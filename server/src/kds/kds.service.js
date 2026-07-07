// server/src/kds/kds.service.js
import prisma from "../config/prisma.js";

const DEFAULT_TARGET_PREP_MINUTES = 15;

// Lower number = higher priority. Used for in-memory sorting since Postgres
// enum ordering follows declaration order, not "importance" order.
const PRIORITY_RANK = {
  VIP: 1,
  EXPRESS: 2,
  SENIOR_CITIZEN: 3,
  ONLINE_DELIVERY: 4,
  SPECIAL_REQUEST: 5,
  NORMAL: 99,
};

// Which KitchenOrder timestamp column to stamp when a status is reached.
const TIMESTAMP_FIELD_BY_STATUS = {
  ACCEPTED: "acceptedAt",
  READY: "readyAt",
  SERVED: "servedAt",
  COMPLETED: "completedAt",
  RECALLED: "recalledAt",
};

const KITCHEN_ORDER_INCLUDE = {
  order: { include: { table: true, customer: true } },
  kitchenSection: true,
  chef: true,
  items: {
    include: {
      orderItem: {
        include: { menuItem: true, addOns: { include: { addOn: true } } },
      },
    },
  },
  notes: { orderBy: { createdAt: "desc" } },
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function generateKotNumber() {
  const count = await prisma.kitchenOrder.count();
  return `KOT-${String(count + 1).padStart(6, "0")}`;
}

async function logStatusChange(kitchenOrderId, fromStatus, toStatus, changedById, reason) {
  return prisma.kitchenOrderStatusLog.create({
    data: { kitchenOrderId, fromStatus, toStatus, changedById, reason },
  });
}

// Any order type other than dine-in gets flagged so it's visible/sortable —
// there's no VIP/customer-tier field on Customer yet, so that priority still
// has to be set manually via updatePriority() until that exists.
function derivePriority(order) {
  if (order.orderType === "DELIVERY") return "ONLINE_DELIVERY";
  return "NORMAL";
}

// Finds active tickets whose elapsed time has passed their target prep time
// and flips isDelayed on. Called before every read so the flag stays fresh
// without needing a separate cron job for now.
async function flagDelayedOrders() {
  const active = await prisma.kitchenOrder.findMany({
    where: {
      status: { in: ["ACCEPTED", "PREPARING"] },
      isDelayed: false,
      acceptedAt: { not: null },
      targetPrepMinutes: { not: null },
    },
    select: { id: true, acceptedAt: true, targetPrepMinutes: true },
  });

  const now = Date.now();
  const delayedIds = active
    .filter((k) => now - new Date(k.acceptedAt).getTime() > k.targetPrepMinutes * 60000)
    .map((k) => k.id);

  if (delayedIds.length) {
    await prisma.kitchenOrder.updateMany({
      where: { id: { in: delayedIds } },
      data: { isDelayed: true },
    });
  }
}

// ─────────────────────────────────────────────
// KOT CREATION (called from the POS module once an order is confirmed)
// ─────────────────────────────────────────────

/**
 * Splits a confirmed Order into one KitchenOrder (KOT) per kitchen station,
 * so each station only sees the items that belong to it.
 * Items whose MenuItem has no kitchenSectionId configured are skipped —
 * configure a station on the menu item to route it to a kitchen screen.
 */
export async function createKitchenOrdersForOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          menuItem: { include: { kitchenSection: true } },
          kitchenOrderItems: true, // used below to skip items already ticketed
        },
      },
    },
  });
  if (!order) throw new Error("Order not found");

  // Safe to call again after items are added mid-order: only items that
  // don't already have a KitchenOrderItem get grouped/ticketed here.
  const unticketedItems = order.items.filter((item) => item.kitchenOrderItems.length === 0);

  const groups = new Map();
  for (const item of unticketedItems) {
    const sectionId = item.menuItem.kitchenSectionId;
    if (!sectionId) continue;
    if (!groups.has(sectionId)) groups.set(sectionId, []);
    groups.get(sectionId).push(item);
  }

  const priority = derivePriority(order);
  const createdTickets = [];

  for (const [kitchenSectionId, items] of groups) {
    const prepTimes = items.map((i) => i.menuItem.prepTimeMinutes || 0).filter(Boolean);
    const targetPrepMinutes = prepTimes.length ? Math.max(...prepTimes) : DEFAULT_TARGET_PREP_MINUTES;

    const kotNumber = await generateKotNumber();

    const kitchenOrder = await prisma.kitchenOrder.create({
      data: {
        orderId: order.id,
        kitchenSectionId,
        kotNumber,
        targetPrepMinutes,
        priority,
        items: {
          create: items.map((i) => ({ orderItemId: i.id, quantity: i.quantity })),
        },
      },
      include: KITCHEN_ORDER_INCLUDE,
    });

    await logStatusChange(kitchenOrder.id, null, "NEW", null, "KOT created");
    createdTickets.push(kitchenOrder);
  }

  return createdTickets;
}

// ─────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────

export async function listKitchenOrders(filters = {}) {
  const { status, kitchenSectionId, chefId, priority, delayedOnly, orderType, search, store } = filters;

  await flagDelayedOrders();

  const where = {};
  if (status) where.status = status;
  if (kitchenSectionId) where.kitchenSectionId = kitchenSectionId;
  if (chefId) where.chefId = chefId;
  if (priority) where.priority = priority;
  if (delayedOnly === "true" || delayedOnly === true) where.isDelayed = true;

  const orderFilter = {};
  if (store) orderFilter.store = store;
  if (orderType) orderFilter.orderType = orderType;
  if (Object.keys(orderFilter).length) where.order = orderFilter;

  if (search) {
    where.OR = [
      { kotNumber: { contains: search, mode: "insensitive" } },
      { order: { orderNumber: { contains: search, mode: "insensitive" } } },
      { order: { table: { name: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const tickets = await prisma.kitchenOrder.findMany({
    where,
    include: KITCHEN_ORDER_INCLUDE,
    orderBy: { createdAt: "asc" },
  });

  // Stable sort: priority first (VIP/Express etc. float to top), then FIFO.
  return tickets.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

export async function getKitchenOrderById(id) {
  const ticket = await prisma.kitchenOrder.findUnique({
    where: { id },
    include: { ...KITCHEN_ORDER_INCLUDE, statusLogs: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) throw new Error("Kitchen order not found");
  return ticket;
}

// ─────────────────────────────────────────────
// STATUS TRANSITIONS
// ─────────────────────────────────────────────

export async function updateKitchenOrderStatus(id, toStatus, { employeeId, reason } = {}) {
  const existing = await prisma.kitchenOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Kitchen order not found");

  const data = { status: toStatus };
  const tsField = TIMESTAMP_FIELD_BY_STATUS[toStatus];
  if (tsField) data[tsField] = new Date();

  if (toStatus === "RECALLED") {
    data.recallCount = existing.recallCount + 1;
    data.isDelayed = false; // fresh prep cycle starts the clock over
  }
  if (toStatus === "ACCEPTED") {
    data.isDelayed = false;
  }

  const updated = await prisma.kitchenOrder.update({
    where: { id },
    data,
    include: KITCHEN_ORDER_INCLUDE,
  });

  await logStatusChange(id, existing.status, toStatus, employeeId, reason);

  return updated;
}

export async function acceptKitchenOrder(id, { chefId, employeeId } = {}) {
  if (chefId) {
    await prisma.kitchenOrder.update({ where: { id }, data: { chefId } });
  }
  return updateKitchenOrderStatus(id, "ACCEPTED", {
    employeeId: employeeId || chefId,
    reason: "Accepted by chef",
  });
}

// Explicit "chef starts cooking" step (Accepted -> Preparing in the spec's
// workflow). acceptedAt (set on ACCEPTED) remains the timer anchor.
export async function startPreparingKitchenOrder(id, { employeeId } = {}) {
  return updateKitchenOrderStatus(id, "PREPARING", { employeeId, reason: "Preparation started" });
}

export async function markKitchenOrderReady(id, { employeeId } = {}) {
  return updateKitchenOrderStatus(id, "READY", { employeeId, reason: "Marked ready" });
}

export async function markKitchenOrderServed(id, { employeeId } = {}) {
  return updateKitchenOrderStatus(id, "SERVED", { employeeId, reason: "Served to table" });
}

export async function completeKitchenOrder(id, { employeeId } = {}) {
  return updateKitchenOrderStatus(id, "COMPLETED", { employeeId, reason: "Completed" });
}

export async function cancelKitchenOrder(id, { employeeId, reason } = {}) {
  return updateKitchenOrderStatus(id, "CANCELLED", { employeeId, reason: reason || "Cancelled" });
}

export async function recallKitchenOrder(id, { employeeId, reason } = {}) {
  return updateKitchenOrderStatus(id, "RECALLED", {
    employeeId,
    reason: reason || "Recalled by waiter",
  });
}

export async function bulkUpdateKitchenOrderStatus(ids, toStatus, { employeeId, reason } = {}) {
  return Promise.all(ids.map((id) => updateKitchenOrderStatus(id, toStatus, { employeeId, reason })));
}

export async function updateKitchenOrderPriority(id, priority) {
  return prisma.kitchenOrder.update({ where: { id }, data: { priority }, include: KITCHEN_ORDER_INCLUDE });
}

// ─────────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────────

export async function addKitchenNote(kitchenOrderId, { chefId, note }) {
  if (!note || !note.trim()) throw new Error("Note text is required");
  return prisma.kitchenNote.create({ data: { kitchenOrderId, chefId, note } });
}

export async function listKitchenNotes(kitchenOrderId) {
  return prisma.kitchenNote.findMany({
    where: { kitchenOrderId },
    orderBy: { createdAt: "desc" },
    include: { chef: true },
  });
}

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────

async function getAveragePrepTimeMinutes(where) {
  const completed = await prisma.kitchenOrder.findMany({
    where: { ...where, status: "COMPLETED", completedAt: { gte: startOfToday() }, acceptedAt: { not: null } },
    select: { acceptedAt: true, completedAt: true },
  });
  if (!completed.length) return null;

  const totalMinutes = completed.reduce(
    (sum, k) => sum + (new Date(k.completedAt) - new Date(k.acceptedAt)) / 60000,
    0
  );
  return Math.round((totalMinutes / completed.length) * 10) / 10;
}

export async function getKitchenDashboard(store) {
  await flagDelayedOrders();

  const where = store ? { order: { store } } : {};

  const [preparingCount, readyCount, delayedCount, completedTodayCount, activeCount] = await Promise.all([
    prisma.kitchenOrder.count({ where: { ...where, status: { in: ["ACCEPTED", "PREPARING"] } } }),
    prisma.kitchenOrder.count({ where: { ...where, status: "READY" } }),
    prisma.kitchenOrder.count({ where: { ...where, isDelayed: true } }),
    prisma.kitchenOrder.count({
      where: { ...where, status: "COMPLETED", completedAt: { gte: startOfToday() } },
    }),
    prisma.kitchenOrder.count({ where: { ...where, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
  ]);

  return {
    totalActiveOrders: activeCount,
    preparingOrders: preparingCount,
    readyOrders: readyCount,
    delayedOrders: delayedCount,
    ordersCompletedToday: completedTodayCount,
    averagePreparationTimeMinutes: await getAveragePrepTimeMinutes(where),
  };
}

// ─────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────

function dateRangeFilter(from, to) {
  const range = {};
  if (from) range.gte = new Date(from);
  if (to) range.lte = new Date(to);
  return Object.keys(range).length ? range : undefined;
}

async function dailyKitchenReport({ date } = {}) {
  const day = date ? new Date(date) : new Date();
  day.setHours(0, 0, 0, 0);
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);

  const tickets = await prisma.kitchenOrder.findMany({
    where: { createdAt: { gte: day, lt: nextDay } },
    select: { status: true },
  });

  const byStatus = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return { date: day.toISOString().slice(0, 10), totalOrders: tickets.length, byStatus };
}

async function prepTimeReport({ from, to } = {}) {
  const completed = await prisma.kitchenOrder.findMany({
    where: {
      status: "COMPLETED",
      completedAt: dateRangeFilter(from, to),
      acceptedAt: { not: null },
    },
    include: { kitchenSection: true },
  });

  const byStation = {};
  for (const k of completed) {
    const name = k.kitchenSection.name;
    const minutes = (new Date(k.completedAt) - new Date(k.acceptedAt)) / 60000;
    if (!byStation[name]) byStation[name] = { totalMinutes: 0, count: 0 };
    byStation[name].totalMinutes += minutes;
    byStation[name].count += 1;
  }

  return Object.entries(byStation).map(([station, { totalMinutes, count }]) => ({
    station,
    ordersCompleted: count,
    averagePrepMinutes: Math.round((totalMinutes / count) * 10) / 10,
  }));
}

async function delayedOrdersReport({ from, to } = {}) {
  return prisma.kitchenOrder.findMany({
    where: {
      OR: [{ isDelayed: true }, { status: "CANCELLED", isDelayed: true }],
      createdAt: dateRangeFilter(from, to),
    },
    include: { order: true, kitchenSection: true, chef: true },
    orderBy: { createdAt: "desc" },
  });
}

async function chefPerformanceReport({ from, to } = {}) {
  const completed = await prisma.kitchenOrder.findMany({
    where: {
      status: "COMPLETED",
      completedAt: dateRangeFilter(from, to),
      chefId: { not: null },
      acceptedAt: { not: null },
    },
    include: { chef: true },
  });

  const byChef = {};
  for (const k of completed) {
    const key = k.chefId;
    const minutes = (new Date(k.completedAt) - new Date(k.acceptedAt)) / 60000;
    if (!byChef[key]) byChef[key] = { chefName: k.chef.fullName, ordersCompleted: 0, totalMinutes: 0, delayedCount: 0 };
    byChef[key].ordersCompleted += 1;
    byChef[key].totalMinutes += minutes;
    if (k.isDelayed) byChef[key].delayedCount += 1;
  }

  return Object.values(byChef).map((c) => ({
    chefName: c.chefName,
    ordersCompleted: c.ordersCompleted,
    delayedCount: c.delayedCount,
    averagePrepMinutes: Math.round((c.totalMinutes / c.ordersCompleted) * 10) / 10,
  }));
}

async function stationLoadReport({ from, to } = {}) {
  const tickets = await prisma.kitchenOrder.findMany({
    where: { createdAt: dateRangeFilter(from, to) },
    include: { kitchenSection: true },
  });

  const byStation = {};
  for (const k of tickets) {
    const name = k.kitchenSection.name;
    byStation[name] = (byStation[name] || 0) + 1;
  }

  return Object.entries(byStation).map(([station, totalOrders]) => ({ station, totalOrders }));
}

async function cancelledOrdersReport({ from, to } = {}) {
  return prisma.kitchenOrder.findMany({
    where: { status: "CANCELLED", updatedAt: dateRangeFilter(from, to) },
    include: {
      order: true,
      kitchenSection: true,
      statusLogs: { where: { toStatus: "CANCELLED" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
}

const REPORT_HANDLERS = {
  daily: dailyKitchenReport,
  "prep-time": prepTimeReport,
  delayed: delayedOrdersReport,
  "chef-performance": chefPerformanceReport,
  "station-load": stationLoadReport,
  cancelled: cancelledOrdersReport,
};

export async function getKitchenReports(type, filters = {}) {
  const handler = REPORT_HANDLERS[type];
  if (!handler) {
    throw new Error(`Unknown report type "${type}". Valid types: ${Object.keys(REPORT_HANDLERS).join(", ")}`);
  }
  return handler(filters);
}