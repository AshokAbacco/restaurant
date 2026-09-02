// server/src/printer-profiles/printerProfiles.routes.js
import { Router } from "express";
import * as printerProfilesController from "./printerProfiles.controller.js";
import { requireRole } from "../auth/auth.middleware.js";

const router = Router();

// Reading is open to any authenticated staff member: every terminal has to
// fetch its paper geometry before it can print, including a waiter's.
//
// /default MUST be declared before /:id or Express matches "default" as an
// id and the lookup 404s.
router.get("/", printerProfilesController.getPrinterProfiles);
router.get("/default", printerProfilesController.getDefaultPrinterProfile);
// Also above /:id — "resolve" would otherwise be read as a profile id.
router.get("/resolve", printerProfilesController.resolvePrinterProfile);
router.get("/:id", printerProfilesController.getPrinterProfile);

// Editing the hardware spec is Owner/Admin, same as BillingCounter: getting
// the printable width wrong silently ruins every receipt the outlet prints,
// so it isn't something to change mid-shift from the floor.
router.post("/", requireRole("OWNER", "ADMIN"), printerProfilesController.createPrinterProfile);
router.put("/:id", requireRole("OWNER", "ADMIN"), printerProfilesController.updatePrinterProfile);
router.post(
  "/:id/default",
  requireRole("OWNER", "ADMIN"),
  printerProfilesController.setDefaultPrinterProfile,
);
router.delete(
  "/:id",
  requireRole("OWNER", "ADMIN"),
  printerProfilesController.deactivatePrinterProfile,
);

export default router;