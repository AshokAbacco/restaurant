// ==============================================
// server/src/pricing/pricing.routes.js
// ==============================================
// NOTE: the webhook route (POST /api/pricing/webhook) is intentionally NOT
// registered here — it needs the raw request body for signature
// verification, so it's mounted directly in index.js with express.raw(),
// ahead of the global express.json() call. See index.js and
// pricing.controller.js's webhookHandler for details.

import { Router } from "express";
import {
  createOrderHandler,
  verifyPaymentHandler,
  getPaymentHandler,
} from "./pricing.controller.js";

const router = Router();

// Public — same reasoning as /api/auth/register: this happens before the
// restaurant has an account or a session.
router.post("/create-order", createOrderHandler);
router.post("/verify-payment", verifyPaymentHandler);
router.get("/payments/:id", getPaymentHandler);

export default router;
