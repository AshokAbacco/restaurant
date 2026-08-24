// server/src/settings/settings.controller.js
import * as settingsService from "./settings.service.js";

export async function getOrderStatusLabels(req, res) {
  try {
    const labels = await settingsService.listOrderStatusLabels(req.tenant.outletId);
    res.json(labels);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch order status labels", error: err.message });
  }
}

export async function updateOrderStatusLabel(req, res) {
  try {
    const label = await settingsService.upsertOrderStatusLabel(
      req.tenant.outletId,
      req.params.systemStatus,
      req.body,
    );
    res.json(label);
  } catch (err) {
    res
      .status(err.statusCode || 400)
      .json({ message: "Failed to update order status label", error: err.message });
  }
}

export async function resetOrderStatusLabel(req, res) {
  try {
    const result = await settingsService.resetOrderStatusLabel(
      req.tenant.outletId,
      req.params.systemStatus,
    );
    res.json(result);
  } catch (err) {
    res
      .status(err.statusCode || 400)
      .json({ message: "Failed to reset order status label", error: err.message });
  }
}