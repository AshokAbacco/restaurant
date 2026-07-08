// server\src\inventory\controllers\units.controller.js
import * as unitsService from "./units.service.js";

export const getUnits = async (req, res) => {
  try {
    const units = await unitsService.listUnits();
    res.json(units);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch units", error: err.message });
  }
};

export const getUnit = async (req, res) => {
  try {
    const unit = await unitsService.getUnitById(req.params.id);
    if (!unit) return res.status(404).json({ message: "Unit not found" });
    res.json(unit);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch unit", error: err.message });
  }
};

export const createUnit = async (req, res) => {
  try {
    const { name, abbreviation } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const unit = await unitsService.createUnit({ name, abbreviation });
    res.status(201).json(unit);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "A unit with this name already exists" });
    }
    res.status(500).json({ message: "Failed to create unit", error: err.message });
  }
};

export const updateUnit = async (req, res) => {
  try {
    const { name, abbreviation } = req.body;
    const unit = await unitsService.updateUnit(req.params.id, { name, abbreviation });
    res.json(unit);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Unit not found" });
    }
    res.status(500).json({ message: "Failed to update unit", error: err.message });
  }
};

export const deleteUnit = async (req, res) => {
  try {
    await unitsService.deleteUnit(req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Unit not found" });
    }
    if (err.code === "P2003") {
      return res
        .status(409)
        .json({ message: "Cannot delete a unit that is in use by ingredients" });
    }
    res.status(500).json({ message: "Failed to delete unit", error: err.message });
  }
};