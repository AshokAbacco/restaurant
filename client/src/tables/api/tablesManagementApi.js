// src/tables/api/tablesManagementApi.js
//
// Same pattern as src/pos/api/posApi.js: every call goes through the app's
// shared apiClient so the access token is attached automatically and a 401
// triggers the existing silent-refresh-and-retry flow. Do NOT use a plain
// fetch() here — that bypasses auth and (as we saw) can end up hitting the
// SPA's index.html instead of the API, which is why you'd get
// "Unexpected token '<'... is not valid JSON".
import { apiRequest } from "../../api/apiClient";

async function request(path, options = {}) {
  const { ok, data } = await apiRequest(path, options);
  if (!ok) {
    // Controllers in this project return { message: "generic wrapper", error: "specific reason" } —
    // surface the specific one when present, same as posApi.js does.
    const detail = data?.error
      ? `${data.message}: ${data.error}`
      : data?.message;
    throw new Error(detail || "Request failed");
  }
  return data;
}

// ---------------------------------------------------------------------------
// Floors
// Backend routes (tables.routes.js): GET/POST /pos/tables/floors,
// PUT/DELETE /pos/tables/floors/:id
// ---------------------------------------------------------------------------

export const getFloors = () => request("/pos/tables/floors");

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

// ---------------------------------------------------------------------------
// Tables
// Backend routes (tables.routes.js): GET /pos/tables?floorId=:id,
// POST /pos/tables, PUT/DELETE /pos/tables/:id
// ---------------------------------------------------------------------------

export const getTablesByFloor = (floorId) =>
  request(`/pos/tables?floorId=${floorId}`);

export const getAllTables = () => request("/pos/tables");

export const createTable = (payload) =>
  request("/pos/tables", { method: "POST", body: JSON.stringify(payload) });

export const updateTable = (id, payload) =>
  request(`/pos/tables/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteTable = (id) =>
  request(`/pos/tables/${id}`, { method: "DELETE" });

// ---------------------------------------------------------------------------
// Waiter assignment (Owner / Admin / Manager only)
// Backend routes: GET /pos/tables/waiters,
// POST /pos/tables/assign | /assign/floor | /assign/all,
// POST /pos/tables/unassign/:id, /pos/tables/waiters/:waiterId/unassign-all
// ---------------------------------------------------------------------------

export const getWaiters = () => request("/pos/tables/waiters");

export const assignTables = (tableIds, waiterId) =>
  // FIX: the controller returns { message, tables } — not a bare array.
  // Unwrap .tables here so Tables.jsx can keep doing `updated.map(...)` on
  // the result directly (that mismatch is what threw "updated.map is not
  // a function" after confirming an assignment).
  request("/pos/tables/assign", {
    method: "POST",
    body: JSON.stringify({ tableIds, waiterId }),
  }).then((data) => data.tables);

export const assignFloorToWaiter = (floorId, waiterId) =>
  request("/pos/tables/assign/floor", {
    method: "POST",
    body: JSON.stringify({ floorId, waiterId }),
  });

export const assignAllTablesToWaiter = (waiterId) =>
  request("/pos/tables/assign/all", {
    method: "POST",
    body: JSON.stringify({ waiterId }),
  });

export const unassignTable = (tableId) =>
  request(`/pos/tables/unassign/${tableId}`, { method: "POST" });

export const unassignAllForWaiter = (waiterId) =>
  request(`/pos/tables/waiters/${waiterId}/unassign-all`, { method: "POST" });

// ---------------------------------------------------------------------------
// Waiter's own view — "My Tables"
// Backend routes: GET /pos/tables/my-tables, GET /pos/tables/my-tables/:id
// ---------------------------------------------------------------------------

export const getMyTables = () => request("/pos/tables/my-tables");

export const getMyTableDetail = (tableId) =>
  request(`/pos/tables/my-tables/${tableId}`);

// ---------------------------------------------------------------------------
// Table Reservations (Phase 1.3)
// ---------------------------------------------------------------------------

export const getReservations = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/pos/tables/reservations${qs ? `?${qs}` : ""}`);
};

// payload: { tableId, customerName, customerPhone?, partySize, reservedFor,
//   durationMinutes?, notes?, customerId? }
export const createReservation = (payload) =>
  request("/pos/tables/reservations", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateReservation = (id, payload) =>
  request(`/pos/tables/reservations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const seatReservation = (id) =>
  request(`/pos/tables/reservations/${id}/seat`, { method: "POST" });

export const cancelReservation = (id, reason) =>
  request(`/pos/tables/reservations/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });