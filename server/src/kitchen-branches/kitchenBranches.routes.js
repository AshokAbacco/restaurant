// server/src/kitchen-branches/kitchenBranches.routes.js
import { Router } from "express";
import * as controller from "./kitchenBranches.controller.js";
import { requireRole } from "../auth/auth.middleware.js";

const router = Router();

// Reading is open to any authenticated role reaching this router — the POS
// Send-to-Kitchen picker and the Kitchen Display both need the list, and
// those are used by waiters and kitchen staff, not just managers.
router.get("/", controller.list);
router.get("/:id", controller.getById);

// Creating/renaming/removing a kitchen is a structural change, so it's
// restricted the same way outlet creation is in stores.routes.js.
router.post("/", requireRole("OWNER", "ADMIN", "MANAGER"), controller.create);
router.put("/:id", requireRole("OWNER", "ADMIN", "MANAGER"), controller.update);
router.delete("/:id", requireRole("OWNER", "ADMIN"), controller.remove);

export default router;