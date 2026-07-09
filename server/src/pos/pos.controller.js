// server/src/pos/pos.controller.js
import * as posService from "./pos.service.js";

export async function getOrders(req, res) {
  try {
    res.json(await posService.listOrders(req.query));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
}

export async function getOrder(req, res) {
  try {
    const order = await posService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch order", error: err.message });
  }
}

export async function createOrder(req, res) {
  try {
    const order = await posService.createOrder(req.body);
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: "Failed to create order", error: err.message });
  }
}

// Creates the order and sends it to the kitchen as a single atomic operation —
// if the kitchen send fails for any reason, nothing is persisted (no orphan
// Order left behind). The POS "Send to Kitchen" button should call this
// instead of createOrder + sendToKitchen as two separate requests.
export async function placeOrderAndSendToKitchen(req, res) {
  try {
    const order = await posService.createOrderAndSendToKitchen(req.body);
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: "Failed to place order", error: err.message });
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const order = await posService.updateOrderStatus(req.params.id, req.body.status);
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: "Failed to update order status", error: err.message });
  }
}

export async function cancelOrder(req, res) {
  try {
    const order = await posService.cancelOrder(req.params.id, req.body.reason);
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: "Failed to cancel order", error: err.message });
  }
}

export async function holdOrder(req, res) {
  try {
    const order = await posService.holdOrder(req.params.id);
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: "Failed to hold order", error: err.message });
  }
}

export async function resumeOrder(req, res) {
  try {
    const order = await posService.resumeOrder(req.params.id);
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: "Failed to resume order", error: err.message });
  }
}

export async function transferTable(req, res) {
  try {
    const order = await posService.transferTable(req.params.id, req.body.tableId);
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: "Failed to transfer table", error: err.message });
  }
}

export async function addItems(req, res) {
  try {
    const result = await posService.addItemsToOrder(req.params.id, req.body.items);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: "Failed to add items to order", error: err.message });
  }
}