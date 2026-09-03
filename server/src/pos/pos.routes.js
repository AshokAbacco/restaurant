// server/src/pos/pos.routes.js
import { Router } from "express";
import * as posController from "./pos.controller.js";
import { requireRole } from "../auth/auth.middleware.js";
import tablesRoutes from "./tables/tables.routes.js";
import customersRoutes from "./customers/customers.routes.js";
import addOnsRoutes from "./add-ons/addOns.routes.js";
import discountsRoutes from "./discounts/discounts.routes.js";
import paymentsRoutes from "./payments/payments.routes.js";
import billSplitsRoutes from "./bill-splits/billSplits.routes.js";
import duePaymentsRoutes from "./due-payments/duePayments.routes.js";
import cashDrawerRoutes from "./cash-drawer/cashDrawer.routes.js";
import countersRoutes from "./counters/counters.routes.js";
import onlinePlatformsRoutes from "./online-platforms/onlinePlatforms.routes.js";
import invoicesRoutes from "./invoices/invoices.routes.js";
import deliveryPartnersRoutes from "./delivery-partners/deliveryPartners.routes.js";
import loyaltyRoutes from "./loyalty/loyalty.routes.js";
import billingRoutes from "./billing/billing.routes.js";

const router = Router();

// Mounted with no auth for now — role guards get added here later
router.get("/orders", posController.getOrders);
router.get("/orders/:id", posController.getOrder);
router.post("/orders", posController.createOrder);
router.post("/orders/place", posController.placeOrderAndSendToKitchen);
router.put("/orders/:id/status", posController.updateOrderStatus);
router.post("/orders/:id/cancel", posController.cancelOrder);
router.post("/orders/:id/hold", posController.holdOrder);
router.post("/orders/:id/resume", posController.resumeOrder);
router.post("/orders/:id/transfer-table", posController.transferTable);
router.post("/orders/:id/items", posController.addItems);
// Voiding a line off a live bill is a shrinkage route, so unlike the rest of
// this router it carries a role check. CASHIER is included deliberately —
// this happens at the till, mid-payment, and routing it through a manager
// every time would just get worked around.
router.delete(
  "/orders/:id/items/:itemId",
  requireRole("OWNER", "ADMIN", "MANAGER", "CASHIER"),
  posController.removeOrderItem,
);
// Owner-only — everything else on this router still has no per-route role
// check (see comment above), but a permanent delete is destructive enough
// that it's restricted regardless. requireAuth already ran at the /api/pos
// mount in index.js, so req.user is guaranteed to exist here.
router.delete("/orders/:id", requireRole("OWNER"), posController.deleteOrder);

// Sub-domains, nested the same way employees/expenses do
router.use("/tables", tablesRoutes);
router.use("/customers", customersRoutes);
router.use("/add-ons", addOnsRoutes);
router.use("/discounts", discountsRoutes);
router.use("/payments", paymentsRoutes);
router.use("/bill-splits", billSplitsRoutes);
router.use("/due-payments", duePaymentsRoutes);
router.use("/cash-drawer", cashDrawerRoutes);
router.use("/counters", countersRoutes);
router.use("/online-platforms", onlinePlatformsRoutes);
router.use("/invoices", invoicesRoutes);
router.use("/delivery-partners", deliveryPartnersRoutes);
router.use("/loyalty", loyaltyRoutes);
// Complete Service -> Billing & Payment -> Invoice -> Free Table flow
router.use("/billing", billingRoutes);

export default router;