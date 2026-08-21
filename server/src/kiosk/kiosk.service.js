// server/src/kiosk/kiosk.service.js
import crypto from "crypto";
import * as repo from "./kiosk.repository.js";
import razorpay, {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
} from "../config/razorpay.js";
// Same KOT logic the POS screen uses (PosOrderScreen.jsx -> sendToKitchen).
// Reusing it here means a kiosk order shows up on KitchenDisplayScreen /
// OrdersPage exactly the same way a POS-placed order does — one
// KitchenOrder ("KOT") row per kitchen section, created the moment the
// order is genuinely confirmed/paid.
import * as kotService from "../pos/kot/kot.service.js";

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const toPaise = (rupees) => Math.round(Number(rupees) * 100);

// ==================================================
// MENU
// ==================================================

// Shapes DB rows into exactly what the kiosk UI needs — never leak
// costPrice, sku, barcode, kitchenSectionId etc. to a customer-facing screen.
export const getKioskMenu = async (outletId) => {
  const [categories, items] = await Promise.all([
    repo.findKioskCategories(outletId),
    repo.findKioskMenuItems(outletId),
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

export const getAddOnsForMenuItem = async (menuItemId, outletId) => {
  const links = await repo.findAddOnsForMenuItem(menuItemId, outletId);
  return links.map((link) => ({
    id: link.addOn.id,
    name: link.addOn.name,
    price: Number(link.addOn.price),
  }));
};

// ==================================================
// TABLES
// ==================================================

export const getAvailableTables = async (outletId) => {
  const tables = await repo.findFreeTables(outletId);
  return tables.map((t) => ({
    id: t.id,
    name: t.name,
    capacity: t.capacity,
    section: t.section,
  }));
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
const generateOrderNumber = async (outletId) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const countToday = await repo.countOrdersCreatedToday(outletId);
    const candidate = buildOrderNumber(countToday + 1 + attempt);
    const existing = await repo.findOrderByOrderNumber(candidate, outletId);
    if (!existing) return candidate;
  }
  // Extremely unlikely fallback: timestamp-based, guaranteed unique.
  return `K-${Date.now()}`;
};

// ==================================================
// ORDER CREATION (server recomputes every price — never trust the client)
// ==================================================

const normalizeOrderType = (orderType) =>
  orderType === "TAKE_AWAY" ? "TAKEAWAY" : orderType;

export const createOrder = async (payload, outletId) => {
  const orderType = normalizeOrderType(payload.orderType);

  // ---- Table validation (only if a tableId was actually sent) ----
  let table = null;
  if (payload.tableId) {
    table = await repo.findTableById(payload.tableId, outletId);
    if (!table) throw new AppError("Selected table does not exist", 400);
    if (table.status !== "FREE") {
      throw new AppError(
        "Selected table is no longer available, please pick another",
        409,
      );
    }
  }

  // ---- Load real menu items from DB (source of truth for pricing) ----
  const menuItemIds = [...new Set(payload.items.map((i) => i.menuItemId))];
  const menuItems = await repo.findKioskMenuItemsByIds(menuItemIds, outletId);
  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  const allAddOnIds = [
    ...new Set(payload.items.flatMap((i) => i.addOnIds || [])),
  ];
  const addOns = allAddOnIds.length
    ? await repo.findAddOnsByIds(allAddOnIds, outletId)
    : [];
  const addOnMap = new Map(addOns.map((a) => [a.id, a]));

  let subtotal = 0;
  let gstAmount = 0;
  let serviceChargeAmount = 0;

  const pricedItems = payload.items.map((reqItem, idx) => {
    const menuItem = menuItemMap.get(reqItem.menuItemId);
    if (!menuItem) {
      // Also covers the cross-outlet case now: an id that's real but
      // belongs to a DIFFERENT outlet won't be in menuItemMap (the lookup
      // above is already scoped), so it fails the same "not found" path
      // rather than silently pricing/ordering another outlet's item.
      throw new AppError(
        `Item ${idx + 1}: menu item not found or unavailable`,
        400,
      );
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

    const lineGst = round2(
      (lineTotal * Number(menuItem.gstPercent || 0)) / 100,
    );
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
    ? await repo.findOrCreateCustomer(
        { name: payload.customerName, phone: payload.phone },
        outletId,
      )
    : null;

  const orderNumber = await generateOrderNumber(outletId);

  const order = await repo.createOrderWithItems({
    outletId,
    orderNumber,
    orderType,
    tableId: payload.tableId || null,
    customerId: customer?.id || null,
    notes: payload.notes,
    pricedItems,
    subtotal,
    gstAmount,
    serviceChargeAmount,
    grandTotal,
  });

  return serializeOrder(order);
};

// ==================================================
// KITCHEN DISPATCH (shared by Cash / UPI / Card / webhook)
// ==================================================

// Fires the order to the kitchen (creates KitchenOrder/KOT rows) the moment
// a payment is genuinely confirmed — mirrors the POS "bill first, then send
// to kitchen" takeaway path. Safe to call more than once for the same order:
// if it's already past NEW (i.e. already dispatched), this is a no-op.
async function dispatchToKitchen(orderId, outletId) {
  const order = await repo.findOrderById(orderId, outletId);
  if (!order) throw new AppError("Order not found", 404);

  if (order.status !== "NEW") {
    // Already sent to kitchen by an earlier call (e.g. webhook beat the
    // frontend's own poll/verify to it) — nothing further to do.
    return serializeOrder(order);
  }

  const orderItemIds = order.items.map((i) => i.id);
  if (orderItemIds.length) {
    try {
      // FIX: this call was missing the outletId argument that
      // kotService.sendToKitchen has required since the multi-tenancy
      // retrofit (signature is now (orderId, orderItemIds, outletId,
      // client)). Without it, outletId was `undefined` inside
      // sendToKitchen's own ownership check — which Prisma treats as "no
      // filter on that field" rather than "match nothing," meaning the
      // check silently passed for ANY order regardless of outlet. A real
      // security bypass, not just a crash — now fixed.
      await kotService.sendToKitchen(orderId, orderItemIds, outletId);
    } catch (err) {
      // Don't let a KOT problem (e.g. a menu item missing kitchenSectionId)
      // undo a payment that's already been taken — just log it so staff
      // can notice and fire the KOT manually from the POS if needed.
      console.error(
        `Kiosk order ${order.orderNumber}: payment confirmed but failed to send to kitchen — ${err.message}`,
      );
      await repo.updateOrderStatus(orderId, "ACCEPTED", outletId);
    }
  } else {
    await repo.updateOrderStatus(orderId, "ACCEPTED", outletId);
  }

  return serializeOrder(await repo.findOrderById(orderId, outletId));
}

// ==================================================
// PAYMENT — CASH
// ==================================================

// Customer confirms at the kiosk; the counter/cashier collects the actual
// cash and marks it PAID later via the POS. The order still gets fired to
// the kitchen right away, same as "Pay at Counter" in the POS flow.
export const confirmPayment = async (
  orderId,
  { method, transactionReference },
  outletId,
) => {
  if (method !== "CASH") {
    // UPI/CARD are handled by the dedicated Razorpay endpoints below —
    // this keeps the old /orders/:id/pay route from silently doing the
    // wrong thing if something still calls it with method=UPI/CARD.
    throw new AppError(
      `${method} payments go through the Razorpay flow (createRazorpayOrderForCard + verifyRazorpayCardPayment for CARD, getUpiQr + checkQrPaymentStatus for UPI), not /pay.`,
      400,
    );
  }

  const order = await repo.findOrderById(orderId, outletId);
  if (!order) throw new AppError("Order not found", 404);
  if (order.status === "CANCELLED")
    throw new AppError("This order was cancelled", 409);

  const payment = await repo.findLatestPaymentForOrder(orderId, outletId);
  if (!payment)
    throw new AppError("No payment record found for this order", 500);

  await repo.updatePayment(payment.id, {
    method: "CASH",
    status: "UNPAID",
  }, outletId);

  return dispatchToKitchen(orderId, outletId);
};

// ==================================================
// PAYMENT — UPI (Razorpay QR Code API)
// ==================================================

// Creates a fixed-amount, single-use Razorpay QR code for this order and
// returns its hosted image so the kiosk can just <img> it. Razorpay tracks
// payments made against this QR code id — see checkQrPaymentStatus below.
export const getUpiQr = async (orderId, outletId) => {
  const order = await repo.findOrderById(orderId, outletId);
  if (!order) throw new AppError("Order not found", 404);
  if (order.status === "CANCELLED")
    throw new AppError("This order was cancelled", 409);

  const qrCode = await razorpay.qrCode.create({
    type: "upi_qr",
    name: `Order ${order.orderNumber}`,
    usage: "single_use",
    fixed_amount: true,
    payment_amount: toPaise(order.grandTotal),
    description: `Order ${order.orderNumber}`,
    notes: { kioskOrderId: order.id, orderNumber: order.orderNumber },
  });

  console.log(qrCode);

  const payment = await repo.findLatestPaymentForOrder(orderId, outletId);
  if (payment) {
    await repo.updatePayment(payment.id, {
      method: "UPI",
      transactionReference: qrCode.id, // Razorpay QR code id — used to reconcile
      status: "UNPAID",
    }, outletId);
  }

  return {
    qrDataUrl: qrCode.image_url, // Razorpay hosts the actual QR image
    qrCodeId: qrCode.id,
    amount: Number(order.grandTotal),
  };
};

// Polled by the kiosk (KioskQrScan) every few seconds while the QR is on
// screen. In TEST MODE, simulate a payment against the QR code from the
// Razorpay Dashboard (Test Mode -> Payments -> QR Codes) and this poll will
// pick it up within a few seconds — no public webhook URL / ngrok required
// for local testing.
// Cache the last Razorpay check for each order to avoid hitting
// Razorpay on every frontend poll.
const qrStatusCache = new Map();

export const checkQrPaymentStatus = async (orderId, outletId) => {
  const order = await repo.findOrderById(orderId, outletId);
  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const payment = order.payments?.[0];

  if (!payment?.transactionReference) {
    return { paid: false };
  }

  // Already paid (usually updated by webhook)
  if (payment.status === "PAID") {
    return {
      paid: true,
      order: await dispatchToKitchen(orderId, outletId),
    };
  }

  const qrCodeId = payment.transactionReference;

  const now = Date.now();
  const cache = qrStatusCache.get(orderId);

  // Don't call Razorpay again within 30 seconds.
  if (cache && now - cache.lastChecked < 30000) {
    return { paid: false };
  }

  qrStatusCache.set(orderId, {
    lastChecked: now,
  });

  let result;

  try {
    result = await razorpay.qrCode.fetchAllPayments(qrCodeId);
  } catch (err) {
    console.error("========== RAZORPAY ERROR ==========");
    console.error("Status:", err.statusCode);
    console.error("Description:", err.error?.description);
    console.error(err);
    console.error("====================================");

    // Razorpay rate-limited us.
    // Don't fail the kiosk UI—just try again on the next poll.
    if (err.statusCode === 429) {
      return { paid: false };
    }

    throw err;
  }

  const captured = (result?.items || []).find(
    (payment) => payment.status === "captured"
  );

  if (!captured) {
    return { paid: false };
  }

  qrStatusCache.delete(orderId);

  await repo.updatePayment(payment.id, {
    method: "UPI",
    status: "PAID",
    transactionReference: captured.id,
    paidAt: new Date(),
  }, outletId);

  return {
    paid: true,
    order: await dispatchToKitchen(orderId, outletId),
  };
};

// ==================================================
// PAYMENT — CARD (Razorpay Checkout, test card numbers)
// ==================================================

// Creates a Razorpay Order for this kiosk order's amount. The frontend uses
// this to open Razorpay's Checkout.js popup right on the kiosk screen (test
// mode accepts Razorpay's published test card numbers — no physical
// terminal needed for now).
export const createRazorpayOrderForCard = async (orderId, outletId) => {
  const order = await repo.findOrderById(orderId, outletId);
  if (!order) throw new AppError("Order not found", 404);
  if (order.status === "CANCELLED")
    throw new AppError("This order was cancelled", 409);

  const rpOrder = await razorpay.orders.create({
    amount: toPaise(order.grandTotal),
    currency: "INR",
    receipt: order.orderNumber,
    notes: { kioskOrderId: order.id, orderNumber: order.orderNumber },
  });

  const payment = await repo.findLatestPaymentForOrder(orderId, outletId);
  if (payment) {
    await repo.updatePayment(payment.id, {
      method: "CARD",
      transactionReference: rpOrder.id, // Razorpay order id — used to reconcile
      status: "UNPAID",
    }, outletId);
  }

  return {
    razorpayOrderId: rpOrder.id,
    amount: rpOrder.amount,
    currency: rpOrder.currency,
    keyId: RAZORPAY_KEY_ID,
    orderNumber: order.orderNumber,
  };
};

// Called once Razorpay Checkout's `handler` fires with a successful
// payment. We MUST verify the signature server-side before trusting it —
// never mark PAID off the frontend callback alone.
export const verifyRazorpayCardPayment = async (
  orderId,
  { razorpay_order_id, razorpay_payment_id, razorpay_signature },
  outletId,
) => {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new AppError("Missing Razorpay payment verification fields", 400);
  }

  const order = await repo.findOrderById(orderId, outletId);
  if (!order) throw new AppError("Order not found", 404);

  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new AppError("Payment verification failed — signature mismatch", 400);
  }

  const payment = await repo.findLatestPaymentForOrder(orderId, outletId);
  if (payment) {
    await repo.updatePayment(payment.id, {
      method: "CARD",
      status: "PAID",
      transactionReference: razorpay_payment_id,
      paidAt: new Date(),
    }, outletId);
  }

  return dispatchToKitchen(orderId, outletId);
};

// ==================================================
// RAZORPAY WEBHOOK (production safety net for UPI + Card)
// ==================================================
// Configure in Razorpay Dashboard -> Settings -> Webhooks, pointing at
// POST /api/kiosk/webhook/razorpay, subscribed to at least:
//   - qr_code.credited   (UPI QR payments)
//   - payment.captured   (covers Card / general payment confirmation)
//
// IMPORTANT: signature verification needs the *raw* request body, not the
// parsed JSON (key order can change HMAC output). If your main server file
// does `app.use(express.json())`, add a verify callback so the raw bytes
// are preserved for this check:
//
//   app.use(express.json({
//     verify: (req, res, buf) => { req.rawBody = buf; }
//   }));
//
// kiosk.controller.js's razorpayWebhook reads req.rawBody if present.
//
// NOTE ON TENANCY: this handler deliberately does NOT go through
// resolveKioskOutlet (see kiosk.routes.js) — Razorpay's servers call this
// directly and have no concept of our outletId. Instead, the outlet is
// resolved implicitly: findOrderByPaymentReference looks up the Order by
// the (globally-unique) Razorpay reference we gave it at creation time,
// and everything downstream uses that order's own outletId.
export const handleRazorpayWebhook = async (rawBody, signature) => {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    // Webhook secret not configured — refuse rather than silently trusting
    // unsigned requests. Polling (checkQrPaymentStatus) still works fine
    // without this configured at all; the webhook is just a backup.
    throw new AppError("Webhook secret not configured", 400);
  }

  const expected = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (expected !== signature) {
    throw new AppError("Invalid webhook signature", 400);
  }

  const event = JSON.parse(rawBody);

  if (event.event === "qr_code.credited") {
    const qrCodeId = event.payload?.qr_code?.entity?.id;
    const rpPayment = event.payload?.payment?.entity;
    if (qrCodeId && rpPayment) {
      const order = await repo.findOrderByPaymentReference(qrCodeId);
      if (order) {
        const payment = await repo.findLatestPaymentForOrder(order.id, order.outletId);
        if (payment && payment.status !== "PAID") {
          await repo.updatePayment(payment.id, {
            method: "UPI",
            status: "PAID",
            transactionReference: rpPayment.id,
            paidAt: new Date(),
          }, order.outletId);
        }
        await dispatchToKitchen(order.id, order.outletId);
      }
    }
  }

  if (event.event === "payment.captured") {
    const rpPayment = event.payload?.payment?.entity;
    const rpOrderId = rpPayment?.order_id;
    if (rpOrderId) {
      const order = await repo.findOrderByPaymentReference(rpOrderId);
      if (order) {
        const payment = await repo.findLatestPaymentForOrder(order.id, order.outletId);
        if (payment && payment.status !== "PAID") {
          await repo.updatePayment(payment.id, {
            method: payment.method === "UPI" ? "UPI" : "CARD",
            status: "PAID",
            transactionReference: rpPayment.id,
            paidAt: new Date(),
          }, order.outletId);
        }
        await dispatchToKitchen(order.id, order.outletId);
      }
    }
  }

  return { received: true };
};

// ==================================================
// ORDER STATUS / LOOKUP
// ==================================================

export const getOrder = async (id, outletId) => {
  const order = await repo.findOrderById(id, outletId);
  if (!order) throw new AppError("Order not found", 404);
  return serializeOrder(order);
};

export const cancelOrder = async (id, outletId) => {
  const order = await repo.findOrderById(id, outletId);
  if (!order) throw new AppError("Order not found", 404);
  if (["COMPLETED", "SERVED"].includes(order.status)) {
    throw new AppError("Completed orders cannot be cancelled", 409);
  }
  await repo.updateOrderStatus(id, "CANCELLED", outletId);
  await repo.freeTableForOrder(id, outletId);
  return getOrder(id, outletId);
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
    customer: order.customer
      ? { id: order.customer.id, name: order.customer.name }
      : null,
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