// server\src\inventory\routes\inventoryStock.routes.js
import { Router } from "express";
import * as inventoryStockController from "./inventoryStock.controller.js";

const router = Router();

router.get("/dashboard", inventoryStockController.getDashboardSummary);
router.get("/:id", inventoryStockController.getStockByIngredient);
router.get("/", inventoryStockController.getStock);

export default router;