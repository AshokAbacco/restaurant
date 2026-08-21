// server/src/employees/incentives/incentives.controller.js
import * as incentivesService from "./incentives.service.js";

export async function getIncentives(req, res) {
  try {
    res.json(await incentivesService.listIncentives(req.query, req.tenant.outletId));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch incentives", error: err.message });
  }
}

export async function createIncentive(req, res) {
  try {
    res.status(201).json(await incentivesService.createIncentive(req.body, req.tenant.outletId));
  } catch (err) {
    res.status(400).json({ message: "Failed to create incentive", error: err.message });
  }
}