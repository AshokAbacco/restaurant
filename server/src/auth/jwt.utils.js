// ==============================================
// src/auth/jwt.utils.js
// ==============================================

import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
// 30 days. NOTE: .env currently sets REFRESH_TOKEN_TTL_DAYS=7, and the env
// value WINS over this default — change it there too or sessions still end
// after a week.
//
// The access token stays short (15m) deliberately. It is the credential sent
// on every request, and keeping it short is what limits the damage of a
// leaked one. Session LENGTH is the refresh token's job: it lives in an
// httpOnly cookie the page's JS cannot read, and revoking its row kills the
// session instantly on logout. Making the ACCESS token 30 days would "fix"
// the logouts by handing every XSS a month-long, unrevokable credential.
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

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
// PRE-AUTH TOKEN (outlet-selection step)
// Issued after a password check succeeds for an account that can access
// more than one outlet (see auth.service.js's login()), instead of a full
// session. Short-lived and single-purpose — it's only good for calling
// POST /api/auth/select-outlet, never accepted by requireAuth. Signed with
// the same secret as the access token (no session state to store), scoped
// with `purpose` so it can't be replayed as a normal access token even if
// someone tried passing it as a Bearer token.
// ==============================================

const PRE_AUTH_TOKEN_TTL = "10m";

export const signPreAuthToken = (payload) => {
  return jwt.sign({ ...payload, purpose: "outlet-selection" }, ACCESS_SECRET, {
    expiresIn: PRE_AUTH_TOKEN_TTL,
  });
};

export const verifyPreAuthToken = (token) => {
  const payload = jwt.verify(token, ACCESS_SECRET);
  if (payload.purpose !== "outlet-selection") {
    // Signed correctly but not what it claims to be — e.g. someone passed
    // a real access token into /select-outlet. Treat exactly like a bad
    // token rather than trusting the payload shape.
    throw new Error("Not a valid outlet-selection token.");
  }
  return payload;
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