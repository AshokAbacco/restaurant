// server/src/pos/tables/tables.service.js
import prisma from "../../config/prisma.js";

const WAITER_SELECT = { id: true, fullName: true, employeeCode: true };

// ---------------------------------------------------------------------------
// Floors — power the floor tabs on the Tables Management page. A floor is
// just a named grouping that tables belong to (floorId on RestaurantTable).
// ---------------------------------------------------------------------------

export async function listFloors(outletId) {
  return prisma.floor.findMany({
    where: { outletId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getFloorById(id, outletId) {
  return prisma.floor.findFirst({ where: { id, outletId } });
}

export async function createFloor(payload, outletId) {
  return prisma.floor.create({ data: { ...payload, outletId } });
}

export async function updateFloor(id, payload, outletId) {
  const existing = await prisma.floor.findFirst({ where: { id, outletId } });
  if (!existing) throw new Error("Floor not found");
  return prisma.floor.update({ where: { id }, data: payload });
}

// Tables on a deleted floor are not deleted with it — they're just
// unassigned (floorId set to null) so no order/table data is ever lost.
export async function deleteFloor(id, outletId) {
  const existing = await prisma.floor.findFirst({ where: { id, outletId } });
  if (!existing) throw new Error("Floor not found");

  await prisma.restaurantTable.updateMany({
    where: { floorId: id, outletId },
    data: { floorId: null },
  });
  return prisma.floor.delete({ where: { id } });
}

export async function listTables({ status, section, outletId, floorId, waiterId }) {
  return prisma.restaurantTable.findMany({
    where: {
      outletId,
      ...(status ? { status } : {}),
      ...(section ? { section } : {}),
      ...(floorId ? { floorId } : {}),
      // Present only when the caller is a WAITER (injected by
      // tables.controller.js) — restricts the result to just their own
      // assigned tables. Absent for everyone else, so Owner/Admin/Manager/
      // Cashier still see every table as before.
      ...(waiterId ? { waiterId } : {}),
    },
    include: {
      orders: {
        where: { status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] } },
      },
      // Waiter assignment — shown as a badge on each TableCard, and used by
      // the Owner/Manager "Assign Waiter" screen to know who already has what.
      waiter: { select: WAITER_SELECT },
    },
    orderBy: { name: "asc" },
  });
}

// Kitchen stage ranking, lowest = least progressed. Used to pick the
// "current" kitchen status for an order that may have multiple tickets
// (one per kitchen section) — we show the LEAST advanced one, since a table
// isn't really "Ready" until every section's ticket is ready.
const KITCHEN_STAGE_RANK = {
  NEW: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  SERVED: 4,
  COMPLETED: 5,
};

function deriveKitchenStatus(kitchenOrders) {
  const active = kitchenOrders.filter((k) => k.status !== "CANCELLED");
  if (active.length === 0) return null;
  return active.reduce((least, k) =>
    KITCHEN_STAGE_RANK[k.status] < KITCHEN_STAGE_RANK[least.status] ? k : least,
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
export async function getTablesBoard({ outletId, floorId, waiterId } = {}) {
  const tables = await prisma.restaurantTable.findMany({
    where: {
      outletId,
      ...(floorId ? { floorId } : {}),
      ...(waiterId ? { waiterId } : {}),
    },
    include: {
      waiter: { select: WAITER_SELECT },
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
      waiter: table.waiter,
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

export async function getTableById(id, outletId) {
  return prisma.restaurantTable.findFirst({
    where: { id, outletId },
    include: {
      orders: {
        where: { status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] } },
      },
      waiter: { select: WAITER_SELECT },
    },
  });
}

export async function createTable(payload, outletId) {
  return prisma.restaurantTable.create({
    data: { ...payload, outletId },
    include: { waiter: { select: WAITER_SELECT } },
  });
}

export async function updateTable(id, payload, outletId) {
  const existing = await prisma.restaurantTable.findFirst({
    where: { id, outletId },
  });
  if (!existing) throw new Error("Table not found");

  return prisma.restaurantTable.update({
    where: { id },
    data: payload,
    include: { waiter: { select: WAITER_SELECT } },
  });
}

export async function deleteTable(id, outletId) {
  const existing = await prisma.restaurantTable.findFirst({
    where: { id, outletId },
  });
  if (!existing) throw new Error("Table not found");

  return prisma.restaurantTable.delete({ where: { id } });
}

// Merges the source table's active order into the target table, freeing the source.
export async function mergeTables(sourceTableId, targetTableId, outletId) {
  // Both tables must belong to this outlet — previously neither was
  // checked at all, so a stray/guessed targetTableId from another outlet
  // would have silently moved an order there.
  const [sourceTable, targetTable] = await Promise.all([
    prisma.restaurantTable.findFirst({
      where: { id: sourceTableId, outletId },
    }),
    prisma.restaurantTable.findFirst({
      where: { id: targetTableId, outletId },
    }),
  ]);
  if (!sourceTable) throw new Error("Source table not found");
  if (!targetTable) throw new Error("Target table not found");

  const sourceOrder = await prisma.order.findFirst({
    where: {
      tableId: sourceTableId,
      outletId,
      status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] },
    },
  });
  if (!sourceOrder) throw new Error("No active order on source table");

  await prisma.order.update({
    where: { id: sourceOrder.id },
    data: { tableId: targetTableId },
  });
  await prisma.restaurantTable.update({
    where: { id: sourceTableId },
    data: { status: "FREE" },
  });
  await prisma.restaurantTable.update({
    where: { id: targetTableId },
    data: { status: "OCCUPIED" },
  });

  return prisma.order.findUnique({
    where: { id: sourceOrder.id },
    include: { items: true },
  });
}

// ---------------------------------------------------------------------------
// WAITER ASSIGNMENT
//
// A table can be assigned to at most one waiter at a time
// (RestaurantTable.waiterId, added alongside this feature). Owner/Admin/
// Manager assign tables individually, by whole floor, or "all tables" in
// one go. A waiter's own view (getMyTables / getTableDetailForWaiter) is
// always scoped to tables where waiterId === their own employee id — they
// never see another waiter's tables, orders, or payments.
// ---------------------------------------------------------------------------

export async function listWaiters(outletId) {
  const employees = await prisma.employee.findMany({
    where: {
      status: "ACTIVE",
      outletId,
      userAccount: { role: "WAITER", isActive: true },
    },
    select: {
      id: true,
      fullName: true,
      employeeCode: true,
      photoUrl: true,
      _count: { select: { assignedTables: true } },
    },
    orderBy: { fullName: "asc" },
  });

  return employees.map((e) => ({
    id: e.id,
    fullName: e.fullName,
    employeeCode: e.employeeCode,
    photoUrl: e.photoUrl,
    assignedTableCount: e._count.assignedTables,
  }));
}

async function assertWaiterExists(waiterId, outletId) {
  const waiter = await prisma.employee.findFirst({
    where: { id: waiterId, outletId, userAccount: { role: "WAITER" } },
    select: { id: true },
  });
  if (!waiter) {
    throw new Error("Selected employee is not an active waiter");
  }
}

// Assign a specific list of table ids to a waiter.
export async function assignTables({ tableIds, waiterId, outletId }) {
  if (!Array.isArray(tableIds) || tableIds.length === 0) {
    throw new Error("tableIds must be a non-empty array");
  }
  await assertWaiterExists(waiterId, outletId);

  await prisma.restaurantTable.updateMany({
    where: { id: { in: tableIds }, outletId },
    data: { waiterId, assignedAt: new Date() },
  });

  return prisma.restaurantTable.findMany({
    where: { id: { in: tableIds }, outletId },
    include: { waiter: { select: WAITER_SELECT } },
  });
}

// Assign every table on one floor (e.g. "Ground Floor") to a waiter.
export async function assignFloorToWaiter({ floorId, waiterId, outletId }) {
  if (!floorId) throw new Error("floorId is required");
  await assertWaiterExists(waiterId, outletId);

  const result = await prisma.restaurantTable.updateMany({
    where: { floorId, outletId },
    data: { waiterId, assignedAt: new Date() },
  });

  return { count: result.count };
}

// Assign every table in this outlet to a single waiter. (Previously took an
// optional `store` to scope this — now outletId is always the scope, there's
// no "assign across every store" case that makes sense per-outlet auth.)
export async function assignAllTables({ waiterId, outletId }) {
  await assertWaiterExists(waiterId, outletId);

  const result = await prisma.restaurantTable.updateMany({
    where: { outletId },
    data: { waiterId, assignedAt: new Date() },
  });

  return { count: result.count };
}

// Remove a table's assignment (goes back to unassigned / any-waiter pool).
export async function unassignTable(id, outletId) {
  const existing = await prisma.restaurantTable.findFirst({
    where: { id, outletId },
  });
  if (!existing) throw new Error("Table not found");

  return prisma.restaurantTable.update({
    where: { id },
    data: { waiterId: null, assignedAt: null },
    include: { waiter: { select: WAITER_SELECT } },
  });
}

// Remove ALL of a waiter's assignments at once (e.g. before reassigning,
// or when the employee goes off shift / is removed).
export async function unassignAllForWaiter(waiterId, outletId) {
  const result = await prisma.restaurantTable.updateMany({
    where: { waiterId, outletId },
    data: { waiterId: null, assignedAt: null },
  });
  return { count: result.count };
}

// ==============================================
// WAITER'S OWN VIEW — "My Tables"
// Scoped strictly to tables where waiterId === the logged-in waiter.
// ==============================================

export async function getMyTables(waiterId, outletId) {
  const tables = await prisma.restaurantTable.findMany({
    where: { waiterId, outletId },
    include: {
      floor: { select: { id: true, name: true } },
      orders: {
        where: { status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          grandTotal: true,
          numberOfGuests: true,
          createdAt: true,
          payments: {
            select: { status: true, method: true, amount: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
    orderBy: [{ floor: { name: "asc" } }, { name: "asc" }],
  });

  return tables.map((t) => {
    const order = t.orders[0] || null;
    const paid = order
      ? order.payments.reduce(
          (sum, p) => (p.status === "PAID" ? sum + Number(p.amount) : sum),
          0,
        )
      : 0;
    const paymentStatus = !order
      ? null
      : paid >= Number(order.grandTotal)
        ? "PAID"
        : paid > 0
          ? "PARTIALLY_PAID"
          : "UNPAID";

    return {
      id: t.id,
      name: t.name,
      capacity: t.capacity,
      section: t.section,
      status: t.status,
      floor: t.floor,
      order: order
        ? {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            grandTotal: order.grandTotal,
            numberOfGuests: order.numberOfGuests,
            createdAt: order.createdAt,
            paymentStatus,
            amountPaid: paid,
          }
        : null,
    };
  });
}

// Detail for a single table — order items + full payment history. Scoped
// to waiterId (and now outletId too) so a waiter can only ever pull up
// tables assigned to them; returns null (controller -> 404) for anyone
// else's table, same as if it didn't exist, so we don't leak which tables
// exist.
export async function getTableDetailForWaiter(tableId, waiterId, outletId) {
  return prisma.restaurantTable.findFirst({
    where: { id: tableId, waiterId, outletId },
    include: {
      floor: { select: { id: true, name: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          items: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              notes: true,
              menuItem: { select: { name: true } },
            },
          },
          payments: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              method: true,
              amount: true,
              status: true,
              paidAt: true,
            },
          },
        },
      },
    },
  });
}