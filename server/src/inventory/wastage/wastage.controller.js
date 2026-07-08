// server/src/inventory/wastage/wastage.controller.js
import * as wastageService from "./wastage.service.js";

export const getWastageRecords = async (req, res) => {
  try {
    const { ingredientId } = req.query;
    const records = await wastageService.listWastage({ ingredientId });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch wastage records", error: err.message });
  }
};

export const getWastageRecord = async (req, res) => {
  try {
    const record = await wastageService.getWastageById(req.params.id);
    if (!record) return res.status(404).json({ message: "Wastage record not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch wastage record", error: err.message });
  }
};

export const createWastageRecord = async (req, res) => {
  try {
    const { ingredientId, quantity, reason } = req.body;
    if (!ingredientId || quantity == null || !reason) {
      return res.status(400).json({ message: "ingredientId, quantity, and reason are required" });
    }
    if (Number(quantity) <= 0) {
      return res.status(400).json({ message: "quantity must be greater than 0" });
    }

    const record = await wastageService.createWastage(req.body);
    res.status(201).json(record);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: err.message });
    }
    if (err.code === "NEGATIVE_STOCK") {
      return res.status(409).json({ message: err.message });
    }
    res.status(500).json({ message: "Failed to create wastage record", error: err.message });
  }
};