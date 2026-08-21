// server/src/inventory/wastage/wastage.service.js
import prisma from "../../config/prisma.js";
import { decrementExpiryBatchesFefo } from "../_shared/decrementExpiryBatchesFefo.js";

export const listWastage = ({ ingredientId }, outletId) => {
  const where = { outletId };
  if (ingredientId) where.ingredientId = ingredientId;

  return prisma.wastage.findMany({
    where,
    include: { ingredient: { select: { name: true, itemCode: true, consumptionUnit: true } } },
    orderBy: { createdAt: "desc" },
  });
};

export const getWastageById = (id, outletId) =>
  prisma.wastage.findFirst({
    where: { id, outletId },
    include: { ingredient: { select: { name: true, itemCode: true, consumptionUnit: true } } },
  });

/**
 * Records spoiled/discarded stock and removes it from inventory.
 * data: { ingredientId, quantity, reason, employeeId?, cost?, userId? }
 * cost is optional — if not supplied, it's computed from the ingredient's
 * current average cost (quantity × averageCost) so the P&L impact is captured
 * even when nobody types in a dollar figure by hand.
 */
export const createWastage = (data, outletId) =>
  prisma.$transaction(async (tx) => {
    // FIX: previously looked up stock by ingredientId alone with no outlet
    // check — same gap as adjustments.service.js's createAdjustment.
    const ingredient = await tx.ingredient.findFirst({
      where: { id: data.ingredientId, outletId },
    });
    if (!ingredient) {
      const err = new Error("Ingredient not found");
      err.code = "P2025";
      throw err;
    }

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
        outletId,
        ingredientId: data.ingredientId,
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

    await decrementExpiryBatchesFefo(tx, data.ingredientId, wasteQty, outletId);

    await tx.stockMovement.create({
      data: {
        outletId,
        ingredientId: data.ingredientId,
        type: "WASTAGE",
        quantity: -wasteQty,
        previousStock: previousQty,
        newStock: newQty,
        reason: data.reason,
        referenceId: wastage.id,
        userId: data.userId || null,
      },
    });

    return tx.wastage.findUnique({
      where: { id: wastage.id },
      include: { ingredient: { select: { name: true, itemCode: true, consumptionUnit: true } } },
    });
  });