// ==============================================
// server/src/dashboard/dashboard.service.js
// All data-access logic for the dashboard. Pure functions — no req/res here,
// so these can be reused by the controller, a cron job, reports, etc.
// ==============================================

import prisma from "../lib/prisma.js";

// FIX: every function in this file previously took an optional `store`
// param defaulting to the string "Main Store" — a convenience default that
// made sense when store was just a free-text label, but not now that
// outletId is a real security boundary. There is no sensible default
// outlet to silently fall back to; every function below requires a real
// outletId, and several (getKitchenStatus, getLowStockAlerts,
// getRecentActivities) had NO scoping at all before this pass, not even
// the old broken pattern — every dashboard tile was showing every outlet's
// data mixed together.

// Orders in these statuses are excluded from revenue / sales figures.
const REVENUE_EXCLUDED_STATUS = { notIn: ["CANCELLED"] };

// ==============================================
// DATE HELPERS
// ==============================================

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ==============================================
// STAT CARDS (revenue, orders, customers, low stock, avg order)
// ==============================================

export const getTodayStats = async (outletId) => {
  const todayStart = startOfDay();
  const yesterdayStart = addDays(todayStart, -1);

  const [todayOrders, yesterdayOrders, ingredients] = await Promise.all([
    prisma.order.findMany({
      where: {
        outletId,
        createdAt: { gte: todayStart },
        status: REVENUE_EXCLUDED_STATUS,
      },
      select: { grandTotal: true, customerId: true },
    }),
    prisma.order.findMany({
      where: {
        outletId,
        createdAt: { gte: yesterdayStart, lt: todayStart },
        status: REVENUE_EXCLUDED_STATUS,
      },
      select: { grandTotal: true },
    }),
    prisma.ingredient.findMany({
      where: { outletId, isEnabled: true },
      select: {
        minimumStockLevel: true,
        inventoryStock: { select: { quantityOnHand: true } },
      },
    }),
  ]);

  const todayRevenue = todayOrders.reduce(
    (sum, o) => sum + Number(o.grandTotal),
    0,
  );
  const yesterdayRevenue = yesterdayOrders.reduce(
    (sum, o) => sum + Number(o.grandTotal),
    0,
  );

  const revenueChangePct =
    yesterdayRevenue > 0
      ? Number(
          (
            ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) *
            100
          ).toFixed(1),
        )
      : null;

  const ordersToday = todayOrders.length;
  const ordersYesterday = yesterdayOrders.length;
  const ordersChange = ordersToday - ordersYesterday;

  const uniqueCustomers = new Set(
    todayOrders.filter((o) => o.customerId).map((o) => o.customerId),
  ).size;

  const lowStockCount = ingredients.filter((ing) => {
    const onHand = ing.inventoryStock
      ? Number(ing.inventoryStock.quantityOnHand)
      : 0;
    return onHand <= Number(ing.minimumStockLevel);
  }).length;

  return {
    revenue: {
      value: todayRevenue,
      change: revenueChangePct,
      changeType:
        revenueChangePct === null || revenueChangePct >= 0 ? "up" : "down",
    },
    orders: {
      value: ordersToday,
      change: ordersChange,
      changeType: ordersChange >= 0 ? "up" : "down",
    },
    customers: { value: uniqueCustomers },
    lowStock: { value: lowStockCount },
    avgOrder: ordersToday > 0 ? Math.round(todayRevenue / ordersToday) : 0,
  };
};

// ==============================================
// SALES CHART
// ==============================================

export const getSalesChart = async (period = "daily", outletId) => {
  const now = new Date();
  let from;

  if (period === "weekly") {
    from = addDays(startOfDay(now), -7 * 4); // last ~4 weeks
  } else if (period === "monthly") {
    from = new Date(now.getFullYear(), now.getMonth() - 5, 1); // last 6 months
  } else {
    from = addDays(startOfDay(now), -6); // last 7 days
  }

  const orders = await prisma.order.findMany({
    where: { outletId, createdAt: { gte: from }, status: REVENUE_EXCLUDED_STATUS },
    select: { grandTotal: true, createdAt: true },
  });

  const keyFor = (date) => {
    if (period === "monthly") {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }
    if (period === "weekly") {
      const weekStart = addDays(startOfDay(date), -date.getDay());
      return weekStart.toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
  };

  const buckets = new Map();
  orders.forEach((o) => {
    const key = keyFor(new Date(o.createdAt));
    buckets.set(key, (buckets.get(key) || 0) + Number(o.grandTotal));
  });

  const sortedKeys = [...buckets.keys()].sort();

  return sortedKeys.map((key, idx) => {
    let name = key;

    if (period === "daily") {
      name = dayLabels[new Date(key).getDay()];
    } else if (period === "weekly") {
      name = `Week ${idx + 1}`;
    } else if (period === "monthly") {
      const [, m] = key.split("-");
      name = monthLabels[Number(m) - 1];
    }

    return { name, sales: Math.round(buckets.get(key)) };
  });
};

// ==============================================
// KITCHEN STATUS
// ==============================================

export const getKitchenStatus = async (outletId) => {
  const todayStart = startOfDay();

  const [waiting, preparing, ready, completedToday, chefCount, timedOrders] =
    await Promise.all([
      prisma.kitchenOrder.count({ where: { outletId, status: "NEW" } }),
      prisma.kitchenOrder.count({
        where: { outletId, status: { in: ["ACCEPTED", "PREPARING"] } },
      }),
      prisma.kitchenOrder.count({ where: { outletId, status: "READY" } }),
      prisma.kitchenOrder.count({
        where: { outletId, status: "COMPLETED", completedAt: { gte: todayStart } },
      }),
      prisma.employee.count({
        where: {
          outletId,
          status: "ACTIVE",
          OR: [
            { designation: { contains: "Chef", mode: "insensitive" } },
            { department: { contains: "Kitchen", mode: "insensitive" } },
          ],
        },
      }),
      prisma.kitchenOrder.findMany({
        where: {
          outletId,
          status: "COMPLETED",
          completedAt: { gte: todayStart },
          acceptedAt: { not: null },
        },
        select: { acceptedAt: true, completedAt: true },
      }),
    ]);

  let avgTime = "—";
  if (timedOrders.length) {
    const totalMinutes = timedOrders.reduce((sum, k) => {
      return sum + (new Date(k.completedAt) - new Date(k.acceptedAt)) / 60000;
    }, 0);
    avgTime = `${Math.round(totalMinutes / timedOrders.length)} min`;
  }

  return {
    waiting,
    preparing,
    ready,
    completed: completedToday,
    avgTime,
    chefs: chefCount,
  };
};

// ==============================================
// RECENT ORDERS
// ==============================================

export const getRecentOrders = async ({
  outletId,
  limit = 5,
  waiterId = null,
} = {}) => {
  const orders = await prisma.order.findMany({
    where: { outletId, ...(waiterId ? { waiterId } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      table: { select: { name: true } },
      customer: { select: { name: true } },
      items: { select: { quantity: true } },
      payments: {
        select: { status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return orders.map((o) => ({
    id: o.orderNumber,
    customer:
      o.customer?.name ||
      (o.orderType === "TAKEAWAY" ? "Walk In Customer" : "Guest"),
    table:
      o.table?.name ||
      (o.orderType === "TAKEAWAY"
        ? "Take Away"
        : o.orderType === "DELIVERY"
          ? "Delivery"
          : "-"),
    items: o.items.reduce((sum, i) => sum + i.quantity, 0),
    amount: Number(o.grandTotal),
    status: o.status,
    payment: o.payments[0]?.status || "UNPAID",
    time: o.createdAt,
  }));
};

// ==============================================
// LOW STOCK ALERTS
// ==============================================

export const getLowStockAlerts = async (outletId) => {
  const ingredients = await prisma.ingredient.findMany({
    where: { outletId, isEnabled: true },
    include: {
      category: { select: { name: true } },
      consumptionUnit: { select: { name: true, abbreviation: true } },
      inventoryStock: true,
    },
  });

  return ingredients
    .map((ing) => {
      const onHand = ing.inventoryStock
        ? Number(ing.inventoryStock.quantityOnHand)
        : 0;
      const min = Number(ing.minimumStockLevel);
      const percentage = min > 0 ? Math.round((onHand / min) * 100) : 100;
      const unitLabel =
        ing.consumptionUnit?.abbreviation || ing.consumptionUnit?.name || "";

      return {
        id: ing.id,
        name: ing.name,
        category: ing.category?.name || "—",
        available: `${onHand} ${unitLabel}`.trim(),
        minimum: `${min} ${unitLabel}`.trim(),
        percentage,
        status: percentage <= 25 ? "Critical" : "Low",
      };
    })
    .filter((ing) => ing.percentage < 50)
    .sort((a, b) => a.percentage - b.percentage);
};

// ==============================================
// PAYMENT SUMMARY
// ==============================================

export const getPaymentSummary = async (outletId) => {
  const todayStart = startOfDay();

  const payments = await prisma.payment.findMany({
    where: {
      status: "PAID",
      paidAt: { gte: todayStart },
      order: { outletId },
    },
    select: { method: true, amount: true },
  });

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const byMethod = {};
  payments.forEach((p) => {
    if (!byMethod[p.method])
      byMethod[p.method] = { amount: 0, transactions: 0 };
    byMethod[p.method].amount += Number(p.amount);
    byMethod[p.method].transactions += 1;
  });

  const methods = Object.entries(byMethod)
    .map(([name, data]) => ({
      name,
      amount: data.amount,
      transactions: data.transactions,
      percentage:
        totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalAmount,
    totalTransactions: payments.length,
    methods,
  };
};

// ==============================================
// TOP SELLING ITEMS
// ==============================================

export const getTopSellingItems = async ({ outletId, limit = 5 } = {}) => {
  const todayStart = startOfDay();

  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        outletId,
        createdAt: { gte: todayStart },
        status: REVENUE_EXCLUDED_STATUS,
      },
    },
    select: {
      quantity: true,
      totalPrice: true,
      menuItem: {
        select: { id: true, name: true, category: { select: { name: true } } },
      },
    },
  });

  const grouped = new Map();
  orderItems.forEach((item) => {
    const key = item.menuItem.id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        name: item.menuItem.name,
        category: item.menuItem.category?.name || "—",
        sold: 0,
        revenue: 0,
      });
    }
    const g = grouped.get(key);
    g.sold += item.quantity;
    g.revenue += Number(item.totalPrice);
  });

  return [...grouped.values()].sort((a, b) => b.sold - a.sold).slice(0, limit);
};

// ==============================================
// RECENT ACTIVITIES
// ==============================================

export const getRecentActivities = async ({ limit = 6, outletId } = {}) => {
  // ActivityLog has no outletId of its own (child row — scope comes from
  // its parent Employee, same pattern as elsewhere in this codebase).
  const logs = await prisma.activityLog.findMany({
    where: { employee: { outletId } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { employee: { select: { fullName: true } } },
  });

  return logs.map((log) => ({
    id: log.id,
    title: log.action,
    description: log.employee ? `by ${log.employee.fullName}` : "",
    time: log.createdAt,
  }));
};

// ==============================================
// WAITER-SPECIFIC SUMMARY
// ==============================================

export const getWaiterSummary = async (waiterId, outletId) => {
  const todayStart = startOfDay();

  // NOTE: tablesOccupied and assignedTables are scoped to tables actually
  // ASSIGNED to this waiter (RestaurantTable.waiterId), not every occupied
  // table in the outlet — a waiter should only see the state of their own
  // section, same as the "My Tables" screen under /tables.
  //
  // FIX: activeOrders/myOrdersToday previously filtered by waiterId alone
  // with no outlet scoping at all, unlike assignedTables/tablesOccupied in
  // this same function which already used the (broken) store filter — an
  // inconsistency worth naming: a waiter's order counts could have
  // silently included orders from a same-named waiterId at a different
  // outlet (extremely unlikely with UUIDs, but the query itself gave no
  // guarantee either way, which is the actual problem).
  const [activeOrders, myOrdersToday, assignedTables, tablesOccupied] =
    await Promise.all([
      prisma.order.count({
        where: {
          outletId,
          waiterId,
          status: { in: ["NEW", "ACCEPTED", "PREPARING", "READY", "SERVED"] },
        },
      }),
      prisma.order.count({
        where: { outletId, waiterId, createdAt: { gte: todayStart } },
      }),
      prisma.restaurantTable.count({ where: { outletId, waiterId } }),
      prisma.restaurantTable.count({
        where: { outletId, waiterId, status: "OCCUPIED" },
      }),
    ]);

  return { activeOrders, myOrdersToday, assignedTables, tablesOccupied };
};