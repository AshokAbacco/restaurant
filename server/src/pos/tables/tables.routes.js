// server/src/pos/tables/tables.routes.js
import { Router } from "express";
import * as tablesController from "./tables.controller.js";

const router = Router();

router.get("/", tablesController.getTables);
router.get("/board", tablesController.getTablesBoard);
router.get("/:id", tablesController.getTable);
router.post("/", tablesController.createTable);
router.put("/:id", tablesController.updateTable);
router.delete("/:id", tablesController.deleteTable);
router.post("/merge", tablesController.mergeTables);

export default router;