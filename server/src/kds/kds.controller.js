// server/src/kds/kds.controller.js
//
// FIX (consolidation): this used to call a separate, independent
// kds.service.js that duplicated pos/kot/kot.service.js's KitchenOrder
// creation and status-transition logic almost entirely — two systems
// that could both create/mutate the same KitchenOrder rows, with
// different safety guards (kot.service.js has an offline-replay no-op
// guard on status transitions; kds.service.js didn't). Both were correctly
// outlet-scoped after the multi-tenancy retrofit, but having two write
// paths to the same table was a real maintenance risk regardless.
// kds.service.js has been deleted; every handler below now delegates to
// kot.service.js, which is also what pos.service.js's main "place order"
// flow already uses. /api/kds and /api/pos/kot are still two separate
// URLs/screens (Kitchen Display Screen vs. the POS "send to kitchen"
// action) — they just share one underlying service now, the same way
// billing/payments/invoices already share services across module
// boundaries elsewhere in this codebase.
import * as kotService from "../pos/kot/kot.service.js";

function handleError(res, err) {
  const notFound = /not found/i.test(err.message);
  console.error("[KDS]", err);
  res.status(notFound ? 404 : 400).json({ error: err.message });
}

export async function generateKitchenOrders(req, res) {
  try {
    const { orderId, orderItemIds } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId is required" });
    // kot.service.js's sendToKitchen expects the specific OrderItem ids to
    // ticket — if the caller didn't supply them (older KDS clients only
    // ever sent orderId), fall back to every item currently on the order.
    let itemIds = orderItemIds;
    if (!itemIds) {
      const order = await kotService.listKotsForOrder(orderId, req.tenant.outletId);
      itemIds = order.flatMap((k) => k.items.map((i) => i.orderItem.id));
    }
    const tickets = await kotService.sendToKitchen(orderId, itemIds, req.tenant.outletId);
    res.status(201).json(tickets);
  } catch (err) {
    handleError(res, err);
  }
}

export async function listOrders(req, res) {
  try {
    const tickets = await kotService.listKitchenOrders(req.query, req.tenant.outletId);
    res.json(tickets);
  } catch (err) {
    handleError(res, err);
  }
}

export async function getOrderById(req, res) {
  try {
    const tickets = await kotService.listKotsForOrder(req.params.id, req.tenant.outletId);
    const ticket = tickets.find((t) => t.id === req.params.id) || tickets[0];
    if (!ticket) return res.status(404).json({ error: "Kitchen order not found" });
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function updateStatus(req, res) {
  try {
    const { id, status, employeeId, reason } = req.body;
    if (!id || !status) return res.status(400).json({ error: "id and status are required" });
    const ticket = await kotService.updateKotStatus(
      id,
      status,
      { changedById: employeeId, reason },
      req.tenant.outletId,
    );
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function acceptOrder(req, res) {
  try {
    const { id, chefId, employeeId } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });
    const ticket = await kotService.acceptKitchenOrder(
      id,
      { chefId, changedById: employeeId },
      req.tenant.outletId,
    );
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function startPreparing(req, res) {
  try {
    const { id, employeeId } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });
    const ticket = await kotService.startPreparingKitchenOrder(
      id,
      { changedById: employeeId },
      req.tenant.outletId,
    );
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function markReady(req, res) {
  try {
    const { id, employeeId } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });
    const ticket = await kotService.markKitchenOrderReady(
      id,
      { changedById: employeeId },
      req.tenant.outletId,
    );
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function markServed(req, res) {
  try {
    const { id, employeeId } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });
    const ticket = await kotService.markKitchenOrderServed(
      id,
      { changedById: employeeId },
      req.tenant.outletId,
    );
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function completeOrder(req, res) {
  try {
    const { id, employeeId } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });
    const ticket = await kotService.completeKitchenOrder(
      id,
      { changedById: employeeId },
      req.tenant.outletId,
    );
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function cancelOrder(req, res) {
  try {
    const { id, employeeId, reason } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });
    const ticket = await kotService.cancelKitchenOrder(
      id,
      { changedById: employeeId, reason },
      req.tenant.outletId,
    );
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function recallOrder(req, res) {
  try {
    const { id, employeeId, reason } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });
    const ticket = await kotService.recallKitchenOrder(
      id,
      { changedById: employeeId, reason },
      req.tenant.outletId,
    );
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function bulkUpdateStatus(req, res) {
  try {
    const { ids, status, employeeId, reason } = req.body;
    if (!Array.isArray(ids) || !ids.length || !status) {
      return res.status(400).json({ error: "ids (array) and status are required" });
    }
    const tickets = await kotService.bulkUpdateKitchenOrderStatus(
      ids,
      status,
      { changedById: employeeId, reason },
      req.tenant.outletId,
    );
    res.json(tickets);
  } catch (err) {
    handleError(res, err);
  }
}

export async function updatePriority(req, res) {
  try {
    const { priority } = req.body;
    if (!priority) return res.status(400).json({ error: "priority is required" });
    const ticket = await kotService.updateKitchenOrderPriority(
      req.params.id,
      priority,
      req.tenant.outletId,
    );
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function addNote(req, res) {
  try {
    const { chefId, note } = req.body;
    const created = await kotService.addKitchenNote(
      req.params.id,
      chefId,
      note,
      req.tenant.outletId,
    );
    res.status(201).json(created);
  } catch (err) {
    handleError(res, err);
  }
}

export async function listNotes(req, res) {
  try {
    const notes = await kotService.listKitchenNotes(req.params.id, req.tenant.outletId);
    res.json(notes);
  } catch (err) {
    handleError(res, err);
  }
}

export async function getDashboard(req, res) {
  try {
    const dashboard = await kotService.getKitchenDashboard(req.tenant.outletId);
    res.json(dashboard);
  } catch (err) {
    handleError(res, err);
  }
}

export async function getReports(req, res) {
  try {
    const { type, ...filters } = req.query;
    if (!type) return res.status(400).json({ error: "type query param is required" });
    const report = await kotService.getKitchenReports(type, filters, req.tenant.outletId);
    res.json(report);
  } catch (err) {
    handleError(res, err);
  }
}