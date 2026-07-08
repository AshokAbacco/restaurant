// server/src/inventory/purchaseOrders/purchaseOrders.controller.js
import * as purchaseOrdersService from "./purchaseOrders.service.js";

const VALID_STATUSES = ["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"];

export const getPurchaseOrders = async (req, res) => {
  try {
    const { supplierId, status } = req.query;
    const orders = await purchaseOrdersService.listPurchaseOrders({ supplierId, status });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch purchase orders", error: err.message });
  }
};

export const getPurchaseOrder = async (req, res) => {
  try {
    const order = await purchaseOrdersService.getPurchaseOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: "Purchase order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch purchase order", error: err.message });
  }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplierId, items } = req.body;
    if (!supplierId) return res.status(400).json({ message: "supplierId is required" });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items must be a non-empty array" });
    }
    const missingItemFields = items.some(
      (i) => !i.ingredientId || i.quantity == null || i.unitPrice == null
    );
    if (missingItemFields) {
      return res
        .status(400)
        .json({ message: "Each item requires ingredientId, quantity, and unitPrice" });
    }

    const order = await purchaseOrdersService.createPurchaseOrder(req.body);
    res.status(201).json(order);
  } catch (err) {
    if (err.code === "P2003") {
      return res.status(400).json({ message: "Invalid supplierId or ingredientId reference" });
    }
    res.status(500).json({ message: "Failed to create purchase order", error: err.message });
  }
};

export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ message: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const order = await purchaseOrdersService.updatePurchaseOrderStatus(req.params.id, status);
    res.json(order);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    res.status(500).json({ message: "Failed to update purchase order status", error: err.message });
  }
};

export const updatePurchaseOrder = async (req, res) => {
  try {
    const order = await purchaseOrdersService.updatePurchaseOrderDetails(req.params.id, req.body);
    res.json(order);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    res.status(500).json({ message: "Failed to update purchase order", error: err.message });
  }
};

export const deletePurchaseOrder = async (req, res) => {
  try {
    await purchaseOrdersService.deletePurchaseOrder(req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    if (err.code === "NOT_DRAFT") {
      return res.status(409).json({ message: err.message });
    }
    res.status(500).json({ message: "Failed to delete purchase order", error: err.message });
  }
};