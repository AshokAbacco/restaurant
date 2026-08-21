// server/src/kiosk/kiosk.routes.js
import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as controller from "./kiosk.controller.js";
import { requireKioskAuth, resolveKioskOutlet } from "./kiosk.middleware.js";
console.log("USING kiosk.routes.js", new Date().toISOString());
// Kiosk endpoints are public-facing (device key, not staff login) so they
// get a rate limiter to keep an unattended device from being abused as a
// flood vector against order/payment creation.
const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please slow down" },
});

// The QR-status poll fires every few seconds while the payment screen is
// open, so it needs a much more generous limit than order/payment writes.
// const pollLimiter = rateLimit({
//   windowMs: 60 * 1000,
//   max: 120,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { success: false, message: "Too many requests, please slow down" },
// });

const pollLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,

  handler(req, res) {
    console.log("RATE LIMITED");
    console.log("IP:", req.ip);
    console.log("URL:", req.originalUrl);

    res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  },
});

console.log(
  "🚀 USING UPDATED server/src/kiosk/kiosk.routes.js - KIOSK WITHOUT STAFF AUTH",
);

const router = Router();

router.use((req, res, next) => {
  console.log("✅ KIOSK ROUTER HIT:", req.method, req.originalUrl);
  next();
});

// ---------- Razorpay Webhook ----------
// IMPORTANT: registered BEFORE requireKioskAuth below, so it does NOT need
// the kiosk device key — Razorpay's own servers call this, not a kiosk
// device, and they don't have (or want) an x-kiosk-key header. Signature
// verification inside the controller/service is what authenticates this
// request instead.
router.post("/webhook/razorpay", controller.razorpayWebhook);

router.use(requireKioskAuth);
// resolveKioskOutlet reads outletId from the QR code's URL (query param on
// GET, body field on writes) — see the comment in kiosk.middleware.js for
// why this can't come from a staff-style session. Applied to every route
// below except the webhook above, which Razorpay calls directly and can't
// be expected to know or send our outletId — it resolves the outlet
// implicitly via the order the payment reference points back to instead.
router.use(resolveKioskOutlet);

// ---------- Menu (read-only, customer-facing) ----------
router.get("/menu", controller.getMenu);
router.get("/menu/:menuItemId/addons", controller.getAddOnsForItem);

// ---------- Tables ----------
router.get("/tables", controller.getTables);

// ---------- Orders ----------
router.post("/orders", orderLimiter, controller.createOrder);
router.get("/orders/:id", controller.getOrder);
router.post("/orders/:id/cancel", orderLimiter, controller.cancelOrder);

// ---------- Payment: Cash ----------
router.post("/orders/:id/pay", orderLimiter, controller.payOrder);

// ---------- Payment: UPI (Razorpay QR Code) ----------
router.get("/orders/:id/upi-qr", orderLimiter, controller.getUpiQr);
router.get(
  "/orders/:id/upi-qr/status",
  pollLimiter,
  controller.checkQrPaymentStatus,
);

// ---------- Payment: Card (Razorpay Checkout) ----------
router.post("/orders/:id/card-order", orderLimiter, controller.createCardOrder);
router.post(
  "/orders/:id/card-order/verify",
  orderLimiter,
  controller.verifyCardPayment,
);


export default router;

// ==================================================
// Mount this in your main server file alongside the menu module, e.g.:
//
//   import kioskRoutes from "./kiosk/kiosk.routes.js";
//   app.use("/api/kiosk", kioskRoutes);
//
// Requires: npm install qrcode express-rate-limit razorpay
//
// For the Razorpay webhook signature check to work, make sure your JSON
// body parser preserves the raw bytes (add this once, near the top of
// your main server file, before routes are mounted):
//
//   app.use(express.json({
//     verify: (req, res, buf) => { req.rawBody = buf; }
//   }));
//
// Env vars needed (test mode):
//   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
//   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
//   RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx   (optional, only if you set
//     up a webhook in the Razorpay dashboard — polling works without it)
// ==================================================