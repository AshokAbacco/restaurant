// server/src/pos/payments/payments.service.js
import prisma from "../../config/prisma.js";

// Payment has no outletId of its own (it's a child row — scope comes from
// its parent Order, same pattern as OrderItem/KitchenNote elsewhere in this
// codebase), so every query here scopes through the order relation.

export async function listPaymentsForOrder(orderId, outletId) {
  return prisma.payment.findMany({
    where: { orderId, order: { outletId } },
    orderBy: { createdAt: "asc" },
  });
}

export async function createPayment(
  orderId,
  { method, amount, transactionReference, billSplitId },
  outletId,
) {
  // FIX: previously created a Payment against orderId with no check the
  // order even existed, let alone belonged to this outlet.
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId },
  });
  if (!order) throw new Error("Order not found");

  const payment = await prisma.payment.create({
    data: {
      orderId,
      method,
      amount,
      transactionReference,
      billSplitId,
      status: "PAID",
      paidAt: new Date(),
    },
  });

  await syncOrderPaymentStatus(orderId, outletId);
  return payment;
}

// Recomputes whether an order is fully paid, partially paid, or unpaid
// by summing all its Payment rows against grandTotal.
async function syncOrderPaymentStatus(orderId, outletId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId },
    include: { payments: true },
  });
  if (!order) throw new Error("Order not found");

  const totalPaid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);

  let paymentStatus = "UNPAID";
  if (totalPaid >= Number(order.grandTotal)) paymentStatus = "PAID";
  else if (totalPaid > 0) paymentStatus = "PARTIAL";

  // paymentStatus isn't a column on Order in the current schema — surfaced
  // here for the caller to act on (e.g. auto-advance order status) rather
  // than silently writing a field that doesn't exist.
  return { totalPaid, grandTotal: Number(order.grandTotal), paymentStatus };
}

export async function deletePayment(id, outletId) {
  const payment = await prisma.payment.findFirst({
    where: { id, order: { outletId } },
  });
  if (!payment) throw new Error("Payment not found");
  await prisma.payment.delete({ where: { id } });
  return syncOrderPaymentStatus(payment.orderId, outletId);
}

export { syncOrderPaymentStatus };