// ==============================================
// src/kiosk/services/kioskApi.js
// ==============================================
// Thin fetch wrapper around the kiosk backend module (server/src/kiosk/*).
// Every kiosk device sends its device key with each request; set it once
// via setKioskDeviceKey() at app startup (e.g. read from a config file
// baked into the kiosk build, or from localStorage set during setup).

const API_BASE = import.meta.env?.VITE_KIOSK_API_URL || "http://localhost:5001/api/kiosk";

let deviceKey = import.meta.env?.VITE_KIOSK_DEVICE_KEY || "";
let storeName = import.meta.env?.VITE_KIOSK_STORE || "Main Store";

console.log("=== KIOSK FRONTEND DEBUG ===");
console.log("API_BASE:", API_BASE);
console.log("deviceKey:", deviceKey);
console.log("All Vite env:", import.meta.env);
console.log("============================");

export const setKioskDeviceKey = (key) => {
  deviceKey = key;
};

export const setKioskStore = (name) => {
  storeName = name;
};

class KioskApiError extends Error {
  constructor(message, statusCode, errors) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

async function request(path, options = {}) {
  console.log("Sending request to:", `${API_BASE}${path}`);
  console.log("Sending x-kiosk-key:", deviceKey);
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-kiosk-key": deviceKey,
      ...(options.headers || {}),
    },
  });

  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok || !body?.success) {
    throw new KioskApiError(
      body?.message || `Request failed (${res.status})`,
      res.status,
      body?.errors,
    );
  }

  return body.data;
}

// ---------- Menu ----------

export const fetchKioskMenu = () => request("/menu");

export const fetchAddOnsForItem = (menuItemId) =>
  request(`/menu/${menuItemId}/addons`);

// ---------- Tables ----------

export const fetchTables = (store = storeName) =>
  request(`/tables?store=${encodeURIComponent(store)}`);

// ---------- Orders ----------

export const createOrder = (payload) =>
  request("/orders", {
    method: "POST",
    body: JSON.stringify({ store: storeName, ...payload }),
  });

export const fetchOrder = (orderId) => request(`/orders/${orderId}`);

export const cancelOrder = (orderId) =>
  request(`/orders/${orderId}/cancel`, { method: "POST" });

// ---------- Payment ----------

export const fetchUpiQr = (orderId) => request(`/orders/${orderId}/upi-qr`);

export const payOrder = (orderId, payload) =>
  request(`/orders/${orderId}/pay`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export { KioskApiError };
