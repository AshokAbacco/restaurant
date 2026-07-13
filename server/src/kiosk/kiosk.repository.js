// server/src/kiosk/kiosk.repository.js
//
// Kiosk has its own repository (separate from the staff Menu Management
// module) because it only ever needs read-only, customer-safe menu data
// plus order/payment writes. It talks to the same Prisma models — no
// schema changes needed — but never reuses menu.repository's staff-facing
// queries directly, so the two modules can evolve independently.

import prisma from "../config/prisma.js";

// ==================================================
// MENU (read-only, customer-facing)
// ==================================================

export const findKioskCategories = () =>
  prisma.category.findMany({
    where: { isEnabled: true },
    orderBy: { displayOrder: "asc" },
  });

// Only items that should actually be sold at the kiosk:
// ACTIVE + available + not hidden from POS/self-order screens.
export const findKioskMenuItems = () =>
  prisma.menuItem.findMany({
    where: {
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

export const findKioskMenuItemsByIds = (ids) =>
  prisma.menuItem.findMany({
    where: { id: { in: ids } },
    include: { category: true, variants: true },
  });

export const findAddOnsForMenuItem = (menuItemId) =>
  prisma.menuItemAddOn.findMany({
    where: { menuItemId, addOn: { isEnabled: true } },
    include: { addOn: true },
  });

export const findAddOnsByIds = (ids) =>
  prisma.addOn.findMany({ where: { id: { in: ids }, isEnabled: true } });

// ==================================================
// TABLES
// ==================================================

export const findFreeTables = (store = "Main Store") =>
  prisma.restaurantTable.findMany({
    where: { store, status: "FREE" },
    orderBy: { name: "asc" },
  });

export const findTableById = (id) =>
  prisma.restaurantTable.findUnique({ where: { id } });

// ==================================================
// CUSTOMER (optional, matched by mobile number)
// ==================================================

export const findOrCreateCustomer = async ({ name, phone }) => {
  if (!phone) return null;

  const existing = await prisma.customer.findUnique({ where: { mobile: phone } });
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
    data: { name: name?.trim() || "Kiosk Guest", mobile: phone },
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
export const countOrdersCreatedToday = async () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.order.count({
    where: { createdAt: { gte: startOfDay } },
  });
};

export const findOrderByOrderNumber = (orderNumber) =>
  prisma.order.findUnique({ where: { orderNumber } });

// ==================================================
// ORDER CREATION
// ==================================================

// All writes happen in a single transaction: if anything fails
// (bad item, table just got taken, etc.) nothing is left half-created.
export const createOrderWithItems = ({
  orderNumber,
  orderType,
  tableId,
  customerId,
  notes,
  store,
  pricedItems, // [{ menuItemId, quantity, unitPrice, totalPrice, notes, addOns: [{addOnId, unitPrice, quantity, totalPrice}] }]
  subtotal,
  gstAmount,
  serviceChargeAmount,
  grandTotal,
}) =>
  prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber,
        orderType,
        status: "NEW",
        tableId: tableId || null,
        customerId: customerId || null,
        notes: notes || null,
        store: store || "Main Store",
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
        // (kiosk.service.confirmPayment) fills in method/status/txn ref.
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
        items: { include: { menuItem: true, addOns: { include: { addOn: true } } } },
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

export const findOrderById = (id) =>
  prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { menuItem: true, addOns: { include: { addOn: true } } } },
      table: true,
      customer: true,
      payments: true,
    },
  });

export const updateOrderStatus = (id, status) =>
  prisma.order.update({ where: { id }, data: { status } });

export const freeTableForOrder = async (orderId) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
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

export const findLatestPaymentForOrder = (orderId) =>
  prisma.payment.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });

export const updatePayment = (id, data) =>
  prisma.payment.update({ where: { id }, data });

export const createPayment = (data) => prisma.payment.create({ data });
