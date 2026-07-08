// server/src/inventory/stockMovements/stockMovements.service.js
import prisma from "../../config/prisma.js";

// Movements are never created directly through this module — they're a
// byproduct of purchase entries, adjustments, wastage, and sales. This is
// purely the read side (the "show me everything that happened" screen).
export const listMovements = ({ ingredientId, type, limit }) => {
  const where = {};
  if (ingredientId) where.ingredientId = ingredientId;
  if (type) where.type = type;

  return prisma.stockMovement.findMany({
    where,
    include: {
      ingredient: { select: { name: true, itemCode: true, consumptionUnit: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit ? Number(limit) : 100,
  });
};

export const getMovementById = (id) =>
  prisma.stockMovement.findUnique({
    where: { id },
    include: {
      ingredient: { select: { name: true, itemCode: true, consumptionUnit: true } },
    },
  });