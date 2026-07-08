// server/src/pos/tables/tables.controller.js
import * as tablesService from "./tables.service.js";

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