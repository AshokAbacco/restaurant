// server/src/pos/online-platforms/onlinePlatforms.service.js
//
// Online Orders feature — CRUD for OnlinePlatform, the list of aggregator
// names (Swiggy, Zomato, etc.) staff can tag a manually-keyed-in order
// with. This is NOT a live aggregator integration (no menu sync, no
// webhooks, no automatic order import) — that's explicitly deferred (see
// the build plan's Phase 4). This just lets an order be labeled as coming
// from one of these platforms, so it can be visually distinguished on the
// Kitchen Display and grouped in reports.
import prisma from "../../config/prisma.js";

export async function listPlatforms({ activeOnly } = {}, outletId) {
  return prisma.onlinePlatform.findMany({
    where: {
      outletId,
      ...(activeOnly === "true" || activeOnly === true ? { isActive: true } : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function getPlatformById(id, outletId) {
  return prisma.onlinePlatform.findFirst({ where: { id, outletId } });
}

// Unlike BillingCounter (Owner/Admin only), any POS role can add a new
// platform on the fly from the order screen's dropdown — a cashier
// shouldn't have to find an Owner just to add "Zomato" to the list the
// first time an order comes in from it.
export async function createPlatform({ name }, outletId) {
  if (!name || !name.trim()) {
    const err = new Error("Platform name is required.");
    err.statusCode = 400;
    throw err;
  }
  try {
    return await prisma.onlinePlatform.create({ data: { outletId, name: name.trim() } });
  } catch (err) {
    if (err.code === "P2002") {
      const dup = new Error(`"${name.trim()}" is already in the list.`);
      dup.statusCode = 409;
      throw dup;
    }
    throw err;
  }
}

export async function updatePlatform(id, { name, isActive }, outletId) {
  const existing = await prisma.onlinePlatform.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Platform not found");
    err.statusCode = 404;
    throw err;
  }
  try {
    return await prisma.onlinePlatform.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      const dup = new Error(`"${name?.trim()}" is already in the list.`);
      dup.statusCode = 409;
      throw dup;
    }
    throw err;
  }
}

// Soft-deactivate only, never a hard delete — same reasoning as
// BillingCounter: past orders should stay attributable to a real platform
// name in reports, not point at a deleted row.
export async function deactivatePlatform(id, outletId) {
  const existing = await prisma.onlinePlatform.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Platform not found");
    err.statusCode = 404;
    throw err;
  }
  return prisma.onlinePlatform.update({ where: { id }, data: { isActive: false } });
}