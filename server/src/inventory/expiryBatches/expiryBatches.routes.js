// server/src/inventory/expiryBatches/expiryBatches.routes.js
import { Router } from "express";
import * as expiryBatchesController from "./expiryBatches.controller.js";

const router = Router();

router.get("/", expiryBatchesController.getBatches);
router.get("/:id", expiryBatchesController.getBatch);

export default router;