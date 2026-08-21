// server/src/employees/shifts/shifts.controller.js
import * as shiftsService from "./shifts.service.js";

export async function getShifts(req, res) {
  try {
    res.json(await shiftsService.listShifts(req.tenant.outletId));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch shifts", error: err.message });
  }
}

export async function createShift(req, res) {
  try {
    res.status(201).json(await shiftsService.createShift(req.body, req.tenant.outletId));
  } catch (err) {
    res.status(400).json({ message: "Failed to create shift", error: err.message });
  }
}

export async function updateShift(req, res) {
  try {
    res.json(await shiftsService.updateShift(req.params.id, req.body, req.tenant.outletId));
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: err.message });
    }
    res.status(400).json({ message: "Failed to update shift", error: err.message });
  }
}

export async function deleteShift(req, res) {
  try {
    await shiftsService.deleteShift(req.params.id, req.tenant.outletId);
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: err.message });
    }
    res.status(400).json({ message: "Failed to delete shift", error: err.message });
  }
}

export async function assignShift(req, res) {
  try {
    res.status(201).json(
      await shiftsService.assignShift(req.params.id, req.body, req.tenant.outletId),
    );
  } catch (err) {
    res.status(400).json({ message: "Failed to assign shift", error: err.message });
  }
}

export async function getAssignments(req, res) {
  try {
    res.json(await shiftsService.listAssignments(req.query, req.tenant.outletId));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch shift assignments", error: err.message });
  }
}