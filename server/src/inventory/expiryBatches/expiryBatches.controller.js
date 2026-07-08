// server/src/inventory/expiryBatches/expiryBatches.controller.js
import * as expiryBatchesService from "./expiryBatches.service.js";

export const getBatches = async (req, res) => {
  try {
    const { ingredientId, expiringWithinDays } = req.query;
    const batches = await expiryBatchesService.listBatches({ ingredientId, expiringWithinDays });
    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch expiry batches", error: err.message });
  }
};

export const getBatch = async (req, res) => {
  try {
    const batch = await expiryBatchesService.getBatchById(req.params.id);
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    res.json(batch);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch batch", error: err.message });
  }
};