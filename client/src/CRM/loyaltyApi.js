// src/crm/loyaltyApi.js
//
// Loyalty programme API (Settings -> Loyalty). Same rules as crmApi.js: the
// outlet always comes from the session token, never from the page.
import { apiRequest } from "../api/apiClient";

async function request(path, options = {}) {
  const { ok, status, data } = await apiRequest(path, options);
  if (!ok) {
    const err = new Error(data?.error || data?.message || "Request failed");
    err.status = status;
    err.code = data?.code;
    err.data = data;
    throw err;
  }
  return data;
}

const qs = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : "";
};
const json = (method, body) => ({ method, body: JSON.stringify(body ?? {}) });

// Settings
export const getLoyaltySettings = () => request("/settings/modules/loyalty");
export const saveLoyaltySettings = (payload) => request("/settings/modules/loyalty", json("PUT", payload));
export const resetLoyaltySettings = () => request("/settings/modules/loyalty", { method: "DELETE" });

// Programme
export const getLoyaltyOverview = () => request("/crm/loyalty/overview");
export const listLoyaltyTransactions = (params) => request(`/crm/loyalty/transactions${qs(params)}`);

// Per customer
export const getCustomerLoyalty = (customerId) => request(`/crm/customers/${customerId}/loyalty`);
export const adjustPoints = (customerId, payload) => request(`/crm/customers/${customerId}/loyalty/adjust`, json("POST", payload));
export const issueVoucher = (customerId, payload) => request(`/crm/customers/${customerId}/vouchers`, json("POST", payload));

// Vouchers
export const listVouchers = (params) => request(`/crm/loyalty/vouchers${qs(params)}`);
export const cancelVoucher = (voucherId) => request(`/crm/loyalty/vouchers/${voucherId}/cancel`, { method: "PATCH" });

// Bonus point campaigns
export const listCampaigns = () => request("/crm/loyalty/campaigns");
export const createCampaign = (payload) => request("/crm/loyalty/campaigns", json("POST", payload));
export const updateCampaign = (id, payload) => request(`/crm/loyalty/campaigns/${id}`, json("PUT", payload));
export const deleteCampaign = (id) => request(`/crm/loyalty/campaigns/${id}`, { method: "DELETE" });

// Discount coupons (stored as coded discounts, so POS discounts see them too)
export const listCoupons = () => request("/crm/loyalty/coupons");
export const createCoupon = (payload) => request("/crm/loyalty/coupons", json("POST", payload));
export const updateCoupon = (id, payload) => request(`/crm/loyalty/coupons/${id}`, json("PUT", payload));