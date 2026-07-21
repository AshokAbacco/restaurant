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
    const detail = data?.error ? `${data.message}: ${data.error}` : data?.message;
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
  request("/pos/tables/floors", { method: "POST", body: JSON.stringify(payload) });

export const updateFloor = (id, payload) =>
  request(`/pos/tables/floors/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const deleteFloor = (id) => request(`/pos/tables/floors/${id}`, { method: "DELETE" });

// ---------------------------------------------------------------------------
// Tables
// Backend routes (tables.routes.js): GET /pos/tables?floorId=:id,
// POST /pos/tables, PUT/DELETE /pos/tables/:id
// ---------------------------------------------------------------------------

export const getTablesByFloor = (floorId) => request(`/pos/tables?floorId=${floorId}`);

export const createTable = (payload) =>
  request("/pos/tables", { method: "POST", body: JSON.stringify(payload) });

export const updateTable = (id, payload) =>
  request(`/pos/tables/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const deleteTable = (id) => request(`/pos/tables/${id}`, { method: "DELETE" });