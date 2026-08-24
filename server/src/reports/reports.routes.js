// src/reports/reports.routes.js
// ==============================================
// Reports Routes
// Mount in your main app with:
//   import reportsRoutes from "./reports/reports.routes.js";
//   app.use("/api/reports", reportsRoutes);
// ==============================================

import express from "express";
import reportsController from "./reports.controller.js";

const router = express.Router();

// Full dashboard payload in a single round trip (used by ReportsDashboard.jsx)
router.get("/dashboard", reportsController.getDashboard);

// Individual sections — handy for widgets that refresh independently,
// lazy-loaded tabs, or lighter polling than the full dashboard call.
router.get("/sales-summary", reportsController.getSalesSummary);
router.get("/sales-trend", reportsController.getSalesTrend);
router.get("/order-type-breakdown", reportsController.getOrderTypeBreakdown);
router.get("/category-performance", reportsController.getCategoryPerformance);
router.get("/payment-distribution", reportsController.getPaymentDistribution);
router.get("/top-selling", reportsController.getTopSellingItems);
router.get("/expense-breakdown", reportsController.getExpenseBreakdown);
router.get("/employee-performance", reportsController.getEmployeePerformance);
router.get("/customer-analytics", reportsController.getCustomerAnalytics);
router.get("/inventory-alerts", reportsController.getInventoryAlerts);
router.get("/kitchen-performance", reportsController.getKitchenPerformance);
router.get("/transactions", reportsController.getRecentTransactions);
router.get("/counter-summary", reportsController.getCounterSummary);
router.get("/assignee-wise-summary", reportsController.getAssigneeWiseSummary);
router.get("/settlement-summary", reportsController.getSettlementSummary);

// Export a report as CSV or XLSX, e.g.:
//   GET /api/reports/export/top-selling?format=xlsx&period=thismonth
router.get("/export/:reportType", reportsController.exportReport);

export default router;