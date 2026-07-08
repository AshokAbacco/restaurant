// server/src/inventory/_shared/decrementExpiryBatchesFefo.js

/**
 * When stock physically leaves (sale, wastage, or a manual decrease), it has
 * to come from SOME batch. This decrements the oldest-expiring batches first
 * (FEFO — first-expire-first-out) until the requested quantity is accounted
 * for, so ExpiryBatch.quantityRemaining stays accurate and expiry alerts
 * don't keep warning about stock that's already gone.
 *
 * Must be called from inside the same Prisma transaction as the
 * InventoryStock update it accompanies — pass the transaction client (`tx`),
 * not the top-level `prisma` object.
 *
 * Not every ingredient will have batch data (expiryDate is optional at
 * purchase entry), so this silently deducts as much as batches can cover and
 * stops — it does not throw if batches run out before quantityToDeduct does.
 * That's expected for non-perishables; nothing to reconcile there.
 */
export const decrementExpiryBatchesFefo = async (tx, ingredientId, quantityToDeduct) => {
  let remaining = Number(quantityToDeduct);
  if (remaining <= 0) return;

  const batches = await tx.expiryBatch.findMany({
    where: { ingredientId, quantityRemaining: { gt: 0 } },
    orderBy: { expiryDate: "asc" },
  });

  for (const batch of batches) {
    if (remaining <= 0) break;

    const available = Number(batch.quantityRemaining);
    const take = Math.min(available, remaining);

    await tx.expiryBatch.update({
      where: { id: batch.id },
      data: { quantityRemaining: available - take },
    });

    remaining -= take;
  }
  // If `remaining` is still > 0 here, this ingredient had less batch-tracked
  // quantity than was deducted — expected for ingredients purchased without
  // an expiryDate. Nothing further to do.
};