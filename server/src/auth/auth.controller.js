// ==============================================
// src/auth/auth.controller.js
// ==============================================

import * as authService from "./auth.service.js";
import { REFRESH_TOKEN_TTL_MS } from "./jwt.utils.js";

const REFRESH_COOKIE_NAME = "refresh_token";

const isProd = process.env.NODE_ENV === "production";

// sameSite was "strict" in production. That works only while the app and the
// API share a site. Deployed on Render they don't: onrender.com is on the
// Public Suffix List, so app.onrender.com and api.onrender.com are different
// SITES, and a Strict/Lax cookie is never attached to a cross-site fetch.
// POST /api/auth/refresh then arrives with no cookie, returns 401, and the
// user is logged out the moment the access token expires.
//
// "none" is what a cross-site session cookie requires, and browsers only
// honour None together with Secure. Still httpOnly, still scoped to
// /api/auth. Locally NODE_ENV=development keeps "lax", which is correct
// because localhost:5173 and localhost:5001 ARE the same site.
//
// If you later serve the API and app from one domain, "lax" becomes the
// stricter and better choice — this follows the deployment shape.
const baseCookieOptions = {
  httpOnly: true,
  secure: isProd, // required by SameSite=None, and correct in prod anyway
  sameSite: isProd ? "none" : "lax",
  path: "/api/auth", // only sent to auth endpoints
};

const cookieOptions = {
  ...baseCookieOptions,
  maxAge: REFRESH_TOKEN_TTL_MS,
};

// FIX (logout not clearing the cookie in production): clearCookie() was
// called with only { path }. A browser only overwrites a cookie whose
// attributes match, and a cross-site response cookie without
// SameSite=None; Secure is rejected outright — so in production the
// "clear" was silently ignored. Use the same attributes it was set with.
const clearRefreshCookie = (res) =>
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions);

// FIX (automatic logouts every few minutes): the session used to depend
// ENTIRELY on the refresh cookie reaching POST /api/auth/refresh. That
// cookie has to be SameSite=None (cross-site, see above), and cross-site
// ("third-party") cookies are blocked by Safari / every iPad & iPhone
// browser (ITP), by Chrome in incognito, and by Chrome/Brave/Firefox when
// third-party cookies are switched off. On those devices the cookie is
// never sent, /refresh returns 401 the first time the short-lived access
// token expires, and the user is thrown out — every ACCESS_TOKEN_TTL.
//
// The refresh token is now ALSO returned in the response body. The client
// keeps it and sends it in the /refresh body only as a fallback when the
// cookie didn't arrive. It's the same server-side token — still hashed in
// the DB, still revoked on logout, still re-checked (account active,
// outlet active, not expired) on every refresh.
const readRefreshTokens = (req) => {
  const fromCookie = req.cookies?.[REFRESH_COOKIE_NAME] || null;
  const fromBody =
    typeof req.body?.refreshToken === "string" && req.body.refreshToken
      ? req.body.refreshToken
      : null;
  // Cookie first; body only if it's a different token.
  return [fromCookie, fromBody].filter(
    (t, i, all) => t && all.indexOf(t) === i,
  );
};

// ==============================================
// POST /api/auth/register
// Public Owner signup. Note that no refresh cookie is set and no
// accessToken is returned — registration does not log the user in. They're
// sent to the existing Login page afterwards, so there's exactly one code
// path that creates a session.
// ==============================================

export const registerHandler = async (req, res) => {
  const result = await authService.registerOwner(req.body);

  if (!result.success) {
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }

  return res.status(201).json({
    success: true,
    message: result.message,
    owner: result.owner,
    plan: result.plan,
  });
};

// ==============================================
// POST /api/auth/login
// ==============================================

export const loginHandler = async (req, res) => {
  const { identifier, email, password } = req.body;

  const result = await authService.login(identifier || email, password);

  if (!result.success) {
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }

  // Account has access to more than one outlet — no full session yet.
  // Don't set the refresh cookie until POST /api/auth/select-outlet
  // confirms which outlet this session is for.
  if (result.requiresOutletSelection) {
    return res.status(200).json({
      success: true,
      requiresOutletSelection: true,
      preAuthToken: result.preAuthToken,
      outlets: result.outlets,
    });
  }

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);

  return res.status(200).json({
    success: true,
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
};

// ==============================================
// POST /api/auth/select-outlet
// Second step of login, only reached when loginHandler above responded
// with requiresOutletSelection: true.
// ==============================================

export const selectOutletHandler = async (req, res) => {
  const { preAuthToken, outletId } = req.body;

  const result = await authService.selectOutlet(preAuthToken, outletId);

  if (!result.success) {
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);

  return res.status(200).json({
    success: true,
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
};

// ==============================================
// POST /api/auth/refresh
// ==============================================

export const refreshHandler = async (req, res) => {
  const candidates = readRefreshTokens(req);

  let result = {
    success: false,
    status: 401,
    message: "No refresh token provided.",
  };
  let rawRefreshToken = null;

  // A browser can hold a stale cookie (e.g. from before an outlet switch)
  // while the client has the current token, or vice versa — try each.
  for (const candidate of candidates) {
    result = await authService.refreshAccessToken(candidate);
    if (result.success) {
      rawRefreshToken = candidate;
      break;
    }
  }

  if (!result.success) {
    clearRefreshCookie(res);
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }

  // Slide the window forward on every refresh. Without this the session died
  // exactly N days after LOGIN however much it was used — someone on the till
  // daily would still be thrown out mid-shift. Re-issuing the cookie (and the
  // DB row's expiry, in the service) makes it N days of INACTIVITY, which is
  // what "stay logged in until Logout is pressed" means in practice.
  res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, cookieOptions);

  return res.status(200).json({
    success: true,
    accessToken: result.accessToken,
    refreshToken: rawRefreshToken,
    user: result.user,
  });
};

// ==============================================
// POST /api/auth/logout
// ==============================================

export const logoutHandler = async (req, res) => {
  // Revoke every token this browser presented (cookie and/or body).
  for (const token of readRefreshTokens(req)) {
    await authService.logout(token);
  }

  clearRefreshCookie(res);

  return res.status(200).json({ success: true });
};

// ==============================================
// GET /api/auth/me
// ==============================================

// ==============================================
// POST /api/auth/switch-outlet
// Requires an already-valid session (requireAuth) — the header switcher's
// endpoint, distinct from /select-outlet's login-time picker.
// ==============================================

export const switchOutletHandler = async (req, res) => {
  const { outletId } = req.body;

  const result = await authService.switchOutlet(req.user.id, outletId);

  if (!result.success) {
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);

  return res.status(200).json({
    success: true,
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
};

export const meHandler = async (req, res) => {
  const result = await authService.getCurrentUser(req.user.id, req.user.outletId);

  if (!result.success) {
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }

  return res
    .status(200)
    .json({ success: true, user: result.user, outlets: result.outlets });
};

// ==============================================
// PUT /api/auth/me
// FEATURE: self-service profile edit — powers the Profile page's Edit
// mode. req.user.id is the UserAccount id (see auth.middleware.js), same
// one every other handler here uses.
// ==============================================

export const updateProfileHandler = async (req, res) => {
  const result = await authService.updateProfile(
    req.user.id,
    req.body,
    req.user.outletId,
  );

  if (!result.success) {
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }

  return res.status(200).json({ success: true, user: result.user });
};

// ==============================================
// POST /api/auth/forgot-password
// ==============================================

export const forgotPasswordHandler = async (req, res) => {
  const { email } = req.body;

  const resetUrlBase = `${process.env.CLIENT_ORIGIN}/reset-password`;

  const result = await authService.forgotPassword(email, resetUrlBase);

  return res.status(200).json(result);
};

// ==============================================
// POST /api/auth/reset-password
// ==============================================

export const resetPasswordHandler = async (req, res) => {
  const { token, password } = req.body;

  const result = await authService.resetPassword(token, password);

  if (!result.success) {
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }

  return res.status(200).json(result);
};

// ==============================================
// POST /api/auth/change-password
// ==============================================

export const changePasswordHandler = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const result = await authService.changePassword(
    req.user.id,
    currentPassword,
    newPassword,
  );

  if (!result.success) {
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }

  return res.status(200).json(result);
};