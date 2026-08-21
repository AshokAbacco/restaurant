// server/src/kiosk/kiosk.repository.js
//
// Kiosk has its own repository (separate from the staff Menu Management
// module) because it only ever needs read-only, customer-safe menu data
// plus order/payment writes. It talks to the same Prisma models — no
// schema changes needed — but never reuses menu.repository's staff-facing
// queries directly, so the two modules can evolve independently.
//
// FIX: every function here now takes outletId and applies it — previously
// none of them did (see kiosk.middleware.js's resolveKioskOutlet for why
// that's now required on every kiosk request).

import prisma from "../config/prisma.js";

// ==================================================
// MENU (read-only, customer-facing)
// ==================================================

export const findKioskCategories = (outletId) =>
  prisma.category.findMany({
    where: { outletId, isEnabled: true },
    orderBy: { displayOrder: "asc" },
  });

// Only items that should actually be sold at the kiosk:
// ACTIVE + available + not hidden from POS/self-order screens.
export const findKioskMenuItems = (outletId) =>
  prisma.menuItem.findMany({
    where: {
      outletId,
      status: "ACTIVE",
      isAvailable: true,
      isHiddenFromPOS: false,
    },
    include: {
      category: true,
      subCategory: true,
      variants: true,
    },
    orderBy: { name: "asc" },
  });

export const findKioskMenuItemsByIds = (ids, outletId) =>
  prisma.menuItem.findMany({
    where: { id: { in: ids }, outletId },
    include: { category: true, variants: true },
  });

export const findAddOnsForMenuItem = (menuItemId, outletId) =>
  prisma.menuItemAddOn.findMany({
    where: { menuItemId, addOn: { isEnabled: true, outletId } },
    include: { addOn: true },
  });

export const findAddOnsByIds = (ids, outletId) =>
  prisma.addOn.findMany({ where: { id: { in: ids }, isEnabled: true, outletId } });

// ==================================================
// TABLES
// ==================================================

export const findFreeTables = (outletId) =>
  prisma.restaurantTable.findMany({
    where: { outletId, status: "FREE" },
    orderBy: { name: "asc" },
  });

export const findTableById = (id, outletId) =>
  prisma.restaurantTable.findFirst({ where: { id, outletId } });

// ==================================================
// CUSTOMER (optional, matched by mobile number)
// ==================================================

export const findOrCreateCustomer = async ({ name, phone }, outletId) => {
  if (!phone) return null;

  // FIX: Customer.mobile is @@unique([outletId, mobile]) now, not globally
  // unique — findUnique({ where: { mobile: phone } }) no longer matches
  // Prisma's generated unique input shape, and would be wrong anyway since
  // the same phone number can legitimately order at two different outlets.
  const existing = await prisma.customer.findFirst({
    where: { mobile: phone, outletId },
  });
  if (existing) {
    if (name && name.trim() && existing.name !== name.trim()) {
      return prisma.customer.update({
        where: { id: existing.id },
        data: { name: name.trim() },
      });
    }
    return existing;
  }

  return prisma.customer.create({
    data: { outletId, name: name?.trim() || "Kiosk Guest", mobile: phone },
  });
};

// ==================================================
// ORDER NUMBER GENERATION
// ==================================================

// Human-readable, per-day sequential order number, e.g. K-20260711-0007.
// Generated from the count of kiosk orders created "today" — wrapped by
// the caller in a retry loop (see kiosk.service.js) so a race between two
// kiosks landing on the same sequence number is resolved by retrying on
// the unique-constraint error rather than by locking the table.
export const countOrdersCreatedToday = async (outletId) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.order.count({
    where: { outletId, createdAt: { gte: startOfDay } },
  });
};

export const findOrderByOrderNumber = (orderNumber, outletId) =>
  prisma.order.findFirst({ where: { orderNumber, outletId } });

// ==================================================
// ORDER CREATION
// ==================================================

// All writes happen in a single transaction: if anything fails
// (bad item, table just got taken, etc.) nothing is left half-created.
export const createOrderWithItems = ({
  outletId,
  orderNumber,
  orderType,
  tableId,
  customerId,
  notes,
  pricedItems, // [{ menuItemId, quantity, unitPrice, totalPrice, notes, addOns: [{addOnId, unitPrice, quantity, totalPrice}] }]
  subtotal,
  gstAmount,
  serviceChargeAmount,
  grandTotal,
}) =>
  prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        outletId,
        orderNumber,
        orderType,
        status: "NEW",
        tableId: tableId || null,
        customerId: customerId || null,
        notes: notes || null,
        subtotal,
        gstAmount,
        serviceChargeAmount,
        discountAmount: 0,
        grandTotal,
        items: {
          create: pricedItems.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes || null,
            addOns: item.addOns?.length
              ? {
                  create: item.addOns.map((a) => ({
                    addOnId: a.addOnId,
                    quantity: a.quantity,
                    unitPrice: a.unitPrice,
                    totalPrice: a.totalPrice,
                  })),
                }
              : undefined,
          })),
        },
        // Payment row is created up-front as UNPAID; the payment step
        // (kiosk.service.confirmPayment / Razorpay flows) fills in
        // method/status/txn ref.
        payments: {
          create: [
            {
              method: "CASH",
              amount: grandTotal,
              status: "UNPAID",
            },
          ],
        },
      },
      include: {
        items: {
          include: { menuItem: true, addOns: { include: { addOn: true } } },
        },
        table: true,
        customer: true,
        payments: true,
      },
    });

    if (tableId) {
      await tx.restaurantTable.update({
        where: { id: tableId },
        data: { status: "OCCUPIED" },
      });
    }

    return order;
  });

// ==================================================
// ORDER READ / STATUS
// ==================================================

export const findOrderById = (id, outletId) =>
  prisma.order.findFirst({
    where: { id, outletId },
    include: {
      items: {
        include: { menuItem: true, addOns: { include: { addOn: true } } },
      },
      table: true,
      customer: true,
      payments: true,
    },
  });

export const updateOrderStatus = async (id, status, outletId) => {
  // FIX: previously updated by id alone with no ownership check.
  const existing = await prisma.order.findFirst({ where: { id, outletId } });
  if (!existing) throw new Error("Order not found");
  return prisma.order.update({ where: { id }, data: { status } });
};

export const freeTableForOrder = async (orderId, outletId) => {
  const order = await prisma.order.findFirst({ where: { id: orderId, outletId } });
  if (order?.tableId) {
    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: "FREE" },
    });
  }
};

// ==================================================
// PAYMENT
// ==================================================

export const findLatestPaymentForOrder = (orderId, outletId) =>
  prisma.payment.findFirst({
    where: { orderId, order: { outletId } },
    orderBy: { createdAt: "desc" },
  });

export const updatePayment = async (id, data, outletId) => {
  // FIX: previously updated by id alone with no ownership check.
  const existing = await prisma.payment.findFirst({
    where: { id, order: { outletId } },
  });
  if (!existing) throw new Error("Payment not found");
  return prisma.payment.update({ where: { id }, data });
};

export const createPayment = (data, outletId) => {
  // Payment has no outletId column of its own (scope comes from its
  // parent Order) — outletId is accepted here for signature consistency
  // with every other function in this file, not because it's written
  // anywhere; kept as a parameter so a future caller can't forget it.
  return prisma.payment.create({ data });
};

// Used by the Razorpay webhook: we store the Razorpay QR code id (for UPI)
// or the Razorpay order id (for Card) in Payment.transactionReference when
// we create it, so an incoming webhook event — which only gives us *their*
// ids — can be traced back to our kiosk Order.
//
// NOT outlet-scoped by parameter, deliberately: Razorpay's webhook payload
// has no concept of our outletId, only the reference we gave it at
// creation time — this lookup is exactly how the webhook (and only the
// webhook) resolves which outlet a payment belongs to, from a reference
// that's already unique across the whole system. Every other function in
// this file requires outletId; this is the one legitimate exception.
export const findOrderByPaymentReference = async (reference) => {
  if (!reference) return null;
  const payment = await prisma.payment.findFirst({
    where: { transactionReference: reference },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) return null;
  return prisma.order.findUnique({ where: { id: payment.orderId } });
};