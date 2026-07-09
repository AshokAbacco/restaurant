import { Router } from "express";
import * as storeController from "./stores.controller.js";

const router = Router();

router.get("/", storeController.getAllStores);
router.get("/:id", storeController.getStoreById);
router.post("/", storeController.createStore);
router.put("/:id", storeController.updateStore);
router.delete("/:id", storeController.deleteStore);

export default router;