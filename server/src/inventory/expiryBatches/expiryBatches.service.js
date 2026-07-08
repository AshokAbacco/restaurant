// server/src/inventory/expiryBatches/expiryBatches.service.js
import prisma from "../../config/prisma.js";

export const listBatches = ({ ingredientId, expiringWithinDays }) => {
  const where = { quantityRemaining: { gt: 0 } };
  if (ingredientId) where.ingredientId = ingredientId;

  if (expiringWithinDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + Number(expiringWithinDays));
    where.expiryDate = { lte: cutoff };
  }

  return prisma.expiryBatch.findMany({
    where,
    include: { ingredient: { select: { name: true, itemCode: true, consumptionUnit: true } } },
    orderBy: { expiryDate: "asc" },
  });
};

export const getBatchById = (id) =>
  prisma.expiryBatch.findUnique({
    where: { id },
    include: { ingredient: { select: { name: true, itemCode: true, consumptionUnit: true } } },
  });