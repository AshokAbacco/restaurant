// server/src/pos/billing/billing.routes.js
import { Router } from "express";
import * as billingController from "./billing.controller.js";

const router = Router();

// GET  /pos/billing/orders/:orderId/summary  -> bill preview for the modal
// POST /pos/billing/orders/:orderId/complete -> take payment(s), complete
//      order, generate invoice, free table (all only on full payment)
router.get("/orders/:orderId/summary", billingController.getBillingSummary);
router.post("/orders/:orderId/complete", billingController.completeBilling);

export default router;