// server\src\inventory\routes\units.routes.js
import { Router } from "express";
import * as unitsController from "./units.controller.js";

const router = Router();

router.get("/", unitsController.getUnits);
router.get("/:id", unitsController.getUnit);
router.post("/", unitsController.createUnit);
router.put("/:id", unitsController.updateUnit);
router.delete("/:id", unitsController.deleteUnit);

export default router;