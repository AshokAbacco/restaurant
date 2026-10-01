// ==============================================
// src/auth/authService.js
// Restaurant ERP Authentication Service (backend-integrated)
// ==============================================

import { jwtDecode } from "jwt-decode";
import {
  apiRequest,
  setAccessToken,
  getAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearSession,
  refreshAccessToken,
} from "../api/apiClient";

// ==============================================
// REGISTER (public Owner signup)
// Deliberately does NOT set an access token on success — the backend
// doesn't issue one (see auth.controller.js's registerHandler). Registration
// and login stay separate steps, so the caller should route the new owner to
// /login rather than treating this as an authenticated session.
// ==============================================

const register = async (payload) => {
  const { ok, data } = await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!ok || !data?.success) {
    return {
      success: false,
      message: data?.message || "Registration failed. Please try again.",
      // validate.js returns a per-field issue list on a 400 — pass it
      // through so the form can highlight the specific offending input
      // instead of only showing one generic message.
      errors: data?.errors || [],
    };
  }

  return { success: true, message: data.message, owner: data.owner };
};

// ==============================================
// PRICING PAYMENT LOOKUP (Register page prefill)
// Goes through apiRequest — and therefore through apiClient's BASE_URL —
// rather than reusing landing/pages/pricingApi.js, which has a different
// fallback base URL ("" vs "http://localhost:5001/api"). Two base URLs for
// the same backend is exactly the kind of thing that works in dev and
// silently 404s in one place after deploy.
//
// Returns the completed payment behind `paymentId`, or a failure. Anything
// that isn't a PAID record 404s server-side (see pricing.service.js's
// getPaymentRecord), so a cancelled checkout can't be walked past.
// ==============================================

const fetchPricingPayment = async (paymentId) => {
  const { ok, data } = await apiRequest(
    `/pricing/payments/${encodeURIComponent(paymentId)}`,
    { method: "GET" },
    // The Register page is public — there's no session to refresh, and
    // attempting one would fire a pointless 401 on every visit.
    { skipRefresh: true },
  );

  if (!ok || !data?.success) {
    return {
      success: false,
      message:
        data?.message ||
        "We couldn't find a completed payment for this reference.",
    };
  }

  return { success: true, payment: data.payment };
};

// ==============================================
// LOGIN
// FEATURE (multi-tenancy): the backend now supports two shapes here.
// Most logins (single-outlet staff) get the old shape straight back:
// { success: true, accessToken, user }. An OWNER/ADMIN on a
// multi-outlet organization instead gets
// { success: true, requiresOutletSelection: true, preAuthToken, outlets }
// — no accessToken yet, since there's no real session until an outlet is
// picked. Callers (AuthContext.login) need to check for
// requiresOutletSelection and route to the picker instead of navigating
// straight to the dashboard.
// ==============================================

const login = async (identifier, password) => {
  const { ok, data } = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });

  if (!ok || !data?.success) {
    return {
      success: false,
      message: data?.message || "Invalid email or password",
    };
  }

  if (data.requiresOutletSelection) {
    return {
      success: true,
      requiresOutletSelection: true,
      preAuthToken: data.preAuthToken,
      outlets: data.outlets,
    };
  }

  // Fallback copy for browsers that block the refresh cookie — see
  // apiClient.js. Older servers don't send it; that's fine.
  if (data.refreshToken) setRefreshToken(data.refreshToken);
  setAccessToken(data.accessToken);

  return { success: true, token: data.accessToken, user: data.user };
};

// ==============================================
// SELECT OUTLET
// Second step of login, only called when login() above returned
// requiresOutletSelection: true. Finishes the session exactly like a
// normal login once an outlet is chosen.
// ==============================================

const selectOutlet = async (preAuthToken, outletId) => {
  const { ok, data } = await apiRequest("/auth/select-outlet", {
    method: "POST",
    body: JSON.stringify({ preAuthToken, outletId }),
  });

  if (!ok || !data?.success) {
    return {
      success: false,
      message: data?.message || "Unable to select that outlet.",
    };
  }

  // Fallback copy for browsers that block the refresh cookie — see
  // apiClient.js. Older servers don't send it; that's fine.
  if (data.refreshToken) setRefreshToken(data.refreshToken);
  setAccessToken(data.accessToken);

  return { success: true, token: data.accessToken, user: data.user };
};

// ==============================================
// LOGOUT
// ==============================================

const logout = async () => {
  // Send the stored refresh token too, so the server can revoke it even on
  // browsers that never sent the cookie. Clear local tokens no matter what —
  // a network error must not leave the user "half logged in".
  try {
    await apiRequest(
      "/auth/logout",
      {
        method: "POST",
        body: JSON.stringify(
          getRefreshToken() ? { refreshToken: getRefreshToken() } : {},
        ),
      },
      { skipRefresh: true },
    );
  } catch (err) {
    console.warn("Logout request failed; clearing local session anyway.", err);
  } finally {
    clearSession();
  }
};

// ==============================================
// SESSION RESTORE
// Called on app load. Tries a silent refresh first (the refresh cookie may
// still be valid even though we have no access token in memory yet), then
// fetches the current user.
//
// FIX: a genuine connectivity failure here (fetch() itself throwing, e.g.
// offline) used to be indistinguishable from the server actually
// rejecting the session — both fell through to setAccessToken(null) +
// logged-out. That meant a hard reload while offline permanently lost the
// session, which defeats the whole point of offline mode for POS/Kitchen/
// Menu: those pages need the user to still be "logged in" (so
// ProtectedRoute/RoleGuard let them through) using only what's already on
// the device. Now a network failure specifically falls back to decoding
// the locally-stored access token instead of logging the user out —
// enough to restore role/employee id for route-gating, even though the
// full profile (name/email/etc.) won't be available again until the next
// successful /auth/me call.
// ==============================================

const restoreSession = async () => {
  // THE 15-MINUTE LOGOUT LIVED HERE.
  //
  // This used to `return null` whenever there was no access token in memory,
  // which reads as "not logged in". But the access token is deliberately
  // short-lived (15m) while the refresh COOKIE is good for 30 days — so "no
  // access token" is the normal state after a short break, not a logged-out
  // one. Any single failed refresh also nulls the token, and from then on
  // this early return meant the app never asked again: permanently logged
  // out with a perfectly valid 30-day cookie sitting in the browser.
  //
  // The cookie is httpOnly, so JS cannot look at it. The only way to find out
  // whether the session is alive is to attempt the refresh.
  if (!getAccessToken()) {
    try {
      const refreshed = await refreshAccessToken();
      if (!refreshed) return null; // genuinely no session — server rejected it
    } catch {
      // Network failure / server error, not a rejection. Nothing cached to
      // fall back on (no access token at all), so we can't restore now.
      return null;
    }
  }

  try {
    const { ok, status, data } = await apiRequest("/auth/me");

    if (!ok || !data?.success) {
      // FIX: this used to log the user out on ANY non-OK /auth/me — a 500
      // during a deploy or a DB hiccup on page reload was enough. apiRequest
      // has already tried a refresh on 401, so a 401/403 here is a genuine
      // rejection (revoked / deactivated). Anything else is temporary: keep
      // the session and restore what the token itself tells us.
      if (status === 401 || status === 403) {
        clearSession();
        return null;
      }
      const user = decodeAccessTokenOffline({ allowExpired: true });
      return user ? { user, outlets: [] } : null;
    }

    // FEATURE (multi-tenancy): /auth/me now also returns the account's
    // full outlet list (for the switcher) alongside the user — see
    // auth.service.js's getCurrentUser. Callers that only care about the
    // user (most of them) can keep destructuring { user } and ignore
    // outlets; AuthContext uses both.
    return { user: data.user, outlets: data.outlets || [] };
  } catch (err) {
    // fetch() itself threw — no connectivity, not a server rejection.
    // Don't log the user out just because we can't reach the server
    // right now; fall back to what the token itself already tells us.
    //
    // allowExpired: the token may have expired while offline/unreachable,
    // but we still hold a refresh token, so the session isn't over — the
    // server will renew (or genuinely reject) it as soon as it's reachable.
    const user = decodeAccessTokenOffline({
      allowExpired: Boolean(getRefreshToken()),
    });
    return user ? { user, outlets: [] } : null;
  }
};

// Decodes the locally-stored JWT without verifying its signature (there's
// no way to verify offline anyway — that's the server's job, and it still
// will, on the next successful request). This is a BEST-EFFORT fallback
// specifically for "let a previously-logged-in user keep using the app
// while offline," not a security boundary — every real write still goes
// through the server, which independently verifies the token there.
function decodeAccessTokenOffline({ allowExpired = false } = {}) {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const payload = jwtDecode(token);

    // Respect the token's own expiry — an expired token shouldn't be
    // trusted just because we're offline and can't ask the server.
    if (!allowExpired && payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      id: payload.employeeId,
      userAccountId: payload.sub,
      role: payload.role,
      // Not present in the JWT payload — unavailable until the next
      // successful /auth/me. Components reading these should treat an
      // empty string the same as "not loaded yet", same as any other
      // still-loading field.
      name: "",
      email: "",
      username: "",
      offlineRestored: true,
    };
  } catch {
    return null;
  }
}
// ==============================================
// SWITCH OUTLET
// Used from an already-authenticated session (the header switcher), as
// opposed to selectOutlet() above which is only for the login-time picker
// (it needs a preAuthToken since no real session exists yet at that
// point). This hits a separate endpoint that authenticates normally via
// the existing access token instead.
// ==============================================

const switchOutlet = async (outletId) => {
  const { ok, data } = await apiRequest("/auth/switch-outlet", {
    method: "POST",
    body: JSON.stringify({ outletId }),
  });

  if (!ok || !data?.success) {
    return {
      success: false,
      message: data?.message || "Unable to switch outlet.",
    };
  }

  // Fallback copy for browsers that block the refresh cookie — see
  // apiClient.js. Older servers don't send it; that's fine.
  if (data.refreshToken) setRefreshToken(data.refreshToken);
  setAccessToken(data.accessToken);

  return { success: true, token: data.accessToken, user: data.user };
};

// ==============================================
// CURRENT USER / TOKEN (in-memory only)
// ==============================================

const getToken = () => getAccessToken();

const isAuthenticated = () => !!getAccessToken();

// ==============================================
// UPDATE PROFILE
// FEATURE: powers the Profile page's Edit mode. payload can include any of
// fullName, gender, mobile, dob, emergencyContact, photoUrl, and address
// ({ houseNo, street, city, state, pincode }) — see auth.service.js's
// EDITABLE_EMPLOYEE_FIELDS for exactly what the backend accepts.
// ==============================================

const updateProfile = async (payload) => {
  const { ok, data } = await apiRequest("/auth/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!ok || !data?.success) {
    return {
      success: false,
      message: data?.message || "Unable to update profile.",
    };
  }

  return { success: true, user: data.user };
};

// ==============================================
// CHANGE PASSWORD
// ==============================================

const changePassword = async (currentPassword, newPassword) => {
  const { ok, data } = await apiRequest("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!ok || !data?.success) {
    return {
      success: false,
      message: data?.message || "Unable to change password.",
    };
  }

  return { success: true, message: data.message };
};

// ==============================================
// FORGOT PASSWORD
// ==============================================

const forgotPassword = async (email) => {
  const { ok, data } = await apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  if (!ok) {
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }

  return { success: true, message: data?.message };
};

// ==============================================
// RESET PASSWORD
// ==============================================

const resetPassword = async (token, password) => {
  const { ok, data } = await apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });

  if (!ok || !data?.success) {
    return {
      success: false,
      message: data?.message || "Unable to reset password.",
    };
  }

  return { success: true, message: data.message };
};

// ==============================================
// EXPORT
// ==============================================

const authService = {
  register,
  fetchPricingPayment,
  login,
  selectOutlet,
  switchOutlet,
  logout,
  restoreSession,
  getToken,
  isAuthenticated,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};

export default authService;