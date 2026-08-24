// server/src/settings/settings.service.js
//
// First real feature in this module (previously an empty stub) — see
// the master build plan's Phase 1.1: Custom Order Status.
import prisma from "../config/prisma.js";

// The real state machine — never customizable, always exactly these
// values. customLabel/color are a cosmetic layer on top, nothing more.
const SYSTEM_STATUSES = [
  "NEW",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "SERVED",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
  "ON_HOLD",
];

// Sensible out-of-the-box labels — an outlet that's never touched this
// settings page still gets something better than the raw enum value
// (e.g. "Out For Delivery" instead of "OUT_FOR_DELIVERY").
const DEFAULT_LABELS = {
  NEW: { customLabel: "New", color: "#6B7280", sortOrder: 0 },
  ACCEPTED: { customLabel: "Accepted", color: "#3B82F6", sortOrder: 1 },
  PREPARING: { customLabel: "Preparing", color: "#F59E0B", sortOrder: 2 },
  READY: { customLabel: "Ready", color: "#10B981", sortOrder: 3 },
  SERVED: { customLabel: "Served", color: "#3FA34D", sortOrder: 4 },
  OUT_FOR_DELIVERY: { customLabel: "Out For Delivery", color: "#8B5CF6", sortOrder: 5 },
  COMPLETED: { customLabel: "Completed", color: "#3FA34D", sortOrder: 6 },
  CANCELLED: { customLabel: "Cancelled", color: "#EF4444", sortOrder: 7 },
  REFUNDED: { customLabel: "Refunded", color: "#EF4444", sortOrder: 8 },
  ON_HOLD: { customLabel: "On Hold", color: "#F59E0B", sortOrder: 9 },
};

// Returns all 10 system statuses for this outlet, with whatever custom
// label/color it has saved, falling back to DEFAULT_LABELS for any status
// it hasn't customized yet (never returns fewer than 10 rows — the
// settings UI always shows every status, customized or not).
export async function listOrderStatusLabels(outletId) {
  const saved = await prisma.orderStatusLabel.findMany({ where: { outletId } });
  const savedByStatus = Object.fromEntries(saved.map((s) => [s.systemStatus, s]));

  return SYSTEM_STATUSES.map((systemStatus) => {
    const existing = savedByStatus[systemStatus];
    const fallback = DEFAULT_LABELS[systemStatus];
    return (
      existing || {
        id: null, // not yet saved — frontend can tell this apart from a real row
        outletId,
        systemStatus,
        customLabel: fallback.customLabel,
        color: fallback.color,
        sortOrder: fallback.sortOrder,
        isActive: true,
      }
    );
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

// Returns { NEW: "New", PREPARING: "Cooking", ... } — the shape every
// consumer (pos.service.js, kot.service.js, reports, etc.) actually wants:
// a plain lookup from system status to display label, no need to know
// about the OrderStatusLabel model at all. Falls back to DEFAULT_LABELS
// the same way listOrderStatusLabels does, so a caller never gets an
// empty label for a status this outlet hasn't customized.
export async function getOrderStatusLabelMap(outletId) {
  const labels = await listOrderStatusLabels(outletId);
  return Object.fromEntries(labels.map((l) => [l.systemStatus, l.customLabel]));
}

// Upserts ONE status's label/color — the settings page saves one row at a
// time as the user edits it, not the whole set together.
export async function upsertOrderStatusLabel(
  outletId,
  systemStatus,
  { customLabel, color, sortOrder, isActive },
) {
  if (!SYSTEM_STATUSES.includes(systemStatus)) {
    const err = new Error(
      `"${systemStatus}" isn't a real order status. Must be one of: ${SYSTEM_STATUSES.join(", ")}`,
    );
    err.statusCode = 400;
    throw err;
  }
  if (!customLabel || !customLabel.trim()) {
    const err = new Error("customLabel is required.");
    err.statusCode = 400;
    throw err;
  }

  return prisma.orderStatusLabel.upsert({
    where: { outletId_systemStatus: { outletId, systemStatus } },
    create: {
      outletId,
      systemStatus,
      customLabel: customLabel.trim(),
      color,
      sortOrder: sortOrder ?? DEFAULT_LABELS[systemStatus].sortOrder,
      isActive: isActive ?? true,
    },
    update: {
      customLabel: customLabel.trim(),
      ...(color !== undefined ? { color } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });
}

// Resets one status back to the shipped default by deleting the outlet's
// customization for it (listOrderStatusLabels' fallback then takes over) —
// simpler and safer than trying to "know" what default to write back.
export async function resetOrderStatusLabel(outletId, systemStatus) {
  const existing = await prisma.orderStatusLabel.findFirst({
    where: { outletId, systemStatus },
  });
  if (!existing) {
    // Already at default (nothing saved) — treat as success, not a 404;
    // the end state the caller wants is already true.
    return { reset: true, alreadyDefault: true };
  }
  await prisma.orderStatusLabel.delete({ where: { id: existing.id } });
  return { reset: true, alreadyDefault: false };
}