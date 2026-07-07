// ==============================================
// src/api/apiClient.js
// ==============================================
// Thin fetch wrapper:
// - keeps the access token in memory only (never localStorage) to limit XSS blast radius
// - always sends credentials so the httpOnly refresh cookie goes along
// - on a 401, tries a single silent refresh, then retries the original request once

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

let accessToken = null;
let refreshPromise = null; // de-dupe concurrent refresh calls

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

const rawRequest = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });

  let data = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { ok: res.ok, status: res.status, data };
};

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = rawRequest("/auth/refresh", { method: "POST" }).finally(
      () => {
        refreshPromise = null;
      },
    );
  }

  const result = await refreshPromise;

  if (result.ok && result.data?.accessToken) {
    setAccessToken(result.data.accessToken);
    return result.data;
  }

  setAccessToken(null);
  return null;
};

export const apiRequest = async (
  path,
  options = {},
  { skipRefresh = false } = {},
) => {
  let result = await rawRequest(path, options);

  if (result.status === 401 && !skipRefresh && path !== "/auth/refresh") {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      result = await rawRequest(path, options);
    }
  }

  return result;
};

export default { apiRequest, setAccessToken, getAccessToken };
