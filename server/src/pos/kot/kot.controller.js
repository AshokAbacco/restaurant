// server/src/pos/kot/kot.controller.js
import * as kotService from "./kot.service.js";

export async function sendToKitchen(req, res) {
  try {
    const kot = await kotService.sendToKitchen(req.params.orderId, req.body.orderItemIds);
    res.status(201).json(kot);
  } catch (err) {
    res.status(400).json({ message: "Failed to send order to kitchen", error: err.message });
  }
}

export async function getKotsForOrder(req, res) {
  try {
    res.json(await kotService.listKotsForOrder(req.params.orderId));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch KOTs", error: err.message });
  }
}

export async function getKitchenDisplay(req, res) {
  try {
    res.json(await kotService.getActiveKitchenDisplay(req.query.kitchenSectionId));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch kitchen display", error: err.message });
  }
}

export async function updateKotStatus(req, res) {
  try {
    const { status, reason } = req.body;
    const kot = await kotService.updateKotStatus(req.params.id, status, {
      changedById: req.user?.employeeId,
      reason,
    });
    res.json(kot);
  } catch (err) {
    res.status(400).json({ message: "Failed to update KOT status", error: err.message });
  }
}

export async function addKitchenNote(req, res) {
  try {
    const note = await kotService.addKitchenNote(req.params.id, req.user?.employeeId, req.body.note);
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ message: "Failed to add kitchen note", error: err.message });
  }
}

export async function getKitchenNotes(req, res) {
  try {
    res.json(await kotService.listKitchenNotes(req.params.id));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch kitchen notes", error: err.message });
  }
}

export async function getRecentKitchenNotes(req, res) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    res.json(await kotService.listRecentKitchenNotes(limit));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch kitchen notes", error: err.message });
  }
}