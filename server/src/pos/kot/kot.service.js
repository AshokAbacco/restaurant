// server/src/pos/kot/kot.service.js
import { randomUUID } from "node:crypto";
import prisma from "../../config/prisma.js";

// FIX: same bug as pos.service.js's generateOrderNumber — `count() + 1`
// collides with an existing kotNumber once any KitchenOrder has ever been
// removed (e.g. cascade-deleted when an Owner deletes its parent Order),
// since the count shrinks but higher-numbered KOTs are still around.
// Basing it on the highest kotNumber actually seen removes that
// possibility — lexicographic DESC sort matches numeric order here because
// every kotNumber is zero-padded to the same width.
//
// PERF: split into a sequence read + a pure formatter. The old version did
// one findFirst PER TICKET, so an order that hit three kitchen sections
// paid three separate database round trips just to pick three numbers.
// Callers that create several tickets at once now read the sequence once
// and number the rest locally.
export async function getLastKotSequence(outletId, client = prisma) {
  const last = await client.kitchenOrder.findFirst({
    where: { outletId },
    orderBy: { kotNumber: "desc" },
    select: { kotNumber: true },
  });
  return last ? parseInt(last.kotNumber.replace("KOT-", ""), 10) || 0 : 0;
}

export function formatKotNumber(sequence) {
  return `KOT-${String(sequence).padStart(6, "0")}`;
}

export async function generateKotNumber(outletId, client = prisma) {
  return formatKotNumber((await getLastKotSequence(outletId, client)) + 1);
}

// PURE — runs no queries at all. Given order items that have already been
// loaded (each carrying its menuItem), returns the array of
// `kitchenOrder.create` data payloads, one per kitchen section, with every
// id pre-generated.
//
// Pre-generating the ids is the whole point: it means the caller can hand
// the entire write set to a single batched prisma.$transaction([...])
// instead of awaiting each create one at a time and waiting a full network
// round trip in between. Every id column in schema.prisma is
// `String @id @default(uuid())`, so supplying our own uuid is exactly what
// the database would have generated anyway.
export function buildKitchenOrderCreates({
  orderId,
  outletId,
  orderItems,
  isOnlineOrder = false,
  lastKotSequence = 0,
  // Which PHYSICAL kitchen cooks this order. Stamped onto every ticket so the
  // Kitchen Display can filter without joining through Order, and so
  // re-routing the order later can't yank tickets out from under a kitchen
  // that has already started cooking them. Null = unrouted, which every
  // kitchen sees (the correct behaviour for single-kitchen outlets).
  kitchenBranchId = null,
}) {
  const unassigned = orderItems.filter((i) => !i.menuItem?.kitchenSectionId);
  if (unassigned.length > 0) {
    const names = unassigned
      .map((i) => i.menuItem?.name || i.menuItemId)
      .join(", ");
    throw new Error(
      `These menu items have no kitchen section assigned and cannot be sent: ${names}. Set kitchenSectionId on them first.`,
    );
  }

  // Group order items by section id — one physical ticket per station.
  const bySection = new Map();
  for (const item of orderItems) {
    const sectionId = item.menuItem.kitchenSectionId;
    if (!bySection.has(sectionId)) bySection.set(sectionId, []);
    bySection.get(sectionId).push(item);
  }

  let sequence = lastKotSequence;
  const creates = [];

  for (const [kitchenSectionId, items] of bySection) {
    sequence += 1;
    const targetPrepMinutes = items.reduce(
      (sum, i) => sum + (i.menuItem.prepTimeMinutes || 0) * i.quantity,
      0,
    );

    creates.push({
      id: randomUUID(),
      outletId,
      orderId,
      kotNumber: formatKotNumber(sequence),
      status: "NEW",
      kitchenBranchId,
      // Online Orders — auto-flag as ONLINE_DELIVERY priority when the
      // parent order came through a tagged platform (Swiggy, Zomato,
      // etc.), reusing the priority tier that already existed for this
      // (see PRIORITY_LABEL/PRIORITY_RANK on the kitchen display) rather
      // than inventing a second, separate flag.
      ...(isOnlineOrder ? { priority: "ONLINE_DELIVERY" } : {}),
      kitchenSectionId,
      targetPrepMinutes: targetPrepMinutes || null,
      printedAt: new Date(),
      items: {
        create: items.map((item) => ({
          id: randomUUID(),
          orderItemId: item.id,
          quantity: item.quantity,
        })),
      },
      statusLogs: {
        create: {
          id: randomUUID(),
          fromStatus: null,
          toStatus: "NEW",
          reason: "Sent to kitchen",
        },
      },
    });
  }

  return creates;
}

// Sends the given OrderItems to the kitchen. Groups items by their MenuItem's
// kitchenSectionId and creates ONE KitchenOrder per section — e.g. grill items
// and dessert items on the same order become two separate physical tickets,
// since kitchenSectionId is a required field on KitchenOrder.
//
// Accepts an optional `client` — pass a Prisma transaction client (tx) to run
// this as part of a larger atomic operation (see pos.service.js's
// createOrderAndSendToKitchen), otherwise it uses the regular global client.
export async function sendToKitchen(orderId, orderItemIds, outletId, client = prisma) {
  // PERF: these three reads have no dependency on each other, so they go
  // out together instead of one-after-another. That matters a lot when the
  // database is remote (this project points at a Render Postgres in
  // Oregon) — three sequential round trips at ~400 ms each is 1.2 s of
  // pure waiting for no reason.
  //
  // This is also reachable as its own standalone route (POST
  // /pos/kot/:orderId), not just via pos.service.js's
  // createOrderAndSendToKitchen — so it needs its own ownership check
  // rather than trusting the caller already verified orderId.
  const [order, orderItems, lastKotSequence] = await Promise.all([
    client.order.findFirst({
      where: { id: orderId, outletId },
      select: { id: true, onlinePlatformId: true, kitchenBranchId: true },
    }),
    client.orderItem.findMany({
      where: { id: { in: orderItemIds }, orderId },
      include: {
        menuItem: true,
        kitchenOrderItems: {
          include: { kitchenOrder: { select: { status: true } } },
        },
      },
    }),
    getLastKotSequence(outletId, client),
  ]);

  if (!order) throw new Error("Order not found");
  if (orderItems.length === 0)
    throw new Error("No matching order items to send");

  // Refuse items that are already sitting on a live (non-cancelled) ticket —
  // prevents duplicate KOTs from a double-click or a client retry.
  const alreadySent = orderItems.filter((i) =>
    i.kitchenOrderItems.some((koi) => koi.kitchenOrder.status !== "CANCELLED"),
  );
  if (alreadySent.length > 0) {
    const names = alreadySent.map((i) => i.menuItem.name).join(", ");
    throw new Error(
      `These items have already been sent to the kitchen: ${names}`,
    );
  }

  const kotCreates = buildKitchenOrderCreates({
    orderId,
    outletId,
    orderItems,
    isOnlineOrder: Boolean(order.onlinePlatformId),
    lastKotSequence,
    // Items added to an existing order go to the SAME kitchen the order was
    // originally routed to — the customer's food shouldn't get split across
    // two kitchens because a second round was ordered.
    kitchenBranchId: order.kitchenBranchId,
  });

  // PERF: all the writes go out as ONE batch instead of an awaited create
  // per section followed by an awaited order update. `client` is a plain
  // PrismaClient when this route is called directly (so we open our own
  // batch transaction); when a caller passed a transaction client we're
  // already inside a transaction and just issue the writes on it.
  const writes = [
    ...kotCreates.map((data) => client.kitchenOrder.create({ data })),
    client.order.update({
      where: { id: orderId },
      data: { status: "ACCEPTED" },
    }),
  ];

  const results =
    typeof client.$transaction === "function"
      ? await client.$transaction(writes)
      : await Promise.all(writes);

  const createdKots = results.slice(0, kotCreates.length);

  // Return a single KOT directly when there's only one (the common case),
  // otherwise the full array — callers should handle both, but this keeps
  // the single-ticket path simple for the frontend.
  return createdKots.length === 1 ? createdKots[0] : createdKots;
}

export async function listKotsForOrder(orderId, outletId) {
  return prisma.kitchenOrder.findMany({
    where: { orderId, outletId },
    include: {
      kitchenSection: true,
      chef: { select: { fullName: true, employeeCode: true } },
      items: { include: { orderItem: { include: { menuItem: true } } } },
      notes: {
        include: { chef: { select: { fullName: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

// Kitchen display screen — everything not finished, oldest first.
// Pass kitchenSectionId to scope this to one station's screen (grill, dessert, etc.).
// kitchenBranchId narrows the display to ONE physical kitchen. Tickets with a
// null kitchenBranchId are always included: they're either pre-feature tickets
// or from a single-kitchen outlet, and hiding them would make live orders
// silently disappear from every screen.
// Returns the physical kitchen an employee is pinned to, or null if they can
// see every kitchen. Only KITCHEN/CHEF staff are ever pinned in practice, but
// the lookup is role-agnostic: whoever has an Employee.kitchenBranchId set is
// restricted to it.
export async function getEmployeeKitchenBranchId(employeeId, outletId) {
  if (!employeeId) return null;
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, outletId },
    select: { kitchenBranchId: true },
  });
  return employee?.kitchenBranchId || null;
}

export async function getActiveKitchenDisplay(
  kitchenSectionId,
  outletId,
  kitchenBranchId = null,
) {
  return prisma.kitchenOrder.findMany({
    where: {
      outletId,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      ...(kitchenSectionId ? { kitchenSectionId } : {}),
      ...(kitchenBranchId
        ? { OR: [{ kitchenBranchId }, { kitchenBranchId: null }] }
        : {}),
    },
    include: {
      order: {
        select: {
          // The Kitchen Display groups its cards by order (one customer
          // order = one card) — see groupKotsByOrder in
          // KitchenDisplayScreen.jsx. It can fall back to the KitchenOrder's
          // own orderId scalar, but returning the id here keeps the grouping
          // key available directly on the nested order too.
          id: true,
          orderNumber: true,
          orderType: true,
          table: { select: { name: true } },
          onlinePlatform: { select: { id: true, name: true } },
        },
      },
      kitchenSection: true,
      kitchenBranch: { select: { id: true, name: true } },
      chef: { select: { fullName: true } },
      items: { include: { orderItem: { include: { menuItem: true } } } },
      notes: {
        include: { chef: { select: { fullName: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

const LIFECYCLE_TIMESTAMP_FIELD = {
  ACCEPTED: "acceptedAt",
  READY: "readyAt",
  SERVED: "servedAt",
  COMPLETED: "completedAt",
  RECALLED: "recalledAt",
};

// FEATURE: offline mode (KDS). A status update made while a kitchen
// device was offline gets queued and replayed later — see
// client/src/offline/kdsQueue.js. Without this guard, a stale queued
// update (e.g. "mark READY") could replay AFTER the same ticket was
// already advanced further by another screen/device in the meantime
// (e.g. already SERVED), silently regressing it back to an earlier
// stage. CANCELLED/RECALLED are deliberately left out of this map — an
// order can be cancelled from any stage, and RECALLED is itself a
// deliberate backward action staff take on purpose, not something to
// block.
const KOT_STAGE_RANK = {
  NEW: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  SERVED: 4,
  COMPLETED: 5,
};

// Maps a KOT reaching a given status onto the parent Order's status, so the
// Orders page badge actually cycles Accepted -> Preparing -> Ready -> Served
// instead of jumping straight from Accepted to Ready (the old code only
// synced on READY, which also meant an Order could never reach SERVED at
// all — "Complete Service" was permanently disabled as a result).
// `from`: only sync if the order is currently in one of these states, so an
// out-of-order/duplicate KOT update can't push the order backwards.
const ORDER_SYNC_FROM_KOT_STATUS = {
  PREPARING: { from: ["ACCEPTED"], to: "PREPARING" },
  READY: { from: ["ACCEPTED", "PREPARING"], to: "READY" },
  SERVED: { from: ["READY"], to: "SERVED" },
};

export async function updateKotStatus(
  id,
  status,
  { changedById, reason } = {},
  outletId,
) {
  const existing = await prisma.kitchenOrder.findFirst({
    where: { id, outletId },
  });
  if (!existing) throw new Error("Kitchen order not found");

  // See KOT_STAGE_RANK above — a replayed offline update that's already
  // at or behind the ticket's current stage is a safe no-op, not an
  // error and not a regression.
  const isGuardedTransition =
    status in KOT_STAGE_RANK && existing.status in KOT_STAGE_RANK;
  if (
    isGuardedTransition &&
    KOT_STAGE_RANK[status] <= KOT_STAGE_RANK[existing.status]
  ) {
    return existing;
  }

  const timestampField = LIFECYCLE_TIMESTAMP_FIELD[status];

  const kot = await prisma.kitchenOrder.update({
    where: { id },
    data: {
      status,
      ...(timestampField ? { [timestampField]: new Date() } : {}),
      ...(status === "RECALLED" ? { recallCount: { increment: 1 } } : {}),
      statusLogs: {
        create: {
          fromStatus: existing.status,
          toStatus: status,
          changedById,
          reason,
        },
      },
    },
  });

  const sync = ORDER_SYNC_FROM_KOT_STATUS[status];
  if (sync) {
    const order = await prisma.order.findUnique({ where: { id: kot.orderId } });
    if (order && sync.from.includes(order.status)) {
      await prisma.order.update({
        where: { id: kot.orderId },
        data: { status: sync.to },
      });
    }
  }

  return kot;
}

// ─────────────────────────────────────────────
// CONVENIENCE STATUS WRAPPERS
// Thin wrappers over updateKotStatus for each stage — this is also where
// kds.controller.js's handlers now delegate (see that file's header
// comment: KDS used to have its own independent, duplicate KitchenOrder
// write path; it now shares this single one, so a status change made
// through either URL always goes through the same replay-guard and
// order-status-sync logic above).
// ─────────────────────────────────────────────

export async function acceptKitchenOrder(id, { chefId, changedById } = {}, outletId) {
  if (chefId) {
    // Assigning a chef is its own small write, done before the status
    // transition itself — verify ownership first, same as every other
    // mutation in this file.
    const existing = await prisma.kitchenOrder.findFirst({ where: { id, outletId } });
    if (!existing) throw new Error("Kitchen order not found");
    await prisma.kitchenOrder.update({ where: { id }, data: { chefId } });
  }
  return updateKotStatus(
    id,
    "ACCEPTED",
    { changedById: changedById || chefId, reason: "Accepted by chef" },
    outletId,
  );
}

export async function startPreparingKitchenOrder(id, { changedById } = {}, outletId) {
  return updateKotStatus(id, "PREPARING", { changedById, reason: "Preparation started" }, outletId);
}

export async function markKitchenOrderReady(id, { changedById } = {}, outletId) {
  return updateKotStatus(id, "READY", { changedById, reason: "Marked ready" }, outletId);
}

export async function markKitchenOrderServed(id, { changedById } = {}, outletId) {
  return updateKotStatus(id, "SERVED", { changedById, reason: "Served to table" }, outletId);
}

export async function completeKitchenOrder(id, { changedById } = {}, outletId) {
  return updateKotStatus(id, "COMPLETED", { changedById, reason: "Completed" }, outletId);
}

export async function cancelKitchenOrder(id, { changedById, reason } = {}, outletId) {
  return updateKotStatus(id, "CANCELLED", { changedById, reason: reason || "Cancelled" }, outletId);
}

export async function recallKitchenOrder(id, { changedById, reason } = {}, outletId) {
  return updateKotStatus(id, "RECALLED", { changedById, reason: reason || "Recalled by waiter" }, outletId);
}

export async function bulkUpdateKitchenOrderStatus(ids, status, { changedById, reason } = {}, outletId) {
  return Promise.all(
    ids.map((id) => updateKotStatus(id, status, { changedById, reason }, outletId)),
  );
}

export async function updateKitchenOrderPriority(id, priority, outletId) {
  const existing = await prisma.kitchenOrder.findFirst({ where: { id, outletId } });
  if (!existing) throw new Error("Kitchen order not found");
  return prisma.kitchenOrder.update({
    where: { id },
    data: { priority },
    include: {
      kitchenSection: true,
      chef: true,
      items: { include: { orderItem: { include: { menuItem: true } } } },
    },
  });
}

// ─────────────────────────────────────────────
// FILTERED LISTING (the KDS ticket board)
// Richer than getActiveKitchenDisplay above — supports status/section/
// chef/priority/delayed/orderType/search filters and priority-sorts the
// result, for the full Kitchen Display Screen rather than a single
// station's simple feed.
// ─────────────────────────────────────────────

const PRIORITY_RANK = {
  VIP: 1,
  EXPRESS: 2,
  SENIOR_CITIZEN: 3,
  ONLINE_DELIVERY: 4,
  SPECIAL_REQUEST: 5,
  NORMAL: 99,
};

const KITCHEN_ORDER_INCLUDE = {
  order: {
    include: {
      table: true,
      customer: true,
      onlinePlatform: { select: { id: true, name: true } },
    },
  },
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

// Finds active tickets whose elapsed time has passed their target prep
// time and flips isDelayed on. Called before every filtered read so the
// flag stays fresh without a separate cron job.
async function flagDelayedOrders(outletId) {
  const active = await prisma.kitchenOrder.findMany({
    where: {
      outletId,
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
      where: { id: { in: delayedIds }, outletId },
      data: { isDelayed: true },
    });
  }
}

export async function listKitchenOrders(filters = {}, outletId) {
  const { status, kitchenSectionId, chefId, priority, delayedOnly, orderType, search } = filters;

  await flagDelayedOrders(outletId);

  const where = { outletId };
  if (status) where.status = status;
  if (kitchenSectionId) where.kitchenSectionId = kitchenSectionId;
  if (chefId) where.chefId = chefId;
  if (priority) where.priority = priority;
  if (delayedOnly === "true" || delayedOnly === true) where.isDelayed = true;
  if (orderType) where.order = { orderType };
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

  return tickets.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getAveragePrepTimeMinutes(outletId) {
  const completed = await prisma.kitchenOrder.findMany({
    where: {
      outletId,
      status: "COMPLETED",
      completedAt: { gte: startOfToday() },
      acceptedAt: { not: null },
    },
    select: { acceptedAt: true, completedAt: true },
  });
  if (!completed.length) return null;

  const totalMinutes = completed.reduce(
    (sum, k) => sum + (new Date(k.completedAt) - new Date(k.acceptedAt)) / 60000,
    0,
  );
  return Math.round((totalMinutes / completed.length) * 10) / 10;
}

export async function getKitchenDashboard(outletId) {
  await flagDelayedOrders(outletId);

  const [preparingCount, readyCount, delayedCount, completedTodayCount, activeCount] =
    await Promise.all([
      prisma.kitchenOrder.count({
        where: { outletId, status: { in: ["ACCEPTED", "PREPARING"] } },
      }),
      prisma.kitchenOrder.count({ where: { outletId, status: "READY" } }),
      prisma.kitchenOrder.count({ where: { outletId, isDelayed: true } }),
      prisma.kitchenOrder.count({
        where: { outletId, status: "COMPLETED", completedAt: { gte: startOfToday() } },
      }),
      prisma.kitchenOrder.count({
        where: { outletId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      }),
    ]);

  return {
    totalActiveOrders: activeCount,
    preparingOrders: preparingCount,
    readyOrders: readyCount,
    delayedOrders: delayedCount,
    ordersCompletedToday: completedTodayCount,
    averagePreparationTimeMinutes: await getAveragePrepTimeMinutes(outletId),
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

async function dailyKitchenReport({ date } = {}, outletId) {
  const day = date ? new Date(date) : new Date();
  day.setHours(0, 0, 0, 0);
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);

  const tickets = await prisma.kitchenOrder.findMany({
    where: { outletId, createdAt: { gte: day, lt: nextDay } },
    select: { status: true },
  });

  const byStatus = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return { date: day.toISOString().slice(0, 10), totalOrders: tickets.length, byStatus };
}

async function prepTimeReport({ from, to } = {}, outletId) {
  const completed = await prisma.kitchenOrder.findMany({
    where: {
      outletId,
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

async function delayedOrdersReport({ from, to } = {}, outletId) {
  return prisma.kitchenOrder.findMany({
    where: {
      outletId,
      OR: [{ isDelayed: true }, { status: "CANCELLED", isDelayed: true }],
      createdAt: dateRangeFilter(from, to),
    },
    include: { order: true, kitchenSection: true, chef: true },
    orderBy: { createdAt: "desc" },
  });
}

async function chefPerformanceReport({ from, to } = {}, outletId) {
  const completed = await prisma.kitchenOrder.findMany({
    where: {
      outletId,
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
    if (!byChef[key])
      byChef[key] = { chefName: k.chef.fullName, ordersCompleted: 0, totalMinutes: 0, delayedCount: 0 };
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

async function stationLoadReport({ from, to } = {}, outletId) {
  const tickets = await prisma.kitchenOrder.findMany({
    where: { outletId, createdAt: dateRangeFilter(from, to) },
    include: { kitchenSection: true },
  });

  const byStation = {};
  for (const k of tickets) {
    const name = k.kitchenSection.name;
    byStation[name] = (byStation[name] || 0) + 1;
  }

  return Object.entries(byStation).map(([station, totalOrders]) => ({ station, totalOrders }));
}

async function cancelledOrdersReport({ from, to } = {}, outletId) {
  return prisma.kitchenOrder.findMany({
    where: { outletId, status: "CANCELLED", updatedAt: dateRangeFilter(from, to) },
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

export async function getKitchenReports(type, filters = {}, outletId) {
  const handler = REPORT_HANDLERS[type];
  if (!handler) {
    throw new Error(
      `Unknown report type "${type}". Valid types: ${Object.keys(REPORT_HANDLERS).join(", ")}`,
    );
  }
  return handler(filters, outletId);
}
// chefId comes from the logged-in kitchen user's employeeId — optional
// because req.user.employeeId may not be set for every role that can reach
// this endpoint (falls back to an anonymous note rather than failing).
export async function addKitchenNote(kitchenOrderId, chefId, note, outletId) {
  const trimmed = (note || "").trim();
  if (!trimmed) throw new Error("Note text is required");

  const kitchenOrder = await prisma.kitchenOrder.findFirst({
    where: { id: kitchenOrderId, outletId },
  });
  if (!kitchenOrder) throw new Error("Kitchen order not found");

  return prisma.kitchenNote.create({
    data: {
      kitchenOrder: { connect: { id: kitchenOrderId } },
      ...(chefId ? { chef: { connect: { id: chefId } } } : {}),
      note: trimmed,
    },
    include: { chef: { select: { fullName: true, employeeCode: true } } },
  });
}

export async function listKitchenNotes(kitchenOrderId, outletId) {
  // KitchenNote itself has no outletId (it's a child row — scope comes from
  // its parent KitchenOrder, same pattern as OrderItem under Order), so
  // scoping happens through the relation filter here.
  return prisma.kitchenNote.findMany({
    where: { kitchenOrderId, kitchenOrder: { outletId } },
    include: { chef: { select: { fullName: true, employeeCode: true } } },
    orderBy: { createdAt: "asc" },
  });
}

// Feed of every note across recent tickets, newest first — powers a
// dedicated "Kitchen Notes" log page so owner/manager can review kitchen
// communication without opening each ticket individually.
export async function listRecentKitchenNotes(limit = 50, outletId) {
  return prisma.kitchenNote.findMany({
    where: { kitchenOrder: { outletId } },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      chef: { select: { fullName: true, employeeCode: true } },
      kitchenOrder: {
        select: {
          kotNumber: true,
          kitchenSection: { select: { name: true } },
          order: {
            select: { orderNumber: true, table: { select: { name: true } } },
          },
        },
      },
    },
  });
}