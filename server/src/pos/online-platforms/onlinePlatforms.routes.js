// server/src/pos/online-platforms/onlinePlatforms.routes.js
import { Router } from "express";
import * as platformsController from "./onlinePlatforms.controller.js";

const router = Router();

// No extra role restriction here (unlike counters.routes.js) — any POS
// role can add a new platform inline from the order screen's dropdown.
router.get("/", platformsController.getPlatforms);
router.get("/:id", platformsController.getPlatform);
router.post("/", platformsController.createPlatform);
router.put("/:id", platformsController.updatePlatform);
router.delete("/:id", platformsController.deactivatePlatform);

export default router;