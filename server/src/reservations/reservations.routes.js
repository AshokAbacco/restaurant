// server/src/pos/reservations/reservations.routes.js
//
// Intended mount point: /api/pos/reservations (see pos.routes.js — mount
// this the same way tables.routes.js is already mounted there). index.js
// already applies requireAuth + requireRole("OWNER","ADMIN","MANAGER",
// "CASHIER","WAITER") at the /api/pos level, so req.user is guaranteed to
// exist here — these requireRole() calls just narrow it further per-route,
// exactly like tables.routes.js does.
//
// ROLE RULES
// - Browse / view reservations                 -> OWNER, ADMIN, MANAGER, CASHIER, WAITER
// - Create / edit reservations                  -> OWNER, ADMIN, MANAGER, CASHIER
// - Seat / cancel / no-show / complete           -> OWNER, ADMIN, MANAGER, CASHIER
import { Router } from "express";
import * as controller from "./reservations.controller.js";
import { requireRole } from "../auth/auth.middleware.js";

const MANAGE_ROLES = ["OWNER", "ADMIN", "MANAGER", "CASHIER"];
const BROWSE_ROLES = ["OWNER", "ADMIN", "MANAGER", "CASHIER", "WAITER"];

const router = Router();

router.get("/", requireRole(...BROWSE_ROLES), controller.getReservations);
router.get("/:id", requireRole(...BROWSE_ROLES), controller.getReservationById);

router.post("/", requireRole(...MANAGE_ROLES), controller.createReservation);
router.put("/:id", requireRole(...MANAGE_ROLES), controller.updateReservation);

router.post(
  "/:id/seat",
  requireRole(...MANAGE_ROLES),
  controller.seatReservation,
);
router.post(
  "/:id/cancel",
  requireRole(...MANAGE_ROLES),
  controller.cancelReservation,
);
router.post(
  "/:id/no-show",
  requireRole(...MANAGE_ROLES),
  controller.noShowReservation,
);
router.post(
  "/:id/complete",
  requireRole(...MANAGE_ROLES),
  controller.completeReservation,
);

export default router;