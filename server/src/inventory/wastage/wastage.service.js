// server/src/inventory/wastage/wastage.service.js
import prisma from "../../config/prisma.js";
import { decrementExpiryBatchesFefo } from "../_shared/decrementExpiryBatchesFefo.js";

export const listWastage = ({ ingredientId }) => {
  const where = {};
  if (ingredientId) where.ingredientId = ingredientId;

  return prisma.wastage.findMany({
    where,
    include: { ingredient: { select: { name: true, itemCode: true, consumptionUnit: true } } },
    orderBy: { createdAt: "desc" },
  });
};

export const getWastageById = (id) =>
  prisma.wastage.findUnique({
    where: { id },
    include: { ingredient: { select: { name: true, itemCode: true, consumptionUnit: true } } },
  });

/**
 * Records spoiled/discarded stock and removes it from inventory.
 * data: { ingredientId, quantity, reason, employeeId?, store?, cost?, userId? }
 * cost is optional — if not supplied, it's computed from the ingredient's
 * current average cost (quantity × averageCost) so the P&L impact is captured
 * even when nobody types in a dollar figure by hand.
 */
export const createWastage = (data) =>
  prisma.$transaction(async (tx) => {
    const stock = await tx.inventoryStock.findUnique({ where: { ingredientId: data.ingredientId } });
    if (!stock) {
      const err = new Error("No stock record found for this ingredient");
      err.code = "P2025";
      throw err;
    }

    const previousQty = Number(stock.quantityOnHand);
    const wasteQty = Number(data.quantity);
    const newQty = previousQty - wasteQty;

    if (newQty < 0 && !data.force) {
      const err = new Error(
        `Wasting ${wasteQty} would take stock to ${newQty} (below zero). Re-check the quantity, or resend with "force: true" if this is intentional.`
      );
      err.code = "NEGATIVE_STOCK";
      throw err;
    }

    const cost = data.cost != null ? Number(data.cost) : wasteQty * Number(stock.averageCost);

    const wastage = await tx.wastage.create({
      data: {
        ingredientId: data.ingredientId,
        store: data.store || "Main Store",
        quantity: wasteQty,
        reason: data.reason,
        cost,
        employeeId: data.employeeId || null,
      },
    });

    await tx.inventoryStock.update({
      where: { ingredientId: data.ingredientId },
      data: { quantityOnHand: newQty },
    });

    await decrementExpiryBatchesFefo(tx, data.ingredientId, wasteQty);

    await tx.stockMovement.create({
      data: {
        ingredientId: data.ingredientId,
        type: "WASTAGE",
        quantity: -wasteQty,
        previousStock: previousQty,
        newStock: newQty,
        reason: data.reason,
        referenceId: wastage.id,
        userId: data.userId || null,
        store: data.store || "Main Store",
      },
    });

    return tx.wastage.findUnique({
      where: { id: wastage.id },
      include: { ingredient: { select: { name: true, itemCode: true, consumptionUnit: true } } },
    });
  });