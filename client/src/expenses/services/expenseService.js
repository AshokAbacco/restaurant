// ==============================================
// src/expenses/services/expenseService.js
// ==============================================

import { apiRequest } from "../../api/apiClient";

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
  deleteStore
};