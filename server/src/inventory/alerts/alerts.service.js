// server/src/inventory/alerts/alerts.service.js
import prisma from "../../config/prisma.js";

const EXPIRING_SOON_WINDOW_DAYS = 30; // outer window; message states exact days left

export const listAlerts = ({ resolved, type, ingredientId }) => {
  const where = {};
  if (resolved !== undefined) where.isResolved = resolved === "true" || resolved === true;
  if (type) where.type = type;
  if (ingredientId) where.ingredientId = ingredientId;

  return prisma.inventoryAlert.findMany({
    where,
    include: { ingredient: { select: { name: true, itemCode: true, consumptionUnit: true } } },
    orderBy: { createdAt: "desc" },
  });
};

export const resolveAlert = (id) =>
  prisma.inventoryAlert.update({
    where: { id },
    data: { isResolved: true },
  });

/**
 * Scans current stock + expiry batches and writes InventoryAlert rows for
 * anything that needs attention. Designed to be safe to call repeatedly
 * (e.g. from a cron job every 15 min, or a button in the UI) — it won't
 * create duplicate LOW_STOCK/OUT_OF_STOCK alerts for the same ingredient,
 * and auto-resolves those two types once the underlying condition clears.
 *
 * Known limitation: InventoryAlert has no batchId field in the current
 * schema, so EXPIRING_SOON/EXPIRED alerts are deduped by exact message text
 * (which embeds the batch number) rather than a real foreign key. Good
 * enough for now; if batch-level resolution tracking becomes important,
 * add `batchId String?` to InventoryAlert and switch the dedupe/resolve
 * logic to use it instead of message-matching.
 */
export const generateAlerts = async () => {
  const created = [];

  // ── LOW_STOCK / OUT_OF_STOCK — one active alert per ingredient per type ──
  const stockRows = await prisma.inventoryStock.findMany({ include: { ingredient: true } });

  for (const stock of stockRows) {
    const qty = Number(stock.quantityOnHand);
    const min = Number(stock.ingredient.minimumStockLevel);

    const isOutOfStock = qty <= 0;
    const isLowStock = !isOutOfStock && qty <= min;

    for (const [type, applies] of [
      ["OUT_OF_STOCK", isOutOfStock],
      ["LOW_STOCK", isLowStock],
    ]) {
      const existing = await prisma.inventoryAlert.findFirst({
        where: { ingredientId: stock.ingredientId, type, isResolved: false },
      });

      if (applies && !existing) {
        const alert = await prisma.inventoryAlert.create({
          data: {
            ingredientId: stock.ingredientId,
            type,
            message:
              type === "OUT_OF_STOCK"
                ? `${stock.ingredient.name} is out of stock`
                : `${stock.ingredient.name} is low on stock (${qty} left, minimum is ${min})`,
          },
        });
        created.push(alert);
      } else if (!applies && existing) {
        // Condition cleared (restocked) — resolve it so it stops showing as active.
        await prisma.inventoryAlert.update({
          where: { id: existing.id },
          data: { isResolved: true },
        });
      }
    }
  }

  // ── EXPIRING_SOON / EXPIRED — per batch ──
  const batches = await prisma.expiryBatch.findMany({
    where: { quantityRemaining: { gt: 0 } },
    include: { ingredient: true },
  });

  const now = new Date();

  for (const batch of batches) {
    const daysUntilExpiry = Math.ceil((batch.expiryDate - now) / (1000 * 60 * 60 * 24));
    let type = null;
    let message = null;

    if (daysUntilExpiry < 0) {
      type = "EXPIRED";
      message = `${batch.ingredient.name} batch ${batch.batchNumber} expired ${Math.abs(daysUntilExpiry)} day(s) ago`;
    } else if (daysUntilExpiry <= EXPIRING_SOON_WINDOW_DAYS) {
      type = "EXPIRING_SOON";
      message = `${batch.ingredient.name} batch ${batch.batchNumber} expires in ${daysUntilExpiry} day(s)`;
    }

    if (!type) continue;

    const existing = await prisma.inventoryAlert.findFirst({
      where: { ingredientId: batch.ingredientId, type, message, isResolved: false },
    });

    if (!existing) {
      const alert = await prisma.inventoryAlert.create({
        data: { ingredientId: batch.ingredientId, type, message },
      });
      created.push(alert);
    }
  }

  return { createdCount: created.length, alerts: created };
};