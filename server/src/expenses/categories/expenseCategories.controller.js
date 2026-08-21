import * as categoryService from "./expenseCategories.service.js";

export const getAllCategories = async (req, res) => {
  try {
    const categories = await categoryService.getAllCategories(req.tenant.outletId);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id, req.tenant.outletId);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const category = await categoryService.createCategory(req.body, req.tenant.outletId);
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const updated = await categoryService.updateCategory(req.params.id, req.body, req.tenant.outletId);
    res.json(updated);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const result = await categoryService.deleteCategory(req.params.id, req.tenant.outletId);
    res.json({ message: "Category removed", result });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
};