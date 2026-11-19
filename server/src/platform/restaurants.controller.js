// ==============================================
// server/src/platform/restaurants.controller.js
// /api/platform/restaurants — every tenant, and everything about one.
// ==============================================

import prisma from "../../prisma/client.js";
import { loadOrgRows, statusCounts, matchesSearch, sortRows } from "./orgs.data.js";
import { dataUsage, MODULES } from "./usage.tracker.js";
import { recordEvent } from "./subscription.js";
import { audit } from "./platform.audit.js";
import {
  handler,
  ok,
  str,
  optStr,
  int,
  paging,
  notFound,
  badRequest,
  addDays,
  startOfDay,
  lastNDays,
  dayKey,
  toNumber,
  toCsv,
  sendCsv,
} from "./platform.utils.js";

const filterRows = (rows, query) => {
  let out = rows;
  if (query.status && query.status !== "ALL") {
    const wanted = String(query.status).split(",");
    out = out.filter((r) => wanted.includes(r.status));
  }
  if (query.plan) out = out.filter((r) => r.planId === query.plan);
  if (query.q) out = out.filter((r) => matchesSearch(r, String(query.q)));
  if (query.inactiveDays) {
    const d = int(query.inactiveDays, 0);
    out = out.filter((r) => r.inactiveDays >= d);
  }
  return sortRows(out, query.sort);
};

export const list = handler(async (req, res) => {
  const { rows } = await loadOrgRows();
  const filtered = filterRows(rows, req.query);
  const { page, pageSize, skip, take } = paging(req.query);
  return ok(res, {
    restaurants: filtered.slice(skip, skip + take),
    total: filtered.length,
    page,
    pageSize,
    counts: statusCounts(rows),
  });
});

export const exportCsv = handler(async (req, res) => {
  const { rows } = await loadOrgRows();
  const filtered = filterRows(rows, req.query);
  const csv = toCsv(filtered, [
    { label: "Restaurant", key: "name" },
    { label: "Owner", value: (r) => r.owner?.fullName },
    { label: "Email", key: "ownerEmail" },
    { label: "Phone", value: (r) => r.owner?.phone },
    { label: "Plan", key: "planName" },
    { label: "Status", key: "status" },
    { label: "Expires", key: "planExpiresAt" },
    { label: "Branches allowed", key: "branchLimit" },
    { label: "Outlets", key: "outlets" },
    { label: "Users", key: "users" },
    { label: "Last active", key: "lastActiveAt" },
    { label: "Inactive days", key: "inactiveDays" },
    { label: "Revenue (INR)", key: "revenue" },
    { label: "Signed up", key: "createdAt" },
  ]);
  return sendCsv(res, `restaurants-${dayKey(new Date())}.csv`, csv);
});

export const detail = handler(async (req, res) => {
  const id = req.params.id;
  const { rows } = await loadOrgRows({ where: { id } });
  const summary = rows[0];
  if (!summary) throw notFound("Restaurant not found.");

  const since30 = addDays(new Date(), -30);
  const [org, outlets, users, payments, events, conversations, followUps] = await Promise.all([
    prisma.organization.findUnique({
      where: { id },
      include: { owner: { include: { pricingPayment: true } } },
    }),
    prisma.outlet.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { employees: true, menuItems: true, restaurantTables: true, customers: true, orders: true } },
      },
    }),
    prisma.userAccount.findMany({
      where: { organizationId: id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        outlet: { select: { id: true, name: true } },
        employee: { select: { fullName: true, mobile: true, designation: true } },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.pricingPayment.findMany({ where: { organizationId: id }, orderBy: { createdAt: "desc" } }),
    prisma.platformSubscriptionEvent.findMany({ where: { organizationId: id }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.platformConversation.findMany({
      where: { organizationId: id },
      orderBy: { lastMessageAt: "desc" },
      include: { assignedTo: { select: { id: true, name: true } } },
    }),
    prisma.platformFollowUp.findMany({
      where: { organizationId: id },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      include: { assignedTo: { select: { id: true, name: true } } },
    }),
  ]);

  const outletIds = outlets.map((o) => o.id);

  // Business stats across every outlet. Orders: exclude cancelled/refunded.
  const [ordersAll, orders30, ordersByDay, recentAudit] = await Promise.all([
    outletIds.length
      ? prisma.order.aggregate({
          where: { outletId: { in: outletIds }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
          _sum: { grandTotal: true },
          _count: { _all: true },
          _max: { createdAt: true },
        })
      : null,
    outletIds.length
      ? prisma.order.aggregate({
          where: { outletId: { in: outletIds }, createdAt: { gte: since30 }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
          _sum: { grandTotal: true },
          _count: { _all: true },
        })
      : null,
    outletIds.length
      ? prisma.order.findMany({
          where: { outletId: { in: outletIds }, createdAt: { gte: since30 }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
          select: { createdAt: true, grandTotal: true },
        })
      : [],
    outletIds.length
      ? prisma.auditLog.findMany({
          where: { outletId: { in: outletIds } },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : [],
  ]);

  const salesSeries = Object.fromEntries(lastNDays(30).map((d) => [d, { day: d, orders: 0, sales: 0 }]));
  for (const o of ordersByDay) {
    const k = dayKey(o.createdAt);
    if (salesSeries[k]) {
      salesSeries[k].orders += 1;
      salesSeries[k].sales += toNumber(o.grandTotal);
    }
  }

  // Signup payment, if it predates organizationId being stored on it.
  const signupPayment = org.owner?.pricingPayment;
  const allPayments = [...payments];
  if (signupPayment && !allPayments.some((p) => p.id === signupPayment.id)) allPayments.push(signupPayment);
  allPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return ok(res, {
    restaurant: {
      ...summary,
      platformNotes: org.platformNotes,
      updatedAt: org.updatedAt,
      ownerDetails: org.owner
        ? {
            fullName: org.owner.fullName,
            email: org.owner.email,
            phone: org.owner.phone,
            address: org.owner.address,
            restaurantName: org.owner.restaurantName,
            signupAt: org.owner.createdAt,
          }
        : null,
    },
    stats: {
      ordersTotal: ordersAll?._count?._all || 0,
      salesTotal: toNumber(ordersAll?._sum?.grandTotal),
      lastOrderAt: ordersAll?._max?.createdAt || null,
      orders30: orders30?._count?._all || 0,
      sales30: toNumber(orders30?._sum?.grandTotal),
      avgOrderValue30: orders30?._count?._all ? toNumber(orders30?._sum?.grandTotal) / orders30._count._all : 0,
      employees: outlets.reduce((s, o) => s + o._count.employees, 0),
      menuItems: outlets.reduce((s, o) => s + o._count.menuItems, 0),
      tables: outlets.reduce((s, o) => s + o._count.restaurantTables, 0),
      customers: outlets.reduce((s, o) => s + o._count.customers, 0),
    },
    salesSeries: Object.values(salesSeries),
    outlets: outlets.map((o) => ({
      id: o.id,
      name: o.name,
      address: [o.address, o.city, o.state, o.pincode].filter(Boolean).join(", "),
      phone: o.phone,
      email: o.email,
      gstin: o.gstin,
      fssai: o.fssai,
      restaurantType: o.restaurantType,
      isActive: o.isActive,
      createdAt: o.createdAt,
      counts: o._count,
    })),
    users,
    payments: allPayments,
    events,
    conversations,
    followUps,
    recentAudit,
  });
});

export const usage = handler(async (req, res) => {
  const id = req.params.id;
  const days = Math.min(180, Math.max(7, int(req.query.days, 30)));
  const since = startOfDay(addDays(new Date(), -(days - 1)));
  const [rows, outlets] = await Promise.all([
    prisma.platformUsageDaily.findMany({
      where: { organizationId: id, day: { gte: new Date(`${dayKey(since)}T00:00:00.000Z`) } },
      orderBy: { day: "asc" },
    }),
    prisma.outlet.findMany({ where: { organizationId: id }, select: { id: true } }),
  ]);

  const dayList = lastNDays(days);
  const series = Object.fromEntries(dayList.map((d) => [d, { day: d, requests: 0, activeMinutes: 0 }]));
  const modules = Object.fromEntries(
    MODULES.map((m) => [m.key, { ...m, requests: 0, writes: 0, activeMinutes: 0, daysUsed: 0, lastSeenAt: null }]),
  );
  for (const r of rows) {
    const k = dayKey(r.day.toISOString().slice(0, 10) + "T12:00:00");
    if (r.module === "_all") {
      if (series[k]) {
        series[k].requests += r.requests;
        series[k].activeMinutes += r.activeMinutes;
      }
      continue;
    }
    const m = modules[r.module];
    if (!m) continue;
    m.requests += r.requests;
    m.writes += r.writes;
    m.activeMinutes += r.activeMinutes;
    m.daysUsed += 1;
    if (!m.lastSeenAt || r.lastSeenAt > m.lastSeenAt) m.lastSeenAt = r.lastSeenAt;
  }

  const fromData = await dataUsage(outlets.map((o) => o.id), since);

  const moduleList = Object.values(modules).sort((a, b) => b.requests - a.requests);
  const totalMinutes = Object.values(series).reduce((s, d) => s + d.activeMinutes, 0);
  const activeDays = Object.values(series).filter((d) => d.requests > 0).length;

  return ok(res, {
    days,
    series: Object.values(series),
    modules: moduleList,
    used: moduleList.filter((m) => m.requests > 0).map((m) => m.key),
    unused: moduleList.filter((m) => m.requests === 0).map((m) => m.key),
    dataUsage: fromData,
    totals: { activeMinutes: totalMinutes, activeDays, avgMinutesPerActiveDay: activeDays ? Math.round(totalMinutes / activeDays) : 0 },
  });
});

export const update = handler(async (req, res) => {
  const id = req.params.id;
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw notFound("Restaurant not found.");
  const data = {};
  if (req.body?.name !== undefined) {
    const name = str(req.body.name, 120);
    if (!name) throw badRequest("Name can't be empty.");
    data.name = name;
  }
  if (req.body?.platformNotes !== undefined) data.platformNotes = optStr(req.body.platformNotes, 5000);
  if (req.body?.branchLimit !== undefined) {
    const n = Math.max(1, Math.min(500, int(req.body.branchLimit, org.branchLimit)));
    data.branchLimit = n;
    if (n !== org.branchLimit) {
      recordEvent({
        organizationId: id,
        type: "BRANCH_LIMIT_CHANGED",
        fromBranches: org.branchLimit,
        toBranches: n,
        performedById: req.platformAdmin.id,
      });
    }
  }
  const updated = await prisma.organization.update({ where: { id }, data });
  audit(req, "ORG_UPDATED", { entityType: "Organization", entityId: id, metadata: data });
  return ok(res, { restaurant: updated });
});

export const suspend = handler(async (req, res) => {
  const id = req.params.id;
  const reason = optStr(req.body?.reason, 500);
  const org = await prisma.organization.update({
    where: { id },
    data: { isActive: false, suspendedAt: new Date(), suspendedReason: reason },
  });
  // End every live session so the suspension takes effect immediately
  // instead of when the current access token runs out.
  await prisma.refreshToken.updateMany({
    where: { revokedAt: null, userAccount: { organizationId: id } },
    data: { revokedAt: new Date() },
  });
  await recordEvent({ organizationId: id, type: "SUSPENDED", note: reason, performedById: req.platformAdmin.id });
  audit(req, "ORG_SUSPENDED", { entityType: "Organization", entityId: id, metadata: { reason } });
  return ok(res, { restaurant: org });
});

export const reactivate = handler(async (req, res) => {
  const id = req.params.id;
  const org = await prisma.organization.update({
    where: { id },
    data: { isActive: true, suspendedAt: null, suspendedReason: null },
  });
  await recordEvent({ organizationId: id, type: "REACTIVATED", note: optStr(req.body?.note, 500), performedById: req.platformAdmin.id });
  audit(req, "ORG_REACTIVATED", { entityType: "Organization", entityId: id });
  return ok(res, { restaurant: org });
});

export const toggleUser = handler(async (req, res) => {
  const { id, userId } = req.params;
  const user = await prisma.userAccount.findFirst({ where: { id: userId, organizationId: id } });
  if (!user) throw notFound("User not found in this restaurant.");
  const isActive = req.body?.isActive === undefined ? !user.isActive : Boolean(req.body.isActive);
  const updated = await prisma.userAccount.update({ where: { id: userId }, data: { isActive } });
  if (!isActive) {
    await prisma.refreshToken.updateMany({ where: { userAccountId: userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  audit(req, isActive ? "ORG_USER_ACTIVATED" : "ORG_USER_DEACTIVATED", {
    entityType: "UserAccount",
    entityId: userId,
    metadata: { organizationId: id },
  });
  return ok(res, { user: { id: updated.id, isActive: updated.isActive } });
});

/** Lightweight id/name list for pickers (messages, follow-ups). */
export const options = handler(async (req, res) => {
  const q = str(req.query.q, 100);
  const orgs = await prisma.organization.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { ownerEmail: { contains: q, mode: "insensitive" } }] }
      : {},
    select: { id: true, name: true, ownerEmail: true },
    orderBy: { name: "asc" },
    take: 50,
  });
  return ok(res, { options: orgs });
});
