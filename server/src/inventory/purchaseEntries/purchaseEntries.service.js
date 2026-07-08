// server/src/inventory/purchaseEntries/purchaseEntries.service.js
import prisma from "../../config/prisma.js";

const includeRelations = {
  supplier: true,
  purchaseOrder: true,
  ingredient: { include: { consumptionUnit: true, purchaseUnit: true } },
};

export const listPurchaseEntries = ({ ingredientId, supplierId, purchaseOrderId }) => {
  const where = {};
  if (ingredientId) where.ingredientId = ingredientId;
  if (supplierId) where.supplierId = supplierId;
  if (purchaseOrderId) where.purchaseOrderId = purchaseOrderId;

  return prisma.purchaseEntry.findMany({
    where,
    include: includeRelations,
    orderBy: { createdAt: "desc" },
  });
};

export const getPurchaseEntryById = (id) =>
  prisma.purchaseEntry.findUnique({ where: { id }, include: includeRelations });

/**
 * Records goods actually received and moves stock accordingly. This is the
 * one place (besides adjustments/wastage/consumption, added separately) where
 * InventoryStock.quantityOnHand and averageCost change — everything happens
 * in one transaction so a crash mid-way can't leave stock partially updated.
 *
 * data: {
 *   purchaseOrderId?, supplierId, ingredientId, store?,
 *   invoiceNumber?, batchNumber?, expiryDate?,
 *   quantityReceived (in the ingredient's PURCHASE unit),
 *   purchasePrice (cost per purchase unit),
 *   gstPercent?, discount?
 * }
 */
export const createPurchaseEntry = (data) =>
  prisma.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.findUnique({ where: { id: data.ingredientId } });
    if (!ingredient) {
      const err = new Error("Ingredient not found");
      err.code = "P2025";
      throw err;
    }

    const quantityReceived = Number(data.quantityReceived);
    const purchasePrice = Number(data.purchasePrice);
    const gstPercent = Number(data.gstPercent ?? 0);
    const discount = Number(data.discount ?? 0);
    const conversionRatio = Number(ingredient.conversionRatio);

    // Landed cost for this delivery: subtotal + tax - discount. This is the
    // cost basis used for average costing below (tax/discount amortized into
    // the per-unit cost, rather than tracked separately).
    const lineSubtotal = quantityReceived * purchasePrice;
    const gstAmount = lineSubtotal * (gstPercent / 100);
    const totalAmount = lineSubtotal + gstAmount - discount;

    // Convert from purchase units (e.g. "5L cans") to consumption units
    // (e.g. "ml") using the ingredient's own ratio, since InventoryStock is
    // always tracked in consumption units.
    const consumptionQtyReceived = quantityReceived * conversionRatio;
    const costPerConsumptionUnit = totalAmount / consumptionQtyReceived;

    const purchaseEntry = await tx.purchaseEntry.create({
      data: {
        purchaseOrderId: data.purchaseOrderId || null,
        supplierId: data.supplierId,
        ingredientId: data.ingredientId,
        store: data.store || "Main Store",
        invoiceNumber: data.invoiceNumber,
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        quantityReceived,
        purchasePrice,
        gstPercent,
        discount,
        totalAmount,
      },
    });

    const currentStock = await tx.inventoryStock.findUnique({
      where: { ingredientId: data.ingredientId },
    });

    const previousQty = Number(currentStock?.quantityOnHand ?? 0);
    const previousAvgCost = Number(currentStock?.averageCost ?? 0);
    const newQty = previousQty + consumptionQtyReceived;

    // Weighted average cost: blend what's already on hand with what just
    // arrived. If there was nothing on hand, the new cost IS the average.
    const newAverageCost =
      previousQty <= 0
        ? costPerConsumptionUnit
        : (previousQty * previousAvgCost + consumptionQtyReceived * costPerConsumptionUnit) /
          newQty;

    await tx.inventoryStock.upsert({
      where: { ingredientId: data.ingredientId },
      create: {
        ingredientId: data.ingredientId,
        quantityOnHand: newQty,
        averageCost: newAverageCost,
        store: data.store || "Main Store",
      },
      update: {
        quantityOnHand: newQty,
        averageCost: newAverageCost,
      },
    });

    await tx.stockMovement.create({
      data: {
        ingredientId: data.ingredientId,
        type: "PURCHASE",
        quantity: consumptionQtyReceived,
        previousStock: previousQty,
        newStock: newQty,
        reason: "Purchase entry (goods received)",
        referenceId: purchaseEntry.id,
        userId: data.userId || null,
        store: data.store || "Main Store",
      },
    });

    // Batch/expiry tracking, only if the supplier's invoice specified one.
    if (data.expiryDate) {
      await tx.expiryBatch.create({
        data: {
          ingredientId: data.ingredientId,
          batchNumber: data.batchNumber || purchaseEntry.id,
          manufacturingDate: data.manufacturingDate ? new Date(data.manufacturingDate) : null,
          expiryDate: new Date(data.expiryDate),
          quantityRemaining: consumptionQtyReceived,
        },
      });
    }

    // Simplification for this phase: one purchase entry against a PO marks
    // it RECEIVED outright. Partial/multi-delivery POs (received across
    // several entries) would need a "received so far vs ordered" comparison —
    // flagging this as a known gap rather than guessing at that logic now.
    if (data.purchaseOrderId) {
      await tx.purchaseOrder.update({
        where: { id: data.purchaseOrderId },
        data: { status: "RECEIVED" },
      });
    }

    return tx.purchaseEntry.findUnique({
      where: { id: purchaseEntry.id },
      include: includeRelations,
    });
  });