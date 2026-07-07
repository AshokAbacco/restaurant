// ==============================================
// src/auth/auth.middleware.js
// ==============================================

import { verifyAccessToken } from "./jwt.utils.js";

// ==============================================
// requireAuth
// Reads the access token from the Authorization header, verifies it, and
// attaches { id (userAccountId), employeeId, role } to req.user.
// ==============================================

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required." });
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      employeeId: payload.employeeId,
      role: payload.role,
    };

    return next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token." });
  }
};

// ==============================================
// requireRole
// Usage: router.get("/reports", requireAuth, requireRole("OWNER", "MANAGER"), handler)
// Must run after requireAuth.
// ==============================================

export const requireRole =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this resource.",
      });
    }

    return next();
  };
