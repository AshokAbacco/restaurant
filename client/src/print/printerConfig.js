// src/print/printerConfig.js
//
// Which printer profile THIS device prints against, plus the API calls that
// manage the outlet's list of profiles.
//
// The split mirrors pos/api/counterContext.js, and for the same reason: the
// list of printers belongs to the outlet (server), but which one is plugged
// into this particular terminal is a property of the device (localStorage).
// A tablet on the floor and the billing PC can be pointed at a 58mm handheld
// and an 80mm counter printer at the same time, under one login.

import { apiRequest } from "../api/apiClient";
import { FALLBACK_PROFILE, toPrintGeometry } from "./printerProfiles";

const STORAGE_KEY = "print:selectedProfileId";

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const unwrap = ({ ok, data }, fallbackMessage) => {
  if (!ok) throw new Error(data?.message || fallbackMessage);
  return data;
};

export const listPrinterProfiles = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return unwrap(
    await apiRequest(`/pos/printer-profiles${qs ? `?${qs}` : ""}`),
    "Couldn't load printer profiles.",
  );
};

export const getPrinterProfile = async (id) =>
  unwrap(
    await apiRequest(`/pos/printer-profiles/${id}`),
    "Couldn't load that printer profile.",
  );

export const getDefaultPrinterProfile = async () =>
  unwrap(
    await apiRequest("/pos/printer-profiles/default"),
    "Couldn't load the default printer profile.",
  );

export const createPrinterProfile = async (payload) =>
  unwrap(
    await apiRequest("/pos/printer-profiles", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    "Couldn't save that printer profile.",
  );

export const updatePrinterProfile = async (id, payload) =>
  unwrap(
    await apiRequest(`/pos/printer-profiles/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
    "Couldn't save that printer profile.",
  );

export const makePrinterProfileDefault = async (id) =>
  unwrap(
    await apiRequest(`/pos/printer-profiles/${id}/default`, { method: "POST" }),
    "Couldn't change the default printer.",
  );

export const deactivatePrinterProfile = async (id) =>
  unwrap(
    await apiRequest(`/pos/printer-profiles/${id}`, { method: "DELETE" }),
    "Couldn't remove that printer profile.",
  );

// ---------------------------------------------------------------------------
// Device selection
// ---------------------------------------------------------------------------

export function getSelectedProfileId() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Active profile cache
// ---------------------------------------------------------------------------
//
// printOnce() is synchronous — it cannot await a fetch while the operator is
// waiting on a print dialog. So the resolved profile is held here and the
// network refresh happens out of band (on app start, and whenever Settings
// changes something). Until the first load lands, printing uses
// FALLBACK_PROFILE, which is the exact 80mm geometry the receipts used before
// this feature existed: a slow network degrades to the old behaviour rather
// than to a broken layout.

let activeProfile = FALLBACK_PROFILE;
let loaded = false;
const listeners = new Set();

function notify() {
  for (const fn of listeners) {
    try {
      fn(activeProfile);
    } catch (err) {
      console.error("[print] profile listener failed:", err);
    }
  }
}

export function getActiveProfile() {
  return activeProfile;
}

export function getActiveGeometry() {
  return toPrintGeometry(activeProfile);
}

export function isProfileLoaded() {
  return loaded;
}

// Subscribe to profile changes. Returns an unsubscribe function, same shape
// as offline/offlineQueue.js's subscribeToQueue.
export function subscribeToPrinterProfile(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function applyProfile(profile) {
  activeProfile = profile || FALLBACK_PROFILE;
  loaded = true;
  notify();
  return activeProfile;
}

// Point this device at a specific profile. Pass null to go back to following
// the outlet's default.
export async function setSelectedProfile(profile) {
  try {
    if (profile?.id) localStorage.setItem(STORAGE_KEY, profile.id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private-mode localStorage failures shouldn't stop the selection taking
    // effect for this session.
  }
  return applyProfile(profile);
}

// Resolve what this device should print against: its own pick if it still
// exists and is active, otherwise the outlet default, otherwise the built-in
// 80mm fallback.
//
// Never throws — a printer-config fetch failing must not stop someone
// printing a bill.
export async function refreshActiveProfile() {
  const selectedId = getSelectedProfileId();

  try {
    if (selectedId) {
      const profile = await getPrinterProfile(selectedId);
      if (profile?.isActive) return applyProfile(profile);
      // Retired or deleted since this device chose it — fall through to the
      // outlet default rather than printing against a stale spec.
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }

    return applyProfile(await getDefaultPrinterProfile());
  } catch (err) {
    console.warn("[print] using fallback printer geometry:", err.message);
    return applyProfile(null);
  }
}