// ==============================================
// server/src/pricing/pricing.service.js
// ==============================================

import crypto from "crypto";
import prisma from "../../prisma/client.js";
import razorpay, {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
} from "../config/razorpay.js";
import { priceQuote } from "./pricing.plans.js";

// ==============================================
// POST /api/pricing/create-order
// ==============================================
// Creates the PricingPayment row first (status CREATED) so that even if
// Razorpay's API call fails, or the user never completes checkout, there is
// a durable record of the attempt with the server-computed amount tied to
// it. The Free plan short-circuits: no Razorpay order is needed, the row is
// written straight to PAID.
export const createOrder = async ({
  planId,
  tierKey,
  branches,
  contact = {},
}) => {
  let quote;
  try {
    quote = priceQuote({ planId, tierKey, branches });
  } catch (err) {
    return { success: false, status: 400, message: err.message };
  }

  const {
    restaurant = "",
    name = "",
    email = "",
    phone = "",
    city = "",
    gstin = "",
    notes = "",
    extraNeeds = "",
  } = contact;

  if (!quote.isFree) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return { success: false, status: 400, message: "A valid email is required." };
    }
    if (!phone || !/^[6-9]\d{9}$/.test(String(phone).replace(/\D/g, ""))) {
      return { success: false, status: 400, message: "A valid 10-digit mobile number is required." };
    }
  }

  // ---- Free plan: no payment, no Razorpay order ----
  if (planId === "free" || quote.total === 0) {
    const record = await prisma.pricingPayment.create({
      data: {
        planId,
        tierKey: quote.tierKey,
        tierLabel: quote.tierLabel,
        billingCycle: quote.cycle,
        branches: quote.branches,
        unitAmount: quote.unit,
        subtotal: quote.subtotal,
        gst: quote.gst,
        amount: quote.total,
        restaurantName: restaurant,
        contactName: name,
        email,
        phone,
        city,
        gstin,
        notes,
        extraNeeds,
        status: "PAID",
      },
    });

    return {
      success: true,
      isFree: true,
      paymentRecordId: record.id,
    };
  }

  // ---- Paid plans: create a real Razorpay order ----
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return {
      success: false,
      status: 500,
      message: "Payments are not configured on the server yet.",
    };
  }

  const record = await prisma.pricingPayment.create({
    data: {
      planId,
      tierKey: quote.tierKey,
      tierLabel: quote.tierLabel,
      billingCycle: quote.cycle,
      branches: quote.branches,
      unitAmount: quote.unit,
      subtotal: quote.subtotal,
      gst: quote.gst,
      amount: quote.total,
      restaurantName: restaurant,
      contactName: name,
      email,
      phone,
      city,
      gstin,
      notes,
      extraNeeds,
      status: "CREATED",
    },
  });

  let order;
  try {
    order = await razorpay.orders.create({
      amount: quote.total * 100, // paise
      currency: "INR",
      receipt: record.id,
      notes: {
        pricingPaymentId: record.id,
        plan: quote.planName,
        tier: quote.tierLabel,
        branches: String(quote.branches),
      },
    });
  } catch (err) {
    await prisma.pricingPayment.update({
      where: { id: record.id },
      data: { status: "FAILED" },
    });
    return {
      success: false,
      status: 502,
      message: "Could not create the Razorpay order. Please try again.",
    };
  }

  const updated = await prisma.pricingPayment.update({
    where: { id: record.id },
    data: { razorpayOrderId: order.id },
  });

  return {
    success: true,
    isFree: false,
    paymentRecordId: updated.id,
    orderId: order.id,
    amount: order.amount, // paise, echoed back so the client doesn't recompute
    currency: order.currency,
    keyId: RAZORPAY_KEY_ID,
    planName: quote.planName,
    tierLabel: quote.tierLabel,
  };
};

// ==============================================
// POST /api/pricing/verify-payment
// ==============================================
// Standard Razorpay checkout signature check:
//   HMAC_SHA256(order_id + "|" + payment_id, key_secret) === signature
// This is the only thing that actually proves the payment happened — the
// `handler` callback firing on the frontend is not proof by itself, since
// it runs in the browser and can be spoofed.
export const verifyPayment = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { success: false, status: 400, message: "Missing payment details." };
  }

  const record = await prisma.pricingPayment.findUnique({
    where: { razorpayOrderId: razorpay_order_id },
  });

  if (!record) {
    return { success: false, status: 404, message: "No matching order found." };
  }

  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const isValid =
    expectedSignature.length === razorpay_signature.length &&
    crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpay_signature),
    );

  if (!isValid) {
    await prisma.pricingPayment.update({
      where: { id: record.id },
      data: { status: "VERIFICATION_FAILED" },
    });
    return { success: false, status: 400, message: "Payment verification failed." };
  }

  const updated = await prisma.pricingPayment.update({
    where: { id: record.id },
    data: {
      status: "PAID",
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    },
  });

  return {
    success: true,
    paymentRecordId: updated.id,
    razorpayPaymentId: razorpay_payment_id,
    planId: updated.planId,
    email: updated.email,
    contactName: updated.contactName,
    restaurantName: updated.restaurantName,
  };
};

// ==============================================
// POST /api/pricing/webhook  (Razorpay server-to-server webhook)
// ==============================================
// Belt-and-braces alongside verifyPayment above: verifyPayment covers the
// happy path where the browser comes back with a signature, but a closed
// tab, a network drop, or a payment that settles asynchronously (e.g. some
// UPI flows) means the browser may never call /verify-payment at all. The
// webhook is Razorpay telling the server directly, independent of whether
// the client-side flow completed.
//
// IMPORTANT: this handler expects the RAW request body (a Buffer), not the
// parsed JSON — see index.js, which mounts this route with express.raw()
// BEFORE the global express.json() middleware, because the signature is
// computed over the exact raw bytes Razorpay sent.
export const handleWebhook = async (rawBody, signatureHeader) => {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    // Webhook secret not configured — accept nothing rather than skip
    // verification silently.
    return { success: false, status: 500, message: "Webhook secret not configured." };
  }

  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (
    !signatureHeader ||
    expectedSignature.length !== signatureHeader.length ||
    !crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signatureHeader),
    )
  ) {
    return { success: false, status: 400, message: "Invalid webhook signature." };
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return { success: false, status: 400, message: "Malformed webhook payload." };
  }

  const payload = event?.payload?.payment?.entity;
  const orderId = payload?.order_id;
  if (!orderId) {
    // Event type we don't care about (e.g. refund/dispute events) — ack it
    // so Razorpay doesn't retry, but do nothing.
    return { success: true, ignored: true };
  }

  const record = await prisma.pricingPayment.findUnique({
    where: { razorpayOrderId: orderId },
  });
  if (!record) {
    return { success: true, ignored: true };
  }

  if (event.event === "payment.captured" && record.status !== "PAID") {
    await prisma.pricingPayment.update({
      where: { id: record.id },
      data: {
        status: "PAID",
        razorpayPaymentId: payload.id,
      },
    });
  } else if (event.event === "payment.failed") {
    await prisma.pricingPayment.update({
      where: { id: record.id },
      data: { status: record.status === "PAID" ? "PAID" : "FAILED" },
    });
  }

  return { success: true };
};

// ==============================================
// GET /api/pricing/payments/:id  (used by the Register page to confirm a
// payment before letting the flow proceed there)
// ==============================================
export const getPaymentRecord = async (id) => {
  if (!id) return { success: false, status: 400, message: "Missing payment id." };

  const record = await prisma.pricingPayment.findUnique({ where: { id } });
  if (!record) {
    return { success: false, status: 404, message: "Payment record not found." };
  }

  return {
    success: true,
    payment: {
      id: record.id,
      planId: record.planId,
      tierLabel: record.tierLabel,
      branches: record.branches,
      amount: record.amount,
      status: record.status,
      restaurantName: record.restaurantName,
      contactName: record.contactName,
      email: record.email,
      phone: record.phone,
    },
  };
};
