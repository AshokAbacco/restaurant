//server\src\inventory\routes\ingredients.routes.js
import { Router } from "express";
import * as ingredientsController from "./ingredients.controller.js";

const router = Router();

router.get("/", ingredientsController.getIngredients);
router.get("/:id", ingredientsController.getIngredient);
router.post("/", ingredientsController.createIngredient);
router.put("/:id", ingredientsController.updateIngredient);
router.delete("/:id", ingredientsController.deleteIngredient);

export default router;