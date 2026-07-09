// server/src/pos/billing/billing.service.js
//
// Orchestrates the "Complete Service" -> Billing & Payment -> Invoice -> Free
// Table flow. This is deliberately a thin coordination layer over the
// existing payments / pos / invoices / discounts services rather than a
// reimplementation, so all the existing business rules (status flow guard,
// stock consumption on COMPLETED, invoice numbering, discount validation,
// etc.) keep working exactly as they do today.
//
// IMPORTANT: the table is only freed once the order is marked COMPLETED,
// and we only mark it COMPLETED once the payment(s) fully cover the grand
// total. Nothing here frees the table up front.
import prisma from "../../config/prisma.js";
import * as paymentsService from "../payments/payments.service.js";
import * as posService from "../pos.service.js";
import * as invoicesService from "../invoices/invoices.service.js";
import * as discountsService from "../discounts/discounts.service.js";

function toInvoiceLine(orderItem) {
  return {
    id: orderItem.id,
    name: orderItem.menuItem.name,
    quantity: orderItem.quantity,
    unitPrice: Number(orderItem.unitPrice),
    totalPrice: Number(orderItem.totalPrice),
    addOns: (orderItem.addOns || []).map((a) => ({
      name: a.addOn.name,
      quantity: a.quantity,
      unitPrice: Number(a.unitPrice),
      totalPrice: Number(a.totalPrice),
    })),
  };
}

// Read-only bill preview shown in the Billing & Payment modal before any
// payment is taken. Safe to call repeatedly (e.g. if the modal reopens).
export async function getBillingSummary(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      table: true,
      customer: true,
      waiter: { select: { fullName: true, employeeCode: true } },
      items: { include: { menuItem: true, addOns: { include: { addOn: true } } } },
      payments: true,
      discountsApplied: true,
      invoice: true,
    },
  });
  if (!order) throw new Error("Order not found");

  const subtotal = Number(order.subtotal);
  const gstAmount = Number(order.gstAmount);
  // Split the combined GST evenly into CGST/SGST for display, the standard
  // convention for dine-in restaurant billing in India.
  const cgst = Math.round((gstAmount / 2) * 100) / 100;
  const sgst = Math.round((gstAmount / 2) * 100) / 100;
  const discountAmount = Number(order.discountAmount);
  const serviceChargeAmount = Number(order.serviceChargeAmount || 0);
  const grandTotal = Number(order.grandTotal);
  const totalPaid = order.payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    table: order.table ? { id: order.table.id, name: order.table.name, section: order.table.section } : null,
    customer: order.customer ? { name: order.customer.name, mobile: order.customer.mobile } : null,
    waiter: order.waiter ? order.waiter.fullName : null,
    items: order.items.map(toInvoiceLine),
    subtotal,
    cgst,
    sgst,
    gstAmount,
    serviceChargeAmount,
    discountAmount,
    grandTotal,
    totalPaid,
    balanceDue: Math.max(grandTotal - totalPaid, 0),
    alreadyInvoiced: !!order.invoice,
    createdAt: order.createdAt,
  };
}

// payments: [{ method: "CASH"|"CARD"|"UPI"|"OTHER", amount, transactionReference? }]
// discount (optional): { discountId } | { code } | { type: "MANUAL", amount, reason, approvedById }
export async function completeBilling(orderId, { payments, discount } = {}) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (order.status === "COMPLETED") throw new Error("This order has already been completed and billed.");
  if (order.status === "CANCELLED") throw new Error("Cannot bill a cancelled order.");

  if (!payments || payments.length === 0) {
    throw new Error("At least one payment is required to complete billing.");
  }
  for (const p of payments) {
    if (!p.method) throw new Error("Every payment line needs a payment method.");
    if (!p.amount || Number(p.amount) <= 0) throw new Error("Every payment line needs a positive amount.");
  }

  // Optional discount applied at the billing counter (e.g. a manual
  // discount the cashier keys in). Skipped entirely if not provided.
  if (discount && (discount.discountId || discount.code || discount.amount)) {
    await discountsService.applyDiscountToOrder(orderId, discount);
  }

  // Record every payment line (also covers split payments — just pass
  // multiple entries). createPayment already keeps the order's payment
  // status in sync as it goes.
  const createdPayments = [];
  for (const p of payments) {
    const payment = await paymentsService.createPayment(orderId, {
      method: p.method,
      amount: p.amount,
      transactionReference: p.transactionReference,
    });
    createdPayments.push(payment);
  }

  const paymentCheck = await paymentsService.syncOrderPaymentStatus(orderId);
  if (paymentCheck.paymentStatus !== "PAID") {
    throw new Error(
      `Payment is incomplete — received ₹${paymentCheck.totalPaid.toFixed(2)} of ₹${paymentCheck.grandTotal.toFixed(2)}. The order has not been marked completed and the table has not been freed.`
    );
  }

  // Only now — with a fully-paid order — do we complete the order. This is
  // what triggers stock consumption AND frees the table (both already live
  // inside posService.updateOrderStatus for the COMPLETED transition).
  const completedOrder = await posService.updateOrderStatus(orderId, "COMPLETED");

  const invoice = await invoicesService.generateInvoice(orderId, {});
  const fullInvoice = await invoicesService.getInvoiceByOrder(orderId);

  return {
    order: completedOrder,
    payments: createdPayments,
    invoice: fullInvoice,
  };
}