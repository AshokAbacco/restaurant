// server/src/pos/tables/tables.service.js
import prisma from "../../config/prisma.js";

// ---------------------------------------------------------------------------
// Floors — power the floor tabs on the Tables Management page. A floor is
// just a named grouping that tables belong to (floorId on RestaurantTable).
// ---------------------------------------------------------------------------

export async function listFloors({ store } = {}) {
  return prisma.floor.findMany({
    where: store ? { store } : {},
    orderBy: { createdAt: "asc" },
  });
}

export async function getFloorById(id) {
  return prisma.floor.findUnique({ where: { id } });
}

export async function createFloor(payload) {
  return prisma.floor.create({ data: payload });
}

export async function updateFloor(id, payload) {
  return prisma.floor.update({ where: { id }, data: payload });
}

// Tables on a deleted floor are not deleted with it — they're just
// unassigned (floorId set to null) so no order/table data is ever lost.
export async function deleteFloor(id) {
  await prisma.restaurantTable.updateMany({ where: { floorId: id }, data: { floorId: null } });
  return prisma.floor.delete({ where: { id } });
}

export async function listTables({ status, section, store, floorId }) {
  return prisma.restaurantTable.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(section ? { section } : {}),
      ...(store ? { store } : {}),
      ...(floorId ? { floorId } : {}),
    },
    include: { orders: { where: { status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] } } } },
    orderBy: { name: "asc" },
  });
}

// Kitchen stage ranking, lowest = least progressed. Used to pick the
// "current" kitchen status for an order that may have multiple tickets
// (one per kitchen section) — we show the LEAST advanced one, since a table
// isn't really "Ready" until every section's ticket is ready.
const KITCHEN_STAGE_RANK = { NEW: 0, ACCEPTED: 1, PREPARING: 2, READY: 3, SERVED: 4, COMPLETED: 5 };

function deriveKitchenStatus(kitchenOrders) {
  const active = kitchenOrders.filter((k) => k.status !== "CANCELLED");
  if (active.length === 0) return null;
  return active.reduce((least, k) =>
    KITCHEN_STAGE_RANK[k.status] < KITCHEN_STAGE_RANK[least.status] ? k : least
  ).status;
}

// Table-wise view for the Orders page: every table plus its active order's
// customer, item count, total, and current kitchen status, in one call —
// so the frontend doesn't have to stitch together /tables + /orders itself.
//
// IMPORTANT: kitchenStatus is read directly from the order's live
// KitchenOrder rows (the exact same rows the Kitchen Display reads from),
// not from Order.status. This is deliberate — mirroring the kitchen status
// onto a separate field on Order requires a sync step that runs on every
// single kitchen status update, and if that sync ever misses a case (or the
// updated code doesn't get deployed), the two pages silently drift apart.
// Reading the same underlying rows both pages already share removes the
// possibility of drift entirely — there's nothing to keep in sync.
export async function getTablesBoard({ store, floorId } = {}) {
  const tables = await prisma.restaurantTable.findMany({
    where: {
      ...(store ? { store } : {}),
      ...(floorId ? { floorId } : {}),
    },
    include: {
      orders: {
        where: { status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          customer: { select: { name: true } },
          items: { select: { id: true, quantity: true } },
          kitchenOrders: { select: { status: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return tables.map((table) => {
    const order = table.orders[0] || null;
    return {
      id: table.id,
      name: table.name,
      capacity: table.capacity,
      section: table.section,
      status: table.status,
      order: order
        ? {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            // The field the Orders page badge and "Complete Service" button
            // should use — always mirrors the Kitchen Display exactly.
            kitchenStatus: deriveKitchenStatus(order.kitchenOrders),
            customerName: order.customer?.name || null,
            itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
            grandTotal: order.grandTotal,
            createdAt: order.createdAt,
          }
        : null,
    };
  });
}

export async function getTableById(id) {
  return prisma.restaurantTable.findUnique({
    where: { id },
    include: { orders: { where: { status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] } } } },
  });
}

export async function createTable(payload) {
  return prisma.restaurantTable.create({ data: payload });
}

export async function updateTable(id, payload) {
  return prisma.restaurantTable.update({ where: { id }, data: payload });
}

export async function deleteTable(id) {
  return prisma.restaurantTable.delete({ where: { id } });
}

// Merges the source table's active order into the target table, freeing the source.
export async function mergeTables(sourceTableId, targetTableId) {
  const sourceOrder = await prisma.order.findFirst({
    where: { tableId: sourceTableId, status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] } },
  });
  if (!sourceOrder) throw new Error("No active order on source table");

  await prisma.order.update({ where: { id: sourceOrder.id }, data: { tableId: targetTableId } });
  await prisma.restaurantTable.update({ where: { id: sourceTableId }, data: { status: "FREE" } });
  await prisma.restaurantTable.update({ where: { id: targetTableId }, data: { status: "OCCUPIED" } });

  return prisma.order.findUnique({ where: { id: sourceOrder.id }, include: { items: true } });
}