// ==============================================
// server/src/profitLoss/profitLoss.controller.js
// ==============================================
// Thin HTTP layer — parses query params, calls the service, forwards errors
// to the app-level error handler in index.js (err.status / err.expose).

import * as profitLossService from "./profitLoss.service.js";
import { sendExport } from "./profitLoss.utils.js";

// Common filters accepted across most endpoints. `shift` is accepted for
// forward-compatibility (see note in profitLoss.service.js) but not yet
// applied to any query.
//
// FIX: outletId here comes from req.tenant (the authenticated session),
// never from req.query — the old `store` query param let a client request
// figures for any store as a plain string. There is no client-controlled
// equivalent of that anymore, by design.
const parseCommonQuery = (req) => ({
  from: req.query.from,
  to: req.query.to,
  period: req.query.period, // today | week | month | year
  outletId: req.tenant.outletId,
  employeeId: req.query.employeeId || undefined,
  categoryId: req.query.categoryId || undefined,
  menuItemId: req.query.menuItemId || undefined,
});

export const getDashboard = async (req, res, next) => {
  try {
    const data = await profitLossService.getDashboard({
      outletId: req.tenant.outletId,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getRevenue = async (req, res, next) => {
  try {
    const data = await profitLossService.getRevenue(parseCommonQuery(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getExpenses = async (req, res, next) => {
  try {
    const data = await profitLossService.getExpenses(parseCommonQuery(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getCogs = async (req, res, next) => {
  try {
    const data = await profitLossService.getCogs(parseCommonQuery(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getCategoryProfit = async (req, res, next) => {
  try {
    const data = await profitLossService.getCategoryProfit(
      parseCommonQuery(req),
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getItemProfit = async (req, res, next) => {
  try {
    const data = await profitLossService.getItemProfit(parseCommonQuery(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getFoodCost = async (req, res, next) => {
  try {
    const thresholdPct = req.query.thresholdPct
      ? Number(req.query.thresholdPct)
      : undefined;
    const data = await profitLossService.getFoodCost({
      ...parseCommonQuery(req),
      thresholdPct,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getDiscounts = async (req, res, next) => {
  try {
    const data = await profitLossService.getDiscounts(parseCommonQuery(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getRefunds = async (req, res, next) => {
  try {
    const data = await profitLossService.getRefunds(parseCommonQuery(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTax = async (req, res, next) => {
  try {
    const data = await profitLossService.getTax(parseCommonQuery(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getPaymentRevenue = async (req, res, next) => {
  try {
    const data = await profitLossService.getPaymentRevenue(
      parseCommonQuery(req),
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getInventoryCost = async (req, res, next) => {
  try {
    const data = await profitLossService.getInventoryCost(
      parseCommonQuery(req),
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getWastage = async (req, res, next) => {
  try {
    const data = await profitLossService.getWastage(parseCommonQuery(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getCharts = async (req, res, next) => {
  try {
    const data = await profitLossService.getCharts({
      ...parseCommonQuery(req),
      type: req.query.type,
      groupBy: req.query.groupBy,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// Supports ?format=json|csv|excel|pdf — json (default) returns the raw
// structured data too, the other three trigger a file download.
export const getReports = async (req, res, next) => {
  try {
    const { title, rows, raw } = await profitLossService.buildReport({
      ...parseCommonQuery(req),
      type: req.query.type,
    });

    const filenameBase = `${req.query.type || "report"}-${new Date().toISOString().slice(0, 10)}`;

    await sendExport(res, {
      format: req.query.format,
      filenameBase,
      title,
      rows,
      jsonPayload: raw,
    });
  } catch (err) {
    next(err);
  }
};

export const getAlerts = async (req, res, next) => {
  try {
    const foodCostThresholdPct = req.query.foodCostThresholdPct
      ? Number(req.query.foodCostThresholdPct)
      : undefined;
    const data = await profitLossService.getAlerts({
      ...parseCommonQuery(req),
      foodCostThresholdPct,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export default {
  getDashboard,
  getRevenue,
  getExpenses,
  getCogs,
  getCategoryProfit,
  getItemProfit,
  getFoodCost,
  getDiscounts,
  getRefunds,
  getTax,
  getPaymentRevenue,
  getInventoryCost,
  getWastage,
  getCharts,
  getReports,
  getAlerts,
};