// ==============================================
// src/auth/jwt.utils.js
// ==============================================

import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7);

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  // Fail loudly at boot rather than silently signing tokens with `undefined`
  throw new Error(
    "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in the environment",
  );
}

// ==============================================
// ACCESS TOKEN (short-lived, sent in Authorization header / memory)
// ==============================================

export const signAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET);
};

// ==============================================
// REFRESH TOKEN (long-lived, httpOnly cookie)
// The raw token goes to the client; only its SHA-256 hash is stored in DB
// (in the RefreshToken table) so a DB leak alone doesn't leak usable tokens.
// ==============================================

export const REFRESH_TOKEN_TTL_MS =
  REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

export const generateRefreshToken = () =>
  crypto.randomBytes(48).toString("hex");

export const hashToken = (rawToken) =>
  crypto.createHash("sha256").update(rawToken).digest("hex");

// ==============================================
// PASSWORD RESET TOKEN (shorter-lived, emailed, single-use)
// ==============================================

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const generateResetToken = () => crypto.randomBytes(32).toString("hex");
