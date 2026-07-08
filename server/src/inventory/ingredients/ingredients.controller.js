// server\src\inventory\controllers\ingredients.controller.js
import * as ingredientsService from "./ingredients.service.js";

export const getIngredients = async (req, res) => {
  try {
    const { search, categoryId, lowStock, outOfStock } = req.query;
    const ingredients = await ingredientsService.listIngredients({
      search,
      categoryId,
      lowStock: lowStock === "true",
      outOfStock: outOfStock === "true",
    });
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch ingredients", error: err.message });
  }
};

export const getIngredient = async (req, res) => {
  try {
    const ingredient = await ingredientsService.getIngredientById(req.params.id);
    if (!ingredient) return res.status(404).json({ message: "Ingredient not found" });
    res.json(ingredient);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch ingredient", error: err.message });
  }
};

const REQUIRED_FIELDS = ["name", "itemCode", "categoryId", "purchaseUnitId", "consumptionUnitId"];

export const createIngredient = async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((f) => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(", ")}` });
    }

    const ingredient = await ingredientsService.createIngredient(req.body);
    res.status(201).json(ingredient);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "An ingredient with this item code already exists" });
    }
    if (err.code === "P2003") {
      return res.status(400).json({ message: "Invalid category or unit reference" });
    }
    res.status(500).json({ message: "Failed to create ingredient", error: err.message });
  }
};

export const updateIngredient = async (req, res) => {
  try {
    const ingredient = await ingredientsService.updateIngredient(req.params.id, req.body);
    res.json(ingredient);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Ingredient not found" });
    }
    if (err.code === "P2002") {
      return res.status(409).json({ message: "An ingredient with this item code already exists" });
    }
    res.status(500).json({ message: "Failed to update ingredient", error: err.message });
  }
};

export const deleteIngredient = async (req, res) => {
  try {
    await ingredientsService.deleteIngredient(req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Ingredient not found" });
    }
    if (err.code === "P2003") {
      return res
        .status(409)
        .json({ message: "Cannot delete an ingredient with existing stock or movement history" });
    }
    res.status(500).json({ message: "Failed to delete ingredient", error: err.message });
  }
};