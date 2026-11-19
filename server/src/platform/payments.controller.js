// ==============================================
// server/src/platform/payments.controller.js
// /api/platform/payments — every plan purchase: public checkout, renewals
// recorded by the platform team, and manual/offline payments.
// ==============================================

import prisma from "../../prisma/client.js";
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
  date,
  endOfDay,
  toCsv,
  sendCsv,
  dayKey,
} from "./platform.utils.js";

const STATUSES = ["CREATED", "PAID", "FAILED", "VERIFICATION_FAILED"];

const buildWhere = (q) => {
  const where = {};
  if (q.status && STATUSES.includes(q.status)) where.status = q.status;
  if (q.source) where.source = String(q.source);
  if (q.planId) where.planId = String(q.planId);
  if (q.organizationId) where.organizationId = String(q.organizationId);
  const from = date(q.from);
  const to = date(q.to);
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: endOfDay(to) } : {}) };
  const search = str(q.q, 100);
  if (search) {
    where.OR = [
      { restaurantName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { razorpayPaymentId: { contains: search } },
      { razorpayOrderId: { contains: search } },
      { reference: { contains: search, mode: "insensitive" } },
    ];
  }
  return where;
};

export const list = handler(async (req, res) => {
  const where = buildWhere(req.query);
  const { page, pageSize, skip, take } = paging(req.query, { defaultSize: 25 });
  const [payments, total, byStatus, bySource, paidAgg] = await Promise.all([
    prisma.pricingPayment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        organization: { select: { id: true, name: true } },
        owner: { select: { organizationId: true, restaurantName: true } },
      },
    }),
    prisma.pricingPayment.count({ where }),
    prisma.pricingPayment.groupBy({ by: ["status"], where, _count: { _all: true }, _sum: { amount: true } }),
    prisma.pricingPayment.groupBy({ by: ["source"], where: { ...where, status: "PAID" }, _count: { _all: true }, _sum: { amount: true } }),
    prisma.pricingPayment.aggregate({
      where: { ...where, status: "PAID" },
      _sum: { amount: true, gst: true, subtotal: true },
      _count: { _all: true },
      _avg: { amount: true },
    }),
  ]);

  return ok(res, {
    payments: payments.map((p) => ({
      ...p,
      organizationId: p.organizationId || p.owner?.organizationId || null,
      organizationName: p.organization?.name || p.owner?.restaurantName || p.restaurantName,
    })),
    total,
    page,
    pageSize,
    summary: {
      paidAmount: paidAgg._sum.amount || 0,
      paidSubtotal: paidAgg._sum.subtotal || 0,
      paidGst: paidAgg._sum.gst || 0,
      paidCount: paidAgg._count._all,
      avgTicket: Math.round(paidAgg._avg.amount || 0),
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, { count: s._count._all, amount: s._sum.amount || 0 }])),
      bySource: Object.fromEntries(bySource.map((s) => [s.source, { count: s._count._all, amount: s._sum.amount || 0 }])),
    },
  });
});

export const get = handler(async (req, res) => {
  const payment = await prisma.pricingPayment.findUnique({
    where: { id: req.params.id },
    include: {
      organization: { select: { id: true, name: true, ownerEmail: true } },
      owner: { select: { organizationId: true, fullName: true, restaurantName: true } },
    },
  });
  if (!payment) throw notFound("Payment not found.");
  const recordedBy = payment.recordedById
    ? await prisma.platformAdmin.findUnique({ where: { id: payment.recordedById }, select: { id: true, name: true } })
    : null;
  return ok(res, { payment: { ...payment, recordedBy } });
});

/** POST /payments — record an offline payment against a restaurant (no plan change). */
export const record = handler(async (req, res) => {
  const b = req.body || {};
  const org = await prisma.organization.findUnique({ where: { id: str(b.organizationId, 64) }, include: { owner: true } });
  if (!org) throw badRequest("Pick a restaurant.");
  const amount = int(b.amount, 0);
  if (amount <= 0) throw badRequest("Amount must be more than zero.");
  const gstRate = b.gstIncluded === false ? 0 : 0.18;
  const subtotal = Math.round(amount / (1 + gstRate));
  const payment = await prisma.pricingPayment.create({
    data: {
      planId: str(b.planId, 40) || org.planId || "manual",
      billingCycle: str(b.billingCycle, 20) || "manual",
      branches: Math.max(1, int(b.branches, org.branchLimit || 1)),
      subtotal,
      gst: amount - subtotal,
      amount,
      restaurantName: org.name,
      contactName: org.owner?.fullName || null,
      email: org.ownerEmail,
      phone: org.owner?.phone || null,
      notes: optStr(b.notes, 1000),
      status: "PAID",
      organizationId: org.id,
      source: "manual",
      paymentMethod: optStr(b.paymentMethod, 40) || "other",
      reference: optStr(b.reference, 120),
      recordedById: req.platformAdmin.id,
    },
  });
  audit(req, "PAYMENT_RECORDED", { entityType: "PricingPayment", entityId: payment.id, metadata: { amount, organizationId: org.id } });
  return ok(res, { payment }, 201);
});

export const exportCsv = handler(async (req, res) => {
  const payments = await prisma.pricingPayment.findMany({
    where: buildWhere(req.query),
    orderBy: { createdAt: "desc" },
    take: 20000,
    include: { organization: { select: { name: true } } },
  });
  const csv = toCsv(payments, [
    { label: "Date", key: "createdAt" },
    { label: "Restaurant", value: (p) => p.organization?.name || p.restaurantName },
    { label: "Email", key: "email" },
    { label: "Plan", key: "planId" },
    { label: "Cycle", key: "billingCycle" },
    { label: "Branches", key: "branches" },
    { label: "Subtotal", key: "subtotal" },
    { label: "GST", key: "gst" },
    { label: "Amount", key: "amount" },
    { label: "Status", key: "status" },
    { label: "Source", key: "source" },
    { label: "Method", key: "paymentMethod" },
    { label: "Reference", value: (p) => p.reference || p.razorpayPaymentId },
    { label: "Invoice", key: "invoiceNumber" },
  ]);
  return sendCsv(res, `payments-${dayKey(new Date())}.csv`, csv);
});
