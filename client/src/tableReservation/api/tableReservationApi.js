// src/tableReservation/api/tableReservationApi.js

import { apiRequest } from "../../api/apiClient";

async function request(path, options = {}) {
  const { ok, data } = await apiRequest(path, options);
  if (!ok) {
    // Controllers in this project return { message: "generic wrapper", error: "specific reason" } —
    // surface the specific one when present, same as tablesManagementApi.js does.
    const detail = data?.error
      ? `${data.message}: ${data.error}`
      : data?.message;
    throw new Error(detail || "Request failed");
  }
  return data;
}

// ---------------------------------------------------------------------------
// Reservations — list / detail
// ---------------------------------------------------------------------------

// filters: { date, status, tableId, customer, phone } — all optional
export const getReservations = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });
  const qs = params.toString();
  return request(`/pos/reservations${qs ? `?${qs}` : ""}`);
};

export const getReservationById = (id) => request(`/pos/reservations/${id}`);

// ---------------------------------------------------------------------------
// Reservations — create / update
// ---------------------------------------------------------------------------

export const createReservation = (payload) =>
  request("/pos/reservations", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateReservation = (id, payload) =>
  request(`/pos/reservations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

// ---------------------------------------------------------------------------
// Reservations — status transitions
// ---------------------------------------------------------------------------

export const seatReservation = (id) =>
  request(`/pos/reservations/${id}/seat`, { method: "POST" });

export const cancelReservation = (id) =>
  request(`/pos/reservations/${id}/cancel`, { method: "POST" });

export const noShowReservation = (id) =>
  request(`/pos/reservations/${id}/no-show`, { method: "POST" });

export const completeReservation = (id) =>
  request(`/pos/reservations/${id}/complete`, { method: "POST" });