// server/src/pos/add-ons/addOns.controller.js
//
// FIX (consolidation): this used to call its own addOns.service.js, an
// independent, thinner duplicate of menu.service.js's addon functions —
// same AddOn table, same basic CRUD, but without the menu module's
// attachment logic (linking an add-on to a specific menu item). Both were
// correctly outlet-scoped after the multi-tenancy retrofit, but two
// separate write paths to the same catalog table was the same risk as the
// KDS/KOT duplication elsewhere in this codebase.
//
// addOns.service.js has been deleted; every handler below now delegates
// to menu.service.js, which is also what the Add-on Management admin
// screen (menu/pages/AddOns.jsx) already uses via /api/addons. This route
// (/api/pos/add-ons) stays — the POS order screen's add-on picker
// (client/src/pos/api/posApi.js's getAddOns) reads from it directly and
// only ever needs the simple list, but it's now backed by the same
// service and the same data, not a parallel copy of it.
import * as menuService from "../../menu/menu.service.js";

export async function getAddOns(req, res) {
  try {
    const addOns = await menuService.listAddOns(req.tenant.outletId);
    const { isEnabled } = req.query;
    const filtered =
      isEnabled !== undefined
        ? addOns.filter((a) => a.isEnabled === (isEnabled === "true"))
        : addOns;
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch add-ons", error: err.message });
  }
}

export async function getAddOn(req, res) {
  try {
    // menu.service.js has no single-add-on getter of its own (the admin
    // screen only ever lists+edits) — filter the list rather than adding
    // a new function there just for this rarely-used lookup.
    const addOns = await menuService.listAddOns(req.tenant.outletId);
    const addOn = addOns.find((a) => a.id === req.params.id);
    if (!addOn) return res.status(404).json({ message: "Add-on not found" });
    res.json(addOn);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch add-on", error: err.message });
  }
}

export async function createAddOn(req, res) {
  try {
    const addOn = await menuService.addAddOn(req.body, req.tenant.outletId);
    res.status(201).json(addOn);
  } catch (err) {
    res.status(400).json({ message: "Failed to create add-on", error: err.message });
  }
}

export async function updateAddOn(req, res) {
  try {
    const addOn = await menuService.editAddOn(req.params.id, req.body, req.tenant.outletId);
    res.json(addOn);
  } catch (err) {
    res
      .status(err.statusCode || 400)
      .json({ message: "Failed to update add-on", error: err.message });
  }
}

export async function deleteAddOn(req, res) {
  try {
    await menuService.removeAddOn(req.params.id, req.tenant.outletId);
    res.status(204).send();
  } catch (err) {
    res
      .status(err.statusCode || 400)
      .json({ message: "Failed to delete add-on", error: err.message });
  }
}