// ==============================================
// server/src/pricing/pricing.plans.js
// ==============================================
// SINGLE SOURCE OF TRUTH for what each plan costs, on the SERVER.
//
// The frontend (client/src/Landing/pricing.jsx) has its own copy of this
// table purely for rendering the pricing cards — it must NEVER be trusted
// for the amount actually charged. Every order-creation request re-derives
// the amount here from planId/tierKey/branches/billingCycle, so a tampered
// client request (e.g. changing `total` in devtools) cannot change what
// Razorpay is asked to collect.
//
// Keep this in sync with the `PLANS` object in pricing.jsx whenever prices
// change.
// ==============================================

export const GST_RATE = 0.18; // 18%

export const PLANS = {
  free: {
    id: "free",
    name: "Free One Month",
    isFree: true,
  },
  monthly: {
    id: "monthly",
    name: "Monthly",
    cycle: "month",
    months: 1,
    tiers: {
      standard: { label: "Standard", price: 650 },
      custom: { label: "Custom", price: 650 },
    },
  },
  yearly: {
    id: "yearly",
    name: "Year",
    cycle: "year",
    months: 12,
    tiers: {
      standard: { label: "Standard", price: 550 },
      custom: { label: "Custom", price: 550 },
    },
  },
};

/**
 * Recomputes the payable amount server-side from raw selection inputs.
 * Throws a descriptive Error for anything that doesn't resolve to a real
 * plan/tier combination — callers should turn that into a 400 response.
 *
 * Returns amounts in whole rupees (not paise); the caller multiplies by
 * 100 for Razorpay.
 */
export const priceQuote = ({ planId, tierKey, branches }) => {
  const plan = PLANS[planId];
  if (!plan) {
    throw new Error(`Unknown planId "${planId}".`);
  }

  if (plan.isFree) {
    return {
      planId,
      planName: plan.name,
      tierKey: null,
      tierLabel: "Free trial",
      cycle: "trial",
      branches: 1,
      unit: 0,
      subtotal: 0,
      gst: 0,
      total: 0,
    };
  }

  const tier = plan.tiers[tierKey];
  if (!tier) {
    throw new Error(`Unknown tier "${tierKey}" for plan "${planId}".`);
  }

  const n = Math.max(1, Math.min(50, Number(branches) || 1));
  const subtotal = tier.price * n * plan.months;
  const gst = Math.round(subtotal * GST_RATE);
  const total = subtotal + gst;

  return {
    planId,
    planName: plan.name,
    tierKey,
    tierLabel: tier.label,
    cycle: plan.cycle,
    branches: n,
    unit: tier.price,
    subtotal,
    gst,
    total,
  };
};
