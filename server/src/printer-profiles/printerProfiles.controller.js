// server/src/pos/printer-profiles/printerProfiles.controller.js
import * as printerProfilesService from "./printerProfiles.service.js";

function handleError(res, err) {
  res.status(err.statusCode || 500).json({ message: err.message || "Request failed" });
}

export async function getPrinterProfiles(req, res) {
  try {
    const profiles = await printerProfilesService.listPrinterProfiles(
      req.query,
      req.tenant.outletId,
    );
    res.json(profiles);
  } catch (err) {
    handleError(res, err);
  }
}

// Sits above /:id deliberately — see the route file.
export async function getDefaultPrinterProfile(req, res) {
  try {
    const profile = await printerProfilesService.getDefaultPrinterProfile(
      req.tenant.outletId,
      req.query.purpose,
    );
    // Null, not 404: an outlet with no printers configured yet is a normal
    // state, and the client falls back to its built-in 80mm geometry.
    res.json(profile || null);
  } catch (err) {
    handleError(res, err);
  }
}

// Which printer should this job go to? The one endpoint the POS and the
// billing screen call before printing anything.
export async function resolvePrinterProfile(req, res) {
  try {
    const result = await printerProfilesService.resolvePrinterProfile(
      req.query,
      req.tenant.outletId,
    );
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

export async function getPrinterProfile(req, res) {
  try {
    const profile = await printerProfilesService.getPrinterProfileById(
      req.params.id,
      req.tenant.outletId,
    );
    if (!profile) return res.status(404).json({ message: "Printer profile not found" });
    res.json(profile);
  } catch (err) {
    handleError(res, err);
  }
}

export async function createPrinterProfile(req, res) {
  try {
    const profile = await printerProfilesService.createPrinterProfile(
      req.body,
      req.tenant.outletId,
    );
    res.status(201).json(profile);
  } catch (err) {
    handleError(res, err);
  }
}

export async function updatePrinterProfile(req, res) {
  try {
    const profile = await printerProfilesService.updatePrinterProfile(
      req.params.id,
      req.body,
      req.tenant.outletId,
    );
    res.json(profile);
  } catch (err) {
    handleError(res, err);
  }
}

export async function setDefaultPrinterProfile(req, res) {
  try {
    const profile = await printerProfilesService.setDefaultPrinterProfile(
      req.params.id,
      req.tenant.outletId,
    );
    res.json(profile);
  } catch (err) {
    handleError(res, err);
  }
}

export async function deactivatePrinterProfile(req, res) {
  try {
    const profile = await printerProfilesService.deactivatePrinterProfile(
      req.params.id,
      req.tenant.outletId,
    );
    res.json(profile);
  } catch (err) {
    handleError(res, err);
  }
}