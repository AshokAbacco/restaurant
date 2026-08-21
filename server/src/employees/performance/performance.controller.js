// server/src/employees/performance/performance.controller.js
import * as performanceService from "./performance.service.js";

export async function getPerformance(req, res) {
  try {
    res.json(await performanceService.listPerformance(req.query, req.tenant.outletId));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch performance records", error: err.message });
  }
}

export async function upsertPerformance(req, res) {
  try {
    res.status(201).json(await performanceService.upsertPerformance(req.body, req.tenant.outletId));
  } catch (err) {
    res.status(400).json({ message: "Failed to save performance record", error: err.message });
  }
}