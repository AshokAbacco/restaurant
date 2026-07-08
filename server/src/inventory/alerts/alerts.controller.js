// server/src/inventory/alerts/alerts.controller.js
import * as alertsService from "./alerts.service.js";

export const getAlerts = async (req, res) => {
  try {
    const { resolved, type, ingredientId } = req.query;
    const alerts = await alertsService.listAlerts({ resolved, type, ingredientId });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch alerts", error: err.message });
  }
};

// Triggers a scan of current stock + expiry batches and persists any new
// alerts. Call this from a scheduled job (e.g. node-cron every 15 min) once
// you set one up — for now it's a manual/on-demand endpoint.
export const generateAlerts = async (req, res) => {
  try {
    const result = await alertsService.generateAlerts();
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to generate alerts", error: err.message });
  }
};

export const resolveAlert = async (req, res) => {
  try {
    const alert = await alertsService.resolveAlert(req.params.id);
    res.json(alert);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Alert not found" });
    }
    res.status(500).json({ message: "Failed to resolve alert", error: err.message });
  }
};