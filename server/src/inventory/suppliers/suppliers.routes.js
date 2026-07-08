// server\src\inventory\routes\suppliers.routes.js
import { Router } from "express";
import * as suppliersController from "./suppliers.controller.js";

const router = Router();

router.get("/", suppliersController.getSuppliers);
router.get("/:id", suppliersController.getSupplier);
router.get("/:id/history", suppliersController.getSupplierHistory);
router.post("/", suppliersController.createSupplier);
router.put("/:id", suppliersController.updateSupplier);
router.delete("/:id", suppliersController.deleteSupplier);

export default router;