// server/src/inventory/adjustments/adjustments.service.js
import prisma from "../../config/prisma.js";
import { decrementExpiryBatchesFefo } from "../_shared/decrementExpiryBatchesFefo.js";

export const listAdjustments = ({ ingredientId }) => {
  const where = {};
  if (ingredientId) where.ingredientId = ingredientId;

  return prisma.stockAdjustment.findMany({
    where,
    include: { ingredient: { select: { name: true, itemCode: true, consumptionUnit: true } } },
    orderBy: { createdAt: "desc" },
  });
};

export const getAdjustmentById = (id) =>
  prisma.stockAdjustment.findUnique({
    where: { id },
    include: { ingredient: { select: { name: true, itemCode: true, consumptionUnit: true } } },
  });

/**
 * Manual correction to stock — count discrepancies, damaged goods found
 * during a physical check, data-entry fixes, etc. Unlike purchases/sales,
 * there's no automatic quantity source here; a human states the amount and
 * the reason, and (ideally) another human approves it.
 *
 * data: { ingredientId, type: "INCREASE"|"DECREASE", quantity, reason, approvedBy?, notes?, userId? }
 */
export const createAdjustment = (data) =>
  prisma.$transaction(async (tx) => {
    const stock = await tx.inventoryStock.findUnique({ where: { ingredientId: data.ingredientId } });
    if (!stock) {
      const err = new Error("No stock record found for this ingredient");
      err.code = "P2025";
      throw err;
    }

    const previousQty = Number(stock.quantityOnHand);
    const adjQty = Number(data.quantity);
    const signedQty = data.type === "INCREASE" ? adjQty : -adjQty;
    const newQty = previousQty + signedQty;

    // A DECREASE adjustment taking stock negative almost always means either
    // the wrong ingredient/quantity was picked, or there's an unrecorded
    // purchase/consumption somewhere upstream — surface it as an error rather
    // than silently letting stock go negative through a manual correction.
    if (newQty < 0 && !data.force) {
      const err = new Error(
        `This adjustment would take stock to ${newQty} (below zero). Re-check the quantity, or resend with "force: true" if this is intentional.`
      );
      err.code = "NEGATIVE_STOCK";
      throw err;
    }

    const adjustment = await tx.stockAdjustment.create({
      data: {
        ingredientId: data.ingredientId,
        type: data.type,
        quantity: adjQty,
        reason: data.reason,
        approvedBy: data.approvedBy,
        notes: data.notes,
      },
    });

    await tx.inventoryStock.update({
      where: { ingredientId: data.ingredientId },
      data: { quantityOnHand: newQty },
    });

    // Only a DECREASE removes physical stock that has to come from a batch.
    // An INCREASE (e.g. "found extra stock during count") has no batch/expiry
    // to attach to, so it's left untracked at the batch level.
    if (data.type === "DECREASE") {
      await decrementExpiryBatchesFefo(tx, data.ingredientId, adjQty);
    }

    await tx.stockMovement.create({
      data: {
        ingredientId: data.ingredientId,
        type: "ADJUSTMENT",
        quantity: signedQty,
        previousStock: previousQty,
        newStock: newQty,
        reason: data.reason,
        referenceId: adjustment.id,
        userId: data.userId || null,
        store: data.store || "Main Store",
      },
    });

    return tx.stockAdjustment.findUnique({
      where: { id: adjustment.id },
      include: { ingredient: { select: { name: true, itemCode: true, consumptionUnit: true } } },
    });
  });