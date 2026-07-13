// server/src/kiosk/kiosk.routes.js
import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as controller from "./kiosk.controller.js";
import { requireKioskAuth } from "./kiosk.middleware.js";

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

console.log(
  "🚀 USING UPDATED server/src/kiosk/kiosk.routes.js - KIOSK WITHOUT STAFF AUTH",
);

const router = Router();

router.use((req, res, next) => {
  console.log("✅ KIOSK ROUTER HIT:", req.method, req.originalUrl);
  next();
});

router.use(requireKioskAuth);
// router.use(requireKioskAuth);

// ---------- Menu (read-only, customer-facing) ----------
router.get("/menu", controller.getMenu);
router.get("/menu/:menuItemId/addons", controller.getAddOnsForItem);

// ---------- Tables ----------
router.get("/tables", controller.getTables);

// ---------- Orders ----------
router.post("/orders", orderLimiter, controller.createOrder);
router.get("/orders/:id", controller.getOrder);
router.post("/orders/:id/cancel", orderLimiter, controller.cancelOrder);

// ---------- Payment ----------
router.get("/orders/:id/upi-qr", orderLimiter, controller.getUpiQr);
router.post("/orders/:id/pay", orderLimiter, controller.payOrder);

export default router;

// ==================================================
// Mount this in your main server file alongside the menu module, e.g.:
//
//   import kioskRoutes from "./kiosk/kiosk.routes.js";
//   app.use("/api/kiosk", kioskRoutes);
//  
// Requires: npm install qrcode express-rate-limit
// ==================================================
