// server/src/inventory/recipes/recipes.routes.js
import { Router } from "express";
import * as recipesController from "./recipes.controller.js";

const router = Router();

router.get("/:menuItemId", recipesController.getRecipe);
router.put("/:menuItemId", recipesController.setRecipe);
router.post("/:menuItemId", recipesController.upsertRecipeIngredient);
router.delete("/:menuItemId/:ingredientId", recipesController.removeRecipeIngredient);

export default router;