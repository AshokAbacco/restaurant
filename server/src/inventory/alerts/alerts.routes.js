// server/src/inventory/alerts/alerts.routes.js
import { Router } from "express";
import * as alertsController from "./alerts.controller.js";

const router = Router();

router.get("/", alertsController.getAlerts);
router.post("/generate", alertsController.generateAlerts);
router.patch("/:id/resolve", alertsController.resolveAlert);

export default router;