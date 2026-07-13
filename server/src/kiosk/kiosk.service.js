// server/src/kiosk/kiosk.service.js
import * as repo from "./kiosk.repository.js";
import QRCode from "qrcode";

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ==================================================
// MENU
// ==================================================

// Shapes DB rows into exactly what the kiosk UI needs — never leak
// costPrice, sku, barcode, kitchenSectionId etc. to a customer-facing screen.
export const getKioskMenu = async () => {
  const [categories, items] = await Promise.all([
    repo.findKioskCategories(),
    repo.findKioskMenuItems(),
  ]);

  const menuItems = items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: Number(item.sellingPrice),
    image: item.imageUrl,
    foodType: item.foodType, // VEG | NON_VEG | EGG
    categoryId: item.categoryId,
    category: item.category?.name || "Uncategorized",
    subCategory: item.subCategory?.name || null,
    prepTimeMinutes: item.prepTimeMinutes,
    variants: item.variants.map((v) => ({
      id: v.id,
      name: v.name,
      price: Number(v.price),
    })),
  }));

  return {
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      image: c.imageUrl,
      displayOrder: c.displayOrder,
    })),
    items: menuItems,
  };
};

export const getAddOnsForMenuItem = async (menuItemId) => {
  const links = await repo.findAddOnsForMenuItem(menuItemId);
  return links.map((link) => ({
    id: link.addOn.id,
    name: link.addOn.name,
    price: Number(link.addOn.price),
  }));
};

// ==================================================
// TABLES
// ==================================================

export const getAvailableTables = async (store) => {
  const tables = await repo.findFreeTables(store);
  return tables.map((t) => ({ id: t.id, name: t.name, capacity: t.capacity, section: t.section }));
};

// ==================================================
// ORDER NUMBER
// ==================================================

const pad = (n, len) => String(n).padStart(len, "0");

const buildOrderNumber = (seq) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1, 2);
  const d = pad(now.getDate(), 2);
  return `K-${y}${m}${d}-${pad(seq, 4)}`;
};

// Retries on a unique-constraint collision instead of locking the table —
// safe under kiosk-scale concurrency (a handful of devices, not thousands).
const generateOrderNumber = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const countToday = await repo.countOrdersCreatedToday();
    const candidate = buildOrderNumber(countToday + 1 + attempt);
    const existing = await repo.findOrderByOrderNumber(candidate);
    if (!existing) return candidate;
  }
  // Extremely unlikely fallback: timestamp-based, guaranteed unique.
  return `K-${Date.now()}`;
};

// ==================================================
// ORDER CREATION (server recomputes every price — never trust the client)
// ==================================================

const normalizeOrderType = (orderType) => (orderType === "TAKE_AWAY" ? "TAKEAWAY" : orderType);

export const createOrder = async (payload) => {
  const orderType = normalizeOrderType(payload.orderType);

  // ---- Table validation (only if a tableId was actually sent) ----
  // This kiosk flow doesn't collect a table number — customers are called
  // by order number instead (see getUpiQr/confirmPayment + the success
  // screen). tableId stays supported for a future "assign my table" step
  // or for orders created some other way that do specify one.
  let table = null;
  if (payload.tableId) {
    table = await repo.findTableById(payload.tableId);
    if (!table) throw new AppError("Selected table does not exist", 400);
    if (table.status !== "FREE") {
      throw new AppError("Selected table is no longer available, please pick another", 409);
    }
  }

  // ---- Load real menu items from DB (source of truth for pricing) ----
  const menuItemIds = [...new Set(payload.items.map((i) => i.menuItemId))];
  const menuItems = await repo.findKioskMenuItemsByIds(menuItemIds);
  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  const allAddOnIds = [...new Set(payload.items.flatMap((i) => i.addOnIds || []))];
  const addOns = allAddOnIds.length ? await repo.findAddOnsByIds(allAddOnIds) : [];
  const addOnMap = new Map(addOns.map((a) => [a.id, a]));

  let subtotal = 0;
  let gstAmount = 0;
  let serviceChargeAmount = 0;

  const pricedItems = payload.items.map((reqItem, idx) => {
    const menuItem = menuItemMap.get(reqItem.menuItemId);
    if (!menuItem) {
      throw new AppError(`Item ${idx + 1}: menu item not found or unavailable`, 400);
    }
    if (menuItem.status !== "ACTIVE" || !menuItem.isAvailable) {
      throw new AppError(`"${menuItem.name}" is currently unavailable`, 409);
    }

    const quantity = Number(reqItem.quantity);
    const unitBase = Number(menuItem.sellingPrice);

    const addOnLines = (reqItem.addOnIds || []).map((addOnId) => {
      const addOn = addOnMap.get(addOnId);
      if (!addOn) throw new AppError(`Add-on not found: ${addOnId}`, 400);
      const unitPrice = Number(addOn.price);
      return {
        addOnId,
        quantity: 1,
        unitPrice,
        totalPrice: round2(unitPrice * quantity),
      };
    });

    const addOnUnitTotal = addOnLines.reduce((s, a) => s + a.unitPrice, 0);
    const lineUnitPrice = round2(unitBase + addOnUnitTotal);
    const lineTotal = round2(lineUnitPrice * quantity);

    const lineGst = round2((lineTotal * Number(menuItem.gstPercent || 0)) / 100);
    const lineService = menuItem.serviceCharge
      ? round2(Number(menuItem.serviceCharge) * quantity)
      : 0;

    subtotal += lineTotal;
    gstAmount += lineGst;
    serviceChargeAmount += lineService;

    return {
      menuItemId: menuItem.id,
      quantity,
      unitPrice: lineUnitPrice,
      totalPrice: lineTotal,
      notes: reqItem.notes || null,
      addOns: addOnLines,
    };
  });

  subtotal = round2(subtotal);
  gstAmount = round2(gstAmount);
  serviceChargeAmount = round2(serviceChargeAmount);
  const grandTotal = round2(subtotal + gstAmount + serviceChargeAmount);

  const customer = payload.phone
    ? await repo.findOrCreateCustomer({ name: payload.customerName, phone: payload.phone })
    : null;

  const orderNumber = await generateOrderNumber();

  const order = await repo.createOrderWithItems({
    orderNumber,
    orderType,
    tableId: payload.tableId || null,
    customerId: customer?.id || null,
    notes: payload.notes,
    store: payload.store || "Main Store",
    pricedItems,
    subtotal,
    gstAmount,
    serviceChargeAmount,
    grandTotal,
  });

  return serializeOrder(order);
};

// ==================================================
// PAYMENT
// ==================================================

// UPI QR is generated server-side from a standard UPI deep link so the
// frontend only needs to render an <img>. In production, swap the payee
// VPA below (and the "verify" step) for your real PSP/gateway integration
// (Razorpay, PhonePe PG, etc.) — the interface (getUpiQr / confirmPayment)
// stays the same for the frontend either way.
const KIOSK_PAYEE_VPA = process.env.KIOSK_UPI_VPA || "restaurant@upi";
const KIOSK_PAYEE_NAME = process.env.KIOSK_UPI_PAYEE_NAME || "Restaurant";

export const getUpiQr = async (orderId) => {
  const order = await repo.findOrderById(orderId);
  if (!order) throw new AppError("Order not found", 404);

  const txnRef = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const upiUrl =
    `upi://pay?pa=${encodeURIComponent(KIOSK_PAYEE_VPA)}` +
    `&pn=${encodeURIComponent(KIOSK_PAYEE_NAME)}` +
    `&am=${encodeURIComponent(order.grandTotal.toString())}` +
    `&cu=INR&tn=${encodeURIComponent("Order " + order.orderNumber)}` +
    `&tr=${encodeURIComponent(txnRef)}`;

  const qrDataUrl = await QRCode.toDataURL(upiUrl, { width: 320, margin: 1 });

  // Record the pending attempt against the order's payment row so the
  // eventual gateway webhook (or the demo "verify" call below) has
  // something to reconcile against.
  const payment = await repo.findLatestPaymentForOrder(orderId);
  if (payment) {
    await repo.updatePayment(payment.id, {
      method: "UPI",
      transactionReference: txnRef,
      status: "UNPAID",
    });
  }

  return { qrDataUrl, upiUrl, transactionReference: txnRef, amount: order.grandTotal };
};

export const confirmPayment = async (orderId, { method, transactionReference }) => {
  const order = await repo.findOrderById(orderId);
  if (!order) throw new AppError("Order not found", 404);
  if (order.status === "CANCELLED") throw new AppError("This order was cancelled", 409);

  const payment = await repo.findLatestPaymentForOrder(orderId);
  if (!payment) throw new AppError("No payment record found for this order", 500);

  // CASH: customer confirms at kiosk, actual cash is collected & marked
  // PAID by the cashier/counter staff via the POS — kiosk just moves the
  // order into the kitchen queue.
  if (method === "CASH") {
    await repo.updatePayment(payment.id, {
      method: "CASH",
      status: "UNPAID",
    });
    const updated = await repo.updateOrderStatus(orderId, "ACCEPTED");
    return serializeOrder(await repo.findOrderById(updated.id));
  }

  // UPI / CARD: this is the point where a real integration verifies the
  // transaction with the payment gateway before marking PAID. Here we
  // simulate a successful gateway callback.
  await repo.updatePayment(payment.id, {
    method,
    status: "PAID",
    transactionReference: transactionReference || payment.transactionReference || `TXN${Date.now()}`,
    paidAt: new Date(),
  });

  const updated = await repo.updateOrderStatus(orderId, "ACCEPTED");
  return serializeOrder(await repo.findOrderById(updated.id));
};

// ==================================================
// ORDER STATUS / LOOKUP
// ==================================================

export const getOrder = async (id) => {
  const order = await repo.findOrderById(id);
  if (!order) throw new AppError("Order not found", 404);
  return serializeOrder(order);
};

export const cancelOrder = async (id) => {
  const order = await repo.findOrderById(id);
  if (!order) throw new AppError("Order not found", 404);
  if (["COMPLETED", "SERVED"].includes(order.status)) {
    throw new AppError("Completed orders cannot be cancelled", 409);
  }
  await repo.updateOrderStatus(id, "CANCELLED");
  await repo.freeTableForOrder(id);
  return getOrder(id);
};

// ==================================================
// SERIALIZATION
// ==================================================

function serializeOrder(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    table: order.table ? { id: order.table.id, name: order.table.name } : null,
    customer: order.customer ? { id: order.customer.id, name: order.customer.name } : null,
    notes: order.notes,
    subtotal: Number(order.subtotal),
    gstAmount: Number(order.gstAmount),
    serviceChargeAmount: Number(order.serviceChargeAmount),
    discountAmount: Number(order.discountAmount),
    grandTotal: Number(order.grandTotal),
    items: order.items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.menuItem?.name,
      image: item.menuItem?.imageUrl,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      notes: item.notes,
      addOns: item.addOns.map((a) => ({
        name: a.addOn?.name,
        unitPrice: Number(a.unitPrice),
        totalPrice: Number(a.totalPrice),
      })),
    })),
    payment: order.payments?.[0]
      ? {
          method: order.payments[0].method,
          status: order.payments[0].status,
          transactionReference: order.payments[0].transactionReference,
        }
      : null,
    estimatedTimeMinutes: estimateReadyTime(order),
    createdAt: order.createdAt,
  };
}

function estimateReadyTime(order) {
  // Simple heuristic: base 10 min + 2 min per distinct item, capped.
  const base = 10 + order.items.length * 2;
  return Math.min(base, 30);
}

export { AppError };
