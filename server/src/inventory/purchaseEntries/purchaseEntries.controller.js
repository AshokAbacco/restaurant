// server/src/inventory/purchaseEntries/purchaseEntries.controller.js
import * as purchaseEntriesService from "./purchaseEntries.service.js";

const REQUIRED_FIELDS = ["supplierId", "ingredientId", "quantityReceived", "purchasePrice"];

export const getPurchaseEntries = async (req, res) => {
  try {
    const { ingredientId, supplierId, purchaseOrderId } = req.query;
    const entries = await purchaseEntriesService.listPurchaseEntries(
      { ingredientId, supplierId, purchaseOrderId },
      req.tenant.outletId,
    );
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch purchase entries", error: err.message });
  }
};

export const getPurchaseEntry = async (req, res) => {
  try {
    const entry = await purchaseEntriesService.getPurchaseEntryById(req.params.id, req.tenant.outletId);
    if (!entry) return res.status(404).json({ message: "Purchase entry not found" });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch purchase entry", error: err.message });
  }
};

export const createPurchaseEntry = async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((f) => req.body[f] == null);
    if (missing.length) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(", ")}` });
    }
    if (Number(req.body.quantityReceived) <= 0) {
      return res.status(400).json({ message: "quantityReceived must be greater than 0" });
    }

    // FIX: StockMovement.userId was always null before — this endpoint
    // never actually attributed a purchase entry's stock movement to the
    // logged-in employee, it just silently relied on the client to send a
    // userId that nothing in the frontend ever sent. Using the
    // authenticated session's own employeeId instead of trusting the body.
    const entry = await purchaseEntriesService.createPurchaseEntry(
      { ...req.body, userId: req.user?.employeeId },
      req.tenant.outletId,
    );
    res.status(201).json(entry);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: err.message });
    }
    if (err.code === "P2003") {
      return res
        .status(400)
        .json({ message: "Invalid supplierId, ingredientId, or purchaseOrderId reference" });
    }
    res.status(500).json({ message: "Failed to create purchase entry", error: err.message });
  }
};