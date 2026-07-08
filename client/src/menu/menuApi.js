// client/src/menu/menuApi.js
import { apiRequest, getAccessToken } from "../api/apiClient";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

// ---------- Categories ----------
export const fetchCategories = () => apiRequest("/categories");
export const createCategory = (data) =>
  apiRequest("/categories", { method: "POST", body: JSON.stringify(data) });
export const updateCategory = (id, data) =>
  apiRequest(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteCategory = (id) =>
  apiRequest(`/categories/${id}`, { method: "DELETE" });

// ---------- Sub Categories ----------
export const fetchSubCategories = (categoryId) => {
  const query = categoryId ? `?categoryId=${categoryId}` : "";
  return apiRequest(`/subcategories${query}`);
};
export const createSubCategory = (data) =>
  apiRequest("/subcategories", { method: "POST", body: JSON.stringify(data) });
export const updateSubCategory = (id, data) =>
  apiRequest(`/subcategories/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteSubCategory = (id) =>
  apiRequest(`/subcategories/${id}`, { method: "DELETE" });

// ---------- Kitchen Sections ----------
export const fetchKitchenSections = () => apiRequest("/kitchen-sections");
export const createKitchenSection = (data) =>
  apiRequest("/kitchen-sections", { method: "POST", body: JSON.stringify(data) });
export const updateKitchenSection = (id, data) =>
  apiRequest(`/kitchen-sections/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteKitchenSection = (id) =>
  apiRequest(`/kitchen-sections/${id}`, { method: "DELETE" });

// ---------- Menu Items ----------
export const fetchMenuItems = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/menu${query ? `?${query}` : ""}`);
};
export const createMenuItem = (data) =>
  apiRequest("/menu", { method: "POST", body: JSON.stringify(data) });
export const updateMenuItem = (id, data) =>
  apiRequest(`/menu/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteMenuItem = (id) =>
  apiRequest(`/menu/${id}`, { method: "DELETE" });

// ---------- Menu Variants ----------
export const fetchVariants = (menuItemId) => apiRequest(`/menu/${menuItemId}/variants`);
export const createVariant = (menuItemId, data) =>
  apiRequest(`/menu/${menuItemId}/variants`, { method: "POST", body: JSON.stringify(data) });
export const updateVariant = (id, data) =>
  apiRequest(`/variants/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteVariant = (id) =>
  apiRequest(`/variants/${id}`, { method: "DELETE" });

// ---------- Add-ons ----------
export const fetchAddOns = () => apiRequest("/addons");
export const createAddOn = (data) =>
  apiRequest("/addons", { method: "POST", body: JSON.stringify(data) });
export const updateAddOn = (id, data) =>
  apiRequest(`/addons/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteAddOn = (id) =>
  apiRequest(`/addons/${id}`, { method: "DELETE" });
export const fetchAddOnsForItem = (menuItemId) => apiRequest(`/menu/${menuItemId}/addons`);
export const attachAddOnToItem = (menuItemId, addOnId) =>
  apiRequest(`/menu/${menuItemId}/addons`, { method: "POST", body: JSON.stringify({ addOnId }) });
export const detachAddOnFromItem = (menuItemId, addOnId) =>
  apiRequest(`/menu/${menuItemId}/addons/${addOnId}`, { method: "DELETE" });

// ---------- Combo Meals ----------
export const fetchCombos = () => apiRequest("/combos");
export const fetchComboById = (id) => apiRequest(`/combos/${id}`);
export const createCombo = (data) =>
  apiRequest("/combos", { method: "POST", body: JSON.stringify(data) });
export const updateCombo = (id, data) =>
  apiRequest(`/combos/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteCombo = (id) =>
  apiRequest(`/combos/${id}`, { method: "DELETE" });
export const addComboItem = (comboId, menuItemId, quantity = 1) =>
  apiRequest(`/combos/${comboId}/items`, { method: "POST", body: JSON.stringify({ menuItemId, quantity }) });
export const removeComboItem = (comboItemId) =>
  apiRequest(`/combos/items/${comboItemId}`, { method: "DELETE" });

// ---------- Price History ----------
export const fetchPriceHistory = (menuItemId) => apiRequest(`/menu/${menuItemId}/price-history`);

// ---------- Reports ----------
export const fetchMenuReport = () => apiRequest("/menu/report");

// ---------- Bulk Import / Export ----------
export const exportMenuCsv = async () => {
  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}/menu/export`, {
    method: "GET",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return { ok: false, data };
  }
  const blob = await res.blob();
  return { ok: true, blob };
};

export const importMenuCsv = async (file) => {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/menu/import`, {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
};

// ---------- Image Upload ----------
export const uploadImage = async (file, folder = "menu-items") => {
  const token = getAccessToken();

  const formData = new FormData();
  formData.append("image", file);
  formData.append("folder", folder);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
};