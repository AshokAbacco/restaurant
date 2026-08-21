// ==============================================
// server/src/profitLoss/profitLoss.service.js
// ==============================================
// All Prisma access + business logic for the Profit & Loss module.
// Controllers stay thin; every exported function here is safe to unit-test
// in isolation.
//
// -------------------------------------------------------------------------
// DOCUMENTED ASSUMPTIONS (please read before relying on exact figures)
// -------------------------------------------------------------------------
// 1. Revenue = sum(Order.grandTotal) for COMPLETED orders only. CANCELLED and
//    REFUNDED orders are excluded from revenue entirely — that's how refunds
//    get "deducted from revenue" per the spec, rather than being subtracted
//    a second time.
// 2. COGS / Food Cost = sum(OrderItem.quantity * MenuItem.costPrice) for
//    items on COMPLETED orders. costPrice is a manually-maintained per-item
//    "food cost", not a live FIFO/ingredient valuation. This is simpler and
//    matches the "Chicken Biryani: Selling ₹300, Ingredient Cost ₹120"
//    style example in the spec. A true recipe-cost engine (summing
//    RecipeIngredient x Ingredient.averageCost) can replace this later
//    without changing any endpoint shapes.
// 3. Operating expenses = Expense.totalPaid (status not DRAFT/REJECTED)
//    + SalaryExpense.netSalary (by salaryMonth) + UtilityBill.amount
//    (by billingPeriodStart). These three tables don't overlap in schema.
// 4. Tax: "GST Collected" = sum(Order.gstAmount) on completed orders.
//    "GST Paid" = input tax embedded in PurchaseEntry (purchasePrice *
//    quantityReceived, less discount, times gstPercent). Tax Liability =
//    Collected - Paid. This is a simplification of real GST accounting
//    (which also involves reverse charge, ITC eligibility rules, etc.) —
//    good enough for a dashboard-level liability estimate.
// 5. Refunds: schema has no dedicated Refund model — REFUNDED is an
//    OrderStatus. Refund "reason" falls back to Order.notes since there's
//    no structured reason field; most rows will show "Not specified" until
//    that's captured elsewhere.
// 6. Shift: the spec asks for a "Shift" filter, but nothing in schema.prisma
//    links an Order (or Expense) to a POS shift/register-close record.
//    The `shift` query param is accepted but currently a no-op — wire it up
//    once a Shift-closing model exists. Employee filter works today via
//    Order.waiterId.
// 7. Opening/Closing inventory valuation: schema doesn't keep a historical
//    cost snapshot per StockMovement, only a *current* InventoryStock
//    .averageCost. Opening/closing quantities are reconstructed from the
//    StockMovement ledger (nearest movement before the boundary date) but
//    valued at *today's* averageCost — flagged as approximate in the
//    response so it isn't mistaken for a precise accounting figure.

import { PrismaClient } from "@prisma/client";
import {
  parseDateRange,
  previousPeriod,
  toNumber,
  round2,
  percent,
} from "./profitLoss.utils.js";

const prisma = new PrismaClient();

const COMPLETED = "COMPLETED";
const REFUNDED = "REFUNDED";
const EXCLUDED_EXPENSE_STATUSES = ["DRAFT", "REJECTED"];
const ALLOWED_GROUP_BY = ["day", "week", "month"];
const DEFAULT_FOOD_COST_THRESHOLD_PCT = 30;

// ------------------------------------------------------------------
// Shared where-clause builders
// ------------------------------------------------------------------

const orderWhere = ({
  fromDate,
  toDate,
  outletId,
  employeeId,
  status = COMPLETED,
}) => ({
  status,
  createdAt: { gte: fromDate, lte: toDate },
  outletId,
  ...(employeeId ? { waiterId: employeeId } : {}),
});

// ------------------------------------------------------------------
// 1. REVENUE
// ------------------------------------------------------------------

export const getRevenueSummary = async ({
  fromDate,
  toDate,
  outletId,
  employeeId,
}) => {
  const where = orderWhere({ fromDate, toDate, outletId, employeeId });

  const [totals, byType] = await Promise.all([
    prisma.order.aggregate({
      where,
      _sum: {
        subtotal: true,
        discountAmount: true,
        gstAmount: true,
        serviceChargeAmount: true,
        grandTotal: true,
      },
      _count: true,
    }),
    prisma.order.groupBy({
      by: ["orderType"],
      where,
      _sum: { grandTotal: true },
      _count: true,
    }),
  ]);

  return {
    grossSales: round2(toNumber(totals._sum.subtotal)),
    discounts: round2(toNumber(totals._sum.discountAmount)),
    tax: round2(toNumber(totals._sum.gstAmount)),
    serviceCharge: round2(toNumber(totals._sum.serviceChargeAmount)),
    netRevenue: round2(toNumber(totals._sum.grandTotal)),
    orderCount: totals._count,
    byOrderType: byType.map((row) => ({
      orderType: row.orderType, // DINE_IN / TAKEAWAY / DELIVERY
      revenue: round2(toNumber(row._sum.grandTotal)),
      orderCount: row._count,
    })),
  };
};

export const getRevenue = async ({ from, to, period, outletId, employeeId }) => {
  const range = parseDateRange({ from, to, period });
  const summary = await getRevenueSummary({ ...range, outletId, employeeId });
  return { period: range, ...summary };
};

// ------------------------------------------------------------------
// 2. COST OF GOODS SOLD / FOOD COST
// ------------------------------------------------------------------

const getCogsInternal = async ({
  fromDate,
  toDate,
  outletId,
  employeeId,
  categoryId,
  menuItemId,
}) => {
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: orderWhere({ fromDate, toDate, outletId, employeeId }),
      ...(menuItemId ? { menuItemId } : {}),
      ...(categoryId ? { menuItem: { categoryId } } : {}),
    },
    select: {
      quantity: true,
      totalPrice: true,
      menuItem: {
        select: { id: true, name: true, categoryId: true, costPrice: true },
      },
    },
  });

  let totalCogs = 0;
  let totalRevenue = 0;
  let itemsMissingCost = 0;
  const byItem = new Map();

  for (const oi of orderItems) {
    const cost = oi.menuItem.costPrice ? toNumber(oi.menuItem.costPrice) : 0;
    if (!oi.menuItem.costPrice) itemsMissingCost += 1;

    const lineCogs = cost * oi.quantity;
    const lineRevenue = toNumber(oi.totalPrice);
    totalCogs += lineCogs;
    totalRevenue += lineRevenue;

    const existing = byItem.get(oi.menuItem.id) || {
      menuItemId: oi.menuItem.id,
      name: oi.menuItem.name,
      quantitySold: 0,
      revenue: 0,
      cogs: 0,
    };
    existing.quantitySold += oi.quantity;
    existing.revenue += lineRevenue;
    existing.cogs += lineCogs;
    byItem.set(oi.menuItem.id, existing);
  }

  return {
    totalCogs: round2(totalCogs),
    totalRevenue: round2(totalRevenue),
    itemsMissingCostPrice: itemsMissingCost,
    byMenuItem: Array.from(byItem.values())
      .map((row) => ({
        ...row,
        revenue: round2(row.revenue),
        cogs: round2(row.cogs),
      }))
      .sort((a, b) => b.cogs - a.cogs),
  };
};

export const getCogs = async ({
  from,
  to,
  period,
  outletId,
  employeeId,
  categoryId,
  menuItemId,
}) => {
  const range = parseDateRange({ from, to, period });
  const cogs = await getCogsInternal({
    ...range,
    outletId,
    employeeId,
    categoryId,
    menuItemId,
  });
  return { period: range, ...cogs };
};

// Food Cost % = Ingredient Cost / Sales * 100, overall + per category, with
// a configurable alert threshold (spec: "Alert if food cost exceeds
// configured thresholds").
export const getFoodCost = async ({
  from,
  to,
  period,
  outletId,
  employeeId,
  thresholdPct = DEFAULT_FOOD_COST_THRESHOLD_PCT,
}) => {
  const range = parseDateRange({ from, to, period });
  const [cogs, categories] = await Promise.all([
    getCogsInternal({ ...range, outletId, employeeId }),
    getCategoryProfitInternal({ ...range, outletId, employeeId }),
  ]);

  const overallPct = percent(cogs.totalCogs, cogs.totalRevenue);

  return {
    period: range,
    foodCostPct: overallPct,
    thresholdPct,
    overThreshold: overallPct > thresholdPct,
    totalRevenue: cogs.totalRevenue,
    totalCogs: cogs.totalCogs,
    byCategory: categories.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      foodCostPct: percent(c.cost, c.revenue),
    })),
  };
};

// ------------------------------------------------------------------
// 3. CATEGORY-WISE & ITEM-WISE PROFIT
// ------------------------------------------------------------------

const getCategoryProfitInternal = async ({
  fromDate,
  toDate,
  outletId,
  employeeId,
}) => {
  const orderItems = await prisma.orderItem.findMany({
    where: { order: orderWhere({ fromDate, toDate, outletId, employeeId }) },
    select: {
      quantity: true,
      totalPrice: true,
      menuItem: {
        select: {
          costPrice: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
  });

  const byCategory = new Map();

  for (const oi of orderItems) {
    const categoryId = oi.menuItem.category?.id || "uncategorized";
    const categoryName = oi.menuItem.category?.name || "Uncategorized";
    const revenue = toNumber(oi.totalPrice);
    const cost =
      (oi.menuItem.costPrice ? toNumber(oi.menuItem.costPrice) : 0) *
      oi.quantity;

    const existing = byCategory.get(categoryId) || {
      categoryId,
      categoryName,
      revenue: 0,
      cost: 0,
    };
    existing.revenue += revenue;
    existing.cost += cost;
    byCategory.set(categoryId, existing);
  }

  return Array.from(byCategory.values())
    .map((row) => ({
      ...row,
      revenue: round2(row.revenue),
      cost: round2(row.cost),
      profit: round2(row.revenue - row.cost),
      profitMarginPct: percent(row.revenue - row.cost, row.revenue),
    }))
    .sort((a, b) => b.profit - a.profit);
};

export const getCategoryProfit = async ({
  from,
  to,
  period,
  outletId,
  employeeId,
}) => {
  const range = parseDateRange({ from, to, period });
  const rows = await getCategoryProfitInternal({ ...range, outletId, employeeId });
  return { period: range, categories: rows };
};

export const getItemProfit = async ({
  from,
  to,
  period,
  outletId,
  employeeId,
  categoryId,
}) => {
  const range = parseDateRange({ from, to, period });
  const cogs = await getCogsInternal({
    ...range,
    outletId,
    employeeId,
    categoryId,
  });

  const items = cogs.byMenuItem.map((row) => ({
    menuItemId: row.menuItemId,
    name: row.name,
    quantitySold: row.quantitySold,
    revenue: row.revenue,
    cost: row.cogs,
    profit: round2(row.revenue - row.cogs),
    profitMarginPct: percent(row.revenue - row.cogs, row.revenue),
  }));

  return {
    period: range,
    items: items.sort((a, b) => b.profit - a.profit),
  };
};

// ------------------------------------------------------------------
// 4. OPERATING EXPENSES
// ------------------------------------------------------------------

const getExpensesInternal = async ({ fromDate, toDate, outletId }) => {
  const expenseWhere = {
    expenseDate: { gte: fromDate, lte: toDate },
    status: { notIn: EXCLUDED_EXPENSE_STATUSES },
    outletId,
  };

  const [expenseTotals, expensesByCategory, salaries, utilities] =
    await Promise.all([
      prisma.expense.aggregate({
        where: expenseWhere,
        _sum: { totalPaid: true },
        _count: true,
      }),
      prisma.expense.groupBy({
        by: ["categoryId"],
        where: expenseWhere,
        _sum: { totalPaid: true },
      }),
      prisma.salaryExpense.aggregate({
        where: {
          salaryMonth: { gte: fromDate, lte: toDate },
          outletId,
        },
        _sum: { netSalary: true },
        _count: true,
      }),
      prisma.utilityBill.aggregate({
        where: {
          billingPeriodStart: { gte: fromDate, lte: toDate },
          outletId,
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

  const categoryIds = expensesByCategory.map((c) => c.categoryId);
  const categories = categoryIds.length
    ? await prisma.expenseCategory.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    : [];
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const generalExpenses = round2(toNumber(expenseTotals._sum.totalPaid));
  const salaryExpenses = round2(toNumber(salaries._sum.netSalary));
  const utilityExpenses = round2(toNumber(utilities._sum.amount));

  return {
    total: round2(generalExpenses + salaryExpenses + utilityExpenses),
    generalExpenses,
    salaryExpenses,
    utilityExpenses,
    counts: {
      expenses: expenseTotals._count,
      salaries: salaries._count,
      utilities: utilities._count,
    },
    byCategory: [
      ...expensesByCategory.map((row) => ({
        categoryName: categoryNameById.get(row.categoryId) || "Uncategorized",
        amount: round2(toNumber(row._sum.totalPaid)),
      })),
      ...(salaryExpenses > 0
        ? [{ categoryName: "Staff Salary", amount: salaryExpenses }]
        : []),
      ...(utilityExpenses > 0
        ? [{ categoryName: "Utilities", amount: utilityExpenses }]
        : []),
    ].sort((a, b) => b.amount - a.amount),
  };
};

export const getExpenses = async ({ from, to, period, outletId }) => {
  const range = parseDateRange({ from, to, period });
  const expenses = await getExpensesInternal({ ...range, outletId });
  return { period: range, ...expenses };
};

// ------------------------------------------------------------------
// 5. DISCOUNT IMPACT
// ------------------------------------------------------------------

export const getDiscounts = async ({ from, to, period, outletId }) => {
  const { fromDate, toDate } = parseDateRange({ from, to, period });

  const orderDiscounts = await prisma.orderDiscount.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
      order: { outletId },
    },
    select: {
      type: true,
      amountDeducted: true,
      discount: { select: { code: true } },
    },
  });

  const byType = new Map();
  let couponCount = 0;
  let total = 0;

  for (const row of orderDiscounts) {
    const amount = toNumber(row.amountDeducted);
    total += amount;
    if (row.discount?.code) couponCount += 1;

    const existing = byType.get(row.type) || {
      type: row.type,
      amount: 0,
      count: 0,
    };
    existing.amount += amount;
    existing.count += 1;
    byType.set(row.type, existing);
  }

  return {
    period: { fromDate, toDate },
    totalDiscounts: round2(total),
    couponsUsed: couponCount,
    revenueLost: round2(total),
    byType: Array.from(byType.values())
      .map((row) => ({ ...row, amount: round2(row.amount) }))
      .sort((a, b) => b.amount - a.amount),
  };
};

// ------------------------------------------------------------------
// 6. REFUND ANALYSIS
// ------------------------------------------------------------------

export const getRefunds = async ({ from, to, period, outletId }) => {
  const { fromDate, toDate } = parseDateRange({ from, to, period });

  const refundedOrders = await prisma.order.findMany({
    where: {
      status: REFUNDED,
      updatedAt: { gte: fromDate, lte: toDate },
      outletId,
    },
    select: { grandTotal: true, notes: true },
  });

  const byReason = new Map();
  let total = 0;

  for (const order of refundedOrders) {
    const amount = toNumber(order.grandTotal);
    total += amount;

    const reason = order.notes?.trim() || "Not specified";
    const existing = byReason.get(reason) || { reason, amount: 0, count: 0 };
    existing.amount += amount;
    existing.count += 1;
    byReason.set(reason, existing);
  }

  return {
    period: { fromDate, toDate },
    refundAmount: round2(total),
    refundCount: refundedOrders.length,
    byReason: Array.from(byReason.values())
      .map((row) => ({ ...row, amount: round2(row.amount) }))
      .sort((a, b) => b.amount - a.amount),
    note: "Refund reason is read from Order.notes — schema has no dedicated reason field yet.",
  };
};

// ------------------------------------------------------------------
// 7. TAX ANALYSIS
// ------------------------------------------------------------------

export const getTax = async ({ from, to, period, outletId }) => {
  const { fromDate, toDate } = parseDateRange({ from, to, period });

  const [collectedAgg, purchaseEntries] = await Promise.all([
    prisma.order.aggregate({
      where: orderWhere({ fromDate, toDate, outletId }),
      _sum: { gstAmount: true },
    }),
    prisma.purchaseEntry.findMany({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        outletId,
      },
      select: {
        quantityReceived: true,
        purchasePrice: true,
        gstPercent: true,
        discount: true,
      },
    }),
  ]);

  const gstCollected = round2(toNumber(collectedAgg._sum.gstAmount));

  let gstPaid = 0;
  for (const entry of purchaseEntries) {
    const base =
      toNumber(entry.quantityReceived) * toNumber(entry.purchasePrice) -
      toNumber(entry.discount);
    gstPaid += Math.max(base, 0) * (toNumber(entry.gstPercent) / 100);
  }
  gstPaid = round2(gstPaid);

  return {
    period: { fromDate, toDate },
    gstCollected,
    gstPaid,
    taxLiability: round2(gstCollected - gstPaid),
  };
};

// ------------------------------------------------------------------
// 8. PAYMENT-WISE REVENUE
// ------------------------------------------------------------------

export const getPaymentRevenue = async ({ from, to, period, outletId }) => {
  const { fromDate, toDate } = parseDateRange({ from, to, period });

  const rows = await prisma.payment.groupBy({
    by: ["method"],
    where: {
      status: "PAID",
      paidAt: { gte: fromDate, lte: toDate },
      order: { outletId },
    },
    _sum: { amount: true },
    _count: true,
  });

  const byMethod = rows
    .map((row) => ({
      method: row.method,
      amount: round2(toNumber(row._sum.amount)),
      count: row._count,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    period: { fromDate, toDate },
    total: round2(byMethod.reduce((sum, r) => sum + r.amount, 0)),
    byMethod,
  };
};

// ------------------------------------------------------------------
// 9. INVENTORY COST ANALYSIS + WASTAGE
// ------------------------------------------------------------------

// Reconstructs an approximate stock quantity at a boundary date using the
// last StockMovement at/before that date, then values it at *current*
// Ingredient average cost (schema doesn't retain historical unit cost).
const approximateStockValueAt = async (boundaryDate, outletId) => {
  const latestPerIngredient = await prisma.stockMovement.findMany({
    where: { createdAt: { lte: boundaryDate }, outletId, },
    orderBy: { createdAt: "desc" },
    distinct: ["ingredientId"],
    select: { ingredientId: true, newStock: true },
  });

  if (latestPerIngredient.length === 0) return 0;

  const stocks = await prisma.inventoryStock.findMany({
    where: {
      ingredientId: { in: latestPerIngredient.map((r) => r.ingredientId) },
    },
    select: { ingredientId: true, averageCost: true },
  });
  const costById = new Map(
    stocks.map((s) => [s.ingredientId, toNumber(s.averageCost)]),
  );

  return latestPerIngredient.reduce(
    (sum, row) =>
      sum + toNumber(row.newStock) * (costById.get(row.ingredientId) || 0),
    0,
  );
};

export const getInventoryCost = async ({ from, to, period, outletId }) => {
  const { fromDate, toDate } = parseDateRange({ from, to, period });

  const [openingValue, closingValue, purchasesAgg, wastageAgg] =
    await Promise.all([
      approximateStockValueAt(new Date(fromDate.getTime() - 1), outletId),
      approximateStockValueAt(toDate, outletId),
      prisma.purchaseEntry.aggregate({
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          outletId,
        },
        _sum: { totalAmount: true },
      }),
      prisma.wastage.aggregate({
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          outletId,
        },
        _sum: { cost: true },
      }),
    ]);

  const purchases = round2(toNumber(purchasesAgg._sum.totalAmount));
  const wastageCost = round2(toNumber(wastageAgg._sum.cost));

  return {
    period: { fromDate, toDate },
    openingStockValue: round2(openingValue),
    purchases,
    closingStockValue: round2(closingValue),
    wastageCost,
    impliedCogs: round2(openingValue + purchases - closingValue),
    approximate: true,
    note:
      "Opening/closing values are reconstructed from the stock-movement ledger and priced at " +
      "current average cost — treat as an estimate, not a precise historical valuation.",
  };
};

export const getWastage = async ({ from, to, period, outletId }) => {
  const { fromDate, toDate } = parseDateRange({ from, to, period });

  const rows = await prisma.wastage.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
      outletId,
    },
    select: {
      quantity: true,
      cost: true,
      reason: true,
      ingredient: { select: { name: true } },
    },
  });

  const byIngredient = new Map();
  let totalCost = 0;

  for (const row of rows) {
    const cost = toNumber(row.cost);
    totalCost += cost;

    const existing = byIngredient.get(row.ingredient.name) || {
      ingredient: row.ingredient.name,
      quantity: 0,
      cost: 0,
    };
    existing.quantity += toNumber(row.quantity);
    existing.cost += cost;
    byIngredient.set(row.ingredient.name, existing);
  }

  return {
    period: { fromDate, toDate },
    totalCost: round2(totalCost),
    incidentCount: rows.length,
    byIngredient: Array.from(byIngredient.values())
      .map((row) => ({
        ...row,
        quantity: round2(row.quantity),
        cost: round2(row.cost),
      }))
      .sort((a, b) => b.cost - a.cost),
  };
};

// ------------------------------------------------------------------
// 10. DASHBOARD (today, at a glance)
// ------------------------------------------------------------------

export const getDashboard = async ({ outletId }) => {
  const range = parseDateRange({ period: "today" });
  const [revenue, cogs, expenses] = await Promise.all([
    getRevenueSummary({ ...range, outletId }),
    getCogsInternal({ ...range, outletId }),
    getExpensesInternal({ ...range, outletId }),
  ]);

  const grossProfit = round2(revenue.netRevenue - cogs.totalCogs);
  const netProfit = round2(grossProfit - expenses.total);

  return {
    period: range,
    todaysRevenue: revenue.netRevenue,
    todaysExpense: expenses.total,
    grossProfit,
    netProfit,
    grossMarginPct: percent(grossProfit, revenue.netRevenue),
    netMarginPct: percent(netProfit, revenue.netRevenue),
    orderCount: revenue.orderCount,
  };
};

// ------------------------------------------------------------------
// 11. FULL P&L SUMMARY (used by daily/weekly/monthly/annual reports)
// ------------------------------------------------------------------

export const getProfitLossSummary = async ({
  from,
  to,
  period,
  outletId,
  employeeId,
  includeCapex = false,
}) => {
  const range = parseDateRange({ from, to, period });
  const params = { ...range, outletId, employeeId };

  const [revenue, cogs, operatingExpenses, wastage, tax] = await Promise.all([
    getRevenueSummary(params),
    getCogsInternal(params),
    getExpensesInternal(params),
    getWastage({
      from: undefined,
      to: undefined,
      period: undefined,
      outletId,
      ...range,
    }),
    getTax({
      from: undefined,
      to: undefined,
      period: undefined,
      outletId,
      ...range,
    }),
  ]);

  const capexAgg = includeCapex
    ? await prisma.assetPurchase.aggregate({
        where: {
          purchaseDate: { gte: range.fromDate, lte: range.toDate },
          outletId,
        },
        _sum: { cost: true },
      })
    : null;
  const capex = includeCapex ? round2(toNumber(capexAgg._sum.cost)) : 0;

  const grossProfit = round2(revenue.netRevenue - cogs.totalCogs);
  const totalDeductions = round2(
    operatingExpenses.total + wastage.totalCost + tax.taxLiability + capex,
  );
  const netProfit = round2(grossProfit - totalDeductions);

  return {
    period: range,
    // CHANGED: this used to be a "store" label falling back to "All
    // Stores" for the no-filter case — that fallback doesn't apply anymore
    // since outletId is always required (never optional) now. Just echo
    // the actual outlet id back; the caller already knows its own name.
    outletId,
    revenue,
    cogs,
    grossProfit,
    grossMarginPct: percent(grossProfit, revenue.netRevenue),
    operatingExpenses,
    wastage,
    tax,
    capex: { amount: capex, includedInNetProfit: includeCapex },
    netProfit,
    netMarginPct: percent(netProfit, revenue.netRevenue),
  };
};

// ------------------------------------------------------------------
// 12. CHARTS
// ------------------------------------------------------------------

const getTrendSeries = async ({ fromDate, toDate, outletId, groupBy }) => {
  const [revenueRows, cogsRows, expenseRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT date_trunc(${groupBy}, "createdAt") AS period,
             COALESCE(SUM("grandTotal"), 0)::float AS revenue,
             COUNT(*)::int AS "orderCount"
      FROM orders
      WHERE status = 'COMPLETED'
        AND "createdAt" BETWEEN ${fromDate} AND ${toDate}
        AND "outletId" = ${outletId}
      GROUP BY period ORDER BY period
    `,
    prisma.$queryRaw`
      SELECT date_trunc(${groupBy}, o."createdAt") AS period,
             COALESCE(SUM(oi.quantity * COALESCE(mi."costPrice", 0)), 0)::float AS cogs
      FROM order_items oi
      JOIN orders o ON o.id = oi."orderId"
      JOIN menu_items mi ON mi.id = oi."menuItemId"
      WHERE o.status = 'COMPLETED'
        AND o."createdAt" BETWEEN ${fromDate} AND ${toDate}
        AND o."outletId" = ${outletId}
      GROUP BY period ORDER BY period
    `,
    prisma.$queryRaw`
      SELECT date_trunc(${groupBy}, "expenseDate") AS period,
             COALESCE(SUM("totalPaid"), 0)::float AS expenses
      FROM expenses
      WHERE status NOT IN ('DRAFT', 'REJECTED')
        AND "expenseDate" BETWEEN ${fromDate} AND ${toDate}
        AND "outletId" = ${outletId}
      GROUP BY period ORDER BY period
    `,
  ]);

  const byPeriod = new Map();
  const key = (d) => new Date(d).toISOString();

  for (const row of revenueRows) {
    byPeriod.set(key(row.period), {
      period: row.period,
      revenue: row.revenue,
      orderCount: row.orderCount,
      cogs: 0,
      expenses: 0,
    });
  }
  for (const row of cogsRows) {
    const k = key(row.period);
    const existing = byPeriod.get(k) || {
      period: row.period,
      revenue: 0,
      orderCount: 0,
      cogs: 0,
      expenses: 0,
    };
    existing.cogs = row.cogs;
    byPeriod.set(k, existing);
  }
  for (const row of expenseRows) {
    const k = key(row.period);
    const existing = byPeriod.get(k) || {
      period: row.period,
      revenue: 0,
      orderCount: 0,
      cogs: 0,
      expenses: 0,
    };
    existing.expenses = row.expenses;
    byPeriod.set(k, existing);
  }

  return Array.from(byPeriod.values())
    .sort((a, b) => new Date(a.period) - new Date(b.period))
    .map((row) => ({
      period: row.period,
      revenue: round2(row.revenue),
      cogs: round2(row.cogs),
      grossProfit: round2(row.revenue - row.cogs),
      expenses: round2(row.expenses),
      netProfit: round2(row.revenue - row.cogs - row.expenses),
      orderCount: row.orderCount,
    }));
};

const CHART_TYPES = [
  "daily-revenue-trend",
  "monthly-profit-trend",
  "expense-breakdown",
  "category-revenue",
  "food-cost-percent",
  "gross-profit-trend",
  "net-profit-trend",
];

export const getCharts = async ({ type, from, to, period, outletId, groupBy }) => {
  if (!CHART_TYPES.includes(type)) {
    const err = new Error(`type must be one of: ${CHART_TYPES.join(", ")}`);
    err.status = 400;
    err.expose = true;
    throw err;
  }

  const range = parseDateRange({ from, to, period });

  if (type === "expense-breakdown") {
    const expenses = await getExpensesInternal({ ...range, outletId });
    return { type, data: expenses.byCategory };
  }

  if (type === "category-revenue") {
    const rows = await getCategoryProfitInternal({ ...range, outletId });
    return {
      type,
      data: rows.map((r) => ({
        categoryName: r.categoryName,
        revenue: r.revenue,
      })),
    };
  }

  // everything else is a time-series over day/week/month
  const resolvedGroupBy =
    groupBy || (type === "monthly-profit-trend" ? "month" : "day");
  if (!ALLOWED_GROUP_BY.includes(resolvedGroupBy)) {
    const err = new Error(
      `groupBy must be one of: ${ALLOWED_GROUP_BY.join(", ")}`,
    );
    err.status = 400;
    err.expose = true;
    throw err;
  }

  const series = await getTrendSeries({
    ...range,
    outletId,
    groupBy: resolvedGroupBy,
  });

  if (type === "food-cost-percent") {
    return {
      type,
      data: series.map((row) => ({
        period: row.period,
        foodCostPct: percent(row.cogs, row.revenue),
      })),
    };
  }

  const fieldByType = {
    "daily-revenue-trend": "revenue",
    "monthly-profit-trend": "netProfit",
    "gross-profit-trend": "grossProfit",
    "net-profit-trend": "netProfit",
  };
  const field = fieldByType[type];

  return {
    type,
    data: series.map((row) => ({ period: row.period, [field]: row[field] })),
  };
};

// ------------------------------------------------------------------
// 13. REPORTS (row builders — controller decides json/csv/excel/pdf)
// ------------------------------------------------------------------

export const REPORT_TYPES = [
  "daily",
  "weekly",
  "monthly",
  "annual",
  "food-cost",
  "category-profit",
  "item-profit",
  "expense",
  "revenue",
  "wastage-cost",
];

export const buildReport = async ({ type, from, to, period, outletId }) => {
  if (!REPORT_TYPES.includes(type)) {
    const err = new Error(`type must be one of: ${REPORT_TYPES.join(", ")}`);
    err.status = 400;
    err.expose = true;
    throw err;
  }

  if (["daily", "weekly", "monthly", "annual"].includes(type)) {
    const presetPeriod =
      period ||
      { daily: "today", weekly: "week", monthly: "month", annual: "year" }[
        type
      ];
    const summary = await getProfitLossSummary({
      from,
      to,
      period: from || to ? undefined : presetPeriod,
      outletId,
    });

    const rows = [
      { metric: "Net Revenue", value: summary.revenue.netRevenue },
      { metric: "COGS", value: summary.cogs.totalCogs },
      { metric: "Gross Profit", value: summary.grossProfit },
      { metric: "Gross Margin %", value: summary.grossMarginPct },
      { metric: "Operating Expenses", value: summary.operatingExpenses.total },
      { metric: "Wastage Cost", value: summary.wastage.totalCost },
      { metric: "Tax Liability", value: summary.tax.taxLiability },
      { metric: "Net Profit", value: summary.netProfit },
      { metric: "Net Margin %", value: summary.netMarginPct },
    ];

    return {
      title: `${type[0].toUpperCase()}${type.slice(1)} P&L Report`,
      rows,
      raw: summary,
    };
  }

  if (type === "food-cost") {
    const data = await getFoodCost({ from, to, period, outletId });
    return {
      title: "Food Cost Report",
      rows: [
        { metric: "Total Revenue", value: data.totalRevenue },
        { metric: "Total COGS", value: data.totalCogs },
        { metric: "Food Cost %", value: data.foodCostPct },
        { metric: "Threshold %", value: data.thresholdPct },
        { metric: "Over Threshold", value: data.overThreshold },
      ],
      raw: data,
    };
  }

  if (type === "category-profit") {
    const data = await getCategoryProfit({ from, to, period, outletId });
    return {
      title: "Category Profit Report",
      rows: data.categories,
      raw: data,
    };
  }

  if (type === "item-profit") {
    const data = await getItemProfit({ from, to, period, outletId });
    return { title: "Item Profit Report", rows: data.items, raw: data };
  }

  if (type === "expense") {
    const data = await getExpenses({ from, to, period, outletId });
    return { title: "Expense Report", rows: data.byCategory, raw: data };
  }

  if (type === "revenue") {
    const data = await getRevenue({ from, to, period, outletId });
    return { title: "Revenue Report", rows: data.byOrderType, raw: data };
  }

  // wastage-cost
  const data = await getWastage({ from, to, period, outletId });
  return { title: "Wastage Cost Report", rows: data.byIngredient, raw: data };
};

// ------------------------------------------------------------------
// 14. AUTOMATION / ALERTS
// ------------------------------------------------------------------

export const getAlerts = async ({
  from,
  to,
  period,
  outletId,
  foodCostThresholdPct = DEFAULT_FOOD_COST_THRESHOLD_PCT,
}) => {
  const range = parseDateRange({ from, to, period });
  const prevRange = previousPeriod(range);

  const [foodCost, currentExpenses, prevExpenses, trend] = await Promise.all([
    getFoodCost({
      from,
      to,
      period,
      outletId,
      thresholdPct: foodCostThresholdPct,
    }),
    getExpensesInternal({ ...range, outletId }),
    getExpensesInternal({ ...prevRange, outletId }),
    getTrendSeries({ ...range, outletId, groupBy: "day" }),
  ]);

  const alerts = [];

  if (foodCost.overThreshold) {
    alerts.push({
      type: "FOOD_COST_HIGH",
      message: `Food cost is ${foodCost.foodCostPct}%, above the ${foodCostThresholdPct}% threshold.`,
    });
  }

  if (prevExpenses.total > 0) {
    const changePct = percent(
      currentExpenses.total - prevExpenses.total,
      prevExpenses.total,
    );
    if (changePct > 25) {
      alerts.push({
        type: "EXPENSE_SPIKE",
        message: `Operating expenses are up ${changePct}% vs. the previous equivalent period.`,
      });
    }
  }

  const recentNegative = trend.slice(-3).filter((row) => row.netProfit < 0);
  if (recentNegative.length >= 2) {
    alerts.push({
      type: "NEGATIVE_PROFIT_TREND",
      message: `Net profit was negative on ${recentNegative.length} of the last ${
        trend.slice(-3).length
      } days in range.`,
    });
  }

  return { period: range, alerts };
};

export default {
  getDashboard,
  getRevenue,
  getExpenses,
  getCogs,
  getCategoryProfit,
  getItemProfit,
  getFoodCost,
  getDiscounts,
  getRefunds,
  getTax,
  getPaymentRevenue,
  getInventoryCost,
  getWastage,
  getCharts,
  buildReport,
  getAlerts,
  getProfitLossSummary,
  REPORT_TYPES,
};