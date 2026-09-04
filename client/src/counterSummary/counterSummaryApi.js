// ==============================================
// src/counterSummary/counterSummaryApi.js
// ==============================================
//
// The report is served by the existing reports module
// (GET /api/reports/counter-summary), so this reuses reportsApi's request
// plumbing rather than repeating the auth, refresh-on-401 and blob-download
// handling that already lives there.

import { apiRequest } from "../api/apiClient";
import { exportReport } from "../reports/reportsApi";

/**
 * One row per billing counter for the period, plus an "Unassigned" row for
 * orders taken with no counter selected.
 *
 * Pass either `period` ("today", "thisweek", "thismonth", "thisyear") or an
 * explicit `startDate` / `endDate` pair as YYYY-MM-DD. When both are given
 * the explicit dates win, which is what makes the custom-range picker work
 * without having to clear the period first.
 */
export async function fetchCounterSummary({ period, startDate, endDate } = {}) {
  const params = new URLSearchParams();
  if (startDate && endDate) {
    params.set("startDate", startDate);
    params.set("endDate", endDate);
  } else if (period) {
    params.set("period", period);
  }

  const qs = params.toString();
  const result = await apiRequest(
    `/reports/counter-summary${qs ? `?${qs}` : ""}`,
  );

  if (!result.ok || result.data?.success === false) {
    throw new Error(
      result.data?.message ||
        `Couldn't load the counter summary (${result.status}).`,
    );
  }

  // The reports controller wraps its payload in { success, data }; older
  // handlers return the array directly. Accept both.
  const payload = result.data?.data ?? result.data;
  return Array.isArray(payload) ? payload : [];
}

export function exportCounterSummary(format, filters) {
  return exportReport("counter-summary", format, filters);
}