// server/src/inventory/consumption/consumption.service.js
import prisma from "../../config/prisma.js";
import { decrementExpiryBatchesFefo } from "../_shared/decrementExpiryBatchesFefo.js";

/**
 * Deducts ingredient stock for menu items that were sold, based on each
 * item's Recipe. This is meant to be called FROM your Orders module at the
 * point an order is confirmed/completed — it is not wired into order
 * creation itself, because that module doesn't exist in this codebase yet.
 * Call `consumeForSale(...)` directly from wherever an order gets finalized.
 *
 * items: [{ menuItemId, quantity }]  — quantity = number of that menu item sold
 * Returns an array of the StockMovement rows created (one per ingredient
 * actually consumed, potentially fewer than items.length if a menu item has
 * no recipe defined yet).
 *
 * Note on negative stock: unlike Adjustments/Wastage, this does NOT block on
 * going negative. Blocking a sale because inventory bookkeeping is slightly
 * behind is worse for a live POS than letting stock dip below zero and
 * flagging it for review — the doc doesn't specify which behavior it wants,
 * so this is a deliberate choice, not an oversight.
 */
export const consumeForSale = ({ items, orderId, userId, store }) =>
  prisma.$transaction(async (tx) => {
    const movements = [];

    for (const item of items) {
      const recipeLines = await tx.recipeIngredient.findMany({
        where: { menuItemId: item.menuItemId },
      });

      for (const line of recipeLines) {
        const deductQty = Number(line.quantity) * Number(item.quantity);

        const stock = await tx.inventoryStock.findUnique({
          where: { ingredientId: line.ingredientId },
        });
        const previousQty = Number(stock?.quantityOnHand ?? 0);
        const newQty = previousQty - deductQty;

        await tx.inventoryStock.upsert({
          where: { ingredientId: line.ingredientId },
          create: {
            ingredientId: line.ingredientId,
            quantityOnHand: newQty,
            averageCost: 0,
            store: store || "Main Store",
          },
          update: { quantityOnHand: newQty },
        });

        await decrementExpiryBatchesFefo(tx, line.ingredientId, deductQty);

        const movement = await tx.stockMovement.create({
          data: {
            ingredientId: line.ingredientId,
            type: "SALE_CONSUMPTION",
            quantity: -deductQty,
            previousStock: previousQty,
            newStock: newQty,
            reason: `Sale consumption${orderId ? ` — order ${orderId}` : ""}`,
            referenceId: orderId || null,
            userId: userId || null,
            store: store || "Main Store",
          },
        });

        movements.push(movement);
      }
    }

    return movements;
  });