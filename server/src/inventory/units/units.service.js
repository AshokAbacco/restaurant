// server/src/inventory/units/units.service.js
import prisma from "../../config/prisma.js";

export const listUnits = (outletId) =>
  prisma.unit.findMany({ where: { outletId }, orderBy: { name: "asc" } });

export const getUnitById = (id, outletId) =>
  prisma.unit.findFirst({ where: { id, outletId } });

export const createUnit = ({ name, abbreviation }, outletId) =>
  prisma.unit.create({ data: { name, abbreviation, outletId } });

// FIX: previously updated/deleted by id alone and relied on Prisma's P2025
// ("record not found") to 404 — but P2025 only means the id doesn't exist
// ANYWHERE, not that it doesn't belong to this outlet. A valid id from
// another outlet would have updated/deleted successfully. Verifying
// ownership first, same pattern as every other retrofitted module.
export const updateUnit = async (id, { name, abbreviation }, outletId) => {
  const existing = await prisma.unit.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Unit not found");
    err.code = "P2025";
    throw err;
  }
  return prisma.unit.update({ where: { id }, data: { name, abbreviation } });
};

export const deleteUnit = async (id, outletId) => {
  const existing = await prisma.unit.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Unit not found");
    err.code = "P2025";
    throw err;
  }
  return prisma.unit.delete({ where: { id } });
};