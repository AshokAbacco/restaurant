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
import * as duePaymentsService from "../due-payments/duePayments.service.js";
import * as cashDrawerService from "../cash-drawer/cashDrawer.service.js";

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
export async function getBillingSummary(orderId, outletId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId },
    include: {
      table: true,
      customer: true,
      waiter: { select: { fullName: true, employeeCode: true } },
      // Restaurant header for the printed bill — same fields the invoice
      // itself pulls, so the preview in the modal and the final invoice
      // can't drift apart.
      outlet: {
        select: {
          name: true,
          address: true,
          phone: true,
          gstin: true,
          fssai: true,
          tagline: true,
          // Bill QR / barcode settings — the invoice renders the codes from
          // these, so they have to travel with the bill.
          upiId: true,
          upiPayeeName: true,
          showBillQr: true,
          showBillBarcode: true,
          billFooterNote: true,
        },
      },
      kitchenOrders: {
        select: { kotNumber: true },
        orderBy: { kotNumber: "asc" },
      },
      kitchenBranch: { select: { name: true } },
      items: {
        include: { menuItem: true, addOns: { include: { addOn: true } } },
      },
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
    table: order.table
      ? {
          id: order.table.id,
          name: order.table.name,
          section: order.table.section,
        }
      : null,
    customer: order.customer
      ? { name: order.customer.name, mobile: order.customer.mobile }
      : null,
    waiter: order.waiter ? order.waiter.fullName : null,
    outlet: order.outlet || null,
    // KOT numbers the kitchen actually worked from — one per kitchen section,
    // so a multi-station order legitimately has several.
    kotNumbers: (order.kitchenOrders || []).map((k) => k.kotNumber),
    kitchenBranch: order.kitchenBranch?.name || null,
    // "Covers" on a restaurant bill = number of diners, not number of items.
    covers: order.numberOfGuests || null,
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
//   — can be empty or partial if allowDue is true (see below).
// discount (optional): { discountId } | { code } | { type: "MANUAL", amount, reason, approvedById }
// allowDue (optional, Phase 1.2 — Due Payment Settlement): if the payments
//   given don't cover the full grandTotal, instead of throwing, track the
//   remainder as a DuePayment against customerId (falls back to the
//   order's own customerId if already set) and still complete the order —
//   the table is freed and stock consumed exactly as if it were fully
//   paid; the balance just becomes a collectible debt instead of blocking
//   service completion. Every existing caller that doesn't pass this gets
//   byte-for-byte the same behavior as before this feature existed.
export async function completeBilling(
  orderId,
  { payments, discount, allowDue, customerId, performedById } = {},
  outletId,
) {
  const order = await prisma.order.findFirst({ where: { id: orderId, outletId } });
  if (!order) throw new Error("Order not found");

  // FEATURE: offline billing replay guard (cash-only offline billing —
  // see client/src/offline/billingQueue.js). A retried "complete
  // billing" call for an order that's already COMPLETED — e.g. an
  // offline-queued cash payment replaying after it actually succeeded
  // once already, but the client never saw the response — must not
  // throw or create a second Payment/Invoice. Return the existing
  // invoice/payments instead; this also protects against a plain
  // accidental double-click on "Complete Payment", independent of
  // offline mode entirely.
  if (order.status === "COMPLETED") {
    const existingInvoice = await invoicesService.getInvoiceByOrder(orderId, outletId);
    if (existingInvoice) {
      const existingPayments =
        await paymentsService.listPaymentsForOrder(orderId, outletId);
      return {
        order,
        payments: existingPayments,
        invoice: existingInvoice,
        duePayment: null,
        alreadyBilled: true,
      };
    }
    // COMPLETED but no invoice on record — genuinely unexpected state,
    // not a safe one to silently paper over. Surface the original error.
    throw new Error("This order has already been completed and billed.");
  }
  if (order.status === "CANCELLED")
    throw new Error("Cannot bill a cancelled order.");

  if (!payments || payments.length === 0) {
    if (!allowDue) {
      throw new Error("At least one payment is required to complete billing.");
    }
    // allowDue with zero payments = the entire bill goes on account —
    // valid (e.g. a regular customer settling their whole tab later),
    // just skip straight to the due-payment path below.
  }
  for (const p of payments || []) {
    if (!p.method)
      throw new Error("Every payment line needs a payment method.");
    if (!p.amount || Number(p.amount) <= 0)
      throw new Error("Every payment line needs a positive amount.");
  }

  // Optional discount applied at the billing counter (e.g. a manual
  // discount the cashier keys in). Skipped entirely if not provided.
  if (discount && (discount.discountId || discount.code || discount.amount)) {
    await discountsService.applyDiscountToOrder(orderId, discount, outletId);
  }

  // Record every payment line (also covers split payments — just pass
  // multiple entries). createPayment already keeps the order's payment
  // status in sync as it goes.
  const createdPayments = [];
  for (const p of payments || []) {
    const payment = await paymentsService.createPayment(
      orderId,
      {
        method: p.method,
        amount: p.amount,
        transactionReference: p.transactionReference,
      },
      outletId,
    );
    createdPayments.push(payment);

    // Phase 2.1 — Cash Flow: every cash payment collected at billing also
    // lands as a SALE transaction against whichever cash drawer session is
    // currently open for this outlet, so end-of-day reconciliation doesn't
    // have to reconstruct cash sales from the Payment table separately.
    // Silently no-ops if no session is open (see
    // cashDrawerService.recordSaleIfSessionOpen) — an unopened drawer
    // should never block taking a customer's cash.
    if (p.method === "CASH") {
      await cashDrawerService.recordSaleIfSessionOpen(p.amount, outletId, performedById);
    }
  }

  const paymentCheck = await paymentsService.syncOrderPaymentStatus(orderId, outletId);
  let duePayment = null;

  if (paymentCheck.paymentStatus !== "PAID") {
    if (!allowDue) {
      throw new Error(
        `Payment is incomplete — received ₹${paymentCheck.totalPaid.toFixed(2)} of ₹${paymentCheck.grandTotal.toFixed(2)}. The order has not been marked completed and the table has not been freed.`,
      );
    }

    const resolvedCustomerId = customerId || order.customerId;
    if (!resolvedCustomerId) {
      throw new Error(
        "A customer is required to mark the remaining balance as due — this order has no customer attached.",
      );
    }

    const remaining = Math.round((paymentCheck.grandTotal - paymentCheck.totalPaid) * 100) / 100;
    duePayment = await duePaymentsService.createDuePayment(
      {
        orderId,
        customerId: resolvedCustomerId,
        originalAmount: remaining,
        // amountPaidUpfront is 0 here deliberately — whatever the customer
        // DID pay just now was already recorded as a normal Payment above;
        // the DuePayment only tracks what's actually still outstanding, so
        // it isn't double-counted in both places.
        amountPaidUpfront: 0,
      },
      outletId,
    );
  }

  // Completes the order regardless of whether it was fully paid or partly
  // put on account — table freed and stock consumed either way. This is
  // the actual behavior change for Phase 1.2: previously an incomplete
  // payment always blocked completion; now it only does when allowDue
  // wasn't requested.
  const completedOrder = await posService.updateOrderStatus(
    orderId,
    "COMPLETED",
    outletId,
  );

  // performedById is the authenticated employee completing the bill — the
  // same value already used for the cash-drawer SALE above. Recording it on
  // the invoice is what puts a real cashier name on the printed bill.
  await invoicesService.generateInvoice(
    orderId,
    { cashierId: performedById },
    outletId,
  );
  const fullInvoice = await invoicesService.getInvoiceByOrder(orderId, outletId);

  return {
    order: completedOrder,
    payments: createdPayments,
    invoice: fullInvoice,
    duePayment,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// BILL HISTORY
//
// Every bill raised in a date range, with what was charged, what was
// collected and what's still outstanding — the reprint/reconciliation list.
//
// Driven off Invoice rather than Order because an invoice is the definition
// of "a bill was raised": an order that was cancelled, or is still open on a
// table, has no invoice and correctly doesn't appear here.
// ─────────────────────────────────────────────────────────────────────────
export async function listBillHistory(
  { from, to, search, limit = 200 } = {},
  outletId,
) {
  // Default to today. `to` is treated as INCLUSIVE of the whole day — a
  // cashier picking 31/08 to 31/08 means "everything today", not "up to
  // midnight", which would return nothing.
  const start = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0));
  const end = to ? new Date(to) : new Date();
  if (to) end.setHours(23, 59, 59, 999);

  // A search with no explicit date range isn't browsing, it's a lookup —
  // someone has an invoice number in front of them and wants that bill.
  // Defaulting those to today made the navbar's Bill No field silently
  // return nothing for anything raised yesterday. The Bill History page is
  // unaffected: it always sends its own from/to.
  const dateFilter =
    search && !from && !to ? {} : { createdAt: { gte: start, lte: end } };

  const invoices = await prisma.invoice.findMany({
    where: {
      outletId,
      ...dateFilter,
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search, mode: "insensitive" } },
              { order: { orderNumber: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      cashier: { select: { fullName: true } },
      order: {
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          grandTotal: true,
          table: { select: { name: true } },
          payments: { select: { method: true, amount: true, status: true } },
          kitchenOrders: {
            select: { kotNumber: true },
            orderBy: { kotNumber: "asc" },
            take: 1, // the bill quotes one reference; see InvoiceView
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit) || 200, 500),
  });

  return invoices.map((inv) => {
    const grandTotal = Number(inv.order?.grandTotal || 0);
    const paid = (inv.order?.payments || [])
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      createdAt: inv.createdAt,
      orderId: inv.order?.id || null,
      orderNumber: inv.order?.orderNumber || null,
      kotNumber: inv.order?.kitchenOrders?.[0]?.kotNumber || null,
      orderType: inv.order?.orderType || null,
      tableName: inv.order?.table?.name || null,
      status: inv.order?.status || null,
      cashier: inv.cashier?.fullName || null,
      grandTotal,
      paid: Math.round(paid * 100) / 100,
      // Never negative: an overpayment shouldn't render as a negative balance
      // in a column staff read as "still to collect".
      balance: Math.max(Math.round((grandTotal - paid) * 100) / 100, 0),
      // De-duplicated, so a split of two cash payments reads "Cash" not
      // "Cash, Cash".
      paymentMethods: [
        ...new Set(
          (inv.order?.payments || [])
            .filter((p) => p.status === "PAID")
            .map((p) => p.method),
        ),
      ],
    };
  });
}