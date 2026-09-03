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
const cookieOptions = {
  httpOnly: true,
  secure: isProd, // required by SameSite=None, and correct in prod anyway
  sameSite: isProd ? "none" : "lax",
  path: "/api/auth", // only sent to auth endpoints
  maxAge: REFRESH_TOKEN_TTL_MS,
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
  });
};

// ==============================================
// POST /api/auth/refresh
// ==============================================

export const refreshHandler = async (req, res) => {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  const result = await authService.refreshAccessToken(rawRefreshToken);

  if (!result.success) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
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
    user: result.user,
  });
};

// ==============================================
// POST /api/auth/logout
// ==============================================

export const logoutHandler = async (req, res) => {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  await authService.logout(rawRefreshToken);

  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });

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