// ==============================================
// src/api/apiClient.js
// ==============================================
// Thin fetch wrapper:
// - access token is cached in localStorage (visible in DevTools, survives refresh)
//   NOTE: this trades some XSS resistance for debuggability/convenience.
// - always sends credentials so the httpOnly refresh cookie goes along
// - on a 401, tries a single silent refresh, then retries the original request once
//
// SESSION FIX ("logged out every 5-10 minutes while using the site")
// ─────────────────────────────────────────────────────────────────────
// The access token is short-lived (ACCESS_TOKEN_TTL, 15m default). Staying
// logged in depends on POST /auth/refresh succeeding each time it expires.
// It was failing in three ways, and every failure was treated as a logout:
//
//  1. The refresh token only travelled as a cross-site cookie. Safari /
//     iPad / iPhone, incognito, and any browser with third-party cookies
//     blocked never send it → /refresh 401 → logged out each time the
//     access token expired. Now the server also returns the refresh token
//     and we send it in the body as a fallback (see auth.controller.js).
//  2. ANY failed refresh — a 500, a 429, a timeout, a server restart or
//     deploy — wiped the token, i.e. a logout. Now only a real rejection
//     (401/403: revoked, expired, deactivated) ends the session; temporary
//     failures keep it and simply try again.
//  3. Nothing renewed the token ahead of time, and several screens
//     (exports, uploads, reports dashboard, P&L download) used plain
//     fetch() with no refresh at all, so they hit "Invalid or expired
//     token" after 15 minutes. The token is now renewed ~1 minute before
//     it expires, again when the tab/tablet wakes up, and those screens go
//     through authFetch() below.

// FIX (tablet login "Failed to fetch"): VITE_API_URL is usually
// "http://localhost:5001/api". On the PC, "localhost" is the PC, so it works.
// On a tablet, "localhost" means THE TABLET ITSELF — there is no server
// there, so fetch() throws "Failed to fetch". If the API URL points at
// localhost but the page was opened from another host (e.g. the PC's LAN IP
// 192.168.1.20), swap in that host so the tablet talks to the PC.
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"];

const resolveBaseUrl = () => {
  const configured =
    import.meta.env.VITE_API_URL || "http://localhost:5001/api";

  if (typeof window === "undefined") return configured;

  try {
    const url = new URL(configured, window.location.origin);
    const pageHost = window.location.hostname;

    if (LOCAL_HOSTS.includes(url.hostname) && !LOCAL_HOSTS.includes(pageHost)) {
      url.hostname = pageHost;
    }

    return url.toString().replace(/\/+$/, "");
  } catch {
    return configured;
  }
};

export const BASE_URL = resolveBaseUrl();

// ==============================================
// TOKEN STORAGE
// ==============================================

const ACCESS_TOKEN_STORAGE_KEY = "restaurant_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "restaurant_refresh_token";

// localStorage can throw (Safari private mode, storage disabled) — never let
// that break auth.
const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

let accessToken = store.get(ACCESS_TOKEN_STORAGE_KEY) || null;
let refreshToken = store.get(REFRESH_TOKEN_STORAGE_KEY) || null;
let refreshPromise = null; // de-dupe concurrent refresh calls

export const setAccessToken = (token) => {
  accessToken = token || null;
  store.set(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  scheduleProactiveRefresh();
};

export const getAccessToken = () => accessToken;

// Fallback copy of the refresh token for browsers that block the cookie.
export const setRefreshToken = (token) => {
  refreshToken = token || null;
  store.set(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
};

export const getRefreshToken = () => refreshToken;

// Clears everything this device holds for the session.
export const clearSession = () => {
  setRefreshToken(null);
  setAccessToken(null);
};

// ==============================================
// SESSION-EXPIRED NOTIFICATION
// Fired only when the server GENUINELY rejects the session (refresh 401/403)
// or the user logged out in another tab. AuthContext listens and sends the
// user to the login screen cleanly instead of leaving a half-dead UI.
// ==============================================

const sessionExpiredListeners = new Set();

export const onSessionExpired = (listener) => {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
};

const emitSessionExpired = (reason) => {
  sessionExpiredListeners.forEach((listener) => {
    try {
      listener(reason);
    } catch (err) {
      console.error(err);
    }
  });
};

// ==============================================
// RAW REQUEST
// ==============================================

const rawRequest = async (path, options = {}) => {
  let res;

  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    // Network/CORS failure — fetch() never got a response. Keep throwing
    // (restoreSession relies on a throw to detect "offline"), but replace
    // the browser's bare "Failed to fetch" with something actionable.
    console.error(`[apiClient] Cannot reach ${BASE_URL}${path}`, err);
    const error = new Error(
      `Cannot reach the server (${BASE_URL}). Check the device is on the same network and the server is running.`,
    );
    error.cause = err;
    error.isNetworkError = true;
    throw error;
  }

  let data = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { ok: res.ok, status: res.status, data };
};

// ==============================================
// REFRESH
// Resolves with the response data on success.
// Resolves with null when the server REJECTED the session (401/403) — the
//   only case that ends the session.
// Throws (err.isTransient = true) when the server couldn't be reached or
//   answered anything else (5xx, 429, an HTML error page from a proxy…).
//   The session is kept; the next request / timer tick simply tries again.
// ==============================================

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = rawRequest("/auth/refresh", {
      method: "POST",
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    }).finally(() => {
      refreshPromise = null;
    });
  }

  let result;
  try {
    result = await refreshPromise;
  } catch (err) {
    err.isTransient = true;
    throw err;
  }

  if (result.ok && result.data?.accessToken) {
    if (result.data.refreshToken) setRefreshToken(result.data.refreshToken);
    setAccessToken(result.data.accessToken);
    return result.data;
  }

  if (result.status === 401 || result.status === 403) {
    const hadSession = Boolean(accessToken || refreshToken);
    clearSession();
    if (hadSession) emitSessionExpired(result.data?.message);
    return null;
  }

  const error = new Error(
    result.data?.message ||
      `Couldn't renew the session right now (server responded ${result.status}).`,
  );
  error.isTransient = true;
  error.status = result.status;
  throw error;
};

export const apiRequest = async (
  path,
  options = {},
  { skipRefresh = false } = {},
) => {
  let result = await rawRequest(path, options);

  if (result.status === 401 && !skipRefresh && path !== "/auth/refresh") {
    let refreshed;
    try {
      refreshed = await refreshAccessToken();
    } catch {
      // Temporary problem renewing — hand the original 401 back to the
      // caller, but DON'T log out. The next request retries the refresh.
      return result;
    }

    if (refreshed) {
      result = await rawRequest(path, options);
    }
  }

  return result;
};

// ==============================================
// authFetch — for requests apiRequest can't make (FormData uploads, blob
// downloads). Same Bearer token + one silent refresh on 401.
// Accepts a path ("/menu/export") or a full URL. Returns the raw Response.
// ==============================================

export const authFetch = async (pathOrUrl, init = {}) => {
  const url = /^https?:\/\//i.test(pathOrUrl)
    ? pathOrUrl
    : `${BASE_URL}${pathOrUrl}`;

  const doFetch = () =>
    fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init.headers || {}),
      },
    });

  let res = await doFetch();

  if (res.status === 401) {
    try {
      if (await refreshAccessToken()) res = await doFetch();
    } catch {
      /* temporary — keep the session, return the 401 */
    }
  }

  return res;
};

// ==============================================
// PROACTIVE RENEWAL
// Renew ~60s BEFORE the access token expires so in-flight work never sees
// a 401. Timers don't run while a tablet sleeps or a tab sits in the
// background, so we also re-check whenever the page becomes visible again,
// gets focus, or comes back online.
// ==============================================

const RENEW_BEFORE_MS = 60 * 1000;
let renewTimer = null;

const decodeJwt = (token) => {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const tokenExpiryMs = (token) => {
  const payload = decodeJwt(token);
  return payload?.exp ? payload.exp * 1000 : null;
};

// How long before expiry to renew: 60s, or a quarter of the token's
// lifetime if that's shorter (so a short ACCESS_TOKEN_TTL doesn't renew in
// a tight loop).
const renewLeadMs = (token) => {
  const payload = decodeJwt(token);
  if (!payload?.exp || !payload?.iat) return RENEW_BEFORE_MS;
  return Math.min(RENEW_BEFORE_MS, ((payload.exp - payload.iat) * 1000) / 4);
};

const renewIfNeeded = async () => {
  if (!accessToken && !refreshToken) return; // logged out
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  const exp = accessToken ? tokenExpiryMs(accessToken) : null;
  if (accessToken && exp && exp - Date.now() > renewLeadMs(accessToken)) return;

  try {
    await refreshAccessToken();
  } catch {
    // Temporary failure — retry shortly instead of giving up.
    clearTimeout(renewTimer);
    renewTimer = setTimeout(renewIfNeeded, 30 * 1000);
  }
};

function scheduleProactiveRefresh() {
  if (typeof window === "undefined") return;
  clearTimeout(renewTimer);
  renewTimer = null;
  if (!accessToken) return;

  const exp = tokenExpiryMs(accessToken);
  if (!exp) return;

  // Clamp: at least 5s away, and under setTimeout's ~24.8-day ceiling.
  const delay = Math.min(
    Math.max(exp - Date.now() - renewLeadMs(accessToken), 1000),
    2 ** 31 - 1,
  );
  renewTimer = setTimeout(renewIfNeeded, delay);
}

if (typeof window !== "undefined") {
  const onWake = () => {
    if (document.visibilityState === "visible") renewIfNeeded();
  };
  document.addEventListener("visibilitychange", onWake);
  window.addEventListener("focus", onWake);
  window.addEventListener("online", () => renewIfNeeded());

  // Keep tabs in sync: a refresh in one tab hands its new token to the
  // others; a logout in one tab logs out the others.
  window.addEventListener("storage", (e) => {
    if (e.key === ACCESS_TOKEN_STORAGE_KEY) {
      accessToken = e.newValue || null;
      scheduleProactiveRefresh();
    } else if (e.key === REFRESH_TOKEN_STORAGE_KEY) {
      const hadSession = Boolean(refreshToken);
      refreshToken = e.newValue || null;
      if (hadSession && !refreshToken) {
        accessToken = null;
        emitSessionExpired("Logged out in another tab.");
      }
    }
  });

  scheduleProactiveRefresh();
}

export default {
  apiRequest,
  authFetch,
  setAccessToken,
  getAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearSession,
  onSessionExpired,
  BASE_URL,
};