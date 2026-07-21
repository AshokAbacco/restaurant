// server/src/pos/tables/tables.routes.js
import { Router } from "express";
import * as tablesController from "./tables.controller.js";

const router = Router();

// Floor routes are registered before "/:id" — otherwise Express would match
// GET/PUT/DELETE "/floors..." against the "/:id" table routes below instead.
router.get("/floors", tablesController.getFloors);
router.post("/floors", tablesController.createFloor);
router.put("/floors/:id", tablesController.updateFloor);
router.delete("/floors/:id", tablesController.deleteFloor);

router.get("/", tablesController.getTables);
router.get("/board", tablesController.getTablesBoard);
router.get("/:id", tablesController.getTable);
router.post("/", tablesController.createTable);
router.put("/:id", tablesController.updateTable);
router.delete("/:id", tablesController.deleteTable);
router.post("/merge", tablesController.mergeTables);

export default router;