// ==============================================
// server/src/platform/plans.controller.js
// /api/platform/plans — full control over what the platform sells.
// ==============================================

import prisma from "../../prisma/client.js";
import { PLANS, builtinPlans, syncPlansFromDb, GST_RATE } from "../pricing/pricing.plans.js";
import { audit } from "./platform.audit.js";
import { invalidatePlanIndex } from "./subscription.js";
import { handler, ok, str, optStr, int, num, bool, badRequest, notFound, oneOf } from "./platform.utils.js";

const CYCLES = ["trial", "month", "year", "custom"];

// ---- first boot: copy the hardcoded plans into the table ----
export const seedPlansIfEmpty = async () => {
  const count = await prisma.platformPlan.count();
  if (count > 0) return 0;
  const builtins = builtinPlans();
  let order = 0;
  for (const plan of Object.values(builtins)) {
    order += 1;
    const standard = plan.tiers?.standard;
    await prisma.platformPlan.create({
      data: {
        code: plan.id,
        name: plan.name,
        description: plan.isFree ? "Try every feature free for a month." : null,
        cycle: plan.isFree ? "trial" : plan.cycle,
        months: plan.isFree ? 1 : plan.months,
        durationDays: plan.isFree ? 30 : null,
        price: plan.isFree ? 0 : standard?.price || 0,
        gstRate: GST_RATE,
        maxBranches: plan.isFree ? 1 : 50,
        isTrial: Boolean(plan.isFree),
        trialDays: plan.isFree ? 30 : null,
        isPublic: true,
        isActive: true,
        isFeatured: plan.id === "yearly",
        sortOrder: order,
        features: plan.features || [],
        tiers: plan.tiers || undefined,
      },
    });
  }
  return order;
};

const subscriberCounts = async () => {
  const now = new Date();
  const [all, active] = await Promise.all([
    prisma.organization.groupBy({ by: ["planId"], _count: { _all: true } }),
    prisma.organization.groupBy({
      by: ["planId"],
      where: { isActive: true, OR: [{ planExpiresAt: null }, { planExpiresAt: { gte: now } }] },
      _count: { _all: true },
    }),
  ]);
  const map = {};
  for (const r of all) map[r.planId || "none"] = { total: r._count._all, active: 0 };
  for (const r of active) {
    map[r.planId || "none"] = map[r.planId || "none"] || { total: 0, active: 0 };
    map[r.planId || "none"].active = r._count._all;
  }
  return map;
};

const revenueByPlan = async () => {
  const rows = await prisma.pricingPayment.groupBy({
    by: ["planId"],
    where: { status: "PAID" },
    _sum: { amount: true },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.planId, { revenue: r._sum.amount || 0, payments: r._count._all }]));
};

const parsePlan = (body, { partial = false } = {}) => {
  const data = {};
  const set = (key, value) => {
    if (partial && body[key] === undefined) return;
    data[key] = value;
  };

  if (!partial || body.code !== undefined) {
    const code = str(body.code, 40).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    if (!code) throw badRequest("Plan code is required (e.g. quarterly).");
    data.code = code;
  }
  if (!partial || body.name !== undefined) {
    const name = str(body.name, 80);
    if (!name) throw badRequest("Plan name is required.");
    data.name = name;
  }
  set("description", optStr(body.description, 500));
  set("cycle", oneOf(body.cycle, CYCLES, "month"));
  set("months", Math.max(1, int(body.months, 1)));
  set("durationDays", body.durationDays === "" || body.durationDays == null ? null : Math.max(1, int(body.durationDays, 30)));
  set("price", Math.max(0, int(body.price, 0)));
  set("comparePrice", body.comparePrice === "" || body.comparePrice == null ? null : Math.max(0, int(body.comparePrice, 0)));
  set("gstRate", Math.min(1, Math.max(0, num(body.gstRate, GST_RATE))));
  set("maxBranches", Math.max(1, int(body.maxBranches, 50)));
  set("isTrial", bool(body.isTrial));
  set("trialDays", body.trialDays === "" || body.trialDays == null ? null : Math.max(1, int(body.trialDays, 30)));
  set("isPublic", bool(body.isPublic, true));
  set("isFeatured", bool(body.isFeatured));
  set("sortOrder", int(body.sortOrder, 0));
  if (!partial || body.features !== undefined) {
    const features = Array.isArray(body.features)
      ? body.features
      : String(body.features || "").split("\n");
    data.features = features.map((f) => str(f, 200)).filter(Boolean);
  }
  if (!partial || body.modules !== undefined) {
    data.modules = Array.isArray(body.modules) ? body.modules.map((m) => str(m, 40)).filter(Boolean) : [];
  }

  // Keep the shape consistent: a trial has no price and one month.
  if (data.isTrial || data.cycle === "trial") {
    data.isTrial = true;
    data.cycle = "trial";
    data.price = 0;
    data.trialDays = data.trialDays || data.durationDays || 30;
    data.maxBranches = 1;
  } else if (data.cycle === "year" && body.months === undefined && !partial) {
    data.months = 12;
  }
  // Explicit tiers would go stale against `price`; regenerate from price.
  if (data.price !== undefined && !data.isTrial) {
    data.tiers = {
      standard: { label: "Standard", price: data.price },
      custom: { label: "Custom", price: data.price },
    };
  }
  return data;
};

const afterChange = async () => {
  invalidatePlanIndex();
  await syncPlansFromDb(prisma);
};

export const list = handler(async (req, res) => {
  const [plans, counts, revenue] = await Promise.all([
    prisma.platformPlan.findMany({ orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }),
    subscriberCounts(),
    revenueByPlan(),
  ]);
  return ok(res, {
    plans: plans.map((p) => ({
      ...p,
      subscribers: counts[p.code] || { total: 0, active: 0 },
      revenue: revenue[p.code] || { revenue: 0, payments: 0 },
      monthlyEquivalent: p.isTrial ? 0 : p.price,
    })),
    checkoutPlans: Object.keys(PLANS),
  });
});

export const get = handler(async (req, res) => {
  const plan = await prisma.platformPlan.findUnique({ where: { id: req.params.id } });
  if (!plan) throw notFound("Plan not found.");
  const subscribers = await prisma.organization.findMany({
    where: { planId: plan.code },
    select: { id: true, name: true, ownerEmail: true, planExpiresAt: true, isActive: true, branchLimit: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return ok(res, { plan, subscribers });
});

export const create = handler(async (req, res) => {
  const data = parsePlan(req.body || {});
  const plan = await prisma.platformPlan.create({ data: { ...data, isActive: bool(req.body?.isActive, true) } });
  await afterChange();
  audit(req, "PLAN_CREATED", { entityType: "PlatformPlan", entityId: plan.id, metadata: { code: plan.code, price: plan.price } });
  return ok(res, { plan }, 201);
});

export const update = handler(async (req, res) => {
  const existing = await prisma.platformPlan.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Plan not found.");
  const data = parsePlan(req.body || {}, { partial: true });
  if (data.code && data.code !== existing.code) {
    const inUse = await prisma.organization.count({ where: { planId: existing.code } });
    if (inUse) throw badRequest(`Code can't change: ${inUse} restaurant(s) are on "${existing.code}".`);
  }
  const plan = await prisma.platformPlan.update({ where: { id: existing.id }, data });
  await afterChange();
  audit(req, "PLAN_UPDATED", {
    entityType: "PlatformPlan",
    entityId: plan.id,
    metadata: { before: { price: existing.price, name: existing.name }, after: { price: plan.price, name: plan.name } },
  });
  return ok(res, { plan });
});

export const setActive = handler(async (req, res) => {
  const active = bool(req.body?.isActive);
  const existing = await prisma.platformPlan.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Plan not found.");
  if (!active) {
    const remaining = await prisma.platformPlan.count({ where: { isActive: true, id: { not: existing.id } } });
    if (!remaining) throw badRequest("At least one plan must stay active.");
  }
  const plan = await prisma.platformPlan.update({
    where: { id: existing.id },
    data: { isActive: active, deactivatedAt: active ? null : new Date() },
  });
  await afterChange();
  audit(req, active ? "PLAN_ACTIVATED" : "PLAN_DEACTIVATED", { entityType: "PlatformPlan", entityId: plan.id, metadata: { code: plan.code } });
  return ok(res, { plan });
});

export const duplicate = handler(async (req, res) => {
  const existing = await prisma.platformPlan.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Plan not found.");
  const { id, createdAt, updatedAt, deactivatedAt, ...rest } = existing;
  let code = `${existing.code}-copy`;
  for (let i = 2; await prisma.platformPlan.findUnique({ where: { code } }); i += 1) code = `${existing.code}-copy-${i}`;
  const plan = await prisma.platformPlan.create({
    data: { ...rest, code, name: `${existing.name} (copy)`, isActive: false, features: existing.features ?? [], modules: existing.modules ?? [], tiers: existing.tiers ?? undefined },
  });
  audit(req, "PLAN_DUPLICATED", { entityType: "PlatformPlan", entityId: plan.id, metadata: { from: existing.code } });
  return ok(res, { plan }, 201);
});

export const remove = handler(async (req, res) => {
  const existing = await prisma.platformPlan.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Plan not found.");
  const [orgs, payments] = await Promise.all([
    prisma.organization.count({ where: { planId: existing.code } }),
    prisma.pricingPayment.count({ where: { planId: existing.code } }),
  ]);
  if (orgs || payments) {
    throw badRequest("This plan has subscribers or payments on record — deactivate it instead of deleting.");
  }
  await prisma.platformPlan.delete({ where: { id: existing.id } });
  await afterChange();
  audit(req, "PLAN_DELETED", { entityType: "PlatformPlan", entityId: existing.id, metadata: { code: existing.code } });
  return ok(res, { deleted: true });
});

// ---- public: GET /api/pricing/plans ----
export const publicPlansHandler = async (req, res) => {
  try {
    const rows = await prisma.platformPlan.findMany({
      where: { isActive: true, isPublic: true },
      orderBy: { sortOrder: "asc" },
    });
    return res.json({
      success: true,
      plans: rows.map((p) => ({
        code: p.code,
        name: p.name,
        description: p.description,
        cycle: p.cycle,
        months: p.months,
        price: p.price,
        comparePrice: p.comparePrice,
        gstRate: p.gstRate,
        maxBranches: p.maxBranches,
        isTrial: p.isTrial,
        trialDays: p.trialDays,
        isFeatured: p.isFeatured,
        features: p.features || [],
      })),
    });
  } catch {
    return res.json({ success: true, plans: [] });
  }
};
