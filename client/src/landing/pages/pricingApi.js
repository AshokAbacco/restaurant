// ==============================================
// client/src/Landing/pricingApi.js
// ==============================================
// Thin fetch wrapper for the three endpoints the Pricing page needs.
// Kept separate from pricing.jsx so the component stays focused on UI.
//
// VITE_API_BASE_URL should point at the backend, e.g.
//   VITE_API_BASE_URL=http://localhost:5001
// Leave it unset (falls back to "") if the frontend is served from the
// same origin as the API, or proxied through Vite's dev server.

const API_BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // credentials: "include",
    ...options,
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const message = body?.message || "Something went wrong. Please try again.";
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return body;
}

/**
 * Creates a PricingPayment row + (for paid plans) a Razorpay order.
 * For the free plan this returns { isFree: true, paymentRecordId } with no
 * Razorpay order at all.
 */
export const createPricingOrder = ({ planId, tierKey, branches, contact }) =>
  request("/pricing/create-order", {
    body: JSON.stringify({ planId, tierKey, branches, contact }),
  });

/**
 * Confirms a completed Razorpay checkout with the backend. This is the step
 * that actually proves the payment happened — never treat Razorpay's
 * in-browser `handler` callback alone as proof of payment.
 */
export const verifyPricingPayment = ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) =>
  request("/pricing/verify-payment", {
    body: JSON.stringify({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }),
  });

/**
 * Looks up a payment record by id — useful if the Register page wants to
 * re-confirm a payment (e.g. after a refresh) rather than trusting
 * whatever was passed in router state.
 */
export const getPricingPayment = (id) =>
  request(`/pricing/payments/${id}`, { method: "GET" });
