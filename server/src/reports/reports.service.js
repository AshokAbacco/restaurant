// src/reports/reports.service.js
// ==============================================
// Reports Service
// All Prisma queries + aggregation logic for the Reports & Analytics module.
// Keep this file free of req/res — controllers own HTTP concerns.
// ==============================================

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;
const prisma = globalForPrisma.__reportsPrisma || new PrismaClient();
if (process.env.NODE_ENV !== "production")
  globalForPrisma.__reportsPrisma = prisma;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function getDateRange(period, startDate, endDate) {
  if (startDate && endDate) {
    return {
      start: startOfDay(new Date(startDate)),
      end: endOfDay(new Date(endDate)),
    };
  }

  const now = new Date();
  const p = (period || "today").toLowerCase().replace(/\s+/g, "");

  if (p === "thisweek" || p === "week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const start = startOfDay(new Date(now));
    start.setDate(start.getDate() - diffToMonday);
    return { start, end: endOfDay(now) };
  }

  if (p === "thismonth" || p === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: startOfDay(start), end: endOfDay(now) };
  }

  if (p === "thisyear" || p === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return { start: startOfDay(start), end: endOfDay(now) };
  }

  return { start: startOfDay(now), end: endOfDay(now) };
}

function getPreviousRange(start, end) {
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { start: prevStart, end: prevEnd };
}

function parseFilters(query = {}, outletId) {
  const {
    period,
    startDate,
    endDate,
    orderType,
    paymentMethod,
    category,
    search,
    granularity,
    page,
    pageSize,
    limit,
  } = query;

  const { start, end } = getDateRange(period, startDate, endDate);

  const clean = (v) => (v && !/^all/i.test(v) ? v : undefined);

  return {
    start,
    end,
    period: period || "today",
    // outletId is NEVER read from query — it comes only from the
    // authenticated session (req.tenant.outletId in the controller). The
    // old `store` query param let a client claim any store as a plain
    // string; there is no client-controlled equivalent of that anymore,
    // by design.
    outletId,
    orderType: clean(orderType),
    paymentMethod: clean(paymentMethod),
    category: clean(category),
    search: search && search.trim() ? search.trim() : undefined,
    granularity: granularity || "daily",
    page: Math.max(1, parseInt(page, 10) || 1),
    pageSize: Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10)),
    limit: Math.min(500, Math.max(1, parseInt(limit, 10) || 10)),
  };
}

function buildOrderWhere(filters, { includeAllStatuses = false } = {}) {
  const where = {
    outletId: filters.outletId,
    createdAt: { gte: filters.start, lte: filters.end },
  };
  if (filters.orderType) where.orderType = filters.orderType;
  if (!includeAllStatuses) where.status = { notIn: ["CANCELLED"] };
  return where;
}

function buildExpenseWhere(filters) {
  return {
    outletId: filters.outletId,
    expenseDate: { gte: filters.start, lte: filters.end },
    status: { not: "REJECTED" },
  };
}

const num = (v) => Number(v || 0);
const pctChange = (curr, prev) =>
  prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

async function getCOGS(orderWhere) {
  const items = await prisma.orderItem.findMany({
    where: { order: orderWhere },
    select: { quantity: true, menuItem: { select: { costPrice: true } } },
  });
  return items.reduce(
    (sum, it) => sum + num(it.menuItem?.costPrice) * it.quantity,
    0,
  );
}

async function getSalesSummary(filters) {
  const where = buildOrderWhere(filters);

  const [currentAgg, cogs, expenseAgg, distinctCustomers] = await Promise.all([
    prisma.order.aggregate({
      where,
      _sum: { grandTotal: true, gstAmount: true },
      _count: { id: true },
    }),
    getCOGS(where),
    prisma.expense.aggregate({
      where: buildExpenseWhere(filters),
      _sum: { totalPaid: true },
    }),
    prisma.order.findMany({
      where: { ...where, customerId: { not: null } },
      select: { customerId: true },
      distinct: ["customerId"],
    }),
  ]);

  const prevRange = getPreviousRange(filters.start, filters.end);
  const prevWhere = buildOrderWhere({
    ...filters,
    start: prevRange.start,
    end: prevRange.end,
  });
  const prevAgg = await prisma.order.aggregate({
    where: prevWhere,
    _sum: { grandTotal: true },
    _count: { id: true },
  });

  const revenue = num(currentAgg._sum.grandTotal);
  const orders = currentAgg._count.id;
  const gst = num(currentAgg._sum.gstAmount);
  const expenses = num(expenseAgg._sum.totalPaid);
  const netProfit = revenue - cogs - expenses;
  const avgBill = orders ? revenue / orders : 0;

  const prevRevenue = num(prevAgg._sum.grandTotal);
  const prevOrders = prevAgg._count.id;
  const prevAvgBill = prevOrders ? prevRevenue / prevOrders : 0;

  return {
    revenue,
    orders,
    netProfit,
    avgBill,
    gst,
    customers: distinctCustomers.length,
    changes: {
      revenuePct: pctChange(revenue, prevRevenue),
      ordersDelta: orders - prevOrders,
      netProfitPct: pctChange(netProfit, prevRevenue - cogs - expenses),
      avgBillPct: pctChange(avgBill, prevAvgBill),
    },
  };
}

async function getInventoryValue(outletId) {
  const stocks = await prisma.inventoryStock.findMany({
    where: { outletId },
    select: { quantityOnHand: true, averageCost: true },
  });
  return stocks.reduce(
    (sum, s) => sum + num(s.quantityOnHand) * num(s.averageCost),
    0,
  );
}

function bucketKey(date, granularity) {
  const d = new Date(date);
  if (granularity === "monthly")
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (granularity === "weekly") {
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  }
  return d.toISOString().slice(0, 10);
}

async function getSalesTrend(filters) {
  const where = buildOrderWhere(filters);
  const orders = await prisma.order.findMany({
    where,
    select: { createdAt: true, grandTotal: true },
  });

  const map = new Map();
  for (const o of orders) {
    const key = bucketKey(o.createdAt, filters.granularity);
    const entry = map.get(key) || { label: key, revenue: 0, orders: 0 };
    entry.revenue += num(o.grandTotal);
    entry.orders += 1;
    map.set(key, entry);
  }
  return Array.from(map.values()).sort((a, b) => (a.label > b.label ? 1 : -1));
}

async function getOrderTypeBreakdown(filters) {
  const where = buildOrderWhere(filters);
  const grouped = await prisma.order.groupBy({
    by: ["orderType"],
    where,
    _sum: { grandTotal: true },
    _count: { id: true },
  });
  const total = grouped.reduce((s, g) => s + num(g._sum.grandTotal), 0);
  return grouped
    .map((g) => ({
      orderType: g.orderType,
      revenue: num(g._sum.grandTotal),
      orders: g._count.id,
      pct: total ? Math.round((num(g._sum.grandTotal) / total) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

async function getCategoryPerformance(filters) {
  const where = buildOrderWhere(filters);
  const items = await prisma.orderItem.findMany({
    where: { order: where },
    select: {
      orderId: true,
      quantity: true,
      totalPrice: true,
      menuItem: {
        select: { costPrice: true, category: { select: { name: true } } },
      },
    },
  });

  const map = new Map();
  for (const it of items) {
    const catName = it.menuItem?.category?.name || "Uncategorized";
    if (filters.category && filters.category !== catName) continue;
    const entry = map.get(catName) || {
      category: catName,
      revenue: 0,
      orders: new Set(),
      profit: 0,
    };
    entry.revenue += num(it.totalPrice);
    entry.orders.add(it.orderId);
    entry.profit +=
      num(it.totalPrice) - num(it.menuItem?.costPrice) * it.quantity;
    map.set(catName, entry);
  }

  const arr = Array.from(map.values()).map((e) => ({
    category: e.category,
    revenue: e.revenue,
    orders: e.orders.size,
    profit: e.profit,
  }));
  const maxRevenue = Math.max(1, ...arr.map((a) => a.revenue), 0);
  return arr
    .sort((a, b) => b.revenue - a.revenue)
    .map((a) => ({ ...a, pct: Math.round((a.revenue / maxRevenue) * 100) }));
}

async function getPaymentDistribution(filters) {
  const where = { status: "PAID", order: buildOrderWhere(filters) };
  if (filters.paymentMethod) where.method = filters.paymentMethod;

  const grouped = await prisma.payment.groupBy({
    by: ["method"],
    where,
    _sum: { amount: true },
    _count: { id: true },
  });
  const total = grouped.reduce((s, g) => s + num(g._sum.amount), 0);
  return grouped
    .map((g) => ({
      method: g.method,
      amount: num(g._sum.amount),
      count: g._count.id,
      pct: total ? Math.round((num(g._sum.amount) / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

async function getTopSellingItems(filters) {
  const where = buildOrderWhere(filters);
  const grouped = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: { order: where },
    _sum: { quantity: true, totalPrice: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: filters.limit || 10,
  });

  const menuItemIds = grouped.map((g) => g.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, outletId: filters.outletId },
    select: { id: true, name: true, costPrice: true },
  });
  const menuMap = new Map(menuItems.map((m) => [m.id, m]));
  const maxQty = Math.max(1, ...grouped.map((g) => g._sum.quantity || 0), 0);

  return grouped.map((g) => {
    const mi = menuMap.get(g.menuItemId);
    const qty = g._sum.quantity || 0;
    const revenue = num(g._sum.totalPrice);
    const cost = num(mi?.costPrice) * qty;
    return {
      item: mi?.name || "Unknown item",
      qty,
      revenue,
      profit: revenue - cost,
      pct: Math.round((qty / maxQty) * 100),
    };
  });
}

async function getExpenseBreakdown(filters) {
  const grouped = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: buildExpenseWhere(filters),
    _sum: { totalPaid: true },
  });
  const categoryIds = grouped.map((g) => g.categoryId);
  const categories = await prisma.expenseCategory.findMany({
    where: { id: { in: categoryIds }, outletId: filters.outletId },
    select: { id: true, name: true },
  });
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const total = grouped.reduce((s, g) => s + num(g._sum.totalPaid), 0);

  return grouped
    .map((g) => ({
      name: catMap.get(g.categoryId) || "Other",
      amount: num(g._sum.totalPaid),
      pct: total ? Math.round((num(g._sum.totalPaid) / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

async function getEmployeePerformance(filters) {
  const where = { ...buildOrderWhere(filters), waiterId: { not: null } };
  const grouped = await prisma.order.groupBy({
    by: ["waiterId"],
    where,
    _sum: { grandTotal: true },
    _count: { id: true },
    orderBy: { _sum: { grandTotal: "desc" } },
    take: filters.limit || 10,
  });

  const ids = grouped.map((g) => g.waiterId);
  const employees = await prisma.employee.findMany({
    where: { id: { in: ids }, outletId: filters.outletId },
    select: { id: true, fullName: true, designation: true },
  });
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const maxOrders = Math.max(1, ...grouped.map((g) => g._count.id), 0);

  return grouped.map((g) => {
    const emp = empMap.get(g.waiterId);
    return {
      name: emp?.fullName || "Unknown",
      role: emp?.designation || "-",
      orders: g._count.id,
      sales: num(g._sum.grandTotal),
      pct: Math.round((g._count.id / maxOrders) * 100),
    };
  });
}

async function getCustomerAnalytics(filters) {
  const where = { ...buildOrderWhere(filters), customerId: { not: null } };
  const [distinctOrders, topCustomerGroup] = await Promise.all([
    prisma.order.findMany({ where, select: { customerId: true } }),
    prisma.order.groupBy({
      by: ["customerId"],
      where,
      _sum: { grandTotal: true },
      _count: { id: true },
      orderBy: { _sum: { grandTotal: "desc" } },
      take: 1,
    }),
  ]);

  const customerIds = [...new Set(distinctOrders.map((o) => o.customerId))];
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds }, outletId: filters.outletId },
    select: { id: true, name: true, createdAt: true, loyaltyPoints: true },
  });
  const custMap = new Map(customers.map((c) => [c.id, c]));

  let newCount = 0;
  let returningCount = 0;
  let loyalCount = 0;
  for (const id of customerIds) {
    const c = custMap.get(id);
    if (!c) continue;
    if (c.createdAt >= filters.start) newCount++;
    else returningCount++;
    if (c.loyaltyPoints >= 500) loyalCount++;
  }

  // FIX: this previously counted every customer in the ENTIRE database not
  // present in customerIds — meaning it counted every other outlet's (and
  // every other organization's) customers as "inactive" for THIS outlet's
  // dashboard. Scoped to this outlet now, which is what the number was
  // always supposed to mean.
  const inactiveCount = await prisma.customer.count({
    where: { id: { notIn: customerIds }, outletId: filters.outletId },
  });

  let topCustomer = null;
  if (topCustomerGroup.length) {
    const g = topCustomerGroup[0];
    const c = custMap.get(g.customerId);
    topCustomer = {
      name: c?.name || "Unknown",
      orders: g._count.id,
      sales: num(g._sum.grandTotal),
      loyaltyPoints: c?.loyaltyPoints || 0,
    };
  }

  return {
    total: customerIds.length,
    new: newCount,
    returning: returningCount,
    loyal: loyalCount,
    inactive: inactiveCount,
    topCustomer,
  };
}

async function getInventoryAlerts(limit = 20, outletId) {
  const alerts = await prisma.inventoryAlert.findMany({
    where: { outletId, isResolved: false },
    include: {
      ingredient: {
        select: {
          name: true,
          consumptionUnit: { select: { abbreviation: true, name: true } },
          inventoryStock: { select: { quantityOnHand: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const severityMap = {
    OUT_OF_STOCK: "critical",
    EXPIRED: "critical",
    LOW_STOCK: "high",
    EXPIRING_SOON: "medium",
  };

  return alerts.map((a) => ({
    item: a.ingredient?.name || "Unknown",
    stock: `${a.ingredient?.inventoryStock?.quantityOnHand ?? 0} ${
      a.ingredient?.consumptionUnit?.abbreviation ||
      a.ingredient?.consumptionUnit?.name ||
      ""
    }`.trim(),
    status: a.type.replace(/_/g, " "),
    severity: severityMap[a.type] || "medium",
    message: a.message,
  }));
}

async function getKitchenPerformance(filters) {
  // KitchenOrder has its own direct outletId (see kot.service.js /
  // kds.service.js from earlier retrofit work) — simpler and more direct
  // than the old `where.order = { store: filters.store }`, which routed
  // through a field (Order.store) that no longer exists anyway.
  const where = {
    outletId: filters.outletId,
    createdAt: { gte: filters.start, lte: filters.end },
  };

  const kots = await prisma.kitchenOrder.findMany({
    where,
    select: { status: true, createdAt: true, readyAt: true },
  });

  let prepared = 0;
  let pending = 0;
  let cancelled = 0;
  let totalPrepMinutes = 0;
  let preparedWithTime = 0;

  for (const k of kots) {
    if (["COMPLETED", "SERVED", "READY"].includes(k.status)) {
      prepared++;
      if (k.readyAt) {
        totalPrepMinutes += (k.readyAt - k.createdAt) / 60000;
        preparedWithTime++;
      }
    } else if (k.status === "CANCELLED") {
      cancelled++;
    } else {
      pending++;
    }
  }

  return {
    prepared,
    pending,
    cancelled,
    avgTimeMinutes: preparedWithTime
      ? Math.round(totalPrepMinutes / preparedWithTime)
      : 0,
  };
}

async function getRecentTransactions(filters) {
  const where = buildOrderWhere(filters, { includeAllStatuses: true });

  if (filters.search) {
    where.OR = [
      { orderNumber: { contains: filters.search, mode: "insensitive" } },
      { customer: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }
  if (filters.paymentMethod) {
    where.payments = { some: { method: filters.paymentMethod } };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        payments: {
          select: { method: true, status: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  const rows = orders.map((o) => ({
    invoice: o.orderNumber,
    customer: o.customer?.name || "Walk-in",
    type: o.orderType,
    payment: o.payments[0]?.method || "-",
    amount: num(o.grandTotal),
    status: o.payments[0]?.status || o.status,
    time: o.createdAt,
  }));

  return { rows, total, page: filters.page, pageSize: filters.pageSize };
}

async function getRefundsAndDiscounts(filters) {
  const [refundAgg, discountAgg] = await Promise.all([
    prisma.order.aggregate({
      where: {
        ...buildOrderWhere(filters, { includeAllStatuses: true }),
        status: "REFUNDED",
      },
      _sum: { grandTotal: true },
    }),
    prisma.orderDiscount.aggregate({
      where: { order: buildOrderWhere(filters, { includeAllStatuses: true }) },
      _sum: { amountDeducted: true },
    }),
  ]);
  return {
    refunds: num(refundAgg._sum.grandTotal),
    discounts: num(discountAgg._sum.amountDeducted),
  };
}

async function getDashboard(filters) {
  const [
    summary,
    salesTrend,
    orderTypeBreakdown,
    categoryPerformance,
    paymentDistribution,
    topSellingItems,
    expenseBreakdown,
    employeePerformance,
    customerAnalytics,
    inventoryAlerts,
    kitchenPerformance,
    recentTransactions,
    inventoryValue,
    refundsDiscounts,
  ] = await Promise.all([
    getSalesSummary(filters),
    getSalesTrend(filters),
    getOrderTypeBreakdown(filters),
    getCategoryPerformance(filters),
    getPaymentDistribution(filters),
    getTopSellingItems({ ...filters, limit: 5 }),
    getExpenseBreakdown(filters),
    getEmployeePerformance({ ...filters, limit: 5 }),
    getCustomerAnalytics(filters),
    getInventoryAlerts(5, filters.outletId),
    getKitchenPerformance(filters),
    getRecentTransactions({ ...filters, page: 1, pageSize: 5 }),
    getInventoryValue(filters.outletId),
    getRefundsAndDiscounts(filters),
  ]);

  const businessSummary = {
    bestItem: topSellingItems[0]?.item || "-",
    bestCategory: categoryPerformance[0]?.category || "-",
    refunds: refundsDiscounts.refunds,
    discounts: refundsDiscounts.discounts,
    netMargin: summary.revenue
      ? Math.round((summary.netProfit / summary.revenue) * 1000) / 10
      : 0,
    growthPct: summary.changes.revenuePct,
  };

  return {
    // ================= KPIs =================
    kpis: {
      sales: {
        value: summary.revenue,
        change: summary.changes.revenuePct,
        trend: summary.changes.revenuePct >= 0 ? "up" : "down",
      },

      orders: {
        value: summary.orders,
        change: summary.changes.ordersDelta,
        trend: summary.changes.ordersDelta >= 0 ? "up" : "down",
      },

      netProfit: {
        value: summary.netProfit,
        change: summary.changes.netProfitPct,
        trend: summary.changes.netProfitPct >= 0 ? "up" : "down",
      },

      averageBill: {
        value: summary.avgBill,
        change: summary.changes.avgBillPct,
        trend: summary.changes.avgBillPct >= 0 ? "up" : "down",
      },
    },

    // ================= Secondary KPIs =================
    secondaryKpis: {
      customers: {
        value: summary.customers,
        change: 0,
        trend: "up",
      },

      inventoryValue: {
        value: inventoryValue,
      },

      expenses: {
        value: expenseBreakdown.reduce((t, e) => t + e.amount, 0),
        change: 0,
        trend: "down",
      },

      gstCollected: {
        value: summary.gst,
        change: 0,
        trend: "up",
      },
    },

    // ================= Dashboard Lists =================
    topSelling: topSellingItems,

    categoryData: categoryPerformance,

    paymentData: paymentDistribution.map((p) => ({
      name: p.method,
      amount: p.amount,
      pct: p.pct,
    })),

    expenseBreakdown,

    expenseTotal: expenseBreakdown.reduce((t, e) => t + e.amount, 0),

    employees: employeePerformance,

    transactions: recentTransactions.rows,

    inventoryAlerts,

    // ================= Customer =================
    customerSegments: {
      newCustomers: customerAnalytics.new,
      returning: customerAnalytics.returning,
      loyal: customerAnalytics.loyal,
      inactive: customerAnalytics.inactive,
    },

    topCustomer: customerAnalytics.topCustomer && {
      name: customerAnalytics.topCustomer.name,
      orders: customerAnalytics.topCustomer.orders,
      totalSpent: customerAnalytics.topCustomer.sales,
    },

    // ================= Kitchen =================
    kitchenPerformance: {
      prepared: kitchenPerformance.prepared,
      pending: kitchenPerformance.pending,
      avgPrepMinutes: kitchenPerformance.avgTimeMinutes,
      cancelled: kitchenPerformance.cancelled,
    },

    // ================= Summary =================
    businessSummary: {
      bestItem: businessSummary.bestItem,
      bestCategory: businessSummary.bestCategory,
      refunds: businessSummary.refunds,
      discounts: businessSummary.discounts,
      netMargin: businessSummary.netMargin,
      growth: businessSummary.growthPct,
    },

    salesTrend,
    orderTypeBreakdown,
  };
}

// ==============================================
// Phase 2.2 — Counter / Settlement / Assignee-Wise Summaries
// ==============================================
//
// Counter Summary and Assignee-Wise Summary share the exact same column
// shape (complimentary/sales-return/cancelled/success order counts, net
// amount, discount, tax, total sales, payment-method breakdown, and
// outstanding due-payment total) — they only differ in what they group
// orders BY (billing counter vs. the waiter/assignee on the order). One
// shared aggregator, two thin callers.
//
// NOTE on payment-method columns: this system's PaymentMethod enum is
// CASH/CARD/UPI/BANK_TRANSFER/CHEQUE/OTHER — there's no separate "Wallet"/
// "Online Cash"/"Online Paid" distinction the way PetPooja's screen shows
// it. Rather than fake columns that don't correspond to real data, the
// breakdown below uses the real enum values plus a separate "Due Payment"
// column (sourced from DuePayment, Phase 1.2) for the amount still
// outstanding — that combination covers the same underlying question
// ("how was this money collected, and how much wasn't") without inventing
// distinctions this app doesn't actually track.

const PAYMENT_METHODS_FOR_SUMMARY = ["CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"];

function emptySummaryGroup(key, label) {
  return {
    key,
    label,
    complimentaryOrders: 0,
    salesReturnOrders: 0,
    cancelledOrders: 0,
    successOrders: 0,
    netAmount: 0,
    totalDiscount: 0,
    totalTax: 0,
    totalSales: 0,
    // Billed but not collected: an invoice was raised and the money never
    // fully arrived. Distinct from duePayment, which is the subset that was
    // deliberately put on a customer's tab — this one is the leak.
    notPaid: 0,
    duePayment: 0,
    // Cash handed to a delivery rider for an order that came in through a
    // platform. It's already counted inside paymentBreakdown.CASH; this is
    // a separate view of the same money, because reconciling the till means
    // knowing which cash walked in the door and which came back with a
    // rider.
    onlineCash: 0,
    paymentBreakdown: Object.fromEntries(PAYMENT_METHODS_FOR_SUMMARY.map((m) => [m, 0])),
  };
}

function roundGroup(g) {
  return {
    ...g,
    netAmount: Math.round(g.netAmount * 100) / 100,
    totalDiscount: Math.round(g.totalDiscount * 100) / 100,
    totalTax: Math.round(g.totalTax * 100) / 100,
    totalSales: Math.round(g.totalSales * 100) / 100,
    notPaid: Math.round(g.notPaid * 100) / 100,
    duePayment: Math.round(g.duePayment * 100) / 100,
    onlineCash: Math.round(g.onlineCash * 100) / 100,
    paymentBreakdown: Object.fromEntries(
      Object.entries(g.paymentBreakdown).map(([k, v]) => [k, Math.round(v * 100) / 100]),
    ),
  };
}

// groupKeyFn/labelFn receive the raw Order row (with .payments, .counter,
// .waiter already included) and decide which group a row belongs to.
async function buildBillingSummary(filters, groupKeyFn, labelFn, seedGroups) {
  // includeAllStatuses: true — unlike almost every other report in this
  // file, this one NEEDS cancelled/refunded orders, since counting them
  // (not just excluding them) is the whole point of this report.
  const where = buildOrderWhere(filters, { includeAllStatuses: true });

  const orders = await prisma.order.findMany({
    where,
    include: {
      payments: { where: { status: "PAID" } },
      counter: { select: { id: true, name: true } },
      waiter: { select: { id: true, fullName: true } },
      // Whether a bill was ever raised — the difference between "still
      // being eaten" and "billed and not paid for".
      invoice: { select: { id: true } },
      // A tab that was deliberately opened gets its own column, so it must
      // not also be counted as unpaid.
      duePayment: { select: { id: true } },
    },
  });

  const groups = new Map();

  // Seed the groups so a counter that took no money in the period still
  // appears, as a row of zeros. Building groups purely from orders meant a
  // counter nobody used simply vanished from the report — which reads as
  // "no such counter" when the answer is "that till took nothing today",
  // and those are very different things at end of day.
  for (const seed of seedGroups || []) {
    groups.set(seed.key, emptySummaryGroup(seed.key, seed.label));
  }

  for (const order of orders) {
    const key = groupKeyFn(order) ?? "unassigned";
    if (!groups.has(key)) {
      groups.set(key, emptySummaryGroup(key, labelFn(order)));
    }
    const g = groups.get(key);

    if (order.status === "CANCELLED") {
      g.cancelledOrders++;
      continue; // cancelled orders don't contribute to any money column
    }
    if (order.status === "REFUNDED") g.salesReturnOrders++;
    if (order.status === "COMPLETED") g.successOrders++;
    if (Number(order.grandTotal) === 0) g.complimentaryOrders++;

    g.netAmount += num(order.subtotal);
    g.totalDiscount += num(order.discountAmount);
    g.totalTax += num(order.gstAmount);
    g.totalSales += num(order.grandTotal);

    let paidOnThisOrder = 0;
    for (const p of order.payments) {
      paidOnThisOrder += num(p.amount);
      if (g.paymentBreakdown[p.method] !== undefined) {
        g.paymentBreakdown[p.method] += num(p.amount);
      }

      // "Online cash" is cash collected against a platform delivery order.
      // Derived from the order rather than stored as its own payment method,
      // because it IS ordinary cash — it just arrives via a rider, and the
      // till reconciliation needs to tell the two apart.
      if (p.method === "CASH" && order.onlinePlatformId) {
        g.onlineCash += num(p.amount);
      }
    }

    // Billed, not collected. Only counted once an invoice exists — an open
    // table with food on it isn't "not paid", it's still being eaten. Orders
    // with a due payment are excluded so the same rupees don't appear in
    // both this column and the due column.
    if (order.invoice && !order.duePayment) {
      const shortfall = num(order.grandTotal) - paidOnThisOrder;
      if (shortfall > 0) g.notPaid += shortfall;
    }
  }

  // Due-payment totals per group — DuePayment links to Order, not
  // directly to counter/waiter, so it's joined through the order here
  // rather than queried standalone.
  const duePayments = await prisma.duePayment.findMany({
    where: { outletId: filters.outletId, createdAt: { gte: filters.start, lte: filters.end } },
    include: {
      order: { include: { counter: { select: { id: true, name: true } }, waiter: { select: { id: true, fullName: true } } } },
    },
  });
  for (const dp of duePayments) {
    if (!dp.order) continue;
    const key = groupKeyFn(dp.order) ?? "unassigned";
    if (groups.has(key)) {
      groups.get(key).duePayment += num(dp.originalAmount) - num(dp.amountPaid);
    }
  }

  return Array.from(groups.values())
    .map(roundGroup)
    .sort((a, b) => b.totalSales - a.totalSales);
}

async function getCounterSummary(filters) {
  // Every till the outlet has configured, so the report is a complete
  // picture of the counters rather than only the ones that rang something
  // up. Deactivated counters are left out — they'd only show as permanent
  // zero rows.
  const counters = await prisma.billingCounter.findMany({
    where: { outletId: filters.outletId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return buildBillingSummary(
    filters,
    (order) => order.counterId,
    (order) => order.counter?.name || "Unassigned",
    counters.map((c) => ({ key: c.id, label: c.name })),
  );
}

async function getAssigneeWiseSummary(filters) {
  return buildBillingSummary(
    filters,
    (order) => order.waiterId,
    (order) => order.waiter?.fullName || "Unassigned",
  );
}

// Settlement Summary — a period-level view of what's actually been
// collected (by method) versus what's still outstanding as due payments,
// for reconciling against a bank deposit / end-of-day cash count. Unlike
// Counter/Assignee summaries, this is intentionally NOT grouped by
// counter or person — it's the single-row "how much money is where"
// answer for the whole outlet over the selected period.
async function getSettlementSummary(filters) {
  const paymentWhere = { status: "PAID", order: buildOrderWhere(filters) };

  const [paymentTotals, duePaymentAgg] = await Promise.all([
    prisma.payment.groupBy({
      by: ["method"],
      where: paymentWhere,
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.duePayment.aggregate({
      where: { outletId: filters.outletId, createdAt: { gte: filters.start, lte: filters.end } },
      _sum: { originalAmount: true, amountPaid: true },
    }),
  ]);

  const byMethod = Object.fromEntries(PAYMENT_METHODS_FOR_SUMMARY.map((m) => [m, { amount: 0, count: 0 }]));
  for (const row of paymentTotals) {
    if (byMethod[row.method]) {
      byMethod[row.method] = { amount: num(row._sum.amount), count: row._count.id };
    }
  }

  const totalCollected = Object.values(byMethod).reduce((s, m) => s + m.amount, 0);
  const totalDueOriginal = num(duePaymentAgg._sum.originalAmount);
  const totalDuePaid = num(duePaymentAgg._sum.amountPaid);
  const totalOutstanding = Math.round((totalDueOriginal - totalDuePaid) * 100) / 100;

  return {
    period: { start: filters.start, end: filters.end },
    byMethod,
    totalCollected: Math.round(totalCollected * 100) / 100,
    totalOutstandingDue: totalOutstanding,
    grandTotal: Math.round((totalCollected + totalOutstanding) * 100) / 100,
  };
}

async function getExportData(reportType, filters) {
  switch (reportType) {
    case "transactions": {
      const { rows } = await getRecentTransactions({
        ...filters,
        page: 1,
        pageSize: filters.limit || 1000,
      });
      return rows;
    }
    case "top-selling":
      return getTopSellingItems({ ...filters, limit: filters.limit || 200 });
    case "category-performance":
      return getCategoryPerformance(filters);
    case "payment-distribution":
      return getPaymentDistribution(filters);
    case "expense-breakdown":
      return getExpenseBreakdown(filters);
    case "employee-performance":
      return getEmployeePerformance({
        ...filters,
        limit: filters.limit || 200,
      });
    case "inventory-alerts":
      return getInventoryAlerts(filters.limit || 200, filters.outletId);
    case "sales-trend":
      return getSalesTrend(filters);
    case "order-type-breakdown":
      return getOrderTypeBreakdown(filters);
    case "customer-analytics": {
      const analytics = await getCustomerAnalytics(filters);
      return [analytics];
    }
    case "counter-summary":
      return getCounterSummary(filters);
    case "assignee-wise-summary":
      return getAssigneeWiseSummary(filters);
    case "settlement-summary": {
      const summary = await getSettlementSummary(filters);
      return [summary];
    }
    default:
      throw new Error(`Unknown report type for export: ${reportType}`);
  }
}

function toCSV(rows) {
  if (!rows || !rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    if (val === null || val === undefined) return "";
    const str = val instanceof Date ? val.toISOString() : String(val);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const lines = [headers.join(",")];
  for (const row of rows)
    lines.push(headers.map((h) => escape(row[h])).join(","));
  return lines.join("\n");
}

async function toExcelBuffer(rows, sheetName = "Report") {
  let ExcelJS;
  try {
    ExcelJS = require("exceljs");
  } catch (e) {
    const err = new Error(
      "Excel export requires the 'exceljs' package. Run `npm install exceljs`.",
    );
    err.statusCode = 501;
    throw err;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31) || "Report");

  if (rows && rows.length) {
    sheet.columns = Object.keys(rows[0]).map((key) => ({
      header: key.charAt(0).toUpperCase() + key.slice(1),
      key,
      width: 22,
    }));
    sheet.addRows(rows);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8F5E9" },
    };
  }

  return workbook.xlsx.writeBuffer();
}

export default {
  prisma,
  parseFilters,
  getDateRange,
  getSalesSummary,
  getSalesTrend,
  getOrderTypeBreakdown,
  getCategoryPerformance,
  getPaymentDistribution,
  getTopSellingItems,
  getExpenseBreakdown,
  getEmployeePerformance,
  getCustomerAnalytics,
  getInventoryAlerts,
  getKitchenPerformance,
  getRecentTransactions,
  getInventoryValue,
  getRefundsAndDiscounts,
  getDashboard,
  getCounterSummary,
  getAssigneeWiseSummary,
  getSettlementSummary,
  getExportData,
  toCSV,
  toExcelBuffer,
};