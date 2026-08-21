// server/src/kiosk/kiosk.controller.js
import * as service from "./kiosk.service.js";
import {
  validateOrderInput,
  validatePaymentInput,
} from "./kiosk.validation.js";

const handleError = (res, err) => {
  console.error("========== CONTROLLER ERROR ==========");
  console.error(err);
  console.error("statusCode:", err.statusCode);
  console.error("message:", err.message);
  console.error("======================================");

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Something went wrong",
  });
};

// ---------- Menu ----------

export const getMenu = async (req, res) => {
  try {
    const menu = await service.getKioskMenu(req.tenant.outletId);
    res.json({ success: true, data: menu });
  } catch (err) {
    handleError(res, err);
  }
};

export const getAddOnsForItem = async (req, res) => {
  try {
    const addOns = await service.getAddOnsForMenuItem(
      req.params.menuItemId,
      req.tenant.outletId,
    );
    res.json({ success: true, data: addOns });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Tables ----------

export const getTables = async (req, res) => {
  try {
    const tables = await service.getAvailableTables(req.tenant.outletId);
    res.json({ success: true, data: tables });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Orders ----------

export const createOrder = async (req, res) => {
  try {
    const errors = validateOrderInput(req.body);
    if (errors.length) return res.status(400).json({ success: false, errors });

    const order = await service.createOrder(req.body, req.tenant.outletId);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    handleError(res, err);
  }
};

export const getOrder = async (req, res) => {
  try {
    const order = await service.getOrder(req.params.id, req.tenant.outletId);
    res.json({ success: true, data: order });
  } catch (err) {
    handleError(res, err);
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const order = await service.cancelOrder(req.params.id, req.tenant.outletId);
    res.json({ success: true, data: order });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Payment: Cash ----------

export const payOrder = async (req, res) => {
  try {
    const errors = validatePaymentInput(req.body);
    if (errors.length) return res.status(400).json({ success: false, errors });

    const order = await service.confirmPayment(req.params.id, req.body, req.tenant.outletId);
    res.json({ success: true, data: order });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Payment: UPI (Razorpay QR Code) ----------

export const getUpiQr = async (req, res) => {
  try {
    const qr = await service.getUpiQr(req.params.id, req.tenant.outletId);
    res.json({ success: true, data: qr });
  } catch (err) {
    handleError(res, err);
  }
};

// Polled by the kiosk while the QR is on screen.
export const checkQrPaymentStatus = async (req, res) => {
  try {
    const result = await service.checkQrPaymentStatus(req.params.id, req.tenant.outletId);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Payment: Card (Razorpay Checkout) ----------

export const createCardOrder = async (req, res) => {
  try {
    const data = await service.createRazorpayOrderForCard(req.params.id, req.tenant.outletId);
    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
};

export const verifyCardPayment = async (req, res) => {
  try {
    const order = await service.verifyRazorpayCardPayment(
      req.params.id,
      req.body,
      req.tenant.outletId,
    );
    res.json({ success: true, data: order });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Razorpay Webhook ----------
// Not customer-facing — Razorpay's servers call this directly, so it
// bypasses the kiosk device-key auth AND resolveKioskOutlet entirely (see
// kiosk.routes.js — this route is registered before either middleware is
// applied). No req.tenant is available here; the service resolves the
// outlet itself from the order the payment reference points back to.
export const razorpayWebhook = async (req, res) => {
  try {
    const signature = req.header("x-razorpay-signature");
    // Prefer the raw, unparsed bytes captured by an express.json({ verify })
    // callback in your main server file — required for an exact HMAC match.
    // Falls back to re-stringifying req.body, which works in most cases but
    // isn't byte-for-byte guaranteed if key order differs.
    const rawBody = req.rawBody
      ? req.rawBody.toString()
      : JSON.stringify(req.body);
    await service.handleRazorpayWebhook(rawBody, signature);
    res.json({ success: true });
  } catch (err) {
    console.error("Razorpay webhook error:", err.message);
    // Razorpay retries on non-2xx, which is fine for transient failures —
    // but don't leak internals in the response.
    res
      .status(400)
      .json({ success: false, message: "Webhook processing failed" });
  }
};