// ==============================================
// server/src/platform/reports.controller.js
// /api/platform/reports — one complete, date-ranged report across revenue,
// growth, subscriptions, restaurants, usage, support and operations.
// ==============================================

import prisma from "../../prisma/client.js";
import { loadOrgRows, statusCounts } from "./orgs.data.js";
import { MODULES } from "./usage.tracker.js";
import { handler, ok, date, endOfDay, addDays, startOfDay, monthKey, toNumber, toCsv, sendCsv, dayKey } from "./platform.utils.js";

const rangeOf = (q) => {
  const to = endOfDay(date(q.to) || new Date());
  const from = startOfDay(date(q.from) || addDays(to, -89));
  return { from, to };
};

const monthsBetween = (from, to) => {
  const out = [];
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  while (d <= to) {
    out.push(monthKey(d));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
};

const buildReport = async ({ from, to }) => {
  const inRange = { gte: from, lte: to };
  const [
    { rows, planIndex },
    payments,
    events,
    convos,
    followUps,
    enquiries,
    usage,
    orders,
    outlets,
    webhooksTotal,
    webhooksFailed,
    errorsCount,
  ] = await Promise.all([
    loadOrgRows(),
    prisma.pricingPayment.findMany({ where: { createdAt: inRange }, select: { id: true, amount: true, subtotal: true, gst: true, status: true, planId: true, source: true, paymentMethod: true, organizationId: true, createdAt: true } }),
    prisma.platformSubscriptionEvent.findMany({ where: { createdAt: inRange }, select: { type: true, organizationId: true, amount: true } }),
    prisma.platformConversation.findMany({
      where: { createdAt: inRange },
      select: { id: true, category: true, status: true, startedBy: true, createdAt: true, messages: { select: { senderType: true, createdAt: true, isInternal: true }, orderBy: { createdAt: "asc" }, take: 50 } },
    }),
    prisma.platformFollowUp.findMany({
      where: { OR: [{ createdAt: inRange }, { completedAt: inRange }, { dueAt: inRange }] },
      select: { id: true, type: true, status: true, dueAt: true, completedAt: true, createdAt: true, assignedTo: { select: { name: true } } },
    }),
    prisma.contactSubmission.findMany({ where: { createdAt: inRange }, select: { status: true, createdAt: true, repliedAt: true } }),
    prisma.platformUsageDaily.groupBy({
      by: ["organizationId", "module"],
      where: { day: { gte: new Date(`${dayKey(from)}T00:00:00.000Z`), lte: new Date(`${dayKey(to)}T00:00:00.000Z`) } },
      _sum: { activeMinutes: true, requests: true },
    }),
    prisma.order.groupBy({
      by: ["outletId"],
      where: { createdAt: inRange, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      _sum: { grandTotal: true },
      _count: { _all: true },
    }),
    prisma.outlet.findMany({ select: { id: true, organizationId: true } }),
    prisma.platformWebhookLog.count({ where: { createdAt: inRange } }),
    prisma.platformWebhookLog.count({ where: { createdAt: inRange, success: false } }),
    prisma.platformErrorLog.count({ where: { createdAt: inRange } }),
  ]);

  const paid = payments.filter((p) => p.status === "PAID");
  const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);

  // ---- revenue ----
  const months = monthsBetween(from, to);
  const monthly = Object.fromEntries(months.map((m) => [m, { month: m, revenue: 0, payments: 0, signups: 0, renewals: 0 }]));
  for (const p of paid) {
    const k = monthKey(p.createdAt);
    if (monthly[k]) {
      monthly[k].revenue += p.amount;
      monthly[k].payments += 1;
    }
  }
  const signupsInRange = rows.filter((r) => new Date(r.createdAt) >= from && new Date(r.createdAt) <= to);
  for (const r of signupsInRange) {
    const k = monthKey(r.createdAt);
    if (monthly[k]) monthly[k].signups += 1;
  }
  const group = (arr, keyFn) => {
    const out = {};
    for (const p of arr) {
      const k = keyFn(p) || "—";
      out[k] = out[k] || { key: k, amount: 0, count: 0 };
      out[k].amount += p.amount;
      out[k].count += 1;
    }
    return Object.values(out).sort((a, b) => b.amount - a.amount);
  };

  // ---- subscriptions ----
  const renewalTypes = ["RENEWED", "UPGRADED", "DOWNGRADED"];
  const renewals = events.filter((e) => renewalTypes.includes(e.type));
  const churned = rows.filter(
    (r) => r.planExpiresAt && new Date(r.planExpiresAt) >= from && new Date(r.planExpiresAt) <= to && /EXPIRED/.test(r.status),
  );
  const trialsStarted = signupsInRange.filter((r) => planIndex[r.planId]?.isTrial || r.revenue === 0).length;
  const converted = signupsInRange.filter((r) => !r.isTrial && r.revenue > 0).length;

  // ---- per restaurant ----
  const orgOfOutlet = Object.fromEntries(outlets.map((o) => [o.id, o.organizationId]));
  const gmv = {};
  for (const g of orders) {
    const org = orgOfOutlet[g.outletId];
    if (!org) continue;
    gmv[org] = gmv[org] || { sales: 0, orders: 0 };
    gmv[org].sales += toNumber(g._sum.grandTotal);
    gmv[org].orders += g._count._all;
  }
  const usageByOrg = {};
  const moduleOrgs = {};
  for (const u of usage) {
    if (u.module === "_all") {
      usageByOrg[u.organizationId] = { minutes: u._sum.activeMinutes || 0, requests: u._sum.requests || 0 };
    } else if ((u._sum.requests || 0) > 0) {
      (moduleOrgs[u.module] ||= new Set()).add(u.organizationId);
    }
  }
  const revByOrg = {};
  for (const p of paid) if (p.organizationId) revByOrg[p.organizationId] = (revByOrg[p.organizationId] || 0) + p.amount;

  const restaurants = rows.map((r) => ({
    id: r.id,
    name: r.name,
    owner: r.owner?.fullName || "",
    email: r.ownerEmail,
    plan: r.planName,
    status: r.status,
    expires: r.planExpiresAt,
    outlets: r.outlets,
    users: r.users,
    revenueInRange: revByOrg[r.id] || 0,
    lifetimeRevenue: r.revenue,
    orders: gmv[r.id]?.orders || 0,
    sales: Math.round(gmv[r.id]?.sales || 0),
    activeMinutes: usageByOrg[r.id]?.minutes || 0,
    lastActiveAt: r.lastActiveAt,
    inactiveDays: r.inactiveDays,
    signedUp: r.createdAt,
  }));

  const activeOrgCount = Object.keys(usageByOrg).length || 1;
  const adoption = MODULES.map((m) => ({
    module: m.label,
    key: m.key,
    restaurants: moduleOrgs[m.key]?.size || 0,
    pct: Math.round(((moduleOrgs[m.key]?.size || 0) / activeOrgCount) * 100),
  })).sort((a, b) => b.restaurants - a.restaurants);

  // ---- support ----
  const responseTimes = [];
  let adminMsgs = 0;
  let restaurantMsgs = 0;
  for (const c of convos) {
    const visible = c.messages.filter((m) => !m.isInternal);
    adminMsgs += visible.filter((m) => m.senderType === "ADMIN").length;
    restaurantMsgs += visible.filter((m) => m.senderType === "RESTAURANT").length;
    if (c.startedBy === "RESTAURANT") {
      const firstAdmin = visible.find((m) => m.senderType === "ADMIN");
      if (firstAdmin) responseTimes.push((new Date(firstAdmin.createdAt) - new Date(c.createdAt)) / 60000);
    }
  }
  const byCategory = {};
  for (const c of convos) byCategory[c.category] = (byCategory[c.category] || 0) + 1;

  const fuCreated = followUps.filter((f) => f.createdAt >= from && f.createdAt <= to);
  const fuCompleted = followUps.filter((f) => f.status === "DONE" && f.completedAt && f.completedAt >= from && f.completedAt <= to);
  const fuOverdue = followUps.filter((f) => ["PENDING", "IN_PROGRESS"].includes(f.status) && f.dueAt < new Date());
  const fuByType = {};
  for (const f of fuCreated) fuByType[f.type] = (fuByType[f.type] || 0) + 1;
  const fuByAssignee = {};
  for (const f of followUps) {
    const k = f.assignedTo?.name || "Unassigned";
    fuByAssignee[k] = fuByAssignee[k] || { name: k, open: 0, done: 0 };
    if (f.status === "DONE") fuByAssignee[k].done += 1;
    else if (["PENDING", "IN_PROGRESS"].includes(f.status)) fuByAssignee[k].open += 1;
  }

  const enqByStatus = {};
  for (const e of enquiries) enqByStatus[e.status] = (enqByStatus[e.status] || 0) + 1;

  return {
    range: { from, to },
    summary: {
      revenue: sum(paid, (p) => p.amount),
      revenueNet: sum(paid, (p) => p.subtotal),
      gst: sum(paid, (p) => p.gst),
      payments: paid.length,
      failedPayments: payments.filter((p) => ["FAILED", "VERIFICATION_FAILED"].includes(p.status)).length,
      avgPayment: paid.length ? Math.round(sum(paid, (p) => p.amount) / paid.length) : 0,
      signups: signupsInRange.length,
      trialsStarted,
      converted,
      conversionRate: signupsInRange.length ? Math.round((converted / signupsInRange.length) * 1000) / 10 : 0,
      renewals: renewals.length,
      renewalRevenue: sum(renewals, (e) => e.amount),
      churned: churned.length,
      mrr: rows.reduce((s, r) => s + (r.mrr || 0), 0),
      gmv: Math.round(Object.values(gmv).reduce((s, g) => s + g.sales, 0)),
      orders: Object.values(gmv).reduce((s, g) => s + g.orders, 0),
    },
    monthly: Object.values(monthly),
    revenueByPlan: group(paid, (p) => planIndex[p.planId]?.name || p.planId),
    revenueBySource: group(paid, (p) => p.source),
    revenueByMethod: group(paid, (p) => p.paymentMethod || (p.source === "checkout" ? "razorpay" : "—")),
    statusCounts: statusCounts(rows),
    churnedList: churned.map((r) => ({ id: r.id, name: r.name, plan: r.planName, expired: r.planExpiresAt })),
    restaurants,
    adoption,
    support: {
      conversations: convos.length,
      byCategory,
      adminMessages: adminMsgs,
      restaurantMessages: restaurantMsgs,
      avgFirstResponseMin: responseTimes.length ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null,
      resolved: convos.filter((c) => ["RESOLVED", "CLOSED"].includes(c.status)).length,
    },
    followUps: {
      created: fuCreated.length,
      completed: fuCompleted.length,
      overdue: fuOverdue.length,
      completionRate: fuCreated.length ? Math.round((fuCompleted.length / fuCreated.length) * 100) : 0,
      byType: fuByType,
      byAssignee: Object.values(fuByAssignee),
    },
    enquiries: {
      total: enquiries.length,
      byStatus: enqByStatus,
      replied: enquiries.filter((e) => e.repliedAt).length,
      converted: enqByStatus.CONVERTED || 0,
    },
    operations: { webhooks: webhooksTotal, webhooksFailed, serverErrors: errorsCount },
  };
};

export const report = handler(async (req, res) => ok(res, { report: await buildReport(rangeOf(req.query)) }));

export const exportCsv = handler(async (req, res) => {
  const range = rangeOf(req.query);
  const r = await buildReport(range);
  const section = String(req.query.section || "restaurants");
  const tag = `${dayKey(range.from)}_${dayKey(range.to)}`;
  if (section === "monthly") {
    return sendCsv(
      res,
      `report-monthly-${tag}.csv`,
      toCsv(r.monthly, [
        { label: "Month", key: "month" },
        { label: "Revenue (INR)", key: "revenue" },
        { label: "Payments", key: "payments" },
        { label: "Signups", key: "signups" },
      ]),
    );
  }
  if (section === "adoption") {
    return sendCsv(res, `report-adoption-${tag}.csv`, toCsv(r.adoption, [
      { label: "Module", key: "module" },
      { label: "Restaurants using", key: "restaurants" },
      { label: "% of active", key: "pct" },
    ]));
  }
  return sendCsv(
    res,
    `report-restaurants-${tag}.csv`,
    toCsv(r.restaurants, [
      { label: "Restaurant", key: "name" },
      { label: "Owner", key: "owner" },
      { label: "Email", key: "email" },
      { label: "Plan", key: "plan" },
      { label: "Status", key: "status" },
      { label: "Expires", key: "expires" },
      { label: "Outlets", key: "outlets" },
      { label: "Users", key: "users" },
      { label: "Revenue in range", key: "revenueInRange" },
      { label: "Lifetime revenue", key: "lifetimeRevenue" },
      { label: "Orders", key: "orders" },
      { label: "Sales (GMV)", key: "sales" },
      { label: "Active minutes", key: "activeMinutes" },
      { label: "Last active", key: "lastActiveAt" },
      { label: "Inactive days", key: "inactiveDays" },
      { label: "Signed up", key: "signedUp" },
    ]),
  );
});
