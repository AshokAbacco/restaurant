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
// API base
// ---------------------------------------------------------------------------

// MUST match where printerProfilesRoutes is mounted in server/src/index.js.
// Currently:  app.use("/api/pos/printer-profiles", ..., printerProfilesRoutes)
//
// The module lives at server/src/printer-profiles/ but keeps a /pos/ URL —
// the same arrangement reservations uses, so the frontend path never had to
// change.
//
// One constant rather than the path repeated across eight calls. A mismatch
// here produces a 404 with no JSON body, which `unwrap` below turns into its
// generic fallback ("Couldn't save that printer profile.") with nothing
// pointing at the real cause — so this is worth exactly one place to edit.
const PRINTER_API = "/pos/printer-profiles";

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

// What a printer is allowed to receive. Mirrors PURPOSES in
// server/src/printer-profiles/printerProfiles.service.js — the server rejects
// anything outside this set, so the two lists have to agree.
export const PRINTER_PURPOSES = [
  {
    key: "KOT",
    label: "Kitchen (KOT)",
    hint: "Kitchen tickets only — never bills.",
  },
  {
    key: "INVOICE",
    label: "Invoice / Bill",
    hint: "Customer bills only — never kitchen tickets.",
  },
  {
    key: "BOTH",
    label: "Both",
    hint: "One printer handling everything (single-counter outlets).",
  },
];

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

// Carries the HTTP status through when the server sends no JSON body.
//
// Without it every failure collapsed to the same sentence, which hid the one
// fact that identifies the cause:
//   404 — the route isn't mounted (server not restarted / wrong path)
//   403 — a role gate above this mount rejected the request
//   502 — the server is down or crashed on boot
//   500 — it reached the handler and something threw (that case DOES carry a
//         message, so it prints the real one)
const unwrap = ({ ok, status, data }, fallbackMessage) => {
  if (ok) return data;

  // A JSON body with a message is the server explaining itself — trust it.
  if (data?.message) throw new Error(data.message);

  // No parseable body: say so, and say what the status was.
  const hint =
    status === 404
      ? "the printer routes aren't reachable at this URL — check PRINTER_API below matches the mount in server/src/index.js, and that the server was restarted"
      : status === 403
        ? "blocked by a role check before reaching the printer routes"
        : status === 0 || !status
          ? "no response from the server"
          : "the server returned no details";

  throw new Error(`${fallbackMessage} (HTTP ${status || "?"} — ${hint})`);
};

export const listPrinterProfiles = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return unwrap(
    await apiRequest(`${PRINTER_API}${qs ? `?${qs}` : ""}`),
    "Couldn't load printer profiles.",
  );
};

export const getPrinterProfile = async (id) =>
  unwrap(
    await apiRequest(`${PRINTER_API}/${id}`),
    "Couldn't load that printer profile.",
  );

// `purpose` narrows this to that stream's default — an outlet has a default
// KOT printer and a default invoice printer at the same time.
export const getDefaultPrinterProfile = async (purpose) => {
  const qs = purpose ? `?purpose=${encodeURIComponent(purpose)}` : "";
  return unwrap(
    await apiRequest(`${PRINTER_API}/default${qs}`),
    "Couldn't load the default printer profile.",
  );
};

// Which printer should this specific job go to?
//
// `purpose` is required; `kitchenBranchId` narrows a KOT to the kitchen that
// actually has to cook it. Resolution happens server-side, most specific
// first: that kitchen's KOT printer, then that kitchen's shared printer, then
// an unbound KOT printer, then the outlet default.
//
// Returns { profile, matchedOn }. `matchedOn` distinguishes an exact hit
// (KITCHEN_EXACT) from a fallback (OUTLET_DEFAULT) or nothing configured at
// all (NONE), so a caller can warn rather than silently print a Rooftop
// ticket on the Ground Floor printer.
export const resolvePrinterProfile = async ({ purpose, kitchenBranchId } = {}) => {
  const qs = new URLSearchParams({
    purpose: purpose || "BOTH",
    ...(kitchenBranchId ? { kitchenBranchId } : {}),
  }).toString();
  return unwrap(
    await apiRequest(`${PRINTER_API}/resolve?${qs}`),
    "Couldn't work out which printer to use.",
  );
};

export const createPrinterProfile = async (payload) =>
  unwrap(
    await apiRequest(PRINTER_API, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    "Couldn't save that printer profile.",
  );

export const updatePrinterProfile = async (id, payload) =>
  unwrap(
    await apiRequest(`${PRINTER_API}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
    "Couldn't save that printer profile.",
  );

export const makePrinterProfileDefault = async (id) =>
  unwrap(
    await apiRequest(`${PRINTER_API}/${id}/default`, { method: "POST" }),
    "Couldn't change the default printer.",
  );

export const deactivatePrinterProfile = async (id) =>
  unwrap(
    await apiRequest(`${PRINTER_API}/${id}`, { method: "DELETE" }),
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
// This stays purpose-agnostic on purpose. It answers "what paper is loaded in
// the printer attached to this terminal", which is a property of the device.
// "Which printer should THIS job go to" is a different question, answered by
// resolvePrinterProfile() above.
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