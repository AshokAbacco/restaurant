// server/src/stores/stores.controller.js
import * as outletsService from "./stores.service.js";

// NOTE: reads req.tenant.organizationId here, not req.tenant.outletId —
// see the header comment in stores.service.js for why. This is deliberately
// the one module in the app where the meaningful scope is "everything my
// organization owns," not "my current outlet."

export const getAllStores = async (req, res) => {
  try {
    const outlets = await outletsService.getAllOutlets(req.tenant.organizationId);
    res.json(outlets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getStoreById = async (req, res) => {
  try {
    const outlet = await outletsService.getOutletById(req.params.id, req.tenant.organizationId);
    if (!outlet) return res.status(404).json({ error: "Outlet not found" });
    res.json(outlet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createStore = async (req, res) => {
  try {
    if (!req.body.name?.trim()) {
      return res.status(400).json({ error: "Outlet name is required" });
    }
    const outlet = await outletsService.createOutlet(req.body, req.tenant.organizationId);
    res.status(201).json(outlet);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "An outlet with this name already exists in your organization" });
    }
    res.status(400).json({ error: err.message });
  }
};

export const updateStore = async (req, res) => {
  try {
    if (!req.body.name?.trim()) {
      return res.status(400).json({ error: "Outlet name is required" });
    }
    const updated = await outletsService.updateOutlet(req.params.id, req.body, req.tenant.organizationId);
    if (!updated) return res.status(404).json({ error: "Outlet not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteStore = async (req, res) => {
  try {
    const result = await outletsService.deleteOutlet(req.params.id, req.tenant.organizationId);
    if (!result) return res.status(404).json({ error: "Outlet not found" });
    res.json({ message: "Outlet deactivated", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};