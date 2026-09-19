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

// Mirrors BASE_FEATURES in pricing.jsx. Used on the invoice PDF's "What's
// included" block, so the customer gets a written record of the
// entitlement they paid for. Keep in sync with the frontend copy.
const BASE_FEATURES = [
  "Login Access: owner, manager, cashier, kitchen, waiter",
  "Orders, KOT and table map",
  "Billing with GST invoices",
  "Menu and stock management",
  "Employee management",
];

export const PLANS = {
  free: {
    id: "free",
    name: "Free One Month",
    isFree: true,
    features: [...BASE_FEATURES, "1 branch included", "Email support"],
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
    features: [
      ...BASE_FEATURES,
      "Daily sales and item reports",
      "Phone support, Email 24/7",
    ],
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
    features: [
      ...BASE_FEATURES,
      "Daily sales and item reports",
      "Phone support, Email 24/7",
    ],
  },
};

/** Feature list for a plan id, for the invoice PDF. Never throws. */
export const planFeatures = (planId) => PLANS[planId]?.features || [];

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
      // FIX: this flag was read by pricing.service.js (`if (!quote.isFree)`)
      // but never actually returned, so it was always undefined and the
      // paid-plan email/phone checks ran against the free plan too.
      isFree: true,
      tierKey: null,
      tierLabel: "Free trial",
      cycle: "trial",
      // A free trial is one branch, full stop — an unchecked `branches`
      // value here would hand out a 5-branch entitlement for ₹0.
      branches: 1,
      months: 1,
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
    isFree: false,
    tierKey,
    tierLabel: tier.label,
    cycle: plan.cycle,
    branches: n,
    months: plan.months,
    unit: tier.price,
    subtotal,
    gst,
    total,
  };
};

/**
 * When a plan bought today runs out. Used to stamp
 * Organization.planExpiresAt at registration so the Subscription screen has
 * a real date to show instead of a hardcoded one.
 *
 * The free plan is 30 days; paid plans run for the number of months the
 * plan covers (1 for monthly, 12 for yearly).
 */
export const planExpiryFrom = (quote, startedAt = new Date()) => {
  const expiry = new Date(startedAt);

  if (quote.isFree) {
    expiry.setDate(expiry.getDate() + 30);
    return expiry;
  }

  expiry.setMonth(expiry.getMonth() + (quote.months || 1));
  return expiry;
};