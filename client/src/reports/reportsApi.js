// ==============================================
// src/reports/reportsApi.js
// ==============================================
// Thin wrapper around the shared apiClient for the Reports API. Centralizing
// this here means the dashboard component just calls functions and doesn't
// know about URLs, query strings, auth headers, or blob-download plumbing.
//
// Auth note: this now goes through apiClient's `apiRequest`, so it uses the
// same Bearer token (from localStorage) and the same silent-refresh-on-401
// behavior as every other module (menu, inventory, expenses, etc.) — instead
// of relying on cookies alone, which is what caused the earlier 401s.

import { apiRequest, authFetch } from "../api/apiClient";

// BASE_URL already includes "/api" (e.g. http://localhost:5001/api), and the
// backend mounts reports at /api/reports — so we just append "/reports".
const REPORTS_PATH = "/reports";

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function request(path, filters) {
  const qs = buildQuery(filters);
  const result = await apiRequest(`${REPORTS_PATH}${path}${qs}`, {
    method: "GET",
  });

  if (!result.ok || !result.data || result.data.success === false) {
    throw new Error(
      result.data?.message || `Request to ${path} failed (${result.status})`,
    );
  }

  return result.data;
}

export function fetchDashboard(filters) {
  return request("/dashboard", filters).then((r) => r.data);
}

export function fetchTransactions(filters) {
  return request("/transactions", filters);
}

/**
 * Fetches a binary export (CSV/XLSX) with the same auth as the rest of the
 * app. apiRequest() can't be reused as-is here since it always parses JSON —
 * this mirrors its Bearer-token + single-silent-refresh behavior for the
 * blob case instead.
 */
async function fetchExportBlob(path) {
  // SESSION FIX: this had its own refresh that bypassed apiClient's shared
  // refresh (no de-dupe, and it wiped the session on any failure).
  return authFetch(path, { headers: { Accept: "*/*" } });
}

/**
 * Downloads a report as CSV or Excel by streaming the response into a Blob
 * and triggering a browser download.
 */
export async function exportReport(reportType, format, filters = {}) {
  const qs = buildQuery({ ...filters, format });
  const res = await fetchExportBlob(
    `${REPORTS_PATH}/export/${reportType}${qs}`,
  );

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.message || `Export failed (${res.status})`);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match
    ? match[1]
    : `${reportType}.${format === "xlsx" ? "xlsx" : "csv"}`;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}