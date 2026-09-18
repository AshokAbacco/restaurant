// ==============================================
// server/src/pricing/pricing.controller.js
// ==============================================

import * as pricingService from "./pricing.service.js";

// ==============================================
// POST /api/pricing/create-order
// Public — this runs before the restaurant has an account, so there is no
// requireAuth here (mirrors /api/auth/register and /api/auth/login).
// ==============================================
export const createOrderHandler = async (req, res) => {
  try {
    const { planId, tierKey, branches, contact } = req.body;

    console.log("📥 REQUEST BODY:", req.body); // 👈 DEBUG

    const result = await pricingService.createOrder({
      planId,
      tierKey,
      branches,
      contact,
    });

    console.log("✅ SERVICE RESULT:", result); // 👈 DEBUG

    if (!result.success) {
      return res
        .status(result.status || 400)
        .json({ success: false, message: result.message });
    }

    return res.status(201).json(result);

  } catch (err) {
    console.error("🔥 ERROR IN createOrderHandler:", err); // 👈 VERY IMPORTANT

    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

// ==============================================
// POST /api/pricing/verify-payment
// ==============================================
export const verifyPaymentHandler = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const result = await pricingService.verifyPayment({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  if (!result.success) {
    return res
      .status(result.status || 400)
      .json({ success: false, message: result.message });
  }

  return res.status(200).json(result);
};

// ==============================================
// GET /api/pricing/payments/:id
// Lets the Register page confirm a completed payment (by the id returned
// from create-order/verify-payment) before it lets signup proceed.
// ==============================================
export const getPaymentHandler = async (req, res) => {
  const result = await pricingService.getPaymentRecord(req.params.id);

  if (!result.success) {
    return res
      .status(result.status || 400)
      .json({ success: false, message: result.message });
  }

  return res.status(200).json(result);
};

// ==============================================
// POST /api/pricing/webhook
// Mounted in index.js with express.raw() ahead of the global express.json()
// — req.body here is a Buffer, not a parsed object. Always respond 200 once
// the signature is valid and the event has been handled/ignored, so
// Razorpay doesn't keep retrying; only signature failures get a 4xx.
// ==============================================
export const webhookHandler = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  const result = await pricingService.handleWebhook(req.body, signature);

  if (!result.success) {
    return res
      .status(result.status || 400)
      .json({ success: false, message: result.message });
  }

  return res.status(200).json({ success: true });
};
