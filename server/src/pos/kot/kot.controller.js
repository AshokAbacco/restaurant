// server/src/pos/kot/kot.controller.js
import * as kotService from "./kot.service.js";

export async function sendToKitchen(req, res) {
  try {
    const kot = await kotService.sendToKitchen(
      req.params.orderId,
      req.body.orderItemIds,
      req.tenant.outletId,
    );
    res.status(201).json(kot);
  } catch (err) {
    res.status(400).json({ message: "Failed to send order to kitchen", error: err.message });
  }
}

export async function getKotsForOrder(req, res) {
  try {
    res.json(await kotService.listKotsForOrder(req.params.orderId, req.tenant.outletId));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch KOTs", error: err.message });
  }
}

export async function getKitchenDisplay(req, res) {
  try {
    // A kitchen employee pinned to one physical kitchen (Employee.
    // kitchenBranchId) is LOCKED to it — their own assignment wins over any
    // ?kitchenBranchId in the query string, so a chef can't widen their view
    // to another kitchen by editing the URL. Everyone else (owner, manager,
    // an unassigned screen) may pass one to filter voluntarily.
    const pinned = await kotService.getEmployeeKitchenBranchId(
      req.user?.employeeId,
      req.tenant.outletId,
    );

    res.json(
      await kotService.getActiveKitchenDisplay(
        req.query.kitchenSectionId,
        req.tenant.outletId,
        pinned || req.query.kitchenBranchId || null,
      ),
    );
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch kitchen display", error: err.message });
  }
}

// Navbar "KOT No." lookup. Thin wrapper over listKitchenOrders' existing
// `search` filter (kotNumber / order number / table name), capped low —
// this answers "where is KOT-000046?", not "show me every ticket", which
// is what /display is for.
export async function searchKots(req, res) {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);

    const tickets = await kotService.listKitchenOrders(
      { search: q },
      req.tenant.outletId,
    );
    res.json(tickets.slice(0, 10));
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to search KOTs", error: err.message });
  }
}

export async function updateKotStatus(req, res) {
  try {
    const { status, reason } = req.body;
    const kot = await kotService.updateKotStatus(
      req.params.id,
      status,
      {
        changedById: req.user?.employeeId,
        reason,
      },
      req.tenant.outletId,
    );
    res.json(kot);
  } catch (err) {
    res.status(400).json({ message: "Failed to update KOT status", error: err.message });
  }
}

export async function addKitchenNote(req, res) {
  try {
    const note = await kotService.addKitchenNote(
      req.params.id,
      req.user?.employeeId,
      req.body.note,
      req.tenant.outletId,
    );
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ message: "Failed to add kitchen note", error: err.message });
  }
}

export async function getKitchenNotes(req, res) {
  try {
    res.json(await kotService.listKitchenNotes(req.params.id, req.tenant.outletId));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch kitchen notes", error: err.message });
  }
}

export async function getRecentKitchenNotes(req, res) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    res.json(await kotService.listRecentKitchenNotes(limit, req.tenant.outletId));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch kitchen notes", error: err.message });
  }
}