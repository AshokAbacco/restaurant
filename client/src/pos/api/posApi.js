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
    const detail = data?.error
      ? `${data.message}: ${data.error}`
      : data?.message;
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

// FEATURE (Phase 1.5 — Menu Item quick On/Off): reuses the existing full
// menu-item update endpoint with just the one field — updateMenuItem on
// the backend already does a plain partial Prisma update, so a
// single-field payload was already supported without any backend change.
export const updateMenuItemAvailability = (id, isAvailable) =>
  requestMenu(`/menu/${id}`, {
    method: "PUT",
    body: JSON.stringify({ isAvailable }),
  });

export const getTables = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/pos/tables${qs ? `?${qs}` : ""}`);
};

// Floors that tables are grouped under (Ground Floor, Rooftop, etc.) —
// powers the floor step in the "Select a table" flow and Table Manager.
export const getFloors = () => request("/pos/tables/floors");

// Phase 2.2 — Counter/Terminal management. Read-only from the POS
// terminal's perspective (picking which counter this device is); creating/
// editing counters themselves is an Owner/Admin action in Settings.
export const getCounters = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/pos/counters${qs ? `?${qs}` : ""}`);
};

// Online Orders — platform list (Swiggy, Zomato, etc.) for the Online Orders
// tab's dropdown. Any POS role can add a new one inline, not just Owner/Admin
// (see onlinePlatforms.routes.js) — unlike counters, this isn't a device
// identity, just a growing list of names staff tag orders with.
export const getOnlinePlatforms = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/pos/online-platforms${qs ? `?${qs}` : ""}`);
};

export const createOnlinePlatform = (payload) =>
  request("/pos/online-platforms", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const createFloor = (payload) =>
  request("/pos/tables/floors", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateFloor = (id, payload) =>
  request(`/pos/tables/floors/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteFloor = (id) =>
  request(`/pos/tables/floors/${id}`, { method: "DELETE" });

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
  request(`/pos/tables/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteTable = (id) =>
  request(`/pos/tables/${id}`, { method: "DELETE" });

export const updateOrderStatus = (orderId, status) =>
  request(`/pos/orders/${orderId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });

export const searchCustomers = (q) =>
  request(`/pos/customers/search?q=${encodeURIComponent(q)}`);
export const createCustomer = (payload) =>
  request("/pos/customers", { method: "POST", body: JSON.stringify(payload) });

export const createOrder = (payload) =>
  request("/pos/orders", { method: "POST", body: JSON.stringify(payload) });

// Atomic version — creates the order and sends it to the kitchen in one
// backend transaction. If the kitchen send fails, nothing is saved at all.
// Use this instead of createOrder + sendToKitchen as two separate calls.
export const placeOrderAndSendToKitchen = (payload) =>
  request("/pos/orders/place", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// Fetches a single order with its full item/payment/kitchen detail — used
// when a staff member taps an OCCUPIED table to see what's already ordered
// before adding more items to it.
export const getOrder = (id) => request(`/pos/orders/${id}`);

// Owner-only: permanently removes an order and everything tied to it
// (items, kitchen tickets, payments, invoice) — see pos.service.js for the
// cascade. Used by the Payments page's Delete action.
export const deleteOrder = (id) =>
  request(`/pos/orders/${id}`, { method: "DELETE" });

// Adds new items to an order that's already been placed (e.g. the customer
// asks for 2 more items mid-meal). Returns { order, newItems } — newItems is
// what you pass to sendToKitchen next, so only the new stuff gets a ticket,
// not the whole order again.
// Voids ONE line off an unbilled order and returns the re-priced order.
// The server recomputes subtotal/GST/grand total from what's left — the
// client never sends a total.
export const removeOrderItem = (orderId, orderItemId) =>
  request(`/pos/orders/${orderId}/items/${orderItemId}`, { method: "DELETE" });

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

// GET counterpart to sendToKitchen above — the existing KOTs already on an
// order, used by the "Move KOT/Items" dialog's KOT-wise tab to list what's
// available to move.
export const getKotsForOrder = (orderId) => request(`/pos/kot/orders/${orderId}`);

// ==============================================
// MOVE KOT / ITEMS (Phase 1.4)
// Table View's three-tab "Move KOT/Items" dialog. Every variant returns
// { sourceOrder, destinationOrder } (table-wise returns just the updated
// order, since there's only one order involved) — the caller should
// re-fetch the tables board afterward rather than try to patch state from
// this response, since a move can create a brand-new order/table entry
// board-side.
// ==============================================

export const moveTableWise = ({ sourceTableId, destinationTableId }) =>
  request("/pos/kot/move/table", {
    method: "POST",
    body: JSON.stringify({ sourceTableId, destinationTableId }),
  });

export const moveKotWise = ({ kotId, destinationTableId }) =>
  request("/pos/kot/move/kot", {
    method: "POST",
    body: JSON.stringify({ kotId, destinationTableId }),
  });

export const moveItemsWise = ({ orderItemIds, destinationTableId }) =>
  request("/pos/kot/move/items", {
    method: "POST",
    body: JSON.stringify({ orderItemIds, destinationTableId }),
  });

export const getKitchenDisplay = (kitchenSectionId, kitchenBranchId) => {
  const params = new URLSearchParams();
  if (kitchenSectionId) params.set("kitchenSectionId", kitchenSectionId);
  // Physical-kitchen filter. Note the server IGNORES this for staff pinned to
  // a kitchen via Employee.kitchenBranchId — their assignment wins, so a chef
  // can't widen their view by editing the URL.
  if (kitchenBranchId) params.set("kitchenBranchId", kitchenBranchId);
  const qs = params.toString();
  return request(`/pos/kot/display${qs ? `?${qs}` : ""}`);
};

// ==============================================
// KITCHEN BRANCHES (physical kitchens)
// Distinct from kitchen SECTIONS (Grill/Beverage stations) — a branch is a
// whole kitchen, e.g. "Ground Floor Kitchen".
// ==============================================

export const getKitchenBranches = (includeInactive = false) =>
  request(`/kitchen-branches${includeInactive ? "?includeInactive=true" : ""}`);

export const createKitchenBranch = (payload) =>
  request("/kitchen-branches", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateKitchenBranch = (id, payload) =>
  request(`/kitchen-branches/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteKitchenBranch = (id) =>
  request(`/kitchen-branches/${id}`, { method: "DELETE" });

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
// Every bill raised in a date range — the reconciliation / reprint list.
export const getBillHistory = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== "" && v != null),
  ).toString();
  return request(`/pos/billing/history${qs ? `?${qs}` : ""}`);
};

// Fetches a previously generated invoice so it can be reprinted. Reuses the
// existing invoices route rather than duplicating the payload on the history
// endpoint — the list stays light, and the full bill is only pulled when
// someone actually clicks Print.
export const getInvoiceForOrder = (orderId) =>
  request(`/pos/invoices/orders/${orderId}`);

export const getBillingSummary = (orderId) =>
  request(`/pos/billing/orders/${orderId}/summary`);

// payload: { payments: [{ method, amount, transactionReference? }], discount?,
//   allowDue?, customerId? }
// Records the payment(s). If the payments given don't cover the full bill
// and allowDue is true, the remainder is tracked as a DuePayment against
// customerId (or the order's own customer if already attached) instead of
// blocking completion — see billing.service.js's completeBilling. Either
// way, once accepted, the order is marked COMPLETED, the invoice is
// generated, and the table is freed. Returns { order, payments, invoice,
// duePayment }.
export const completeBilling = (orderId, payload) =>
  request(`/pos/billing/orders/${orderId}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getOrders = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/pos/orders${qs ? `?${qs}` : ""}`);
};

// ==============================================
// DUE PAYMENTS (Phase 1.2 — Due Payment Settlement)
// ==============================================

// Outstanding (or filtered) due payments for the outlet. status omitted =
// everything not yet SETTLED (see duePayments.service.js's default).
export const getDuePayments = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/pos/due-payments${qs ? `?${qs}` : ""}`);
};

export const getDuePayment = (id) => request(`/pos/due-payments/${id}`);

// { customer, duePayments, totalOutstanding } for one customer's full tab.
export const getCustomerDuePayments = (customerId) =>
  request(`/pos/due-payments/customers/${customerId}`);

// payload: { amount, paymentMethod, notes? }
export const settleDuePayment = (id, payload) =>
  request(`/pos/due-payments/${id}/settle`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

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