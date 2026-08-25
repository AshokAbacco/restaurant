// server/src/pos/counters/counters.routes.js
import { Router } from "express";
import * as countersController from "./counters.controller.js";
import { requireRole } from "../../auth/auth.middleware.js";

const router = Router();

router.get("/", countersController.getCounters);
router.get("/:id", countersController.getCounter);
// Managing the counter list itself (as opposed to selecting one on a
// terminal) is an Owner/Admin action — a device's identity shouldn't be
// something a cashier can rename mid-shift.
router.post("/", requireRole("OWNER", "ADMIN"), countersController.createCounter);
router.put("/:id", requireRole("OWNER", "ADMIN"), countersController.updateCounter);
router.delete("/:id", requireRole("OWNER", "ADMIN"), countersController.deactivateCounter);

export default router;