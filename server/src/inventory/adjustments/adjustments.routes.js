// server/src/inventory/adjustments/adjustments.routes.js
import { Router } from "express";
import * as adjustmentsController from "./adjustments.controller.js";

const router = Router();

router.get("/", adjustmentsController.getAdjustments);
router.get("/:id", adjustmentsController.getAdjustment);
router.post("/", adjustmentsController.createAdjustment);
// No PUT/DELETE — same reasoning as purchase entries: this is an audit
// record of a stock change that already happened. A mistaken adjustment
// gets corrected with an opposite adjustment, not by editing history.

export default router;