// ==============================================
// server/src/platform/subscription.js
// One definition of "what state is this restaurant's subscription in",
// shared by the dashboard, restaurants list, renewals and reports so the
// numbers always agree with each other.
// ==============================================

import prisma from "../../prisma/client.js";
import { PLANS } from "../pricing/pricing.plans.js";
import { addDays } from "./platform.utils.js";

export const STATUSES = ["ACTIVE", "TRIAL", "EXPIRING", "EXPIRED", "TRIAL_EXPIRED", "SUSPENDED"];

let planCache = null;
let planCacheAt = 0;

/** code -> PlatformPlan row (falls back to the in-memory PLANS). */
export const getPlanIndex = async () => {
  if (planCache && Date.now() - planCacheAt < 30000) return planCache;
  let rows = [];
  try {
    rows = await prisma.platformPlan.findMany();
  } catch {
    rows = [];
  }
  const index = {};
  for (const r of rows) index[r.code] = r;
  for (const [code, p] of Object.entries(PLANS)) {
    if (!index[code]) {
      index[code] = {
        code,
        name: p.name,
        isTrial: Boolean(p.isFree),
        price: p.tiers?.standard?.price || 0,
        cycle: p.isFree ? "trial" : p.cycle,
        months: p.months || 1,
        isActive: true,
      };
    }
  }
  if (!index.free) index.free = { code: "free", name: "Free trial", isTrial: true, price: 0, cycle: "trial", months: 1 };
  planCache = index;
  planCacheAt = Date.now();
  return index;
};

export const invalidatePlanIndex = () => {
  planCache = null;
};

// A restaurant created without any plan (direct signup, no checkout) is
// treated like a trial: it isn't paying and shouldn't count toward MRR.
export const isTrialPlan = (planIndex, planId) => {
  if (!planId) return true;
  return Boolean(planIndex[planId]?.isTrial);
};

export const orgStatus = (org, planIndex, { reminderDays = 7, now = new Date() } = {}) => {
  if (!org.isActive) return "SUSPENDED";
  const trial = isTrialPlan(planIndex, org.planId);
  const exp = org.planExpiresAt ? new Date(org.planExpiresAt) : null;
  if (exp && exp < now) return trial ? "TRIAL_EXPIRED" : "EXPIRED";
  if (trial) return "TRIAL";
  if (exp && exp <= addDays(now, reminderDays)) return "EXPIRING";
  return "ACTIVE";
};

export const daysLeft = (org, now = new Date()) =>
  org.planExpiresAt ? Math.ceil((new Date(org.planExpiresAt).getTime() - now.getTime()) / 86400000) : null;

/** Monthly recurring value of one org: plan price per branch per month × branches. */
export const orgMrr = (org, planIndex) => {
  const plan = planIndex[org.planId];
  if (!plan || plan.isTrial) return 0;
  return (plan.price || 0) * Math.max(1, org.branchLimit || 1);
};

export const recordEvent = (data) =>
  prisma.platformSubscriptionEvent.create({ data }).catch((err) => {
    console.error("[platform] subscription event write failed:", err.message);
    return null;
  });
