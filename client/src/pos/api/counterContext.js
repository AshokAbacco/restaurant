// src/pos/counterContext.js
//
// Phase 2.2 — Counter/Terminal selection. A "counter" (BillingCounter) is
// a property of the PHYSICAL POS device, not of whoever is logged in —
// the same terminal keeps its counter identity across shifts/logins, and
// one staff login can be used at different counters at different times.
// That's why this lives in localStorage (per-browser/device), not in
// AuthContext or the JWT.
//
// NOTE: switching outlets (AuthContext.switchOutlet) reloads the whole
// page, which is the natural point a stale counter selection from a
// DIFFERENT outlet would otherwise leak into the new one — clearSelectedCounter
// is exported so that flow can call it explicitly if this ever needs
// tightening; not wired in automatically yet, since one physical terminal
// switching outlets entirely is an edge case rather than the common path.

const STORAGE_KEY = "pos:selectedCounter";

export function getSelectedCounter() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getSelectedCounterId() {
  return getSelectedCounter()?.id || null;
}

export function setSelectedCounter(counter) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: counter.id, name: counter.name }));
}

export function clearSelectedCounter() {
  localStorage.removeItem(STORAGE_KEY);
}