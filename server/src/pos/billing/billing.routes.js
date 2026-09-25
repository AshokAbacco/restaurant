// server/src/pos/billing/billing.routes.js
import { Router } from "express";
import * as billingController from "./billing.controller.js";

const router = Router();

// GET  /pos/billing/orders/:orderId/summary  -> bill preview for the modal
// POST /pos/billing/orders/:orderId/complete -> take payment(s), complete
//      order, generate invoice, free table (all only on full payment)
// GET /pos/billing/history?from=&to=&search= -> every bill raised in a date
//      range, for reconciliation and reprinting
// GET /pos/billing/orders -> slim list of still-billable orders for the
//      Billing page (DELIVERY only when enabled in Settings -> Tax & Billing)
// GET /pos/billing/config -> { deliveryBillingEnabled }
router.get("/history", billingController.getBillHistory);
router.get("/orders", billingController.getBillableOrders);
router.get("/config", billingController.getBillingConfig);
router.get("/orders/:orderId/summary", billingController.getBillingSummary);
router.post("/orders/:orderId/complete", billingController.completeBilling);

export default router;