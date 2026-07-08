// server/src/inventory/wastage/wastage.routes.js
import { Router } from "express";
import * as wastageController from "./wastage.controller.js";

const router = Router();

router.get("/", wastageController.getWastageRecords);
router.get("/:id", wastageController.getWastageRecord);
router.post("/", wastageController.createWastageRecord);

export default router;