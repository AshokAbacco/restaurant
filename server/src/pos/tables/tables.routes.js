// server/src/pos/tables/tables.routes.js
import { Router } from "express";
import * as tablesController from "./tables.controller.js";
import { requireRole } from "../../auth/auth.middleware.js";

// Only Owner/Admin/Manager may assign tables to waiters or manage floors —
// requireAuth already ran wherever this router is mounted (see pos.routes.js
// / index.js), so req.user is guaranteed to exist here.
const MANAGE_ROLES = ["OWNER", "ADMIN", "MANAGER"];

const router = Router();

// Floor routes are registered before "/:id" — otherwise Express would match
// GET/PUT/DELETE "/floors..." against the "/:id" table routes below instead.
router.get("/floors", tablesController.getFloors);
router.post(
  "/floors",
  requireRole(...MANAGE_ROLES),
  tablesController.createFloor,
);
router.put(
  "/floors/:id",
  requireRole(...MANAGE_ROLES),
  tablesController.updateFloor,
);
router.delete(
  "/floors/:id",
  requireRole(...MANAGE_ROLES),
  tablesController.deleteFloor,
);

// Waiter's own view ("My Tables") + the waiter picklist — same reasoning as
// "/floors" above, these literal paths MUST come before "/:id" or Express
// would swallow "my-tables"/"waiters" as an :id value.
router.get("/my-tables", requireRole("WAITER"), tablesController.getMyTables);
router.get(
  "/my-tables/:id",
  requireRole("WAITER"),
  tablesController.getMyTableDetail,
);
router.get(
  "/waiters",
  requireRole(...MANAGE_ROLES),
  tablesController.getWaiters,
);

// Reservation routes — before "/:id" for the same reason as /floors,
// /my-tables, /waiters above.
router.get("/reservations", tablesController.getReservations);
router.post("/reservations", tablesController.createReservation);
router.get("/reservations/:id", tablesController.getReservation);
router.put("/reservations/:id", tablesController.updateReservation);
router.post("/reservations/:id/seat", tablesController.seatReservation);
router.post("/reservations/:id/cancel", tablesController.cancelReservation);

router.get("/", tablesController.getTables);
router.get("/board", tablesController.getTablesBoard);
router.get("/:id", tablesController.getTable);
router.post("/", tablesController.createTable);

// Waiter assignment (Owner / Admin / Manager only)
router.post(
  "/assign",
  requireRole(...MANAGE_ROLES),
  tablesController.assignTables,
);
router.post(
  "/assign/floor",
  requireRole(...MANAGE_ROLES),
  tablesController.assignFloor,
);
router.post(
  "/assign/all",
  requireRole(...MANAGE_ROLES),
  tablesController.assignAll,
);
router.post(
  "/unassign/:id",
  requireRole(...MANAGE_ROLES),
  tablesController.unassignTable,
);
router.post(
  "/waiters/:waiterId/unassign-all",
  requireRole(...MANAGE_ROLES),
  tablesController.unassignAllForWaiter,
);

router.put("/:id", tablesController.updateTable);
router.delete("/:id", tablesController.deleteTable);
router.post("/merge", tablesController.mergeTables);

export default router;