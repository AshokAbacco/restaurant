// server/src/kitchen-branches/kitchenBranches.service.js
//
// CRUD for KitchenBranch — a PHYSICAL kitchen ("Ground Floor Kitchen",
// "Rooftop Kitchen") that orders get routed to.
//
// Not to be confused with KitchenSection, which is a FUNCTIONAL station
// (Grill, Beverage) that menu items map to via MenuItem.kitchenSectionId.
// A ticket carries both: the branch says which kitchen cooks it, the section
// says which station inside that kitchen.
import prisma from "../config/prisma.js";

// Everything here is scoped by outletId, like every other service in this
// codebase — a kitchen belongs to exactly one restaurant branch.
export const listKitchenBranches = async (outletId, { includeInactive = false } = {}) =>
  prisma.kitchenBranch.findMany({
    where: {
      outletId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: {
      floor: { select: { id: true, name: true } },
      _count: { select: { staff: true } },
    },
    orderBy: { name: "asc" },
  });

export const getKitchenBranchById = async (id, outletId) =>
  prisma.kitchenBranch.findFirst({
    where: { id, outletId },
    include: { floor: { select: { id: true, name: true } } },
  });

export const createKitchenBranch = async (data, outletId) => {
  // floorId is optional, but if one is supplied it must belong to this same
  // outlet — otherwise a caller could attach their kitchen to another
  // restaurant's floor by guessing an id.
  if (data.floorId) {
    const floor = await prisma.floor.findFirst({
      where: { id: data.floorId, outletId },
      select: { id: true },
    });
    if (!floor) {
      const err = new Error("That floor doesn't belong to this outlet.");
      err.status = 400;
      throw err;
    }
  }

  return prisma.kitchenBranch.create({
    data: {
      outletId,
      name: data.name.trim(),
      floorId: data.floorId || null,
      isActive: true,
    },
    include: { floor: { select: { id: true, name: true } } },
  });
};

export const updateKitchenBranch = async (id, data, outletId) => {
  const existing = await prisma.kitchenBranch.findFirst({
    where: { id, outletId },
    select: { id: true },
  });
  if (!existing) return null;

  if (data.floorId) {
    const floor = await prisma.floor.findFirst({
      where: { id: data.floorId, outletId },
      select: { id: true },
    });
    if (!floor) {
      const err = new Error("That floor doesn't belong to this outlet.");
      err.status = 400;
      throw err;
    }
  }

  return prisma.kitchenBranch.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.floorId !== undefined ? { floorId: data.floorId || null } : {}),
      // Only applied when an explicit boolean is sent, so an ordinary rename
      // can't accidentally reactivate a deactivated kitchen.
      ...(typeof data.isActive === "boolean" ? { isActive: data.isActive } : {}),
    },
    include: { floor: { select: { id: true, name: true } } },
  });
};

// Soft delete, matching how outlets are handled in stores.service.js.
// A hard delete would orphan every historical Order.kitchenBranchId and
// KitchenOrder.kitchenBranchId pointing at it, and those are real records the
// restaurant needs for reporting.
//
// Refuses while the kitchen still has unfinished tickets — deactivating a
// kitchen mid-service would make live tickets vanish from the display it's
// currently being cooked on.
export const deactivateKitchenBranch = async (id, outletId) => {
  const branch = await prisma.kitchenBranch.findFirst({
    where: { id, outletId },
    select: { id: true, name: true },
  });
  if (!branch) return null;

  const openTickets = await prisma.kitchenOrder.count({
    where: {
      kitchenBranchId: id,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
  });

  if (openTickets > 0) {
    const err = new Error(
      `"${branch.name}" still has ${openTickets} unfinished ticket${
        openTickets === 1 ? "" : "s"
      }. Finish or cancel them before deactivating this kitchen.`,
    );
    err.status = 409;
    throw err;
  }

  return prisma.kitchenBranch.update({
    where: { id },
    data: { isActive: false },
  });
};