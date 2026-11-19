// ==============================================
// server/src/platform/activity.controller.js
// /api/platform/activity — which features each restaurant uses, which it
// ignores, how long it has been inactive, plus the audit trails.
// ==============================================

import prisma from "../../prisma/client.js";
import { loadOrgRows, matchesSearch, sortRows } from "./orgs.data.js";
import { MODULES } from "./usage.tracker.js";
import { handler, ok, int, paging, addDays, startOfDay, dayKey, str, lastNDays } from "./platform.utils.js";

export const usage = handler(async (req, res) => {
  const days = Math.min(180, Math.max(1, int(req.query.days, 30)));
  const since = new Date(`${dayKey(startOfDay(addDays(new Date(), -(days - 1))))}T00:00:00.000Z`);

  const [{ rows, settings }, grouped, daily] = await Promise.all([
    loadOrgRows(),
    prisma.platformUsageDaily.groupBy({
      by: ["organizationId", "module"],
      where: { day: { gte: since } },
      _sum: { requests: true, activeMinutes: true, writes: true },
      _count: { _all: true },
    }),
    prisma.platformUsageDaily.groupBy({
      by: ["day"],
      where: { day: { gte: since }, module: "_all" },
      _count: { _all: true },
      _sum: { activeMinutes: true, requests: true },
    }),
  ]);

  const byOrg = {};
  for (const g of grouped) {
    const o = (byOrg[g.organizationId] ||= { modules: {}, activeMinutes: 0, activeDays: 0, requests: 0 });
    if (g.module === "_all") {
      o.activeMinutes = g._sum.activeMinutes || 0;
      o.activeDays = g._count._all;
      o.requests = g._sum.requests || 0;
    } else {
      o.modules[g.module] = { requests: g._sum.requests || 0, minutes: g._sum.activeMinutes || 0, days: g._count._all };
    }
  }

  const inactiveAfter = Number(settings.activity.inactiveAfterDays) || 7;
  const churnAfter = Number(settings.activity.churnRiskAfterDays) || 14;

  let out = rows.map((r) => {
    const u = byOrg[r.id] || { modules: {}, activeMinutes: 0, activeDays: 0, requests: 0 };
    const used = MODULES.filter((m) => (u.modules[m.key]?.requests || 0) > 0).map((m) => m.key);
    return {
      id: r.id,
      name: r.name,
      planName: r.planName,
      status: r.status,
      lastActiveAt: r.lastActiveAt,
      lastLoginAt: r.lastLoginAt,
      inactiveDays: r.inactiveDays,
      health: r.inactiveDays >= churnAfter ? "CHURN_RISK" : r.inactiveDays >= inactiveAfter ? "INACTIVE" : "ACTIVE",
      activeMinutes: u.activeMinutes,
      activeDays: u.activeDays,
      requests: u.requests,
      modules: u.modules,
      used,
      unused: MODULES.filter((m) => !used.includes(m.key)).map((m) => m.key),
      users: r.users,
      createdAt: r.createdAt,
    };
  });

  const activeOrgs = out.filter((o) => o.requests > 0).length || 1;
  const adoption = MODULES.map((m) => {
    const users = out.filter((o) => o.used.includes(m.key)).length;
    const minutes = out.reduce((s, o) => s + (o.modules[m.key]?.minutes || 0), 0);
    const requests = out.reduce((s, o) => s + (o.modules[m.key]?.requests || 0), 0);
    return { ...m, restaurants: users, pct: Math.round((users / activeOrgs) * 100), minutes, requests };
  }).sort((a, b) => b.restaurants - a.restaurants);

  const healthCounts = { ACTIVE: 0, INACTIVE: 0, CHURN_RISK: 0 };
  for (const o of out) healthCounts[o.health] += 1;

  const dailyMap = Object.fromEntries(daily.map((d) => [d.day.toISOString().slice(0, 10), d]));
  const dailyActive = lastNDays(days).map((d) => ({
    day: d,
    restaurants: dailyMap[d]?._count?._all || 0,
    minutes: dailyMap[d]?._sum?.activeMinutes || 0,
  }));

  if (req.query.health) out = out.filter((o) => o.health === req.query.health);
  if (req.query.q) out = out.filter((o) => matchesSearch(o, String(req.query.q)));
  if (req.query.module) out = out.filter((o) => (req.query.notUsing ? !o.used.includes(req.query.module) : o.used.includes(req.query.module)));
  out = req.query.sort === "minutes" ? out.sort((a, b) => b.activeMinutes - a.activeMinutes) : sortRows(out, req.query.sort || "inactive");

  const { page, pageSize, skip, take } = paging(req.query, { defaultSize: 50 });
  return ok(res, {
    days,
    rows: out.slice(skip, skip + take),
    total: out.length,
    page,
    pageSize,
    adoption,
    healthCounts,
    dailyActive,
    modules: MODULES,
    thresholds: { inactiveAfter, churnAfter },
  });
});

export const feed = handler(async (req, res) => {
  const source = String(req.query.source || "platform");
  const { page, pageSize, skip, take } = paging(req.query, { defaultSize: 50 });
  const q = str(req.query.q, 100);

  if (source === "platform") {
    const where = {};
    if (req.query.action) where.action = String(req.query.action);
    if (req.query.adminId) where.adminId = String(req.query.adminId);
    if (q) where.OR = [{ action: { contains: q, mode: "insensitive" } }, { entityType: { contains: q, mode: "insensitive" } }];
    const [items, total, actions] = await Promise.all([
      prisma.platformAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { admin: { select: { id: true, name: true, email: true } } },
      }),
      prisma.platformAuditLog.count({ where }),
      prisma.platformAuditLog.groupBy({ by: ["action"], _count: { _all: true }, orderBy: { action: "asc" } }),
    ]);
    return ok(res, { items, total, page, pageSize, actions: actions.map((a) => a.action) });
  }

  if (source === "logins") {
    const where = { lastLoginAt: { not: null } };
    if (req.query.organizationId) where.organizationId = String(req.query.organizationId);
    const [items, total] = await Promise.all([
      prisma.userAccount.findMany({
        where,
        orderBy: { lastLoginAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          lastLoginAt: true,
          isActive: true,
          organization: { select: { id: true, name: true } },
          outlet: { select: { name: true } },
          employee: { select: { fullName: true } },
        },
      }),
      prisma.userAccount.count({ where }),
    ]);
    return ok(res, { items, total, page, pageSize });
  }

  // Restaurant-side audit trail (orders deleted, employees terminated, ...)
  const where = {};
  if (req.query.organizationId) where.outlet = { organizationId: String(req.query.organizationId) };
  if (q) where.OR = [{ action: { contains: q, mode: "insensitive" } }, { entityType: { contains: q, mode: "insensitive" } }];
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { outlet: { select: { name: true, organization: { select: { id: true, name: true } } } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return ok(res, { items, total, page, pageSize });
});
