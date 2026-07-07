// ==============================================
// src/auth/auth.routes.js
// ==============================================

import { Router } from "express";
import {
  loginHandler,
  refreshHandler,
  logoutHandler,
  meHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  changePasswordHandler,
} from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";

const router = Router();

// Public
router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);
router.post("/forgot-password", forgotPasswordHandler);
router.post("/reset-password", resetPasswordHandler);

// Protected
router.get("/me", requireAuth, meHandler);
router.post("/change-password", requireAuth, changePasswordHandler);

export default router;
