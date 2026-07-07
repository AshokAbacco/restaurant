// server/src/kds/kds.controller.js
import * as kdsService from "./kds.service.js";

function handleError(res, err) {
  const notFound = /not found/i.test(err.message);
  console.error("[KDS]", err);
  res.status(notFound ? 404 : 400).json({ error: err.message });
}

export async function generateKitchenOrders(req, res) {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId is required" });
    const tickets = await kdsService.createKitchenOrdersForOrder(orderId);
    res.status(201).json(tickets);
  } catch (err) {
    handleError(res, err);
  }
}

export async function listOrders(req, res) {
  try {
    const tickets = await kdsService.listKitchenOrders(req.query);
    res.json(tickets);
  } catch (err) {
    handleError(res, err);
  }
}

export async function getOrderById(req, res) {
  try {
    const ticket = await kdsService.getKitchenOrderById(req.params.id);
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function updateStatus(req, res) {
  try {
    const { id, status, employeeId, reason } = req.body;
    if (!id || !status) return res.status(400).json({ error: "id and status are required" });
    const ticket = await kdsService.updateKitchenOrderStatus(id, status, { employeeId, reason });
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function acceptOrder(req, res) {
  try {
    const { id, chefId, employeeId } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });
    const ticket = await kdsService.acceptKitchenOrder(id, { chefId, employeeId });
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function startPreparing(req, res) {
  try {
    const { id, employeeId } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });
    const ticket = await kdsService.startPreparingKitchenOrder(id, { employeeId });
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function markReady(req, res) {
  try {
    const { id, employeeId } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });
    const ticket = await kdsService.markKitchenOrderReady(id, { employeeId });
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function markServed(req, res) {
  try {
    const { id, employeeId } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });
    const ticket = await kdsService.markKitchenOrderServed(id, { employeeId });
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function completeOrder(req, res) {
  try {
    const { id, employeeId } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });
    const ticket = await kdsService.completeKitchenOrder(id, { employeeId });
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function cancelOrder(req, res) {
  try {
    const { id, employeeId, reason } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });
    const ticket = await kdsService.cancelKitchenOrder(id, { employeeId, reason });
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function recallOrder(req, res) {
  try {
    const { id, employeeId, reason } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });
    const ticket = await kdsService.recallKitchenOrder(id, { employeeId, reason });
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
    const tickets = await kdsService.bulkUpdateKitchenOrderStatus(ids, status, { employeeId, reason });
    res.json(tickets);
  } catch (err) {
    handleError(res, err);
  }
}

export async function updatePriority(req, res) {
  try {
    const { priority } = req.body;
    if (!priority) return res.status(400).json({ error: "priority is required" });
    const ticket = await kdsService.updateKitchenOrderPriority(req.params.id, priority);
    res.json(ticket);
  } catch (err) {
    handleError(res, err);
  }
}

export async function addNote(req, res) {
  try {
    const { chefId, note } = req.body;
    const created = await kdsService.addKitchenNote(req.params.id, { chefId, note });
    res.status(201).json(created);
  } catch (err) {
    handleError(res, err);
  }
}

export async function listNotes(req, res) {
  try {
    const notes = await kdsService.listKitchenNotes(req.params.id);
    res.json(notes);
  } catch (err) {
    handleError(res, err);
  }
}

export async function getDashboard(req, res) {
  try {
    const dashboard = await kdsService.getKitchenDashboard(req.query.store);
    res.json(dashboard);
  } catch (err) {
    handleError(res, err);
  }
}

export async function getReports(req, res) {
  try {
    const { type, ...filters } = req.query;
    if (!type) return res.status(400).json({ error: "type query param is required" });
    const report = await kdsService.getKitchenReports(type, filters);
    res.json(report);
  } catch (err) {
    handleError(res, err);
  }
}