// server/src/inventory/purchaseEntries/purchaseEntries.routes.js
import { Router } from "express";
import * as purchaseEntriesController from "./purchaseEntries.controller.js";

const router = Router();

router.get("/", purchaseEntriesController.getPurchaseEntries);
router.get("/:id", purchaseEntriesController.getPurchaseEntry);
router.post("/", purchaseEntriesController.createPurchaseEntry);
// Deliberately no PUT/DELETE: a purchase entry is a financial/audit record —
// once stock has moved because of it, editing or removing it would falsify
// the ledger. Mistakes get corrected with a Stock Adjustment instead (Phase 3).

export default router;