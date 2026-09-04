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
  const tables = await prisma.restaurantTable.findMany({
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

  // FEATURE (Phase 1.3 — Table Reservation): same batched lookup
  // getTablesBoard uses, so the Tables management page (which calls this
  // function, not getTablesBoard) can show the same "Reserved 7:30 PM"
  // badge on its TableCard grid.
  const upcomingByTable = await getUpcomingReservationsByTable(
    tables.map((t) => t.id),
    outletId,
  );

  return tables.map((table) => ({
    ...table,
    upcomingReservation: upcomingByTable[table.id] || null,
  }));
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
      // Floor View groups its cards under floor headings ("Top Floor",
      // "Ground Floor"), so the board has to say which floor each table
      // belongs to. Without this the only way to build that grouping was
      // one /board request per floor.
      floor: { select: { id: true, name: true } },
      orders: {
        where: { status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          customer: { select: { name: true } },
          // Billing state, for the board's Printed (invoice raised) and
          // Paid (fully settled) colours. Both are read from the rows that
          // billing.service.js actually writes, for the same reason
          // kitchenStatus is read from KitchenOrder — a mirrored field on
          // Order would need a sync step that can drift.
          invoice: {
            select: { id: true, invoiceNumber: true, createdAt: true },
          },
          payments: { select: { id: true, amount: true, status: true } },
          // unitPrice/totalPrice/name feed the Orders page's hover tooltip
          // (item lines, quantities, costs). They're a snapshot on OrderItem
          // already, so this doesn't cost an extra query — just more columns
          // on a row we were reading anyway.
          items: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              menuItem: { select: { name: true } },
            },
          },
          kitchenOrders: { select: { id: true, status: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // FEATURE (Phase 1.3 — Table Reservation): one extra query for every
  // table's next upcoming reservation, so the floor view can show
  // "Reserved 7:30 PM" on an otherwise-free table without N+1 queries (one
  // findMany here instead of one per table).
  const upcomingByTable = await getUpcomingReservationsByTable(
    tables.map((t) => t.id),
    outletId,
  );

  // Tables billed today whose card hasn't been cleared off the board yet.
  // completeBilling closes the order and frees the table in one step, so a
  // just-paid table would otherwise blink straight back to blank — the
  // cashier never gets to see it settle. Returned separately from `order`
  // so nothing that consumes the active order (POS, Move KOT/Items,
  // "add items to this table") ever mistakes a closed order for a live one.
  const settledByTable = await getSettledOrdersByTable(
    tables.filter((t) => t.orders.length === 0).map((t) => t.id),
    outletId,
  );

  return tables.map((table) => {
    const order = table.orders[0] || null;
    return {
      id: table.id,
      name: table.name,
      capacity: table.capacity,
      section: table.section,
      status: table.status,
      waiter: table.waiter,
      floorId: table.floorId,
      floorName: table.floor?.name || null,
      upcomingReservation: upcomingByTable[table.id] || null,
      settledOrder: settledByTable[table.id] || null,
      order: order
        ? {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            invoice: order.invoice || null,
            amountPaid: sumPaid(order.payments),
            // The field the Orders page badge and "Complete Service" button
            // should use — always mirrors the Kitchen Display exactly.
            kitchenStatus: deriveKitchenStatus(order.kitchenOrders),
            customerName: order.customer?.name || null,
            itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
            // Flattened here rather than client-side so the Orders page gets
            // the same `itemLines` shape whether a card came from this board
            // or from /pos/orders (takeaway/delivery).
            itemLines: order.items.map((i) => ({
              id: i.id,
              name: i.menuItem?.name || "Item",
              quantity: i.quantity,
              unitPrice: Number(i.unitPrice),
              totalPrice: Number(i.totalPrice),
            })),
            kitchenOrderIds: order.kitchenOrders.map((k) => k.id),
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

// ---------------------------------------------------------------------------
// TABLE RESERVATIONS (Phase 1.3)
//
// A reservation is a future booking against a specific table. Booking it
// does NOT touch RestaurantTable.status immediately — a table stays FREE
// (bookable for a walk-in right now) right up until either its reservation
// time arrives (a scheduled sweep could flip it to RESERVED — not built
// yet, see note on markNoShows below) or staff explicitly seat the party
// (seatReservation, which does set status to OCCUPIED). This avoids a
// table sitting artificially "reserved" and unusable all day for a booking
// that's still 6 hours out.
// ---------------------------------------------------------------------------

const RESERVATION_INCLUDE = {
  table: { select: { id: true, name: true, capacity: true, section: true } },
  customer: { select: { id: true, name: true, mobile: true } },
  createdBy: { select: { fullName: true, employeeCode: true } },
};

// Only PAID rows count toward what's actually been collected. A Payment
// sitting at UNPAID/PARTIAL is a recorded intent, not money in the drawer,
// and counting it would turn a half-settled bill green on the board.
function sumPaid(payments = []) {
  return payments
    .filter((p) => p.status === "PAID")
    .reduce((total, p) => total + Number(p.amount), 0);
}

// The most recent order billed at each table today. Scoped to today (not
// "the last completed order, ever") so a table that's been empty since
// last week comes back blank rather than showing a week-old bill, and
// limited to orders that actually reached an invoice — a cancelled or
// refunded order was never settled and has nothing to show.
async function getSettledOrdersByTable(tableIds, outletId) {
  if (tableIds.length === 0) return {};

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      outletId,
      tableId: { in: tableIds },
      status: "COMPLETED",
      updatedAt: { gte: dayStart },
      invoice: { isNot: null },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      tableId: true,
      orderNumber: true,
      status: true,
      grandTotal: true,
      createdAt: true,
      updatedAt: true,
      customer: { select: { name: true } },
      invoice: { select: { id: true, invoiceNumber: true, createdAt: true } },
      payments: { select: { id: true, amount: true, status: true } },
      items: { select: { quantity: true } },
    },
  });

  const byTable = {};
  for (const order of orders) {
    // Sorted newest-first, so the first one seen per table is the one that
    // just closed; earlier bills on the same table today are already
    // accounted for on the Payments page.
    if (byTable[order.tableId]) continue;
    byTable[order.tableId] = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      invoice: order.invoice,
      amountPaid: sumPaid(order.payments),
      grandTotal: order.grandTotal,
      customerName: order.customer?.name || null,
      itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
      createdAt: order.createdAt,
      settledAt: order.updatedAt,
    };
  }
  return byTable;
}

// Powers the floor view's "Reserved 7:30 PM" badge — the single next
// upcoming (still-BOOKED, in-the-future) reservation per table, batched
// into one query for however many tableIds are passed in.
async function getUpcomingReservationsByTable(tableIds, outletId) {
  if (tableIds.length === 0) return {};

  const reservations = await prisma.tableReservation.findMany({
    where: {
      outletId,
      tableId: { in: tableIds },
      status: "BOOKED",
      reservedFor: { gte: new Date() },
    },
    orderBy: { reservedFor: "asc" },
    select: {
      id: true,
      tableId: true,
      customerName: true,
      partySize: true,
      reservedFor: true,
    },
  });

  const byTable = {};
  for (const r of reservations) {
    // Already sorted by reservedFor ascending — first one seen per table
    // is that table's NEXT reservation; later ones for the same table are
    // ignored here (the full list is available via listReservations).
    if (!byTable[r.tableId]) byTable[r.tableId] = r;
  }
  return byTable;
}

export async function listReservations({ date, tableId, status }, outletId) {
  const where = { outletId };
  if (tableId) where.tableId = tableId;
  if (status) where.status = status;

  if (date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    where.reservedFor = { gte: dayStart, lt: dayEnd };
  }

  return prisma.tableReservation.findMany({
    where,
    include: RESERVATION_INCLUDE,
    orderBy: { reservedFor: "asc" },
  });
}

export async function getReservationById(id, outletId) {
  return prisma.tableReservation.findFirst({
    where: { id, outletId },
    include: RESERVATION_INCLUDE,
  });
}

export async function createReservation(payload, outletId) {
  const {
    tableId,
    customerId,
    customerName,
    customerPhone,
    partySize,
    reservedFor,
    durationMinutes,
    notes,
    createdById,
  } = payload;

  if (!tableId) throw new Error("tableId is required");
  if (!customerName || !customerName.trim())
    throw new Error("customerName is required");
  if (!partySize || Number(partySize) <= 0)
    throw new Error("partySize must be greater than 0");
  if (!reservedFor) throw new Error("reservedFor is required");

  const reservedForDate = new Date(reservedFor);
  if (Number.isNaN(reservedForDate.getTime())) {
    throw new Error("reservedFor is not a valid date/time");
  }

  const table = await prisma.restaurantTable.findFirst({ where: { id: tableId, outletId } });
  if (!table) throw new Error("Table not found");

  if (customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, outletId } });
    if (!customer) throw new Error("Customer not found");
  }

  // Warn-level conflict check (per the plan: reservations "block/warn"
  // against overlapping bookings on the same table) — an overlapping BOOKED
  // reservation on the same table is flagged as an error the caller can
  // choose to override by not retrying, rather than silently double-booking.
  const duration = durationMinutes || 90;
  const newStart = reservedForDate;
  const newEnd = new Date(newStart.getTime() + duration * 60000);

  const existingOnTable = await prisma.tableReservation.findMany({
    where: { outletId, tableId, status: "BOOKED" },
    select: { reservedFor: true, durationMinutes: true, customerName: true },
  });

  const conflict = existingOnTable.find((r) => {
    const existingStart = new Date(r.reservedFor);
    const existingEnd = new Date(existingStart.getTime() + r.durationMinutes * 60000);
    return newStart < existingEnd && newEnd > existingStart;
  });

  if (conflict) {
    const err = new Error(
      `This table already has a reservation for ${conflict.customerName} around that time.`,
    );
    err.code = "RESERVATION_CONFLICT";
    throw err;
  }

  return prisma.tableReservation.create({
    data: {
      outletId,
      tableId,
      customerId: customerId || null,
      customerName: customerName.trim(),
      customerPhone: customerPhone || null,
      partySize: Number(partySize),
      reservedFor: reservedForDate,
      durationMinutes: duration,
      notes: notes || null,
      createdById: createdById || null,
    },
    include: RESERVATION_INCLUDE,
  });
}

export async function updateReservation(id, payload, outletId) {
  const existing = await prisma.tableReservation.findFirst({ where: { id, outletId } });
  if (!existing) throw new Error("Reservation not found");

  if (existing.status !== "BOOKED") {
    throw new Error(`Cannot reschedule a reservation that's already ${existing.status}.`);
  }

  const data = {};
  if (payload.customerName !== undefined) data.customerName = payload.customerName.trim();
  if (payload.customerPhone !== undefined) data.customerPhone = payload.customerPhone;
  if (payload.partySize !== undefined) data.partySize = Number(payload.partySize);
  if (payload.notes !== undefined) data.notes = payload.notes;
  if (payload.durationMinutes !== undefined) data.durationMinutes = Number(payload.durationMinutes);
  if (payload.tableId !== undefined) {
    const table = await prisma.restaurantTable.findFirst({
      where: { id: payload.tableId, outletId },
    });
    if (!table) throw new Error("Table not found");
    data.tableId = payload.tableId;
  }
  if (payload.reservedFor !== undefined) {
    const d = new Date(payload.reservedFor);
    if (Number.isNaN(d.getTime())) throw new Error("reservedFor is not a valid date/time");
    data.reservedFor = d;
  }

  return prisma.tableReservation.update({
    where: { id },
    data,
    include: RESERVATION_INCLUDE,
  });
}

// Marks the party as arrived — occupies the table for real. This is the
// bridge between "a future booking" and "an actual table in use"; nothing
// about POS order creation changes here, staff still open/create the order
// on this table normally once seated.
export async function seatReservation(id, outletId) {
  const reservation = await prisma.tableReservation.findFirst({ where: { id, outletId } });
  if (!reservation) throw new Error("Reservation not found");
  if (reservation.status !== "BOOKED") {
    throw new Error(`Cannot seat a reservation that's already ${reservation.status}.`);
  }

  const table = await prisma.restaurantTable.findFirst({
    where: { id: reservation.tableId, outletId },
  });
  if (!table) throw new Error("Table not found");
  if (table.status === "OCCUPIED") {
    throw new Error("This table is already occupied by another order.");
  }

  const [updated] = await prisma.$transaction([
    prisma.tableReservation.update({
      where: { id },
      data: { status: "SEATED" },
      include: RESERVATION_INCLUDE,
    }),
    prisma.restaurantTable.update({
      where: { id: reservation.tableId },
      data: { status: "OCCUPIED" },
    }),
  ]);

  return updated;
}

export async function cancelReservation(id, { reason } = {}, outletId) {
  const reservation = await prisma.tableReservation.findFirst({ where: { id, outletId } });
  if (!reservation) throw new Error("Reservation not found");
  if (reservation.status !== "BOOKED") {
    throw new Error(`Cannot cancel a reservation that's already ${reservation.status}.`);
  }

  return prisma.tableReservation.update({
    where: { id },
    data: {
      status: "CANCELLED",
      notes: reason
        ? `${reservation.notes ? reservation.notes + "\n" : ""}Cancelled: ${reason}`
        : reservation.notes,
    },
    include: RESERVATION_INCLUDE,
  });
}

// FOLLOW-UP (not built yet): a scheduled job to sweep BOOKED reservations
// whose reservedFor + durationMinutes has passed without being seated, and
// mark them NO_SHOW. Would follow the exact same "loop over every active
// Outlet" pattern already noted for alerts.service.js's generateAlerts and
// attendance.service.js's markAbsentees — flagging here rather than
// guessing at a cron setup that doesn't exist in this codebase yet.