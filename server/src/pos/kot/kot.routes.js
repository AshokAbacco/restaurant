// server/src/pos/kot/kot.routes.js
import { Router } from "express";
import * as kotController from "./kot.controller.js";
import * as kotMoveController from "./kotMove.controller.js";
import { requireRole } from "../../auth/auth.middleware.js";

const router = Router();

router.get("/display", kotController.getKitchenDisplay);
router.get("/notes", kotController.getRecentKitchenNotes);
// Before "/:id/..." below — otherwise "search" is read as a KOT id.
router.get("/search", kotController.searchKots);
router.get("/orders/:orderId", kotController.getKotsForOrder);
router.post("/orders/:orderId", kotController.sendToKitchen);
router.put("/:id/status", kotController.updateKotStatus);
router.get("/:id/notes", kotController.getKitchenNotes);

// Adding a note is kitchen-only — everyone else on this router (OWNER,
// MANAGER, CASHIER) can still read notes via the routes above, but only
// KITCHEN can write one. requireAuth already ran at the /api/pos/kot mount
// in index.js, so req.user is guaranteed to exist here.
router.post("/:id/notes", requireRole("KITCHEN"), kotController.addKitchenNote);

// Phase 1.4 — "Move KOT/Items" dialog (Table View screen's three-tab
// move UI): table-wise, KOT-wise, and item-wise, in that order of scope.
router.post("/move/table", kotMoveController.moveTableWise);
router.post("/move/kot", kotMoveController.moveKotWise);
router.post("/move/items", kotMoveController.moveItemsWise);

export default router;