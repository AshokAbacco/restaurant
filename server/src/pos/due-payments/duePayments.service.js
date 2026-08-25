// server/src/pos/due-payments/duePayments.service.js
//
// Phase 1.2 — Due Payment Settlement. Lets a bill be marked partly (or
// fully) unpaid at billing time, tracked as an outstanding debt against
// the customer, and settled later across one or more visits.
import prisma from "../../config/prisma.js";

const DUE_PAYMENT_INCLUDE = {
  customer: { select: { id: true, name: true, mobile: true } },
  order: {
    select: { id: true, orderNumber: true, orderType: true, grandTotal: true, createdAt: true },
  },
  settlements: {
    orderBy: { settledAt: "desc" },
    include: { settledBy: { select: { fullName: true, employeeCode: true } } },
  },
};

function computeStatus(originalAmount, amountPaid) {
  if (Number(amountPaid) <= 0) return "OUTSTANDING";
  if (Number(amountPaid) >= Number(originalAmount)) return "SETTLED";
  return "PARTIALLY_PAID";
}

// Called from billing.service.js's completeBilling when the biller marks
// part of a bill as due rather than collecting the full amount. Creates
// the DuePayment row and, if anything was actually collected up front,
// also records that as the first settlement — so "customer pays ₹200 of a
// ₹500 bill, owes ₹300" is one clean call, not two.
export async function createDuePayment(
  { orderId, customerId, originalAmount, amountPaidUpfront = 0, settledById, paymentMethod },
  outletId,
) {
  const order = await prisma.order.findFirst({ where: { id: orderId, outletId } });
  if (!order) throw new Error("Order not found");

  const customer = await prisma.customer.findFirst({ where: { id: customerId, outletId } });
  if (!customer) throw new Error("Customer not found");

  if (Number(amountPaidUpfront) > Number(originalAmount)) {
    throw new Error("Amount paid upfront cannot exceed the bill total.");
  }

  const status = computeStatus(originalAmount, amountPaidUpfront);

  return prisma.duePayment.create({
    data: {
      outletId,
      orderId,
      customerId,
      originalAmount,
      amountPaid: amountPaidUpfront,
      status,
      ...(Number(amountPaidUpfront) > 0
        ? {
            settlements: {
              create: {
                outletId,
                amount: amountPaidUpfront,
                paymentMethod: paymentMethod || "CASH",
                settledById: settledById || null,
                notes: "Collected at billing time",
              },
            },
          }
        : {}),
    },
    include: DUE_PAYMENT_INCLUDE,
  });
}

export async function listDuePayments({ customerId, status }, outletId) {
  return prisma.duePayment.findMany({
    where: {
      outletId,
      ...(customerId ? { customerId } : {}),
      ...(status ? { status } : { status: { not: "SETTLED" } }), // default: only what's still owed
    },
    include: DUE_PAYMENT_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export async function getDuePaymentById(id, outletId) {
  return prisma.duePayment.findFirst({
    where: { id, outletId },
    include: DUE_PAYMENT_INCLUDE,
  });
}

export async function getDuePaymentsForCustomer(customerId, outletId) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, outletId } });
  if (!customer) throw new Error("Customer not found");

  const duePayments = await prisma.duePayment.findMany({
    where: { customerId, outletId },
    include: DUE_PAYMENT_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  const totalOutstanding = duePayments.reduce(
    (sum, d) => sum + (Number(d.originalAmount) - Number(d.amountPaid)),
    0,
  );

  return { customer, duePayments, totalOutstanding };
}

// Records a settlement (full or partial) against an existing due payment.
export async function settleDuePayment(
  id,
  { amount, paymentMethod, settledById, notes },
  outletId,
) {
  const duePayment = await prisma.duePayment.findFirst({ where: { id, outletId } });
  if (!duePayment) throw new Error("Due payment not found");

  if (duePayment.status === "SETTLED") {
    throw new Error("This due payment has already been fully settled.");
  }

  const settleAmount = Number(amount);
  if (!settleAmount || settleAmount <= 0) {
    throw new Error("Settlement amount must be greater than 0.");
  }

  const remaining = Number(duePayment.originalAmount) - Number(duePayment.amountPaid);
  if (settleAmount > remaining + 0.01) {
    // small epsilon for decimal rounding, not a real tolerance for overpayment
    throw new Error(
      `Settlement amount (₹${settleAmount}) exceeds the remaining balance (₹${remaining.toFixed(2)}).`,
    );
  }

  const newAmountPaid = Number(duePayment.amountPaid) + settleAmount;
  const newStatus = computeStatus(duePayment.originalAmount, newAmountPaid);

  return prisma.$transaction(async (tx) => {
    await tx.duePaymentSettlement.create({
      data: {
        outletId,
        duePaymentId: id,
        amount: settleAmount,
        paymentMethod: paymentMethod || "CASH",
        settledById: settledById || null,
        notes: notes || null,
      },
    });

    return tx.duePayment.update({
      where: { id },
      data: { amountPaid: newAmountPaid, status: newStatus },
      include: DUE_PAYMENT_INCLUDE,
    });
  });
}