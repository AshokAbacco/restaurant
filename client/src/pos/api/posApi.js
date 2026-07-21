// src/pos/api/posApi.js
//
// Routes every call through the app's shared apiClient (same one
// auth/authService.js uses) so the access token is attached automatically,
// and a 401 triggers the existing silent-refresh-and-retry flow instead of
// just failing. Do NOT use a plain fetch() here — it silently bypasses auth.
import { apiRequest } from "../../api/apiClient";

async function request(path, options = {}) {
  const { ok, data } = await apiRequest(path, options);
  if (!ok) {
    // Controllers in this project return { message: "generic wrapper", error: "specific reason" } —
    // surface the specific one when present, since the generic message alone hides the real cause.
    const detail = data?.error ? `${data.message}: ${data.error}` : data?.message;
    throw new Error(detail || "Request failed");
  }
  return data;
}

// Menu module wraps responses as { success, data } — unwrap here so
// callers always get the plain payload regardless of which module they hit.
async function requestMenu(path, options = {}) {
  const body = await request(path, options);
  return body?.data !== undefined ? body.data : body;
}

export const getCategories = () => requestMenu("/categories");
export const getMenuItems = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return requestMenu(`/menu${qs ? `?${qs}` : ""}`);
};

export const getTables = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/pos/tables${qs ? `?${qs}` : ""}`);
};

// Floors that tables are grouped under (Ground Floor, Rooftop, etc.) —
// powers the floor step in the "Select a table" flow and Table Manager.
export const getFloors = () => request("/pos/tables/floors");

export const createFloor = (payload) =>
  request("/pos/tables/floors", { method: "POST", body: JSON.stringify(payload) });

export const updateFloor = (id, payload) =>
  request(`/pos/tables/floors/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const deleteFloor = (id) => request(`/pos/tables/floors/${id}`, { method: "DELETE" });

// Table-wise board for the Orders page and the POS "select a table" strip —
// each table with its active order's customer, item count, total, and
// kitchen status in one call. Pass { floorId } to scope it to one floor.
export const getTablesBoard = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/pos/tables/board${qs ? `?${qs}` : ""}`);
};

export const createTable = (payload) =>
  request("/pos/tables", { method: "POST", body: JSON.stringify(payload) });

export const updateTable = (id, payload) =>
  request(`/pos/tables/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const deleteTable = (id) => request(`/pos/tables/${id}`, { method: "DELETE" });

export const updateOrderStatus = (orderId, status) =>
  request(`/pos/orders/${orderId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });

export const searchCustomers = (q) => request(`/pos/customers/search?q=${encodeURIComponent(q)}`);
export const createCustomer = (payload) =>
  request("/pos/customers", { method: "POST", body: JSON.stringify(payload) });

export const createOrder = (payload) =>
  request("/pos/orders", { method: "POST", body: JSON.stringify(payload) });

// Atomic version — creates the order and sends it to the kitchen in one
// backend transaction. If the kitchen send fails, nothing is saved at all.
// Use this instead of createOrder + sendToKitchen as two separate calls.
export const placeOrderAndSendToKitchen = (payload) =>
  request("/pos/orders/place", { method: "POST", body: JSON.stringify(payload) });

// Fetches a single order with its full item/payment/kitchen detail — used
// when a staff member taps an OCCUPIED table to see what's already ordered
// before adding more items to it.
export const getOrder = (id) => request(`/pos/orders/${id}`);

// Adds new items to an order that's already been placed (e.g. the customer
// asks for 2 more items mid-meal). Returns { order, newItems } — newItems is
// what you pass to sendToKitchen next, so only the new stuff gets a ticket,
// not the whole order again.
export const addItemsToOrder = (orderId, items) =>
  request(`/pos/orders/${orderId}/items`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });

export const sendToKitchen = (orderId, orderItemIds) =>
  request(`/pos/kot/orders/${orderId}`, {
    method: "POST",
    body: JSON.stringify({ orderItemIds }),
  });

export const getKitchenDisplay = (kitchenSectionId) => {
  const qs = kitchenSectionId ? `?kitchenSectionId=${kitchenSectionId}` : "";
  return request(`/pos/kot/display${qs}`);
};

export const updateKotStatus = (id, status, reason) =>
  request(`/pos/kot/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status, reason }),
  });

// add near getMenuItems
export const getAddOns = () => request(`/pos/add-ons?isEnabled=true`);

// ==============================================
// BILLING & PAYMENT
// Complete Service -> Billing & Payment -> Invoice -> Free Table.
// The table is only freed server-side once completeBilling succeeds with a
// fully-paid order — nothing here frees it up front.
// ==============================================

// Read-only bill preview for the Billing & Payment modal: items, subtotal,
// CGST/SGST, discount, grand total, and anything already paid so far.
export const getBillingSummary = (orderId) => request(`/pos/billing/orders/${orderId}/summary`);

// payload: { payments: [{ method, amount, transactionReference? }], discount? }
// Records the payment(s), and only on full payment marks the order
// COMPLETED, generates the invoice, and frees the table. Returns
// { order, payments, invoice }.
export const completeBilling = (orderId, payload) =>
  request(`/pos/billing/orders/${orderId}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getOrders = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/pos/orders${qs ? `?${qs}` : ""}`);
};

// Notes left by kitchen staff on a specific ticket (e.g. "ran out of paneer,
// used tofu instead"). Adding one returns just the new note; the ticket's
// full note list comes back inline as part of getKitchenDisplay/getKotsForOrder.
export const addKitchenNote = (kotId, note) =>
  request(`/pos/kot/${kotId}/notes`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });

export const getKitchenNotes = (kotId) => request(`/pos/kot/${kotId}/notes`);

// Feed of every note across recent tickets, newest first — powers the
// standalone Kitchen Notes log page.
export const getRecentKitchenNotes = (limit) =>
  request(`/pos/kot/notes${limit ? `?limit=${limit}` : ""}`);