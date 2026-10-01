// ==============================================
// src/expenses/services/expenseService.js
// ==============================================

import { apiRequest, authFetch, BASE_URL } from "../../api/apiClient";

// ==============================================
// DASHBOARD
// ==============================================

export const getDashboard = async () => {
  const { ok, data } = await apiRequest("/expenses/dashboard");

  if (!ok) {
    throw new Error(data?.error || "Failed to load dashboard");
  }

  return data;
};

// ==============================================
// EXPENSES
// ==============================================

export const getExpenses = async (params = "") => {
  const { ok, data } = await apiRequest(`/expenses${params}`);

  if (!ok) {
    throw new Error(data?.error || "Failed to load expenses");
  }

  return data;
};

export const getExpense = async (id) => {
  const { ok, data } = await apiRequest(`/expenses/${id}`);

  if (!ok) {
    throw new Error(data?.error || "Expense not found");
  }

  return data;
};

export const createExpense = async (payload) => {
  const { ok, data } = await apiRequest("/expenses", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!ok) {
    throw new Error(data?.error || "Unable to create expense");
  }

  return data;
};

export const updateExpense = async (id, payload) => {
  const { ok, data } = await apiRequest(`/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!ok) {
    throw new Error(data?.error || "Unable to update expense");
  }

  return data;
};

export const deleteExpense = async (id) => {
  const { ok, data } = await apiRequest(`/expenses/${id}`, {
    method: "DELETE",
  });

  if (!ok) {
    throw new Error(data?.error || "Unable to delete expense");
  }

  return data;
};

// ==============================================
// APPROVAL
// ==============================================

export const approveExpense = async (id, payload) => {
  const { ok, data } = await apiRequest(`/expenses/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!ok) {
    throw new Error(data?.error || "Unable to approve expense");
  }

  return data;
};

// ==============================================
// CATEGORIES
// ==============================================

export const getCategories = async () => {
  const { ok, data } = await apiRequest("/expenses/categories");

  if (!ok) {
    throw new Error(data?.error || "Failed to load categories");
  }

  return data;
};

export const createCategory = async (payload) => {
  const { ok, data } = await apiRequest("/expenses/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!ok) {
    throw new Error(data?.error || "Unable to create category");
  }

  return data;
};

export const updateCategory = async (id, payload) => {
  const { ok, data } = await apiRequest(`/expenses/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!ok) {
    throw new Error(data?.error || "Unable to update category");
  }

  return data;
};

export const deleteCategory = async (id) => {
  const { ok, data } = await apiRequest(`/expenses/categories/${id}`, {
    method: "DELETE",
  });

  if (!ok) {
    throw new Error(data?.error || "Unable to delete category");
  }

  return data;
};

// ==============================================
// REPORTS
// ==============================================

export const getReports = async (params = "") => {
  const { ok, data } = await apiRequest(`/expenses/reports${params}`);

  if (!ok) {
    throw new Error(data?.error || "Failed to load reports");
  }

  return data;
};

// ==============================================
// STORES
// ==============================================

export const getStores = async () => {
  const { ok, data } = await apiRequest("/stores");
  if (!ok) {
    throw new Error(data?.error || "Failed to load stores");
  }
  return data;
};

export const createStore = async (payload) => {
  const { ok, data } = await apiRequest("/stores", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!ok) {
    throw new Error(data?.error || "Unable to create store");
  }
  return data;
};

export const updateStore = async (id, payload) => {
  const { ok, data } = await apiRequest(`/stores/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!ok) {
    throw new Error(data?.error || "Unable to update store");
  }
  return data;
};

export const deleteStore = async (id) => {
  const { ok, data } = await apiRequest(`/stores/${id}`, {
    method: "DELETE",
  });
  if (!ok) {
    throw new Error(data?.error || "Unable to delete store");
  }
  return data;
};
// ==============================================
// IMPORT / EXPORT
// apiRequest() is built for JSON responses, so file upload/download go
// through fetch directly. Adjust API_ROOT if your app isn't same-origin —
// it should match whatever base URL apiClient.js uses internally.
// ==============================================

const API_ROOT = `${BASE_URL}/expenses`;

const EXCEL_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const downloadBlob = async (url, filename) => {
  let res;
  try {
    // authFetch: renews an expired token instead of failing with 401.
    res = await authFetch(url);
  } catch {
    // fetch itself threw — network down, CORS block, wrong host/port, etc.
    throw new Error("Could not reach the server. Check your connection and try again.");
  }

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok || !contentType.includes(EXCEL_CONTENT_TYPE)) {
    // Either an explicit error status, OR a 200 that isn't actually a
    // spreadsheet (e.g. a proxy/misconfigured route serving JSON/HTML with
    // a 200 status) — never let that get saved to disk as a fake .xlsx.
    let message = "Download failed";
    try {
      const data = await res.json();
      message = data?.error || data?.message || message;
    } catch {
      // body wasn't JSON either — surface a status-based message instead
      message = `Download failed (server returned ${res.status || "an unexpected"} response).`;
    }
    throw new Error(message);
  }

  const blob = await res.blob();

  if (!blob || blob.size === 0) {
    throw new Error("Download failed — the file was empty.");
  }

  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(link.href);
};

export const downloadImportTemplate = () =>
  downloadBlob(`${API_ROOT}/import/template`, "expense-import-template.xlsx");

export const validateImportFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  let res;
  try {
    res = await authFetch(`${API_ROOT}/import/validate`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || data?.message || "Unable to check the file");
  return data; // { validRows, errorRows }
};

export const confirmImportRows = async (rows) => {
  const { ok, data } = await apiRequest("/expenses/import/confirm", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
  if (!ok) throw new Error(data?.error || "Unable to import expenses");
  return data; // { created, skipped }
};

export const exportExpenses = (query = "") =>
  downloadBlob(`${API_ROOT}/export${query}`, "expenses-export.xlsx");
// ==============================================
// EXPORT
// ==============================================

export default {
  getDashboard,
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getReports,
  getStores,
  createStore,
  updateStore,
  deleteStore,
  downloadImportTemplate,
  validateImportFile,
  confirmImportRows,
  exportExpenses,
};