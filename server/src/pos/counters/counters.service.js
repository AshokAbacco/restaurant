// server/src/pos/counters/counters.service.js
//
// Phase 2.2 — Counter/Terminal management. CRUD for BillingCounter, the
// physical POS device identity every order is optionally tagged with (see
// schema.prisma). Owner/Admin manage the list from Settings; every other
// staff member just picks one on their terminal (see the client-side
// counter-selection flow, a localStorage choice, not part of login).
import prisma from "../../config/prisma.js";

export async function listCounters({ activeOnly } = {}, outletId) {
  return prisma.billingCounter.findMany({
    where: {
      outletId,
      ...(activeOnly === "true" || activeOnly === true ? { isActive: true } : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function getCounterById(id, outletId) {
  return prisma.billingCounter.findFirst({ where: { id, outletId } });
}

export async function createCounter({ name }, outletId) {
  if (!name || !name.trim()) {
    const err = new Error("Counter name is required.");
    err.statusCode = 400;
    throw err;
  }
  try {
    return await prisma.billingCounter.create({ data: { outletId, name: name.trim() } });
  } catch (err) {
    if (err.code === "P2002") {
      const dup = new Error(`A counter named "${name.trim()}" already exists.`);
      dup.statusCode = 409;
      throw dup;
    }
    throw err;
  }
}

export async function updateCounter(id, { name, isActive }, outletId) {
  const existing = await prisma.billingCounter.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Counter not found");
    err.statusCode = 404;
    throw err;
  }
  try {
    return await prisma.billingCounter.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      const dup = new Error(`A counter named "${name?.trim()}" already exists.`);
      dup.statusCode = 409;
      throw dup;
    }
    throw err;
  }
}

// Soft-deactivate only, never a hard delete — a counter with real order
// history attached should stay resolvable in old reports/receipts, same
// reasoning as Outlet's own deactivate-only delete (stores.service.js).
export async function deactivateCounter(id, outletId) {
  const existing = await prisma.billingCounter.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Counter not found");
    err.statusCode = 404;
    throw err;
  }
  return prisma.billingCounter.update({ where: { id }, data: { isActive: false } });
}