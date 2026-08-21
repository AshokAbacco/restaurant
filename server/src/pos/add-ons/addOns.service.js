// server/src/pos/add-ons/addOns.service.js
import prisma from "../../config/prisma.js";

export async function listAddOns({ isEnabled } = {}, outletId) {
  return prisma.addOn.findMany({
    where: {
      outletId,
      ...(isEnabled !== undefined ? { isEnabled: isEnabled === "true" } : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function getAddOnById(id, outletId) {
  return prisma.addOn.findFirst({ where: { id, outletId } });
}

export async function createAddOn(payload, outletId) {
  return prisma.addOn.create({ data: { ...payload, outletId } });
}

export async function updateAddOn(id, payload, outletId) {
  const existing = await prisma.addOn.findFirst({ where: { id, outletId } });
  if (!existing) throw new Error("Add-on not found");
  return prisma.addOn.update({ where: { id }, data: payload });
}

export async function deleteAddOn(id, outletId) {
  // Soft-disable preferred over hard delete so past orders keep their reference.
  const existing = await prisma.addOn.findFirst({ where: { id, outletId } });
  if (!existing) throw new Error("Add-on not found");
  return prisma.addOn.update({ where: { id }, data: { isEnabled: false } });
}