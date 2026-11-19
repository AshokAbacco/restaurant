// ==============================================
// server/src/platform/usage.tracker.js
// Which features each restaurant actually uses, and for how long.
//
// trackUsage() is a global middleware: it registers a `finish` listener and
// reads req.user AFTER the route's own requireAuth has populated it, so it
// needs no changes to any existing route. Hits are aggregated in memory
// (requests, writes, distinct active minutes per org/day/module) and
// flushed to PlatformUsageDaily every minute in a few batched upserts —
// a restaurant's request never waits on platform bookkeeping.
// ==============================================

import prisma from "../../prisma/client.js";
import { getSettings } from "./platform.settings.js";
import { dayKey } from "./platform.utils.js";

export const MODULES = [
  { key: "pos", label: "POS / Orders" },
  { key: "kot", label: "KOT" },
  { key: "billing", label: "Billing & invoices" },
  { key: "tables", label: "Tables" },
  { key: "reservations", label: "Reservations" },
  { key: "menu", label: "Menu" },
  { key: "kitchen", label: "Kitchen display" },
  { key: "inventory", label: "Inventory" },
  { key: "expenses", label: "Expenses" },
  { key: "employees", label: "Employees" },
  { key: "crm", label: "CRM & loyalty" },
  { key: "reports", label: "Reports" },
  { key: "profit-loss", label: "Profit & loss" },
  { key: "dashboard", label: "Dashboard" },
  { key: "settings", label: "Settings" },
  { key: "support", label: "Support messages" },
];

const MODULE_KEYS = new Set(MODULES.map((m) => m.key));

export const moduleForPath = (path) => {
  const p = path.split("?")[0].replace(/^\/api\/?/, "");
  const [a = "", b = ""] = p.split("/");
  if (a === "pos") {
    if (b === "kot") return "kot";
    if (b === "reservations") return "reservations";
    if (b === "tables") return "tables";
    if (["billing", "invoices", "payments", "bill-splits", "due-payments", "cash-drawer", "discounts"].includes(b)) return "billing";
    if (["customers", "loyalty"].includes(b)) return "crm";
    if (b === "add-ons") return "menu";
    if (b === "printer-profiles") return "settings";
    return "pos";
  }
  if (a === "kds" || a === "kitchen-branches") return "kitchen";
  if (a === "stores") return "inventory";
  if (["menu", "categories", "subcategories", "sub-categories", "kitchen-sections", "addons", "add-ons", "combos", "variants"].includes(a)) return "menu";
  if (MODULE_KEYS.has(a)) return a;
  return null;
};

// org -> day -> module -> { requests, writes, minutes:Set, lastSeenAt }
let buffer = new Map();
let enabled = true;

const bump = (orgId, day, module, minute, isWrite, at) => {
  let byDay = buffer.get(orgId);
  if (!byDay) buffer.set(orgId, (byDay = new Map()));
  let byModule = byDay.get(day);
  if (!byModule) byDay.set(day, (byModule = new Map()));
  let entry = byModule.get(module);
  if (!entry) byModule.set(module, (entry = { requests: 0, writes: 0, minutes: new Set(), lastSeenAt: at }));
  entry.requests += 1;
  if (isWrite) entry.writes += 1;
  entry.minutes.add(minute);
  entry.lastSeenAt = at;
};

export const trackUsage = (req, res, next) => {
  if (!enabled || !req.path.startsWith("/api/") || req.path.startsWith("/api/platform")) return next();
  res.on("finish", () => {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId || res.statusCode >= 500) return;
      const module = moduleForPath(req.originalUrl || req.path);
      if (!module) return;
      const now = new Date();
      const day = dayKey(now);
      const minute = Math.floor(now.getTime() / 60000);
      const isWrite = req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS";
      bump(orgId, day, module, minute, isWrite, now);
      bump(orgId, day, "_all", minute, isWrite, now);
    } catch {
      /* never break a response over tracking */
    }
  });
  return next();
};

export const flushUsage = async () => {
  if (!buffer.size) return 0;
  const pending = buffer;
  buffer = new Map();
  const ops = [];
  for (const [organizationId, byDay] of pending) {
    for (const [day, byModule] of byDay) {
      for (const [module, e] of byModule) {
        const dayDate = new Date(`${day}T00:00:00.000Z`);
        ops.push(
          prisma.platformUsageDaily.upsert({
            where: { organizationId_day_module: { organizationId, day: dayDate, module } },
            create: {
              organizationId,
              day: dayDate,
              module,
              requests: e.requests,
              writes: e.writes,
              activeMinutes: e.minutes.size,
              lastSeenAt: e.lastSeenAt,
            },
            update: {
              requests: { increment: e.requests },
              writes: { increment: e.writes },
              activeMinutes: { increment: e.minutes.size },
              lastSeenAt: e.lastSeenAt,
            },
          }),
        );
      }
    }
  }
  // Small chunks: each upsert is its own statement, and a remote DB is slow.
  for (let i = 0; i < ops.length; i += 25) {
    const chunk = ops.slice(i, i + 25);
    const results = await Promise.allSettled(chunk);
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) console.error(`[platform] usage flush: ${failed.length} upserts failed`, failed[0].reason?.message);
  }
  return ops.length;
};

export const startUsageTracker = () => {
  const timer = setInterval(async () => {
    try {
      const { trackUsage: on } = await getSettings("activity");
      enabled = on !== false;
      await flushUsage();
    } catch (err) {
      console.error("[platform] usage flush failed:", err.message);
    }
  }, 60 * 1000);
  timer.unref?.();
  return timer;
};

// ==============================================
// Data-derived usage — works even for history from before the tracker
// existed, by counting rows each module wrote in the window.
// ==============================================

const DATA_SOURCES = [
  { module: "pos", label: "Orders", model: "order" },
  { module: "kot", label: "KOTs", model: "kitchenOrder" },
  { module: "billing", label: "Invoices", model: "invoice" },
  { module: "reservations", label: "Reservations", model: "tableReservation" },
  { module: "menu", label: "Menu items added", model: "menuItem" },
  { module: "inventory", label: "Stock movements", model: "stockMovement" },
  { module: "inventory", label: "Purchase orders", model: "purchaseOrder" },
  { module: "expenses", label: "Expenses", model: "expense" },
  { module: "employees", label: "Employees added", model: "employee" },
  { module: "crm", label: "Customers added", model: "customer" },
  { module: "crm", label: "Loyalty transactions", model: "loyaltyTransaction" },
];

/** { module: { label: count } } for the given outlets since `since`. */
export const dataUsage = async (outletIds, since) => {
  if (!outletIds.length) return [];
  const results = await Promise.all(
    DATA_SOURCES.map(async (src) => {
      try {
        const [recent, total] = await Promise.all([
          prisma[src.model].count({ where: { outletId: { in: outletIds }, createdAt: { gte: since } } }),
          prisma[src.model].count({ where: { outletId: { in: outletIds } } }),
        ]);
        return { ...src, recent, total };
      } catch {
        return { ...src, recent: null, total: null };
      }
    }),
  );
  return results.map(({ model, ...rest }) => rest);
};
