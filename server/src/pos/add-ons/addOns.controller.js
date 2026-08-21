// server/src/pos/add-ons/addOns.controller.js
import * as addOnsService from "./addOns.service.js";

export async function getAddOns(req, res) {
  try {
    res.json(await addOnsService.listAddOns(req.query, req.tenant.outletId));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch add-ons", error: err.message });
  }
}

export async function getAddOn(req, res) {
  try {
    const addOn = await addOnsService.getAddOnById(req.params.id, req.tenant.outletId);
    if (!addOn) return res.status(404).json({ message: "Add-on not found" });
    res.json(addOn);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch add-on", error: err.message });
  }
}

export async function createAddOn(req, res) {
  try {
    const addOn = await addOnsService.createAddOn(req.body, req.tenant.outletId);
    res.status(201).json(addOn);
  } catch (err) {
    res.status(400).json({ message: "Failed to create add-on", error: err.message });
  }
}

export async function updateAddOn(req, res) {
  try {
    const addOn = await addOnsService.updateAddOn(
      req.params.id,
      req.body,
      req.tenant.outletId,
    );
    res.json(addOn);
  } catch (err) {
    res.status(400).json({ message: "Failed to update add-on", error: err.message });
  }
}

export async function deleteAddOn(req, res) {
  try {
    await addOnsService.deleteAddOn(req.params.id, req.tenant.outletId);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: "Failed to delete add-on", error: err.message });
  }
}