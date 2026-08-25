// server/src/settings/settings.routes.js
//
// First real route file in this module (previously an empty stub).
// Mounted at /api/settings in index.js, guarded there by
// requireAuth + requireOutletContext + requireRole(OWNER, ADMIN, MANAGER)
// — same pattern as every other admin-facing module.
import { Router } from "express";
import * as settingsController from "./settings.controller.js";

const router = Router();

router.get("/order-status-labels", settingsController.getOrderStatusLabels);
router.put(
  "/order-status-labels/:systemStatus",
  settingsController.updateOrderStatusLabel,
);
router.delete(
  "/order-status-labels/:systemStatus",
  settingsController.resetOrderStatusLabel,
);

export default router;