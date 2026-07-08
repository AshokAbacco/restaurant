// server/src/inventory/purchaseOrders/purchaseOrders.routes.js
import { Router } from "express";
import * as purchaseOrdersController from "./purchaseOrders.controller.js";

const router = Router();

router.get("/", purchaseOrdersController.getPurchaseOrders);
router.get("/:id", purchaseOrdersController.getPurchaseOrder);
router.post("/", purchaseOrdersController.createPurchaseOrder);
router.put("/:id", purchaseOrdersController.updatePurchaseOrder);
router.patch("/:id/status", purchaseOrdersController.updatePurchaseOrderStatus);
router.delete("/:id", purchaseOrdersController.deletePurchaseOrder);

export default router;