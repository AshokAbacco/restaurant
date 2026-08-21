import { Router } from "express";
import * as storeController from "./stores.controller.js";
import { requireRole } from "../auth/auth.middleware.js";

const router = Router();

router.get("/", storeController.getAllStores);
router.get("/:id", storeController.getStoreById);
// Creating/deactivating an outlet is a bigger action than day-to-day
// management (the outer /api/stores mount already allows OWNER/ADMIN/
// MANAGER — see index.js) — matches the same extra requireRole("OWNER")
// layering pos.routes.js uses for order deletion.
router.post("/", requireRole("OWNER"), storeController.createStore);
router.put("/:id", storeController.updateStore);
router.delete("/:id", requireRole("OWNER"), storeController.deleteStore);

export default router;