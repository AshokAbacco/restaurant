// ==============================================
// client/src/platform/api.js
// API client for the platform admin. Completely separate from the
// restaurant apiClient: its own token (localStorage "platform_token"),
// no refresh-token dance (platform sessions are a single signed token that
// lasts Settings -> Security -> session hours), and no outlet context.
// ==============================================

import { BASE_URL } from "../api/apiClient";

const TOKEN_KEY = "platform_token";
let token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
const expiredListeners = new Set();

export const getPlatformToken = () => token;
export const setPlatformToken = (t) => {
  token = t || null;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};
export const onPlatformSessionExpired = (fn) => {
  expiredListeners.add(fn);
  return () => expiredListeners.delete(fn);
};

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const buildUrl = (path, params) => {
  const url = `${BASE_URL}/platform${path}`;
  if (!params) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
};

export const request = async (method, path, { params, body } = {}) => {
  let res;
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(`Cannot reach the server (${BASE_URL}).`, 0);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.status === 401 && path !== "/auth/login") {
    setPlatformToken(null);
    expiredListeners.forEach((fn) => fn());
  }
  if (!res.ok || data?.success === false) {
    throw new ApiError(data?.message || `Request failed (${res.status})`, res.status, data);
  }
  return data;
};

export const api = {
  get: (path, params) => request("GET", path, { params }),
  post: (path, body) => request("POST", path, { body: body ?? {} }),
  put: (path, body) => request("PUT", path, { body: body ?? {} }),
  patch: (path, body) => request("PATCH", path, { body: body ?? {} }),
  del: (path) => request("DELETE", path),
};

/** Download a CSV export with the platform token. */
export const downloadCsv = async (path, params, filename) => {
  const res = await fetch(buildUrl(path, params), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError("Export failed.", res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ||
    res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ||
    "export.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
