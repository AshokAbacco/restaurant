// server/src/pos/kot/kot.service.js
import prisma from "../../config/prisma.js";

async function generateKotNumber(client = prisma) {
  const count = await client.kitchenOrder.count();
  return `KOT-${String(count + 1).padStart(6, "0")}`;
}

// Sends the given OrderItems to the kitchen. Groups items by their MenuItem's
// kitchenSectionId and creates ONE KitchenOrder per section — e.g. grill items
// and dessert items on the same order become two separate physical tickets,
// since kitchenSectionId is a required field on KitchenOrder.
//
// Accepts an optional `client` — pass a Prisma transaction client (tx) to run
// this as part of a larger atomic operation (see pos.service.js's
// createOrderAndSendToKitchen), otherwise it uses the regular global client.
export async function sendToKitchen(orderId, orderItemIds, client = prisma) {
  const orderItems = await client.orderItem.findMany({
    where: { id: { in: orderItemIds }, orderId },
    include: {
      menuItem: true,
      kitchenOrderItems: { include: { kitchenOrder: { select: { status: true } } } },
    },
  });
  if (orderItems.length === 0) throw new Error("No matching order items to send");

  // Refuse items that are already sitting on a live (non-cancelled) ticket —
  // prevents duplicate KOTs from a double-click or a client retry.
  const alreadySent = orderItems.filter((i) =>
    i.kitchenOrderItems.some((koi) => koi.kitchenOrder.status !== "CANCELLED")
  );
  if (alreadySent.length > 0) {
    const names = alreadySent.map((i) => i.menuItem.name).join(", ");
    throw new Error(`These items have already been sent to the kitchen: ${names}`);
  }

  const unassigned = orderItems.filter((i) => !i.menuItem.kitchenSectionId);
  if (unassigned.length > 0) {
    const names = unassigned.map((i) => i.menuItem.name).join(", ");
    throw new Error(
      `These menu items have no kitchen section assigned and cannot be sent: ${names}. Set kitchenSectionId on them first.`
    );
  }

  // Group order items by section id
  const bySection = new Map();
  for (const item of orderItems) {
    const sectionId = item.menuItem.kitchenSectionId;
    if (!bySection.has(sectionId)) bySection.set(sectionId, []);
    bySection.get(sectionId).push(item);
  }

  const createdKots = [];

  for (const [kitchenSectionId, items] of bySection) {
    const kotNumber = await generateKotNumber(client);
    const targetPrepMinutes = items.reduce(
      (sum, i) => sum + (i.menuItem.prepTimeMinutes || 0) * i.quantity,
      0
    );

    const kitchenOrder = await client.kitchenOrder.create({
      data: {
        order: { connect: { id: orderId } },
        kotNumber,
        status: "NEW",
        kitchenSection: { connect: { id: kitchenSectionId } },
        targetPrepMinutes: targetPrepMinutes || null,
        printedAt: new Date(),
        items: {
          create: items.map((item) => ({
            quantity: item.quantity,
            orderItem: { connect: { id: item.id } },
          })),
        },
        statusLogs: {
          create: { fromStatus: null, toStatus: "NEW", reason: "Sent to kitchen" },
        },
      },
      include: {
        kitchenSection: true,
        items: { include: { orderItem: { include: { menuItem: true } } } },
      },
    });

    createdKots.push(kitchenOrder);
  }

  await client.order.update({ where: { id: orderId }, data: { status: "ACCEPTED" } });

  // Return a single KOT directly when there's only one (the common case),
  // otherwise the full array — callers should handle both, but this keeps
  // the single-ticket path simple for the frontend.
  return createdKots.length === 1 ? createdKots[0] : createdKots;
}

export async function listKotsForOrder(orderId) {
  return prisma.kitchenOrder.findMany({
    where: { orderId },
    include: {
      kitchenSection: true,
      chef: { select: { fullName: true, employeeCode: true } },
      items: { include: { orderItem: { include: { menuItem: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
}

// Kitchen display screen — everything not finished, oldest first.
// Pass kitchenSectionId to scope this to one station's screen (grill, dessert, etc.).
export async function getActiveKitchenDisplay(kitchenSectionId) {
  return prisma.kitchenOrder.findMany({
    where: {
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      ...(kitchenSectionId ? { kitchenSectionId } : {}),
    },
    include: {
      order: { select: { orderNumber: true, orderType: true, table: { select: { name: true } } } },
      kitchenSection: true,
      chef: { select: { fullName: true } },
      items: { include: { orderItem: { include: { menuItem: true } } } },
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

export async function updateKotStatus(id, status, { changedById, reason } = {}) {
  const existing = await prisma.kitchenOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Kitchen order not found");

  const timestampField = LIFECYCLE_TIMESTAMP_FIELD[status];

  const kot = await prisma.kitchenOrder.update({
    where: { id },
    data: {
      status,
      ...(timestampField ? { [timestampField]: new Date() } : {}),
      ...(status === "RECALLED" ? { recallCount: { increment: 1 } } : {}),
      statusLogs: {
        create: { fromStatus: existing.status, toStatus: status, changedById, reason },
      },
    },
  });

  const sync = ORDER_SYNC_FROM_KOT_STATUS[status];
  if (sync) {
    const order = await prisma.order.findUnique({ where: { id: kot.orderId } });
    if (order && sync.from.includes(order.status)) {
      await prisma.order.update({ where: { id: kot.orderId }, data: { status: sync.to } });
    }
  }

  return kot;
}