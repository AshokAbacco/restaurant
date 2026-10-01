// ==============================================
// client/src/profitLoss/profitLossService.js
// ==============================================
import { apiRequest, authFetch } from "../api/apiClient";

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const qs = query.toString();
  return qs ? `?${qs}` : "";
};

const unwrap = (result, fallbackMessage) => {
  if (!result.ok) {
    throw new Error(result.data?.message || fallbackMessage);
  }
  return result.data.data;
};

const get = (path, params, fallbackMessage) =>
  apiRequest(`${path}${buildQuery(params)}`).then((r) =>
    unwrap(r, fallbackMessage),
  );

export const fetchDashboard = (params) =>
  get("/profit-loss/dashboard", params, "Failed to load dashboard");

export const fetchRevenue = (params) =>
  get("/profit-loss/revenue", params, "Failed to load revenue");

export const fetchExpenses = (params) =>
  get("/profit-loss/expenses", params, "Failed to load expenses");

export const fetchCogs = (params) =>
  get("/profit-loss/cogs", params, "Failed to load COGS");

export const fetchCategoryProfit = (params) =>
  get("/profit-loss/category-profit", params, "Failed to load category profit");

export const fetchItemProfit = (params) =>
  get("/profit-loss/item-profit", params, "Failed to load item profit");

export const fetchFoodCost = (params) =>
  get("/profit-loss/food-cost", params, "Failed to load food cost");

export const fetchDiscounts = (params) =>
  get("/profit-loss/discounts", params, "Failed to load discount impact");

export const fetchRefunds = (params) =>
  get("/profit-loss/refunds", params, "Failed to load refund analysis");

export const fetchTax = (params) =>
  get("/profit-loss/tax", params, "Failed to load tax analysis");

export const fetchPaymentRevenue = (params) =>
  get(
    "/profit-loss/payment-revenue",
    params,
    "Failed to load payment-wise revenue",
  );

export const fetchInventoryCost = (params) =>
  get(
    "/profit-loss/inventory-cost",
    params,
    "Failed to load inventory cost analysis",
  );

export const fetchWastage = (params) =>
  get("/profit-loss/wastage", params, "Failed to load wastage cost");

export const fetchCharts = (params) =>
  get("/profit-loss/charts", params, "Failed to load chart");

export const fetchAlerts = (params) =>
  get("/profit-loss/alerts", params, "Failed to load alerts");

// Reports: json goes through apiRequest like everything else; csv/excel/pdf
// need a raw authenticated fetch so the browser can download a Blob.
export const fetchReportJSON = (params) =>
  get("/profit-loss/reports", params, "Failed to load report");

export const downloadReport = async (params) => {
  // authFetch: renews an expired token instead of failing with 401.
  const res = await authFetch(`/profit-loss/reports${buildQuery(params)}`);

  if (!res.ok) {
    let message = "Failed to generate report";
    try {
      const body = await res.json();
      message = body.message || message;
    } catch {
      // response wasn't JSON (already a file) — keep default message
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : `report.${params.format || "json"}`;

  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export default {
  fetchDashboard,
  fetchRevenue,
  fetchExpenses,
  fetchCogs,
  fetchCategoryProfit,
  fetchItemProfit,
  fetchFoodCost,
  fetchDiscounts,
  fetchRefunds,
  fetchTax,
  fetchPaymentRevenue,
  fetchInventoryCost,
  fetchWastage,
  fetchCharts,
  fetchAlerts,
  fetchReportJSON,
  downloadReport,
};