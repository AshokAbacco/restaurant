// ==============================================
// server/src/platform/dashboard.controller.js
// /api/platform/dashboard — the platform at a glance.
// ==============================================

import prisma from "../../prisma/client.js";
import { loadOrgRows, statusCounts } from "./orgs.data.js";
import { liveMetrics, pingDb } from "./health.monitor.js";
import {
  handler,
  ok,
  addDays,
  startOfDay,
  lastNMonths,
  lastNDays,
  monthKey,
  dayKey,
  toNumber,
} from "./platform.utils.js";

export const overview = handler(async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const since30 = addDays(startOfDay(), -29);
  const since14 = addDays(startOfDay(), -13);

  const [{ rows, planIndex }, paidAll, paidThisMonth, paidLastMonth, paidYear, outletsCount, usersCount, activeUsers7d, recentPayments, orders30, outletOrgs, usageDaily, unread, openConvos, fuToday, fuOverdue, newEnquiries, failedWebhooks, unresolvedErrors, db] =
    await Promise.all([
      loadOrgRows(),
      prisma.pricingPayment.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.pricingPayment.aggregate({ where: { status: "PAID", createdAt: { gte: monthStart } }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.pricingPayment.aggregate({ where: { status: "PAID", createdAt: { gte: lastMonthStart, lt: monthStart } }, _sum: { amount: true } }),
      prisma.pricingPayment.findMany({ where: { status: "PAID", createdAt: { gte: yearAgo } }, select: { amount: true, createdAt: true, planId: true } }),
      prisma.outlet.count(),
      prisma.userAccount.count(),
      prisma.userAccount.count({ where: { lastLoginAt: { gte: addDays(now, -7) } } }),
      prisma.pricingPayment.findMany({
        where: { status: "PAID" },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { organization: { select: { id: true, name: true } } },
      }),
      prisma.order.groupBy({
        by: ["outletId"],
        where: { createdAt: { gte: since30 }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
        _sum: { grandTotal: true },
        _count: { _all: true },
      }),
      prisma.outlet.findMany({ select: { id: true, organizationId: true } }),
      prisma.platformUsageDaily
        .groupBy({ by: ["day"], where: { module: "_all", day: { gte: new Date(`${dayKey(since14)}T00:00:00.000Z`) } }, _count: { _all: true } })
        .catch(() => []),
      prisma.platformConversation.aggregate({ _sum: { unreadForAdmin: true } }),
      prisma.platformConversation.count({ where: { status: { in: ["OPEN", "PENDING"] } } }),
      prisma.platformFollowUp.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueAt: { gte: startOfDay(), lt: addDays(startOfDay(), 1) } } }),
      prisma.platformFollowUp.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueAt: { lt: startOfDay() } } }),
      prisma.contactSubmission.count({ where: { status: "NEW" } }),
      prisma.platformWebhookLog.count({ where: { success: false, createdAt: { gte: addDays(now, -1) } } }),
      prisma.platformErrorLog.count({ where: { resolved: false } }),
      pingDb(),
    ]);

  const counts = statusCounts(rows);
  const paying = rows.filter((r) => !r.isTrial && r.isActive && !/EXPIRED/.test(r.status));
  const mrr = rows.reduce((s, r) => s + (r.mrr || 0), 0);
  const everPaid = new Set(rows.filter((r) => r.revenue > 0).map((r) => r.id)).size;

  // Revenue + signups by month (12 months)
  const months = lastNMonths(12);
  const byMonth = Object.fromEntries(months.map((m) => [m, { month: m, revenue: 0, payments: 0, signups: 0 }]));
  for (const p of paidYear) {
    const k = monthKey(p.createdAt);
    if (byMonth[k]) {
      byMonth[k].revenue += p.amount;
      byMonth[k].payments += 1;
    }
  }
  for (const r of rows) {
    const k = monthKey(r.createdAt);
    if (byMonth[k]) byMonth[k].signups += 1;
  }

  // Daily revenue (30 days)
  const days = lastNDays(30);
  const byDay = Object.fromEntries(days.map((d) => [d, { day: d, revenue: 0, signups: 0 }]));
  for (const p of paidYear) {
    const k = dayKey(p.createdAt);
    if (byDay[k]) byDay[k].revenue += p.amount;
  }
  for (const r of rows) {
    const k = dayKey(r.createdAt);
    if (byDay[k]) byDay[k].signups += 1;
  }

  // Plan distribution
  const planDist = {};
  for (const r of rows) {
    const key = r.planName || "No plan";
    planDist[key] = planDist[key] || { plan: key, restaurants: 0, mrr: 0 };
    planDist[key].restaurants += 1;
    planDist[key].mrr += r.mrr || 0;
  }

  // GMV across all restaurants + top restaurants (30d)
  const orgOfOutlet = Object.fromEntries(outletOrgs.map((o) => [o.id, o.organizationId]));
  const gmvByOrg = {};
  let gmv30 = 0;
  let orderCount30 = 0;
  for (const g of orders30) {
    const orgId = orgOfOutlet[g.outletId];
    const v = toNumber(g._sum.grandTotal);
    gmv30 += v;
    orderCount30 += g._count._all;
    if (!orgId) continue;
    gmvByOrg[orgId] = gmvByOrg[orgId] || { sales: 0, orders: 0 };
    gmvByOrg[orgId].sales += v;
    gmvByOrg[orgId].orders += g._count._all;
  }
  const nameOf = Object.fromEntries(rows.map((r) => [r.id, r.name]));
  const topRestaurants = Object.entries(gmvByOrg)
    .map(([id, v]) => ({ id, name: nameOf[id] || "—", ...v }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 6);

  const usageMap = Object.fromEntries(usageDaily.map((u) => [u.day.toISOString().slice(0, 10), u._count._all]));
  const dailyActive = lastNDays(14).map((d) => ({ day: d, restaurants: usageMap[d] || 0 }));

  const live = liveMetrics(60);

  return ok(res, {
    kpis: {
      restaurants: rows.length,
      newThisMonth: rows.filter((r) => new Date(r.createdAt) >= monthStart).length,
      newLastMonth: rows.filter((r) => new Date(r.createdAt) >= lastMonthStart && new Date(r.createdAt) < monthStart).length,
      payingRestaurants: paying.length,
      outlets: outletsCount,
      users: usersCount,
      activeUsers7d,
      activeRestaurantsToday: dailyActive[dailyActive.length - 1]?.restaurants || 0,
      totalRevenue: paidAll._sum.amount || 0,
      totalPayments: paidAll._count._all,
      revenueThisMonth: paidThisMonth._sum.amount || 0,
      paymentsThisMonth: paidThisMonth._count._all,
      revenueLastMonth: paidLastMonth._sum.amount || 0,
      mrr,
      arr: mrr * 12,
      arpu: paying.length ? Math.round(mrr / paying.length) : 0,
      conversionRate: rows.length ? Math.round((everPaid / rows.length) * 1000) / 10 : 0,
      gmv30,
      orders30: orderCount30,
    },
    statusCounts: counts,
    revenueByMonth: Object.values(byMonth),
    dailyRevenue: Object.values(byDay),
    planDistribution: Object.values(planDist).sort((a, b) => b.restaurants - a.restaurants),
    dailyActive,
    topRestaurants,
    recentSignups: rows.slice(0, 6).map((r) => ({ id: r.id, name: r.name, owner: r.owner?.fullName, planName: r.planName, status: r.status, createdAt: r.createdAt })),
    expiringSoon: rows
      .filter((r) => r.status === "EXPIRING" || (r.status === "TRIAL" && r.daysLeft !== null && r.daysLeft <= 7))
      .sort((a, b) => new Date(a.planExpiresAt) - new Date(b.planExpiresAt))
      .slice(0, 6)
      .map((r) => ({ id: r.id, name: r.name, planName: r.planName, planExpiresAt: r.planExpiresAt, daysLeft: r.daysLeft, isTrial: r.isTrial })),
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      amount: p.amount,
      planId: p.planId,
      planName: planIndex[p.planId]?.name || p.planId,
      source: p.source,
      restaurant: p.organization?.name || p.restaurantName,
      organizationId: p.organizationId,
      createdAt: p.createdAt,
    })),
    attention: {
      unreadMessages: unread._sum.unreadForAdmin || 0,
      openConversations: openConvos,
      followUpsToday: fuToday,
      followUpsOverdue: fuOverdue,
      newEnquiries,
      failedWebhooks24h: failedWebhooks,
      unresolvedErrors,
    },
    health: {
      db: db.ok,
      dbLatencyMs: db.ms,
      avgResponseMs: live.summary.avgMs,
      p95ResponseMs: live.summary.p95Ms,
      errorRatePct: live.summary.errorRatePct,
      rpm: live.summary.rpm,
      uptimeSec: Math.round(process.uptime()),
    },
  });
});
