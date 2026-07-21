// server/src/pos/tables/tables.controller.js
import * as tablesService from "./tables.service.js";

// ---------------------------------------------------------------------------
// Floors
// ---------------------------------------------------------------------------

export async function getFloors(req, res) {
  try {
    res.json(await tablesService.listFloors(req.query));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch floors", error: err.message });
  }
}

export async function createFloor(req, res) {
  try {
    if (!req.body.name?.trim()) {
      return res.status(400).json({ message: "Floor name is required" });
    }
    const floor = await tablesService.createFloor(req.body);
    res.status(201).json(floor);
  } catch (err) {
    res.status(400).json({ message: "Failed to create floor", error: err.message });
  }
}

export async function updateFloor(req, res) {
  try {
    const floor = await tablesService.updateFloor(req.params.id, req.body);
    res.json(floor);
  } catch (err) {
    res.status(400).json({ message: "Failed to update floor", error: err.message });
  }
}

export async function deleteFloor(req, res) {
  try {
    await tablesService.deleteFloor(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: "Failed to delete floor", error: err.message });
  }
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export async function getTables(req, res) {
  try {
    res.json(await tablesService.listTables(req.query));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tables", error: err.message });
  }
}

export async function getTablesBoard(req, res) {
  try {
    res.json(await tablesService.getTablesBoard(req.query));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tables board", error: err.message });
  }
}

export async function getTable(req, res) {
  try {
    const table = await tablesService.getTableById(req.params.id);
    if (!table) return res.status(404).json({ message: "Table not found" });
    res.json(table);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch table", error: err.message });
  }
}

export async function createTable(req, res) {
  try {
    const table = await tablesService.createTable(req.body);
    res.status(201).json(table);
  } catch (err) {
    res.status(400).json({ message: "Failed to create table", error: err.message });
  }
}

export async function updateTable(req, res) {
  try {
    const table = await tablesService.updateTable(req.params.id, req.body);
    res.json(table);
  } catch (err) {
    res.status(400).json({ message: "Failed to update table", error: err.message });
  }
}

export async function deleteTable(req, res) {
  try {
    await tablesService.deleteTable(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: "Failed to delete table", error: err.message });
  }
}

export async function mergeTables(req, res) {
  try {
    const order = await tablesService.mergeTables(req.body.sourceTableId, req.body.targetTableId);
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: "Failed to merge tables", error: err.message });
  }
}