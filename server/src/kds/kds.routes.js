// server/src/kds/kds.routes.js
import express from "express";
import * as kdsController from "./kds.controller.js";

const router = express.Router();

// ── Spec-required APIs ──────────────────────────────
router.get("/orders", kdsController.listOrders);
router.get("/orders/:id", kdsController.getOrderById);
router.put("/orders/status", kdsController.updateStatus);
router.post("/orders/accept", kdsController.acceptOrder);
router.post("/orders/ready", kdsController.markReady);
router.post("/orders/complete", kdsController.completeOrder);
router.post("/orders/recall", kdsController.recallOrder);
router.get("/dashboard", kdsController.getDashboard);
router.get("/reports", kdsController.getReports);

// ── Supporting endpoints (not explicitly listed in the spec, but needed
//    to cover the workflow it describes) ─────────────
router.post("/orders/generate", kdsController.generateKitchenOrders); // called by POS on order confirm
router.post("/orders/preparing", kdsController.startPreparing); // Accepted -> Preparing
router.post("/orders/served", kdsController.markServed); // Ready -> Served (distinct from Completed)
router.post("/orders/cancel", kdsController.cancelOrder);
router.post("/orders/bulk-status", kdsController.bulkUpdateStatus); // bulk accept/ready/complete
router.put("/orders/:id/priority", kdsController.updatePriority);
router.post("/orders/:id/notes", kdsController.addNote);
router.get("/orders/:id/notes", kdsController.listNotes);

export default router;