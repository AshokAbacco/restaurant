// server/src/inventory/stockMovements/stockMovements.controller.js
import * as stockMovementsService from "./stockMovements.service.js";

export const getMovements = async (req, res) => {
  try {
    const { ingredientId, type, limit } = req.query;
    const movements = await stockMovementsService.listMovements(
      { ingredientId, type, limit },
      req.tenant.outletId,
    );
    res.json(movements);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stock movements", error: err.message });
  }
};

export const getMovement = async (req, res) => {
  try {
    const movement = await stockMovementsService.getMovementById(req.params.id, req.tenant.outletId);
    if (!movement) return res.status(404).json({ message: "Stock movement not found" });
    res.json(movement);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stock movement", error: err.message });
  }
};