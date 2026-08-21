// server/src/pos/bill-splits/billSplits.service.js
import prisma from "../../config/prisma.js";

// BillSplit has no outletId of its own (child row — scope comes from its
// parent Order), so every query here scopes through the order relation.

export async function listSplitsForOrder(orderId, outletId) {
  return prisma.billSplit.findMany({
    where: { orderId, order: { outletId } },
    include: { payments: true },
  });
}

// splits: [{ label, amount }] for EQUAL/CUSTOM, or [{ label, amount, orderItemIds }] for ITEM_WISE
// (item-wise amount is expected pre-computed by the client from selected OrderItem totals).
export async function createSplits(orderId, { splitType, splits }, outletId) {
  const order = await prisma.order.findFirst({ where: { id: orderId, outletId } });
  if (!order) throw new Error("Order not found");

  const total = splits.reduce((sum, s) => sum + Number(s.amount), 0);
  if (Math.abs(total - Number(order.grandTotal)) > 0.01) {
    throw new Error(`Split amounts (${total}) must add up to the order grand total (${order.grandTotal})`);
  }

  return prisma.$transaction(
    splits.map((s) =>
      prisma.billSplit.create({
        data: { orderId, splitType, label: s.label, amount: s.amount },
      })
    )
  );
}

export async function deleteSplit(id, outletId) {
  // FIX: previously deleted by id alone with no existence/ownership check
  // at all — a stray/guessed id (from any outlet) would delete silently.
  const existing = await prisma.billSplit.findFirst({
    where: { id, order: { outletId } },
  });
  if (!existing) throw new Error("Bill split not found");
  return prisma.billSplit.delete({ where: { id } });
}