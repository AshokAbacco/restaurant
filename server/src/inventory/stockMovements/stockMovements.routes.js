// server/src/inventory/stockMovements/stockMovements.routes.js
import { Router } from "express";
import * as stockMovementsController from "./stockMovements.controller.js";

const router = Router();

router.get("/", stockMovementsController.getMovements);
router.get("/:id", stockMovementsController.getMovement);

export default router;