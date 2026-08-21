// server/src/pos/loyalty/loyalty.service.js
import prisma from "../../config/prisma.js";

export async function listTransactionsForCustomer(customerId, outletId) {
  return prisma.loyaltyTransaction.findMany({
    where: { customerId, outletId },
    orderBy: { createdAt: "desc" },
  });
}

// points: positive to earn, negative to redeem. Keeps Customer.loyaltyPoints
// in sync with the ledger in one transaction so they can't drift apart.
export async function recordTransaction(
  { customerId, orderId, points, reason },
  outletId,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, outletId },
  });
  if (!customer) throw new Error("Customer not found");

  if (points < 0 && customer.loyaltyPoints + points < 0) {
    throw new Error("Insufficient loyalty points");
  }

  const [transaction] = await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: { outletId, customerId, orderId, points, reason },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { loyaltyPoints: { increment: points } },
    }),
  ]);

  return transaction;
}

// Simple default rule: 1 point per 100 spent. Swap for a configurable rate
// table later if the business needs tiered earning.
export async function earnFromOrder(orderId, outletId) {
  const order = await prisma.order.findFirst({ where: { id: orderId, outletId } });
  if (!order || !order.customerId) return null;

  const points = Math.floor(Number(order.grandTotal) / 100);
  if (points <= 0) return null;

  return recordTransaction(
    {
      customerId: order.customerId,
      orderId,
      points,
      reason: "Earned from order",
    },
    outletId,
  );
}