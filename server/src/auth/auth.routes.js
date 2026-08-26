// ==============================================
// src/auth/auth.routes.js
// ==============================================

import { Router } from "express";
import {
  registerHandler,
  loginHandler,
  selectOutletHandler,
  switchOutletHandler,
  refreshHandler,
  logoutHandler,
  meHandler,
  updateProfileHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  changePasswordHandler,
} from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";
import { validate } from "../middleware/validate.js";
import {
  loginRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
} from "../middleware/rateLimiters.js";
import {
  registerSchema,
  loginSchema,
  selectOutletSchema,
  switchOutletSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "./auth.validation.js";

const router = Router();

// Public Owner self-signup. Role is NOT taken from the body;
// auth.service.js hardcodes OWNER, and staff accounts are created later by
// the logged-in owner via the already-protected /api/employees routes.
//
// No rate limiter on this one by choice. If you ever want it back, the
// pattern is the same as /login below — import a limiter from
// ../middleware/rateLimiters.js and slot it in ahead of validate().
router.post("/register", validate(registerSchema), registerHandler);

// Public — rate limiting + validation added; previously had neither.
router.post("/login", loginRateLimiter, validate(loginSchema), loginHandler);
// Same rate limiter as /login — this is still the login flow, just its
// second step, and carries the same brute-force risk (guessing outletId
// against a stolen/guessed preAuthToken).
router.post(
  "/select-outlet",
  loginRateLimiter,
  validate(selectOutletSchema),
  selectOutletHandler,
);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);
router.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  validate(forgotPasswordSchema),
  forgotPasswordHandler,
);
router.post(
  "/reset-password",
  resetPasswordRateLimiter,
  validate(resetPasswordSchema),
  resetPasswordHandler,
);

// Protected
router.get("/me", requireAuth, meHandler);
// Header outlet-switcher — requires a real, already-valid session, unlike
// /select-outlet above which is only for the login-time picker.
router.post(
  "/switch-outlet",
  requireAuth,
  validate(switchOutletSchema),
  switchOutletHandler,
);
router.put(
  "/me",
  requireAuth,
  validate(updateProfileSchema),
  updateProfileHandler,
);
router.post(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  changePasswordHandler,
);

export default router;