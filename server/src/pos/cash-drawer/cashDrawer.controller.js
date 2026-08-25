// server/src/pos/cash-drawer/cashDrawer.controller.js
import * as cashDrawerService from "./cashDrawer.service.js";

function handleError(res, err) {
  res
    .status(err.statusCode || 500)
    .json({ message: err.message || "Cash drawer request failed" });
}

export async function getCurrentSession(req, res) {
  try {
    const session = await cashDrawerService.getCurrentSession(req.tenant.outletId);
    res.json(session); // null is a valid, expected response — no session open right now
  } catch (err) {
    handleError(res, err);
  }
}

export async function openSession(req, res) {
  try {
    const { openingFloat, notes } = req.body;
    const session = await cashDrawerService.openSession(
      { openingFloat, notes, openedById: req.user?.employeeId },
      req.tenant.outletId,
    );
    res.status(201).json(session);
  } catch (err) {
    handleError(res, err);
  }
}

export async function getSessions(req, res) {
  try {
    const { status, page, limit } = req.query;
    const result = await cashDrawerService.listSessions(
      { status, page, limit },
      req.tenant.outletId,
    );
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

export async function getSession(req, res) {
  try {
    const session = await cashDrawerService.getSessionById(
      req.params.sessionId,
      req.tenant.outletId,
    );
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.json(session);
  } catch (err) {
    handleError(res, err);
  }
}

export async function withdraw(req, res) {
  try {
    const { amount, reason } = req.body;
    const transaction = await cashDrawerService.withdraw(
      req.params.sessionId,
      { amount, reason, performedById: req.user?.employeeId },
      req.tenant.outletId,
    );
    res.status(201).json(transaction);
  } catch (err) {
    handleError(res, err);
  }
}

export async function topUp(req, res) {
  try {
    const { amount, reason } = req.body;
    const transaction = await cashDrawerService.topUp(
      req.params.sessionId,
      { amount, reason, performedById: req.user?.employeeId },
      req.tenant.outletId,
    );
    res.status(201).json(transaction);
  } catch (err) {
    handleError(res, err);
  }
}

export async function convertCurrency(req, res) {
  try {
    const { fromCurrency, toCurrency, foreignAmount, exchangeRate } = req.body;
    const transaction = await cashDrawerService.convertCurrency(
      req.params.sessionId,
      {
        fromCurrency,
        toCurrency,
        foreignAmount,
        exchangeRate,
        performedById: req.user?.employeeId,
      },
      req.tenant.outletId,
    );
    res.status(201).json(transaction);
  } catch (err) {
    handleError(res, err);
  }
}

export async function closeSession(req, res) {
  try {
    const { closingCounted, notes } = req.body;
    const result = await cashDrawerService.closeSession(
      req.params.sessionId,
      { closingCounted, notes, closedById: req.user?.employeeId },
      req.tenant.outletId,
    );
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}