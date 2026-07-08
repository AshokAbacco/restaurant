// server\src\inventory\controllers\ingredientCategories.controller.js
import * as categoriesService from "./ingredientCategories.service.js";

export const getCategories = async (req, res) => {
  try {
    const categories = await categoriesService.listCategories();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch categories", error: err.message });
  }
};

export const getCategory = async (req, res) => {
  try {
    const category = await categoriesService.getCategoryById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch category", error: err.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const category = await categoriesService.createCategory({ name, description });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "A category with this name already exists" });
    }
    res.status(500).json({ message: "Failed to create category", error: err.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { name, description, isEnabled } = req.body;
    const category = await categoriesService.updateCategory(req.params.id, {
      name,
      description,
      isEnabled,
    });
    res.json(category);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(500).json({ message: "Failed to update category", error: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await categoriesService.deleteCategory(req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Category not found" });
    }
    if (err.code === "P2003") {
      return res
        .status(409)
        .json({ message: "Cannot delete a category that has ingredients assigned" });
    }
    res.status(500).json({ message: "Failed to delete category", error: err.message });
  }
};