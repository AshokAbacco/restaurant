// server\src\inventory\controllers\inventoryStock.controller.js
import * as inventoryStockService from "./inventoryStock.service.js";

export const getStock = async (req, res) => {
  try {
    const stock = await inventoryStockService.listStock();
    res.json(stock);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch inventory stock", error: err.message });
  }
};

export const getStockByIngredient = async (req, res) => {
  try {
    const stock = await inventoryStockService.getStockByIngredientId(req.params.id);
    if (!stock) return res.status(404).json({ message: "Stock record not found" });
    res.json(stock);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stock record", error: err.message });
  }
};

export const getDashboardSummary = async (req, res) => {
  try {
    const summary = await inventoryStockService.getDashboardSummary();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch dashboard summary", error: err.message });
  }
};