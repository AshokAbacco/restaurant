// server\src\inventory\routes\ingredientCategories.routes.js
import { Router } from "express";
import * as categoriesController from "./ingredientCategories.controller.js";

const router = Router();

router.get("/", categoriesController.getCategories);
router.get("/:id", categoriesController.getCategory);
router.post("/", categoriesController.createCategory);
router.put("/:id", categoriesController.updateCategory);
router.delete("/:id", categoriesController.deleteCategory);

export default router;