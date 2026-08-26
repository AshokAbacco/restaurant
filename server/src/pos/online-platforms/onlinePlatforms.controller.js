// server/src/pos/online-platforms/onlinePlatforms.controller.js
import * as platformsService from "./onlinePlatforms.service.js";

function handleError(res, err) {
  res.status(err.statusCode || 500).json({ message: err.message || "Request failed" });
}

export async function getPlatforms(req, res) {
  try {
    const platforms = await platformsService.listPlatforms(req.query, req.tenant.outletId);
    res.json(platforms);
  } catch (err) {
    handleError(res, err);
  }
}

export async function getPlatform(req, res) {
  try {
    const platform = await platformsService.getPlatformById(req.params.id, req.tenant.outletId);
    if (!platform) return res.status(404).json({ message: "Platform not found" });
    res.json(platform);
  } catch (err) {
    handleError(res, err);
  }
}

export async function createPlatform(req, res) {
  try {
    const platform = await platformsService.createPlatform(req.body, req.tenant.outletId);
    res.status(201).json(platform);
  } catch (err) {
    handleError(res, err);
  }
}

export async function updatePlatform(req, res) {
  try {
    const platform = await platformsService.updatePlatform(
      req.params.id,
      req.body,
      req.tenant.outletId,
    );
    res.json(platform);
  } catch (err) {
    handleError(res, err);
  }
}

export async function deactivatePlatform(req, res) {
  try {
    const platform = await platformsService.deactivatePlatform(req.params.id, req.tenant.outletId);
    res.json(platform);
  } catch (err) {
    handleError(res, err);
  }
}