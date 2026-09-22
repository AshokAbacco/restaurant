// server/src/settings/settings.controller.js
import * as settingsService from "./settings.service.js";
import * as outletSettingsService from "./outletSettings.service.js";

export async function getOrderStatusLabels(req, res) {
  try {
    const labels = await settingsService.listOrderStatusLabels(req.tenant.outletId);
    res.json(labels);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch order status labels", error: err.message });
  }
}

export async function updateOrderStatusLabel(req, res) {
  try {
    const label = await settingsService.upsertOrderStatusLabel(
      req.tenant.outletId,
      req.params.systemStatus,
      req.body,
    );
    res.json(label);
  } catch (err) {
    res
      .status(err.statusCode || 400)
      .json({ message: "Failed to update order status label", error: err.message });
  }
}

export async function resetOrderStatusLabel(req, res) {
  try {
    const result = await settingsService.resetOrderStatusLabel(
      req.tenant.outletId,
      req.params.systemStatus,
    );
    res.json(result);
  } catch (err) {
    res
      .status(err.statusCode || 400)
      .json({ message: "Failed to reset order status label", error: err.message });
  }
}

// ── Restaurant Profile ───────────────────────────────────────────────────
// outletId comes from the verified token via requireOutletContext, never
// from the body or a URL param.

export async function getRestaurantProfile(req, res) {
  try {
    const profile = await settingsService.getRestaurantProfile(
      req.tenant.outletId,
    );
    if (!profile) return res.status(404).json({ error: "Outlet not found" });
    res.json(profile);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to load restaurant profile", error: err.message });
  }
}

export async function updateRestaurantProfile(req, res) {
  try {
    const profile = await settingsService.updateRestaurantProfile(
      req.tenant.outletId,
      req.body,
    );
    res.json(profile);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to save restaurant profile", error: err.message });
  }
}

// ── Module settings (CRM, Payment Gateway, Self Order Kiosk, Tax & Billing) ──
// Always scoped to req.tenant.outletId — see outletSettings.service.js.

export async function getAllModuleSettings(req, res) {
  try {
    res.json(await outletSettingsService.getAllSections(req.tenant.outletId));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ message: "Failed to load settings", error: err.message });
  }
}

export async function getModuleSettings(req, res) {
  try {
    res.json(
      await outletSettingsService.getSection(req.tenant.outletId, req.params.section),
    );
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ message: "Failed to load settings", error: err.message });
  }
}

export async function updateModuleSettings(req, res) {
  try {
    res.json(
      await outletSettingsService.updateSection(
        req.tenant.outletId,
        req.params.section,
        req.body,
      ),
    );
  } catch (err) {
    res
      .status(err.statusCode || 400)
      .json({ message: "Failed to save settings", error: err.message });
  }
}

export async function resetModuleSettings(req, res) {
  try {
    res.json(
      await outletSettingsService.resetSection(req.tenant.outletId, req.params.section),
    );
  } catch (err) {
    res
      .status(err.statusCode || 400)
      .json({ message: "Failed to reset settings", error: err.message });
  }
}