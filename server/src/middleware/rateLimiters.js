// server/src/middleware/rateLimiters.js
//
// express-rate-limit was already a dependency but wasn't wired up
// anywhere — meaning /auth/login, /auth/forgot-password, and
// /auth/reset-password had zero rate limiting of their own. auth.service.js
// already locks an ACCOUNT after 5 failed attempts (see
// MAX_FAILED_ATTEMPTS), but that's per-account — nothing stopped someone
// from hammering different usernames/emails from one IP, or spamming the
// forgot-password endpoint to mass-trigger reset emails.
import rateLimit from "express-rate-limit";

const jsonRateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: "Too many attempts. Please wait a few minutes and try again.",
  });
};

// 10 attempts per 15 minutes per IP — generous enough for a real user who
// mistypes a password a few times, tight enough to blunt credential
// stuffing / brute force from a single source.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// Forgot-password sends a real email (or logs one in dev) per request —
// tighter limit so this can't be used to spam a target's inbox or probe
// which emails are registered via timing.
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// Reset-password is already gated by a single-use, 30-minute emailed
// token (see jwt.utils.js's RESET_TOKEN_TTL_MS) — this limit exists mainly
// to slow down token-guessing attempts.
export const resetPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});
