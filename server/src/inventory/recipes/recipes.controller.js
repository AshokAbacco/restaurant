// server/src/inventory/recipes/recipes.controller.js
import * as recipesService from "./recipes.service.js";

export const getRecipe = async (req, res) => {
  try {
    const recipe = await recipesService.getRecipeForMenuItem(req.params.menuItemId);
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch recipe", error: err.message });
  }
};

export const setRecipe = async (req, res) => {
  try {
    const { ingredients } = req.body;
    if (!Array.isArray(ingredients)) {
      return res.status(400).json({ message: "ingredients must be an array" });
    }
    const missing = ingredients.some((i) => !i.ingredientId || i.quantity == null);
    if (missing) {
      return res
        .status(400)
        .json({ message: "Each ingredient requires ingredientId and quantity" });
    }

    const recipe = await recipesService.setRecipe(req.params.menuItemId, ingredients);
    res.json(recipe);
  } catch (err) {
    if (err.code === "P2003") {
      return res.status(400).json({ message: "Invalid menuItemId or ingredientId reference" });
    }
    res.status(500).json({ message: "Failed to update recipe", error: err.message });
  }
};

export const upsertRecipeIngredient = async (req, res) => {
  try {
    const { ingredientId, quantity } = req.body;
    if (!ingredientId || quantity == null) {
      return res.status(400).json({ message: "ingredientId and quantity are required" });
    }

    const line = await recipesService.upsertRecipeIngredient(
      req.params.menuItemId,
      ingredientId,
      quantity
    );
    res.status(201).json(line);
  } catch (err) {
    if (err.code === "P2003") {
      return res.status(400).json({ message: "Invalid menuItemId or ingredientId reference" });
    }
    res.status(500).json({ message: "Failed to save recipe line", error: err.message });
  }
};

export const removeRecipeIngredient = async (req, res) => {
  try {
    await recipesService.removeRecipeIngredient(req.params.menuItemId, req.params.ingredientId);
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Recipe line not found" });
    }
    res.status(500).json({ message: "Failed to remove recipe line", error: err.message });
  }
};