// ==============================================
// server/src/pricing/pricing.service.js
// ==============================================
//
// WRITE-ON-SUCCESS RULE
// ---------------------
// A PricingPayment row is written ONLY when money has actually changed
// hands: a Razorpay signature that verifies, a payment.captured webhook, or
// a zero-amount free trial. A checkout that is cancelled, dismissed,
// abandoned or declined leaves NO row behind.
//
// That is a deliberate reversal of how this module used to work. The old
// flow created the row up front with status CREATED and patched it to
// PAID/FAILED afterwards, which meant the table filled up with rows for
// people who never paid — and, worse, handed out a real paymentRecordId to
// the browser BEFORE payment, which the Register page then accepted as
// proof of purchase.
//
// The consequence of not writing early is that the selection (plan, tier,
// branch count) and the billing contact have nowhere on our side to live
// between "order created" and "payment captured". They are therefore
// stashed in the Razorpay order's own `notes`, and read back out of it with
// orders.fetch() at capture time. Razorpay is the system of record for that
// window, which is appropriate: it is also the only party that knows
// whether the payment happened.
//
// The amount is NEVER read back from notes — it is always recomputed from
// planId/tierKey/branches through priceQuote(), so a tampered note could at
// worst misdescribe an order, never change what was charged or what
// entitlement is granted.

import crypto from "crypto";
import prisma from "../../prisma/client.js";
import razorpay, {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
} from "../config/razorpay.js";
import { priceQuote } from "./pricing.plans.js";

// Razorpay caps each note value at 256 chars and allows at most 15 keys.
// Exceeding either makes the whole orders.create call fail, which would
// present to the user as "couldn't start checkout" — so clamp rather than
// risk it. We use 11 keys; the free headroom is intentional.
const NOTE_MAX = 250;
const note = (value) => String(value ?? "").slice(0, NOTE_MAX);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[6-9]\d{9}$/;

// ==============================================
// POST /api/pricing/create-order
// ==============================================
// Paid plans: creates a Razorpay order and NOTHING in our database.
// Free plan: there is no payment to wait for, so the row is written here
// and is immediately PAID with amount 0 — this table doubles as the
// trial-signup log.
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

  // Required for both flows now, not just paid ones: the Register page
  // prefills itself from these, so a signup with no email or phone recorded
  // would strand the user on a half-empty form with fields they can't edit.
  if (!email || !EMAIL_PATTERN.test(email)) {
    return { success: false, status: 400, message: "A valid email is required." };
  }
  if (!phone || !PHONE_PATTERN.test(String(phone).replace(/\D/g, ""))) {
    return {
      success: false,
      status: 400,
      message: "A valid 10-digit mobile number is required.",
    };
  }
  if (!restaurant.trim()) {
    return { success: false, status: 400, message: "Restaurant name is required." };
  }
  if (!name.trim()) {
    return { success: false, status: 400, message: "Your name is required." };
  }

  // ---- Free plan: no payment, no Razorpay order, record it now ----
  if (quote.isFree) {
    const record = await prisma.pricingPayment.create({
      data: {
        planId: quote.planId,
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
      branches: record.branches,
    };
  }

  // ---- Paid plans ----
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return {
      success: false,
      status: 500,
      message: "Payments are not configured on the server yet.",
    };
  }

  let order;
  try {
    order = await razorpay.orders.create({
      amount: quote.total * 100, // paise
      currency: "INR",
      // Receipt is capped at 40 chars by Razorpay. There is no local row to
      // point at any more, so this is just a readable correlation id for
      // the Razorpay dashboard.
      receipt: `abacco_${crypto.randomBytes(12).toString("hex")}`,
      notes: {
        // The selection — everything needed to re-derive the price and the
        // branch entitlement at capture time.
        planId: note(quote.planId),
        tierKey: note(quote.tierKey),
        branches: note(quote.branches),
        // The billing contact — everything the Register page prefills from.
        restaurant: note(restaurant),
        name: note(name),
        email: note(email),
        phone: note(String(phone).replace(/\D/g, "")),
        city: note(city),
        gstin: note(gstin),
        customerNotes: note(notes),
        extraNeeds: note(extraNeeds),
      },
    });
  } catch (err) {
    console.error("Razorpay order creation failed:", err);
    return {
      success: false,
      status: 502,
      message: "Could not create the Razorpay order. Please try again.",
    };
  }

  // NOTE: no paymentRecordId is returned here, because no record exists
  // yet. The client gets one only from verify-payment, once the payment is
  // real. Anything that hands the browser an id before that point is
  // handing it a forgeable proof of purchase.
  return {
    success: true,
    isFree: false,
    orderId: order.id,
    amount: order.amount, // paise, echoed back so the client doesn't recompute
    currency: order.currency,
    keyId: RAZORPAY_KEY_ID,
    planName: quote.planName,
    tierLabel: quote.tierLabel,
    branches: quote.branches,
  };
};

// ==============================================
// Shared persist step
// ==============================================
// Called from BOTH verifyPayment (browser came back with a signature) and
// handleWebhook (Razorpay told us server-to-server). Whichever arrives
// first writes the row; the other finds it and returns it unchanged.
//
// Idempotency rests on PricingPayment.razorpayOrderId being @unique: even
// if the two paths race, the second create throws P2002 and is resolved by
// re-reading the row rather than producing a duplicate.
const persistPaidPayment = async (order, { paymentId, signature = null }) => {
  const existing = await prisma.pricingPayment.findUnique({
    where: { razorpayOrderId: order.id },
  });
  if (existing) return existing;

  const n = order.notes || {};

  // Re-derived, never read back as an amount. If the notes were somehow
  // mangled, fall back to describing the order from what Razorpay itself
  // holds rather than throwing away a real payment.
  let quote;
  try {
    quote = priceQuote({
      planId: n.planId,
      tierKey: n.tierKey,
      branches: n.branches,
    });
  } catch (err) {
    console.error(
      `Could not re-derive the quote for Razorpay order ${order.id}:`,
      err.message,
    );
    quote = null;
  }

  // Sanity check: the order was created from this same function, so a
  // mismatch means the notes no longer describe the order. Log loudly and
  // record what was actually collected.
  const paidRupees = Math.round(Number(order.amount) / 100);
  if (quote && quote.total !== paidRupees) {
    console.error(
      `Amount mismatch on Razorpay order ${order.id}: notes re-derive to ₹${quote.total}, order collected ₹${paidRupees}. Recording the collected amount.`,
    );
  }

  const data = {
    planId: quote?.planId || n.planId || "unknown",
    tierKey: quote?.tierKey ?? (n.tierKey || null),
    tierLabel: quote?.tierLabel ?? null,
    billingCycle: quote?.cycle || "month",
    // The entitlement. Falls back to 1 rather than to an unvalidated note,
    // so a corrupted note can never inflate a plan's branch allowance.
    branches: quote?.branches ?? 1,
    unitAmount: quote?.unit ?? 0,
    subtotal: quote?.subtotal ?? paidRupees,
    gst: quote?.gst ?? 0,
    amount: paidRupees,
    restaurantName: n.restaurant || null,
    contactName: n.name || null,
    email: n.email || null,
    phone: n.phone || null,
    city: n.city || null,
    gstin: n.gstin || null,
    notes: n.customerNotes || null,
    extraNeeds: n.extraNeeds || null,
    razorpayOrderId: order.id,
    razorpayPaymentId: paymentId || null,
    razorpaySignature: signature,
    status: "PAID",
  };

  try {
    return await prisma.pricingPayment.create({ data });
  } catch (err) {
    // Lost the race with the other path (verify vs webhook) — the row it
    // wrote is just as good as the one we were about to write.
    if (err.code === "P2002") {
      return prisma.pricingPayment.findUnique({
        where: { razorpayOrderId: order.id },
      });
    }
    throw err;
  }
};

// ==============================================
// POST /api/pricing/verify-payment
// ==============================================
// Standard Razorpay checkout signature check:
//   HMAC_SHA256(order_id + "|" + payment_id, key_secret) === signature
// This is the only thing that proves the payment happened — the `handler`
// callback firing in the browser is not proof by itself, since it runs on
// the client and can be spoofed. A failed check writes nothing.
export const verifyPayment = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { success: false, status: 400, message: "Missing payment details." };
  }

  // createHmac throws on an undefined key, which would surface as an
  // unhandled 500 rather than a diagnosable message. Fail closed and say
  // what's actually wrong.
  if (!RAZORPAY_KEY_SECRET) {
    console.error("RAZORPAY_KEY_SECRET is not set — cannot verify payments.");
    return {
      success: false,
      status: 500,
      message: "Payments are not configured on the server yet.",
    };
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
    // Nothing is recorded. There is no half-state to clean up precisely
    // because nothing was written when the order was created.
    console.warn(
      `Signature verification failed for Razorpay order ${razorpay_order_id}.`,
    );
    return {
      success: false,
      status: 400,
      message: "Payment verification failed.",
    };
  }

  // The signature proves the order/payment pair is genuine. Fetch the order
  // to recover the selection and contact details we stashed in its notes.
  let order;
  try {
    order = await razorpay.orders.fetch(razorpay_order_id);
  } catch (err) {
    console.error(`Could not fetch Razorpay order ${razorpay_order_id}:`, err);
    return {
      success: false,
      status: 502,
      // The money IS taken at this point, so don't imply otherwise — the
      // webhook will normally pick this up within seconds anyway.
      message:
        "Your payment went through, but we couldn't finish setting up your account. Please contact support with your payment id.",
    };
  }

  const record = await persistPaidPayment(order, {
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  return {
    success: true,
    paymentRecordId: record.id,
    razorpayPaymentId: razorpay_payment_id,
    planId: record.planId,
    branches: record.branches,
    email: record.email,
    contactName: record.contactName,
    restaurantName: record.restaurantName,
  };
};

// ==============================================
// POST /api/pricing/webhook  (Razorpay server-to-server webhook)
// ==============================================
// Belt-and-braces alongside verifyPayment: that covers the happy path where
// the browser comes back with a signature, but a closed tab, a network
// drop, or a payment that settles asynchronously (some UPI flows) means the
// browser may never call /verify-payment at all. This is Razorpay telling
// the server directly, independent of the client.
//
// payment.failed deliberately writes NOTHING — a failed payment leaves no
// trace in PricingPayment by design.
//
// IMPORTANT: expects the RAW request body (a Buffer), not parsed JSON — see
// index.js, which mounts this route with express.raw() BEFORE the global
// express.json(), because the signature covers the exact bytes sent.
export const handleWebhook = async (rawBody, signatureHeader) => {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    return {
      success: false,
      status: 500,
      message: "Webhook secret not configured.",
    };
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

  // Only a captured payment creates anything. payment.failed, refunds and
  // disputes are acknowledged so Razorpay stops retrying, and ignored.
  if (event.event !== "payment.captured") {
    return { success: true, ignored: true };
  }

  const payment = event?.payload?.payment?.entity;
  const orderId = payment?.order_id;
  if (!orderId) {
    return { success: true, ignored: true };
  }

  let order;
  try {
    order = await razorpay.orders.fetch(orderId);
  } catch (err) {
    console.error(`Webhook could not fetch Razorpay order ${orderId}:`, err);
    // 500 so Razorpay retries — the payment is real and we want the row.
    return {
      success: false,
      status: 500,
      message: "Could not fetch the order for this payment.",
    };
  }

  await persistPaidPayment(order, { paymentId: payment.id });

  return { success: true };
};

// ==============================================
// GET /api/pricing/payments/:id
// ==============================================
// Feeds the Register page: it prefills every Restaurant Details field from
// this, leaving the user only a password to set.
//
// Returns 404 for anything that isn't a completed payment, so a cancelled
// checkout can't be walked past. `alreadyUsed` lets the Register page say
// "this payment already has an account" instead of letting someone fill in
// the whole form and only then hit a 409.
//
// NOTE: this is an unauthenticated lookup by UUID — it has to be, since the
// account it will create doesn't exist yet. The id is a v4 UUID handed only
// to the payer's own browser, so it is unguessable in practice, but it is
// worth knowing that possession of the id is the only thing gating these
// contact details. Registration additionally requires the submitted email
// to match the paid email (see auth.service.js), so a leaked id alone can't
// be used to register someone else's restaurant.
export const getPaymentRecord = async (id) => {
  if (!id) return { success: false, status: 400, message: "Missing payment id." };

  const record = await prisma.pricingPayment.findUnique({
    where: { id },
    include: { owner: { select: { id: true } } },
  });

  if (!record || record.status !== "PAID") {
    return {
      success: false,
      status: 404,
      message: "We couldn't find a completed payment for this reference.",
    };
  }

  return {
    success: true,
    payment: {
      id: record.id,
      planId: record.planId,
      tierLabel: record.tierLabel,
      billingCycle: record.billingCycle,
      // What the Branches page will enforce once they're registered.
      branches: record.branches,
      amount: record.amount,
      status: record.status,
      // ---- Register page prefill ----
      restaurantName: record.restaurantName,
      contactName: record.contactName,
      email: record.email,
      phone: record.phone,
      city: record.city,
      gstin: record.gstin,
      alreadyUsed: Boolean(record.owner),
    },
  };
};