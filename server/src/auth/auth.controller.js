// ==============================================
// src/auth/auth.controller.js
// ==============================================

import * as authService from "./auth.service.js";
import { REFRESH_TOKEN_TTL_MS } from "./jwt.utils.js";

const REFRESH_COOKIE_NAME = "refresh_token";

const isProd = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProd, // requires HTTPS in production
  sameSite: isProd ? "strict" : "lax",
  path: "/api/auth", // only sent to auth endpoints
  maxAge: REFRESH_TOKEN_TTL_MS,
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

export const meHandler = async (req, res) => {
  const result = await authService.getCurrentUser(req.user.id);

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
