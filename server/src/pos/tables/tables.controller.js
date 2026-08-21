// server/src/pos/tables/tables.controller.js
import * as tablesService from "./tables.service.js";

// FIX: this codebase isn't fully consistent about which field on req.user
// carries the Employee id — dashboard.controller.js reads req.user.id,
// while kot.controller.js reads req.user?.employeeId for the same purpose.
// A waiter whose real auth payload uses one and not the other would see
// every "my tables" / "my orders" query come back empty even though tables
// ARE assigned to them, exactly like the empty POS floor picker just seen.
// Trying employeeId first, falling back to id, works no matter which one
// your auth middleware actually sets.
const waiterEmployeeId = (req) => req.user?.employeeId ?? req.user?.id;

// ---------------------------------------------------------------------------
// Floors
// ---------------------------------------------------------------------------

export async function getFloors(req, res) {
  try {
    res.json(await tablesService.listFloors(req.tenant.outletId));
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch floors", error: err.message });
  }
}

export async function createFloor(req, res) {
  try {
    if (!req.body.name?.trim()) {
      return res.status(400).json({ message: "Floor name is required" });
    }
    const floor = await tablesService.createFloor(req.body, req.tenant.outletId);
    res.status(201).json(floor);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to create floor", error: err.message });
  }
}

export async function updateFloor(req, res) {
  try {
    const floor = await tablesService.updateFloor(
      req.params.id,
      req.body,
      req.tenant.outletId,
    );
    res.json(floor);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to update floor", error: err.message });
  }
}

export async function deleteFloor(req, res) {
  try {
    await tablesService.deleteFloor(req.params.id, req.tenant.outletId);
    res.status(204).send();
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to delete floor", error: err.message });
  }
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export async function getTables(req, res) {
  try {
    // FIX: this endpoint is shared by the Tables management page AND the
    // POS "New Order" floor/table picker. It previously returned every
    // table on the floor no matter who asked — so a waiter creating an
    // order saw every table's floor/table picker, not just the ones
    // assigned to them. Scoping here (rather than per-frontend) means any
    // screen that calls GET /pos/tables is automatically correct.
    const query = { ...req.query, outletId: req.tenant.outletId };
    if (req.user?.role === "WAITER") {
      query.waiterId = waiterEmployeeId(req);
    }
    res.json(await tablesService.listTables(query));
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch tables", error: err.message });
  }
}

export async function getTablesBoard(req, res) {
  try {
    const query = { ...req.query, outletId: req.tenant.outletId };
    if (req.user?.role === "WAITER") {
      query.waiterId = waiterEmployeeId(req);
    }
    res.json(await tablesService.getTablesBoard(query));
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch tables board", error: err.message });
  }
}

export async function getTable(req, res) {
  try {
    const table = await tablesService.getTableById(
      req.params.id,
      req.tenant.outletId,
    );
    if (!table) return res.status(404).json({ message: "Table not found" });
    // Defense in depth: even though the frontend never links a waiter to
    // another waiter's table, don't let a direct request to this id leak it.
    if (
      req.user?.role === "WAITER" &&
      table.waiterId !== waiterEmployeeId(req)
    ) {
      return res.status(404).json({ message: "Table not found" });
    }
    res.json(table);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch table", error: err.message });
  }
}

export async function createTable(req, res) {
  try {
    const table = await tablesService.createTable(req.body, req.tenant.outletId);
    res.status(201).json(table);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to create table", error: err.message });
  }
}

export async function updateTable(req, res) {
  try {
    const table = await tablesService.updateTable(
      req.params.id,
      req.body,
      req.tenant.outletId,
    );
    res.json(table);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to update table", error: err.message });
  }
}

export async function deleteTable(req, res) {
  try {
    await tablesService.deleteTable(req.params.id, req.tenant.outletId);
    res.status(204).send();
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to delete table", error: err.message });
  }
}

export async function mergeTables(req, res) {
  try {
    const order = await tablesService.mergeTables(
      req.body.sourceTableId,
      req.body.targetTableId,
      req.tenant.outletId,
    );
    res.json(order);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to merge tables", error: err.message });
  }
}

// ---------------------------------------------------------------------------
// Waiters + assignment (Owner / Admin / Manager — enforced in tables.routes.js)
// ---------------------------------------------------------------------------

export async function getWaiters(req, res) {
  try {
    res.json(await tablesService.listWaiters(req.tenant.outletId));
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch waiters", error: err.message });
  }
}

export async function assignTables(req, res) {
  try {
    const { tableIds, waiterId } = req.body;
    const tables = await tablesService.assignTables({
      tableIds,
      waiterId,
      outletId: req.tenant.outletId,
    });
    res.json({ message: "Tables assigned", tables });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to assign tables", error: err.message });
  }
}

export async function assignFloor(req, res) {
  try {
    const { floorId, waiterId } = req.body;
    const result = await tablesService.assignFloorToWaiter({
      floorId,
      waiterId,
      outletId: req.tenant.outletId,
    });
    res.json({
      message: `Assigned ${result.count} table(s) on this floor`,
      ...result,
    });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to assign floor", error: err.message });
  }
}

export async function assignAll(req, res) {
  try {
    const { waiterId } = req.body;
    const result = await tablesService.assignAllTables({
      waiterId,
      outletId: req.tenant.outletId,
    });
    res.json({ message: `Assigned all ${result.count} table(s)`, ...result });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to assign all tables", error: err.message });
  }
}

export async function unassignTable(req, res) {
  try {
    const table = await tablesService.unassignTable(
      req.params.id,
      req.tenant.outletId,
    );
    res.json(table);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to unassign table", error: err.message });
  }
}

export async function unassignAllForWaiter(req, res) {
  try {
    const result = await tablesService.unassignAllForWaiter(
      req.params.waiterId,
      req.tenant.outletId,
    );
    res.json({ message: `Unassigned ${result.count} table(s)`, ...result });
  } catch (err) {
    res
      .status(400)
      .json({
        message: "Failed to unassign waiter's tables",
        error: err.message,
      });
  }
}

// ---------------------------------------------------------------------------
// Waiter's own view — "My Tables"
// req.user.id is the logged-in employee's id (same value dashboard.controller.js
// already uses as waiterId when filtering Order.waiterId).
// ---------------------------------------------------------------------------

export async function getMyTables(req, res) {
  try {
    res.json(
      await tablesService.getMyTables(waiterEmployeeId(req), req.tenant.outletId),
    );
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch your tables", error: err.message });
  }
}

export async function getMyTableDetail(req, res) {
  try {
    const table = await tablesService.getTableDetailForWaiter(
      req.params.id,
      waiterEmployeeId(req),
      req.tenant.outletId,
    );
    if (!table) {
      return res
        .status(404)
        .json({ message: "Table not found or not assigned to you" });
    }
    res.json(table);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch table detail", error: err.message });
  }
}