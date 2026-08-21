// server/src/lib/auditLog.service.js
//
// Thin wrapper around AuditLog.create(). Deliberately fire-and-forget-safe:
// writeAuditLog() swallows its own errors (logging to console instead of
// throwing) so a logging failure can never block or roll back the real
// action it's describing — e.g. a DB hiccup writing the audit row must
// never prevent an order deletion the Owner explicitly requested.
import prisma from "../config/prisma.js";

/**
 * @param {object} entry
 * @param {string} entry.outletId - required now that AuditLog is
 *   outlet-scoped (schema.prisma) — every caller must pass req.tenant.outletId
 * @param {string} entry.action - e.g. "ORDER_DELETED"
 * @param {string} entry.entityType - e.g. "Order"
 * @param {string} entry.entityId
 * @param {string|null} [entry.performedById] - Employee.id of the actor
 * @param {string|null} [entry.performedByRole] - role snapshot at the time
 * @param {object} [entry.metadata] - free-form extra detail
 */
export async function writeAuditLog({
  outletId,
  action,
  entityType,
  entityId,
  performedById = null,
  performedByRole = null,
  metadata = null,
}) {
  if (!outletId) {
    // Same "never throw" contract as the DB-failure catch below — a
    // missing outletId is a caller bug, but audit logging must still
    // never be the thing that blocks the real action. Log loudly instead.
    console.error(
      "writeAuditLog called without outletId — skipping:",
      action,
      entityType,
      entityId,
    );
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        outletId,
        action,
        entityType,
        entityId,
        performedById,
        performedByRole,
        metadata,
      },
    });
  } catch (err) {
    // Deliberately not re-thrown — see file header. Still surfaced to
    // server logs so a persistent audit-logging failure doesn't go
    // completely unnoticed.
    console.error(
      "Failed to write audit log:",
      action,
      entityType,
      entityId,
      err.message,
    );
  }
}

export async function listAuditLogs({
  outletId,
  entityType,
  entityId,
  action,
  page = 1,
  limit = 50,
} = {}) {
  const where = {
    outletId,
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(action ? { action } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, total, page: Number(page), limit: Number(limit) };
}