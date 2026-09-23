// server/src/crm/loyalty.controller.js
import * as loyalty from "./loyalty.service.js";
import { resolveActor } from "./crm.service.js";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

const handle = (fn, fallbackMessage, successStatus = 200) => async (req, res) => {
  try {
    res.status(successStatus).json(await fn(req));
  } catch (err) {
    const status = err.statusCode || 500;
    if (status >= 500) console.error(`[loyalty] ${fallbackMessage}:`, err);
    res.status(status).json({
      message: fallbackMessage,
      error: status >= 500 ? "Something went wrong. Please try again." : err.message,
    });
  }
};

const outlet = (req) => req.tenant.outletId;
const actorName = async (req) => (await resolveActor(req.user)).name;

export const overview = handle((req) => loyalty.getLoyaltyOverview(outlet(req)), "Failed to load loyalty overview");
export const transactions = handle((req) => loyalty.listTransactions(outlet(req), req.query), "Failed to load loyalty history");
export const customerLoyalty = handle((req) => loyalty.getCustomerLoyalty(outlet(req), req.params.id), "Failed to load loyalty");
export const adjust = handle(
  async (req) => loyalty.adjustPoints(outlet(req), req.params.id, req.body, await actorName(req)),
  "Failed to adjust points",
  201,
);

// Converting points into a voucher is something the customer asks for at the
// counter, so any staff member can do it. A free (manual) voucher is a gift
// from the business, so only managers can issue one.
export const createVoucher = handle(async (req) => {
  if (req.body?.mode !== "POINTS" && !MANAGER_ROLES.includes(req.user?.role)) {
    const err = new Error("Only a manager can issue a free voucher.");
    err.statusCode = 403;
    throw err;
  }
  await loyalty.requireLoyalty(outlet(req));
  return loyalty.createVoucher(outlet(req), req.params.id, req.body, await actorName(req));
}, "Failed to create voucher", 201);

export const listVouchers = handle(async (req) => {
  await loyalty.requireLoyalty(outlet(req));
  return loyalty.listVouchers(outlet(req), req.query);
}, "Failed to load vouchers");
export const cancelVoucher = handle(
  async (req) => loyalty.cancelVoucher(outlet(req), req.params.voucherId, await actorName(req)),
  "Failed to cancel voucher",
);

export const listCampaigns = handle(async (req) => {
  await loyalty.requireLoyalty(outlet(req));
  return loyalty.listCampaigns(outlet(req));
}, "Failed to load campaigns");
export const createCampaign = handle((req) => loyalty.createCampaign(outlet(req), req.body), "Failed to create campaign", 201);
export const updateCampaign = handle((req) => loyalty.updateCampaign(outlet(req), req.params.campaignId, req.body), "Failed to update campaign");
export const deleteCampaign = handle((req) => loyalty.deleteCampaign(outlet(req), req.params.campaignId), "Failed to delete campaign");

export const listCoupons = handle((req) => loyalty.listCoupons(outlet(req)), "Failed to load coupons");
export const createCoupon = handle((req) => loyalty.createCoupon(outlet(req), req.body), "Failed to create coupon", 201);
export const updateCoupon = handle((req) => loyalty.updateCoupon(outlet(req), req.params.couponId, req.body), "Failed to update coupon");