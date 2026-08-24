// server/src/reservations/reservations.service.js
//
// Data-access + business rules for table reservations. Pure functions — no
// req/res here — same pattern as tables.service.js.
//
// RESERVATION MODEL
// ------------------------------------------------------------------
// A TableReservation is an additional layer on top of RestaurantTable — it
// does NOT drive RestaurantTable.status. The existing FREE/OCCUPIED/RESERVED
// occupancy flow (owned by orders/KOT/billing) is left completely alone.
// Conflict checking below only looks at other reservations on the same
// table (status BOOKED or SEATED) whose time window overlaps — it never
// reads or writes RestaurantTable.status.
//
// Scoping: every reservation belongs to an outlet via `outletId` (the
// TableReservation.outlet relation), matching the multi-tenant pattern used
// across the rest of the app (req.tenant.outletId, populated by
// requireOutletContext). There is no "store" field on this model.
// ------------------------------------------------------------------

import prisma from "../config/prisma.js";

// Statuses that still "hold" a table slot (used for conflict checking).
const ACTIVE_RESERVATION_STATUSES = ["BOOKED", "SEATED"];

const RESERVATION_SELECT = {
  id: true,
  tableId: true,
  outletId: true,
  customerName: true,
  customerPhone: true,
  partySize: true,
  reservedFor: true,
  durationMinutes: true,
  status: true,
  notes: true,
  createdById: true,
  seatedAt: true,
  cancelledAt: true,
  noShowAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  table: {
    select: {
      id: true,
      name: true,
      capacity: true,
      floor: { select: { id: true, name: true } },
    },
  },
  createdBy: {
    select: { id: true, fullName: true, employeeCode: true },
  },
};

// ==============================================
// VALIDATION HELPERS
// ==============================================

function assertRequiredFields({
  tableId,
  customerName,
  customerPhone,
  partySize,
  reservedFor,
}) {
  if (!tableId) throw new Error("tableId is required");
  if (!customerName || !customerName.trim())
    throw new Error("Customer name is required");
  if (!customerPhone || !customerPhone.trim())
    throw new Error("Customer phone is required");
  if (!partySize || Number(partySize) <= 0)
    throw new Error("Party size must be greater than 0");
  if (!reservedFor || Number.isNaN(new Date(reservedFor).getTime())) {
    throw new Error("A valid reservation date/time is required");
  }
}

async function assertTableInOutlet(tableId, outletId) {
  const table = await prisma.restaurantTable.findFirst({
    where: { id: tableId, outletId },
    select: { id: true },
  });
  if (!table) {
    throw new Error("Selected table does not exist in this outlet");
  }
}

// Prevent two active (BOOKED/SEATED) reservations on the same table with
// overlapping [reservedFor, reservedFor + durationMinutes) windows.
async function assertNoConflict({
  tableId,
  reservedFor,
  durationMinutes,
  excludeId,
}) {
  const start = new Date(reservedFor);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  const candidates = await prisma.tableReservation.findMany({
    where: {
      tableId,
      status: { in: ACTIVE_RESERVATION_STATUSES },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, reservedFor: true, durationMinutes: true },
  });

  const conflict = candidates.some((r) => {
    const rStart = new Date(r.reservedFor);
    const rEnd = new Date(rStart.getTime() + r.durationMinutes * 60000);
    return start < rEnd && rStart < end; // standard interval overlap check
  });

  if (conflict) {
    throw new Error(
      "This table already has a reservation that overlaps this time",
    );
  }
}

// ==============================================
// LIST / GET
// ==============================================

// filters: { date, status, tableId, customer, phone }
export async function listReservations(outletId, filters = {}) {
  const { date, status, tableId, customer, phone } = filters;

  const where = { outletId };

  if (status) where.status = status;
  if (tableId) where.tableId = tableId;

  if (customer) {
    where.customerName = { contains: customer, mode: "insensitive" };
  }
  if (phone) {
    where.customerPhone = { contains: phone };
  }

  if (date) {
    // date is expected as "YYYY-MM-DD" — match the whole calendar day.
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    where.reservedFor = { gte: dayStart, lt: dayEnd };
  }

  return prisma.tableReservation.findMany({
    where,
    select: RESERVATION_SELECT,
    orderBy: { reservedFor: "asc" },
  });
}

export async function getReservationById(id, outletId) {
  return prisma.tableReservation.findFirst({
    where: { id, outletId },
    select: RESERVATION_SELECT,
  });
}

// ==============================================
// CREATE / UPDATE
// ==============================================

export async function createReservation({
  tableId,
  customerName,
  customerPhone,
  partySize,
  reservedFor,
  durationMinutes,
  notes,
  outletId,
  createdBy,
}) {
  assertRequiredFields({
    tableId,
    customerName,
    customerPhone,
    partySize,
    reservedFor,
  });

  const duration = durationMinutes ? Number(durationMinutes) : 60;

  await assertTableInOutlet(tableId, outletId);
  await assertNoConflict({ tableId, reservedFor, durationMinutes: duration });

  return prisma.tableReservation.create({
    data: {
      tableId,
      outletId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      partySize: Number(partySize),
      reservedFor: new Date(reservedFor),
      durationMinutes: duration,
      notes: notes?.trim() || null,
      createdById: createdBy || null,
    },
    select: RESERVATION_SELECT,
  });
}

export async function updateReservation(id, outletId, data) {
  const existing = await prisma.tableReservation.findFirst({
    where: { id, outletId },
    select: { id: true, tableId: true, status: true },
  });
  if (!existing) throw new Error("Reservation not found");

  if (existing.status !== "BOOKED") {
    throw new Error("Only BOOKED reservations can be edited");
  }

  const {
    tableId,
    customerName,
    customerPhone,
    partySize,
    reservedFor,
    durationMinutes,
    notes,
  } = data;

  const nextTableId = tableId || existing.tableId;
  const nextReservedFor = reservedFor
    ? new Date(reservedFor)
    : undefined;
  const nextDuration =
    durationMinutes !== undefined ? Number(durationMinutes) : undefined;

  if (tableId) {
    await assertTableInOutlet(tableId, outletId);
  }

  // Only re-check conflicts if something time/table-relevant changed.
  if (tableId || reservedFor || durationMinutes !== undefined) {
    const current = await prisma.tableReservation.findUnique({
      where: { id },
      select: { reservedFor: true, durationMinutes: true },
    });
    await assertNoConflict({
      tableId: nextTableId,
      reservedFor: nextReservedFor || current.reservedFor,
      durationMinutes: nextDuration ?? current.durationMinutes,
      excludeId: id,
    });
  }

  return prisma.tableReservation.update({
    where: { id },
    data: {
      ...(tableId !== undefined ? { tableId } : {}),
      ...(customerName !== undefined
        ? { customerName: customerName.trim() }
        : {}),
      ...(customerPhone !== undefined
        ? { customerPhone: customerPhone.trim() }
        : {}),
      ...(partySize !== undefined ? { partySize: Number(partySize) } : {}),
      ...(nextReservedFor !== undefined ? { reservedFor: nextReservedFor } : {}),
      ...(nextDuration !== undefined ? { durationMinutes: nextDuration } : {}),
      ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
    },
    select: RESERVATION_SELECT,
  });
}

// ==============================================
// STATUS TRANSITIONS
// ==============================================

async function transition(id, outletId, fromStatuses, toStatus, timestampField) {
  const existing = await prisma.tableReservation.findFirst({
    where: { id, outletId },
    select: { id: true, status: true },
  });
  if (!existing) throw new Error("Reservation not found");

  if (!fromStatuses.includes(existing.status)) {
    throw new Error(
      `Cannot move a ${existing.status} reservation to ${toStatus}`,
    );
  }

  return prisma.tableReservation.update({
    where: { id },
    data: {
      status: toStatus,
      ...(timestampField ? { [timestampField]: new Date() } : {}),
    },
    select: RESERVATION_SELECT,
  });
}

export async function seatReservation(id, outletId) {
  // BOOKED -> SEATED. Deliberately does NOT touch RestaurantTable.status —
  // that continues to be driven by the existing order/KOT/billing flow.
  return transition(id, outletId, ["BOOKED"], "SEATED", "seatedAt");
}

export async function cancelReservation(id, outletId) {
  return transition(id, outletId, ["BOOKED"], "CANCELLED", "cancelledAt");
}

export async function noShowReservation(id, outletId) {
  return transition(id, outletId, ["BOOKED"], "NO_SHOW", "noShowAt");
}

export async function completeReservation(id, outletId) {
  return transition(id, outletId, ["SEATED"], "COMPLETED", "completedAt");
}

// ==============================================
// TABLE INTEGRATION
// Used by tables.service.js to attach "upcoming reservation" info to the
// existing table list responses — read-only, additive.
// ==============================================

export async function getUpcomingReservationsByTableIds(tableIds) {
  if (!tableIds || tableIds.length === 0) return {};

  const upcoming = await prisma.tableReservation.findMany({
    where: {
      tableId: { in: tableIds },
      status: "BOOKED",
      reservedFor: { gte: new Date() },
    },
    orderBy: { reservedFor: "asc" },
    select: {
      tableId: true,
      id: true,
      customerName: true,
      partySize: true,
      reservedFor: true,
    },
  });

  // Keep only the soonest upcoming reservation per table.
  const byTable = {};
  for (const r of upcoming) {
    if (!byTable[r.tableId]) byTable[r.tableId] = r;
  }
  return byTable;
}