// server/src/pos/counters/counters.controller.js
import * as countersService from "./counters.service.js";

function handleError(res, err) {
  res.status(err.statusCode || 500).json({ message: err.message || "Request failed" });
}

export async function getCounters(req, res) {
  try {
    const counters = await countersService.listCounters(req.query, req.tenant.outletId);
    res.json(counters);
  } catch (err) {
    handleError(res, err);
  }
}

export async function getCounter(req, res) {
  try {
    const counter = await countersService.getCounterById(req.params.id, req.tenant.outletId);
    if (!counter) return res.status(404).json({ message: "Counter not found" });
    res.json(counter);
  } catch (err) {
    handleError(res, err);
  }
}

export async function createCounter(req, res) {
  try {
    const counter = await countersService.createCounter(req.body, req.tenant.outletId);
    res.status(201).json(counter);
  } catch (err) {
    handleError(res, err);
  }
}

export async function updateCounter(req, res) {
  try {
    const counter = await countersService.updateCounter(req.params.id, req.body, req.tenant.outletId);
    res.json(counter);
  } catch (err) {
    handleError(res, err);
  }
}

export async function deactivateCounter(req, res) {
  try {
    const counter = await countersService.deactivateCounter(req.params.id, req.tenant.outletId);
    res.json(counter);
  } catch (err) {
    handleError(res, err);
  }
}