// src/crm/crmApi.js
//
// CRM API client. Goes through the shared apiClient (like posApi.js) so the
// access token and silent refresh are handled for us. The outlet is never
// sent — the server takes it from the token, which is what keeps each
// restaurant's customers separate.
import { apiRequest } from "../api/apiClient";

async function request(path, options = {}) {
  const { ok, status, data } = await apiRequest(path, options);
  if (!ok) {
    const err = new Error(data?.error || data?.message || "Request failed");
    err.status = status;
    err.code = data?.code;
    err.data = data;
    throw err;
  }
  return data;
}

const qs = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : "";
};

const json = (method, body) => ({ method, body: JSON.stringify(body ?? {}) });

// Config / settings
export const getCrmConfig = () => request("/crm/config");
export const getCrmSettings = () => request("/settings/modules/crm");
export const saveCrmSettings = (payload) => request("/settings/modules/crm", json("PUT", payload));
export const resetCrmSettings = () => request("/settings/modules/crm", { method: "DELETE" });

// Overview
export const getCrmOverview = () => request("/crm/overview");

// Customers
export const listCustomers = (params) => request(`/crm/customers${qs(params)}`);
export const searchCustomers = (q) => request(`/crm/customers/search${qs({ q })}`);
export const lookupCustomerByMobile = (mobile) => request(`/crm/customers/lookup${qs({ mobile })}`);
export const getCustomer = (id) => request(`/crm/customers/${id}`);
export const createCustomer = (payload) => request("/crm/customers", json("POST", payload));
export const updateCustomer = (id, payload) => request(`/crm/customers/${id}`, json("PUT", payload));
export const deleteCustomer = (id) => request(`/crm/customers/${id}`, { method: "DELETE" });
export const getCustomerOrders = (id, params) => request(`/crm/customers/${id}/orders${qs(params)}`);
export const getCustomerTimeline = (id) => request(`/crm/customers/${id}/timeline`);

// Link / unlink a customer on an existing POS order
export const linkOrderCustomer = (orderId, customerId) =>
  request(`/crm/orders/${orderId}/customer`, json("PATCH", { customerId }));

// Groups / tags
export const listTags = () => request("/crm/tags");
export const createTag = (payload) => request("/crm/tags", json("POST", payload));
export const updateTag = (id, payload) => request(`/crm/tags/${id}`, json("PUT", payload));
export const deleteTag = (id) => request(`/crm/tags/${id}`, { method: "DELETE" });

// Notes
export const listNotes = (id) => request(`/crm/customers/${id}/notes`);
export const addNote = (id, payload) => request(`/crm/customers/${id}/notes`, json("POST", payload));
export const updateNote = (id, noteId, payload) => request(`/crm/customers/${id}/notes/${noteId}`, json("PATCH", payload));
export const deleteNote = (id, noteId) => request(`/crm/customers/${id}/notes/${noteId}`, { method: "DELETE" });

// Communication history
export const listCommunications = (id) => request(`/crm/customers/${id}/communications`);
export const addCommunication = (id, payload) => request(`/crm/customers/${id}/communications`, json("POST", payload));

// Feedback & complaints
export const listCustomerFeedback = (id) => request(`/crm/customers/${id}/feedback`);
export const listFeedback = (params) => request(`/crm/feedback${qs(params)}`);
export const addFeedback = (id, payload) => request(`/crm/customers/${id}/feedback`, json("POST", payload));
export const updateFeedback = (feedbackId, payload) => request(`/crm/feedback/${feedbackId}`, json("PATCH", payload));

// Follow-up reminders
export const listCustomerReminders = (id) => request(`/crm/customers/${id}/reminders`);
export const listReminders = (params) => request(`/crm/reminders${qs(params)}`);
export const addReminder = (id, payload) => request(`/crm/customers/${id}/reminders`, json("POST", payload));
export const updateReminder = (reminderId, payload) => request(`/crm/reminders/${reminderId}`, json("PATCH", payload));