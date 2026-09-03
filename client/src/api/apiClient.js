// ==============================================
// src/api/apiClient.js
// ==============================================
// Thin fetch wrapper:
// - access token is cached in localStorage (visible in DevTools, survives refresh)
//   NOTE: this trades some XSS resistance for debuggability/convenience.
//   If you want the harder-to-steal version back, swap this for an in-memory
//   variable and rely on /auth/me + the refresh cookie to repopulate it on load.
// - always sends credentials so the httpOnly refresh cookie goes along
// - on a 401, tries a single silent refresh, then retries the original request once

export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const ACCESS_TOKEN_STORAGE_KEY = "restaurant_access_token";

let accessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) || null;
let refreshPromise = null; // de-dupe concurrent refresh calls

export const setAccessToken = (token) => {
  accessToken = token;

  if (token) {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
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

// Exported so session restore can try the refresh COOKIE even when there is
// no access token in memory. The cookie is httpOnly, so JS can't inspect it —
// the only way to know whether a session is still alive is to ask.
export const refreshAccessToken = async () => {
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

export default { apiRequest, setAccessToken, getAccessToken, BASE_URL };