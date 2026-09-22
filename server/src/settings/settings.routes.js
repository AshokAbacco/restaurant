// server/src/settings/settings.routes.js
//
// First real route file in this module (previously an empty stub).
// Mounted at /api/settings in index.js, guarded there by
// requireAuth + requireOutletContext + requireRole(OWNER, ADMIN, MANAGER)
// — same pattern as every other admin-facing module.
import { Router } from "express";
import * as settingsController from "./settings.controller.js";

const router = Router();

router.get("/restaurant-profile", settingsController.getRestaurantProfile);
router.put("/restaurant-profile", settingsController.updateRestaurantProfile);

router.get("/order-status-labels", settingsController.getOrderStatusLabels);
router.put(
  "/order-status-labels/:systemStatus",
  settingsController.updateOrderStatusLabel,
);
router.delete(
  "/order-status-labels/:systemStatus",
  settingsController.resetOrderStatusLabel,
);

// Module settings — Settings -> CRM / Payment Gateway / Self Order Kiosk /
// Tax & Billing. :section is one of crm | payment | kiosk | tax.
router.get("/modules", settingsController.getAllModuleSettings);
router.get("/modules/:section", settingsController.getModuleSettings);
router.put("/modules/:section", settingsController.updateModuleSettings);
router.delete("/modules/:section", settingsController.resetModuleSettings);

export default router;