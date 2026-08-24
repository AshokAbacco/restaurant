// src/reports/reports.controller.js
// ==============================================
// Reports Controller
// Owns all HTTP concerns (req/res, status codes, content-type, downloads).
// Delegates every bit of business/query logic to reports.service.js.
// ==============================================

import reportsService from "./reports.service.js";

const VALID_PERIODS = ["today", "thisweek", "thismonth", "thisyear"];

/**
 * GET /api/reports/dashboard
 * Query: period, startDate, endDate, store, orderType, paymentMethod,
 *        category, search, granularity
 */
async function getDashboard(req, res) {
  try {
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);

    if (
      req.query.period &&
      !VALID_PERIODS.includes(
        String(req.query.period).toLowerCase().replace(/\s+/g, ""),
      ) &&
      !(req.query.startDate && req.query.endDate)
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid period. Use one of: Today, This Week, This Month, This Year — or pass startDate & endDate.`,
      });
    }

    const data = await reportsService.getDashboard(filters);

    return res.status(200).json({ success: true, filters, data });
  } catch (error) {
    console.error("[reports.controller] getDashboard failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard report data.",
    });
  }
}

/**
 * GET /api/reports/sales-summary
 */
async function getSalesSummary(req, res) {
  try {
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);
    const [summary, inventoryValue] = await Promise.all([
      reportsService.getSalesSummary(filters),
      reportsService.getInventoryValue(req.tenant.outletId),
    ]);
    return res.status(200).json({
      success: true,
      data: { ...summary, inventoryValue },
    });
  } catch (error) {
    console.error("[reports.controller] getSalesSummary failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load sales summary." });
  }
}

/**
 * GET /api/reports/sales-trend
 */
async function getSalesTrend(req, res) {
  try {
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);
    const data = await reportsService.getSalesTrend(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[reports.controller] getSalesTrend failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load sales trend." });
  }
}

/**
 * GET /api/reports/order-type-breakdown
 */
async function getOrderTypeBreakdown(req, res) {
  try {
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);
    const data = await reportsService.getOrderTypeBreakdown(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[reports.controller] getOrderTypeBreakdown failed:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to load order type breakdown.",
      });
  }
}

/**
 * GET /api/reports/category-performance
 */
async function getCategoryPerformance(req, res) {
  try {
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);
    const data = await reportsService.getCategoryPerformance(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[reports.controller] getCategoryPerformance failed:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to load category performance.",
      });
  }
}

/**
 * GET /api/reports/payment-distribution
 */
async function getPaymentDistribution(req, res) {
  try {
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);
    const data = await reportsService.getPaymentDistribution(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[reports.controller] getPaymentDistribution failed:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to load payment distribution.",
      });
  }
}

/**
 * GET /api/reports/top-selling
 */
async function getTopSellingItems(req, res) {
  try {
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);
    const data = await reportsService.getTopSellingItems(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[reports.controller] getTopSellingItems failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load top selling items." });
  }
}

/**
 * GET /api/reports/expense-breakdown
 */
async function getExpenseBreakdown(req, res) {
  try {
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);
    const data = await reportsService.getExpenseBreakdown(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[reports.controller] getExpenseBreakdown failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load expense breakdown." });
  }
}

/**
 * GET /api/reports/employee-performance
 */
async function getEmployeePerformance(req, res) {
  try {
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);
    const data = await reportsService.getEmployeePerformance(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[reports.controller] getEmployeePerformance failed:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to load employee performance.",
      });
  }
}

/**
 * GET /api/reports/counter-summary
 * Phase 2.2 — grouped by billing counter/terminal.
 */
async function getCounterSummary(req, res) {
  try {
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);
    const data = await reportsService.getCounterSummary(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[reports.controller] getCounterSummary failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load counter summary." });
  }
}

/**
 * GET /api/reports/assignee-wise-summary
 * Phase 2.2 — same column shape as counter-summary, grouped by waiter/assignee.
 */
async function getAssigneeWiseSummary(req, res) {
  try {
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);
    const data = await reportsService.getAssigneeWiseSummary(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[reports.controller] getAssigneeWiseSummary failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load assignee-wise summary." });
  }
}

/**
 * GET /api/reports/settlement-summary
 * Phase 2.2 — outlet-wide collected-vs-outstanding view for the period.
 */
async function getSettlementSummary(req, res) {
  try {
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);
    const data = await reportsService.getSettlementSummary(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[reports.controller] getSettlementSummary failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load settlement summary." });
  }
}

/**
 * GET /api/reports/customer-analytics
 */
async function getCustomerAnalytics(req, res) {
  try {
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);
    const data = await reportsService.getCustomerAnalytics(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[reports.controller] getCustomerAnalytics failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load customer analytics." });
  }
}

/**
 * GET /api/reports/inventory-alerts
 */
async function getInventoryAlerts(req, res) {
  try {
    const limit = Math.min(
      200,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const data = await reportsService.getInventoryAlerts(limit, req.tenant.outletId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[reports.controller] getInventoryAlerts failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load inventory alerts." });
  }
}

/**
 * GET /api/reports/kitchen-performance
 */
async function getKitchenPerformance(req, res) {
  try {
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);
    const data = await reportsService.getKitchenPerformance(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[reports.controller] getKitchenPerformance failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load kitchen performance." });
  }
}

/**
 * GET /api/reports/transactions
 * Supports pagination via page & pageSize, plus search & paymentMethod filters.
 */
async function getRecentTransactions(req, res) {
  try {
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);
    const data = await reportsService.getRecentTransactions(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[reports.controller] getRecentTransactions failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load recent transactions." });
  }
}

/**
 * GET /api/reports/export/:reportType?format=csv|xlsx
 * reportType matches the switch cases in reportsService.getExportData
 * (transactions, top-selling, category-performance, payment-distribution,
 *  expense-breakdown, employee-performance, inventory-alerts, sales-trend,
 *  order-type-breakdown, customer-analytics).
 */
async function exportReport(req, res) {
  try {
    const { reportType } = req.params;
    const format = String(req.query.format || "csv").toLowerCase();
    const filters = reportsService.parseFilters(req.query, req.tenant.outletId);

    const rows = await reportsService.getExportData(reportType, filters);
    const filename = `${reportType}-${new Date().toISOString().slice(0, 10)}`;

    if (format === "xlsx") {
      const buffer = await reportsService.toExcelBuffer(rows, reportType);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.xlsx"`,
      );
      return res.status(200).send(Buffer.from(buffer));
    }

    const csv = reportsService.toCSV(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.csv"`,
    );
    return res.status(200).send(csv);
  } catch (error) {
    console.error("[reports.controller] exportReport failed:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to export report.",
    });
  }
}

export default {
  getDashboard,
  getSalesSummary,
  getSalesTrend,
  getOrderTypeBreakdown,
  getCategoryPerformance,
  getPaymentDistribution,
  getTopSellingItems,
  getExpenseBreakdown,
  getEmployeePerformance,
  getCustomerAnalytics,
  getInventoryAlerts,
  getKitchenPerformance,
  getRecentTransactions,
  getCounterSummary,
  getAssigneeWiseSummary,
  getSettlementSummary,
  exportReport,
};