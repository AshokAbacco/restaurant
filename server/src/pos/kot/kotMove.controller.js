// server/src/pos/kot/kotMove.controller.js
import * as moveService from "./kotMove.service.js";

function handleError(res, err) {
  res
    .status(err.statusCode || 400)
    .json({ message: err.message || "Failed to move" });
}

export async function moveTableWise(req, res) {
  try {
    const { sourceTableId, destinationTableId } = req.body;
    if (!sourceTableId || !destinationTableId) {
      return res
        .status(400)
        .json({ message: "sourceTableId and destinationTableId are required" });
    }
    const result = await moveService.moveTableWise(
      { sourceTableId, destinationTableId },
      req.tenant.outletId,
    );
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

export async function moveKotWise(req, res) {
  try {
    const { kotId, destinationTableId } = req.body;
    if (!kotId || !destinationTableId) {
      return res
        .status(400)
        .json({ message: "kotId and destinationTableId are required" });
    }
    const result = await moveService.moveKotWise(
      { kotId, destinationTableId },
      req.tenant.outletId,
    );
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

export async function moveItemsWise(req, res) {
  try {
    const { orderItemIds, destinationTableId } = req.body;
    if (!destinationTableId) {
      return res.status(400).json({ message: "destinationTableId is required" });
    }
    const result = await moveService.moveItemsWise(
      { orderItemIds, destinationTableId },
      req.tenant.outletId,
    );
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}