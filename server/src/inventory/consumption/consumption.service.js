// server/src/inventory/consumption/consumption.service.js
import prisma from "../../config/prisma.js";
import { decrementExpiryBatchesFefo } from "../_shared/decrementExpiryBatchesFefo.js";

/**
 * Deducts ingredient stock for menu items that were sold, based on each
 * item's Recipe. This is meant to be called FROM your Orders module at the
 * point an order is confirmed/completed — it is not currently wired into
 * order creation/completion itself (see pos.service.js/billing.service.js —
 * neither calls this). It's reachable today only as a standalone manual
 * endpoint. Wiring it into the real order-completion flow is a genuine
 * functional gap worth closing in a later phase, not a tenancy issue.
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
export const consumeForSale = ({ items, orderId, userId }, outletId) =>
  prisma.$transaction(async (tx) => {
    const movements = [];

    for (const item of items) {
      // FIX: previously trusted menuItemId outright with no outlet check —
      // a stray menuItemId from another outlet would have consumed THAT
      // outlet's ingredient stock while being attributed to this one's sale.
      const menuItem = await tx.menuItem.findFirst({
        where: { id: item.menuItemId, outletId },
      });
      if (!menuItem) continue; // same "skip items with no recipe" tolerance as below

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
            outletId,
            ingredientId: line.ingredientId,
            quantityOnHand: newQty,
            averageCost: 0,
          },
          update: { quantityOnHand: newQty },
        });

        await decrementExpiryBatchesFefo(tx, line.ingredientId, deductQty, outletId);

        const movement = await tx.stockMovement.create({
          data: {
            outletId,
            ingredientId: line.ingredientId,
            type: "SALE_CONSUMPTION",
            quantity: -deductQty,
            previousStock: previousQty,
            newStock: newQty,
            reason: `Sale consumption${orderId ? ` — order ${orderId}` : ""}`,
            referenceId: orderId || null,
            userId: userId || null,
          },
        });

        movements.push(movement);
      }
    }

    return movements;
  });