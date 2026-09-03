// server/src/pos/pos.controller.js
import * as posService from "./pos.service.js";
// FEATURE (Phase 1.1 — Custom Order Status): attaches each outlet's
// custom display label onto order responses, without touching the real
// OrderStatus state machine in pos.service.js at all — see
// settings.service.js. Kept at the controller layer deliberately: this is
// a presentation concern (what to SHOW for a status), not a data-fetch
// concern, so pos.service.js's core order queries stay untouched.
import { getOrderStatusLabelMap } from "../settings/settings.service.js";

// Every handler below reads req.tenant.outletId (set by requireOutletContext
// — see src/middleware/tenantContext.js, wired in ahead of this router in
// src/index.js) and passes it into the service layer. Never trust an
// outletId from req.body/req.query for these routes — the session's own
// outlet is the only one a request is allowed to act on.

export async function getOrders(req, res) {
  try {
    const result = await posService.listOrders(req.query, req.tenant.outletId);
    const labelMap = await getOrderStatusLabelMap(req.tenant.outletId);
    result.data = result.data.map((order) => ({
      ...order,
      statusLabel: labelMap[order.status] || order.status,
    }));
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch orders", error: err.message });
  }
}

export async function getOrder(req, res) {
  try {
    const order = await posService.getOrderById(
      req.params.id,
      req.tenant.outletId,
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    const labelMap = await getOrderStatusLabelMap(req.tenant.outletId);
    res.json({ ...order, statusLabel: labelMap[order.status] || order.status });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch order", error: err.message });
  }
}

export async function createOrder(req, res) {
  try {
    const order = await posService.createOrder(req.body, req.tenant.outletId);
    res.status(201).json(order);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to create order", error: err.message });
  }
}

// Creates the order and sends it to the kitchen as a single atomic operation —
// if the kitchen send fails for any reason, nothing is persisted (no orphan
// Order left behind). The POS "Send to Kitchen" button should call this
// instead of createOrder + sendToKitchen as two separate requests.
export async function placeOrderAndSendToKitchen(req, res) {
  try {
    const order = await posService.createOrderAndSendToKitchen(
      req.body,
      req.tenant.outletId,
    );
    res.status(201).json(order);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to place order", error: err.message });
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const order = await posService.updateOrderStatus(
      req.params.id,
      req.body.status,
      req.tenant.outletId,
    );
    res.json(order);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to update order status", error: err.message });
  }
}

export async function cancelOrder(req, res) {
  try {
    const order = await posService.cancelOrder(
      req.params.id,
      req.body.reason,
      req.tenant.outletId,
    );
    res.json(order);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to cancel order", error: err.message });
  }
}

export async function holdOrder(req, res) {
  try {
    const order = await posService.holdOrder(
      req.params.id,
      req.tenant.outletId,
    );
    res.json(order);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to hold order", error: err.message });
  }
}

export async function resumeOrder(req, res) {
  try {
    const order = await posService.resumeOrder(
      req.params.id,
      req.tenant.outletId,
    );
    res.json(order);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to resume order", error: err.message });
  }
}

export async function transferTable(req, res) {
  try {
    const order = await posService.transferTable(
      req.params.id,
      req.body.tableId,
      req.tenant.outletId,
    );
    res.json(order);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to transfer table", error: err.message });
  }
}

export async function addItems(req, res) {
  try {
    const result = await posService.addItemsToOrder(
      req.params.id,
      req.body.items,
      req.tenant.outletId,
    );
    res.json(result);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to add items to order", error: err.message });
  }
}

// Removes ONE item from an unbilled order and re-prices it. Used by the
// Billing screen when a waiter asks for a dish to come off the bill mid-
// payment. `req.user` is passed for the audit trail — never a client field.
export async function removeOrderItem(req, res) {
  try {
    const order = await posService.removeOrderItem(
      req.params.id,
      req.params.itemId,
      req.user,
      req.tenant.outletId,
    );
    res.json(order);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to remove item", error: err.message });
  }
}

// Owner-only (enforced in pos.routes.js) — permanently removes the order
// and its payments/invoice, used by the Payments page's Delete action.
export async function deleteOrder(req, res) {
  try {
    const result = await posService.deleteOrder(
      req.params.id,
      req.user,
      req.tenant.outletId,
    );
    res.json(result);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to delete order", error: err.message });
  }
}