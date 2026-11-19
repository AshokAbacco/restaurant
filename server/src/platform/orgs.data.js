// ==============================================
// server/src/platform/orgs.data.js
// Builds the enriched "restaurant row" every platform screen works from:
// organization + owner + counts + subscription status + last activity +
// lifetime revenue. A handful of grouped queries total, regardless of the
// number of tenants, so it stays fast against a remote database.
// ==============================================

import prisma from "../../prisma/client.js";
import { getPlanIndex, orgStatus, daysLeft, orgMrr } from "./subscription.js";
import { getAllSettings } from "./platform.settings.js";
import { daysBetween } from "./platform.utils.js";

export const loadOrgRows = async ({ where = {} } = {}) => {
  const [orgs, planIndex, settings] = await Promise.all([
    prisma.organization.findMany({
      where,
      include: {
        owner: {
          select: {
            fullName: true,
            phone: true,
            email: true,
            address: true,
            restaurantName: true,
            createdAt: true,
          },
        },
        _count: { select: { outlets: true, userAccounts: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getPlanIndex(),
    getAllSettings(),
  ]);

  if (!orgs.length) return { rows: [], planIndex, settings };
  const ids = orgs.map((o) => o.id);

  const [lastLogins, lastUsage, revenue, openConvos, openFollowUps, activeUsers] = await Promise.all([
    prisma.userAccount.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: ids } },
      _max: { lastLoginAt: true },
    }),
    prisma.platformUsageDaily
      .groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: ids }, module: "_all" },
        _max: { lastSeenAt: true },
      })
      .catch(() => []),
    prisma.pricingPayment.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: ids }, status: "PAID" },
      _sum: { amount: true },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.platformConversation
      .groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: ids }, status: { in: ["OPEN", "PENDING"] } },
        _count: { _all: true },
        _sum: { unreadForAdmin: true },
      })
      .catch(() => []),
    prisma.platformFollowUp
      .groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: ids }, status: { in: ["PENDING", "IN_PROGRESS"] } },
        _count: { _all: true },
        _min: { dueAt: true },
      })
      .catch(() => []),
    prisma.userAccount.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: ids }, isActive: true },
      _count: { _all: true },
    }),
  ]);

  const by = (arr) => Object.fromEntries(arr.map((r) => [r.organizationId, r]));
  const loginMap = by(lastLogins);
  const usageMap = by(lastUsage);
  const revMap = by(revenue);
  const convoMap = by(openConvos);
  const fuMap = by(openFollowUps);
  const activeUserMap = by(activeUsers);

  const reminderDays = Math.max(...(settings.subscriptions.expiryReminderDays || [7]), 1);
  const now = new Date();

  const rows = orgs.map((org) => {
    const lastLogin = loginMap[org.id]?._max?.lastLoginAt || null;
    const lastSeen = usageMap[org.id]?._max?.lastSeenAt || null;
    const lastActiveAt =
      [lastLogin, lastSeen].filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0] || null;
    const plan = planIndex[org.planId];
    const status = orgStatus(org, planIndex, { reminderDays, now });
    return {
      id: org.id,
      name: org.name,
      ownerEmail: org.ownerEmail,
      owner: org.owner,
      planId: org.planId,
      planName: plan?.name || org.planId || "No plan",
      isTrial: !org.planId || Boolean(plan?.isTrial),
      branchLimit: org.branchLimit,
      planExpiresAt: org.planExpiresAt,
      daysLeft: daysLeft(org, now),
      isActive: org.isActive,
      suspendedAt: org.suspendedAt,
      suspendedReason: org.suspendedReason,
      status,
      createdAt: org.createdAt,
      outlets: org._count.outlets,
      users: org._count.userAccounts,
      activeUsers: activeUserMap[org.id]?._count?._all || 0,
      lastLoginAt: lastLogin,
      lastActiveAt,
      inactiveDays: lastActiveAt ? daysBetween(lastActiveAt, now) : daysBetween(org.createdAt, now),
      revenue: revMap[org.id]?._sum?.amount || 0,
      paymentsCount: revMap[org.id]?._count?._all || 0,
      lastPaymentAt: revMap[org.id]?._max?.createdAt || null,
      mrr: /EXPIRED|SUSPENDED/.test(status) ? 0 : orgMrr(org, planIndex),
      openConversations: convoMap[org.id]?._count?._all || 0,
      unreadMessages: convoMap[org.id]?._sum?.unreadForAdmin || 0,
      openFollowUps: fuMap[org.id]?._count?._all || 0,
      nextFollowUpAt: fuMap[org.id]?._min?.dueAt || null,
    };
  });

  return { rows, planIndex, settings };
};

export const statusCounts = (rows) => {
  const counts = { ALL: rows.length, ACTIVE: 0, TRIAL: 0, EXPIRING: 0, EXPIRED: 0, TRIAL_EXPIRED: 0, SUSPENDED: 0 };
  for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;
  return counts;
};

export const matchesSearch = (row, q) => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [row.name, row.ownerEmail, row.owner?.fullName, row.owner?.phone, row.planName, row.id]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(needle));
};

export const sortRows = (rows, sort = "newest") => {
  const s = [...rows];
  const time = (v) => (v ? new Date(v).getTime() : 0);
  switch (sort) {
    case "name":
      return s.sort((a, b) => a.name.localeCompare(b.name));
    case "expiry":
      return s.sort((a, b) => (time(a.planExpiresAt) || Infinity) - (time(b.planExpiresAt) || Infinity));
    case "lastActive":
      return s.sort((a, b) => time(b.lastActiveAt) - time(a.lastActiveAt));
    case "inactive":
      return s.sort((a, b) => b.inactiveDays - a.inactiveDays);
    case "revenue":
      return s.sort((a, b) => b.revenue - a.revenue);
    case "oldest":
      return s.sort((a, b) => time(a.createdAt) - time(b.createdAt));
    default:
      return s.sort((a, b) => time(b.createdAt) - time(a.createdAt));
  }
};
