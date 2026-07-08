// server/src/inventory/adjustments/adjustments.controller.js
import * as adjustmentsService from "./adjustments.service.js";

const VALID_TYPES = ["INCREASE", "DECREASE"];

export const getAdjustments = async (req, res) => {
  try {
    const { ingredientId } = req.query;
    const adjustments = await adjustmentsService.listAdjustments({ ingredientId });
    res.json(adjustments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch adjustments", error: err.message });
  }
};

export const getAdjustment = async (req, res) => {
  try {
    const adjustment = await adjustmentsService.getAdjustmentById(req.params.id);
    if (!adjustment) return res.status(404).json({ message: "Adjustment not found" });
    res.json(adjustment);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch adjustment", error: err.message });
  }
};

export const createAdjustment = async (req, res) => {
  try {
    const { ingredientId, type, quantity, reason } = req.body;
    if (!ingredientId || !type || quantity == null || !reason) {
      return res
        .status(400)
        .json({ message: "ingredientId, type, quantity, and reason are required" });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: `type must be one of: ${VALID_TYPES.join(", ")}` });
    }
    if (Number(quantity) <= 0) {
      return res.status(400).json({ message: "quantity must be greater than 0" });
    }

    const adjustment = await adjustmentsService.createAdjustment(req.body);
    res.status(201).json(adjustment);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: err.message });
    }
    if (err.code === "NEGATIVE_STOCK") {
      return res.status(409).json({ message: err.message });
    }
    res.status(500).json({ message: "Failed to create adjustment", error: err.message });
  }
};