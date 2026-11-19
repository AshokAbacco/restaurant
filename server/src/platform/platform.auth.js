// ==============================================
// server/src/platform/platform.auth.js
// Platform staff authentication. Deliberately separate from the restaurant
// login (src/auth): different table (PlatformAdmin), different token
// `purpose`, different secret. A restaurant access token can never pass
// requirePlatformAuth and a platform token can never pass requireAuth.
// ==============================================

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

import prisma from "../../prisma/client.js";
import { effectivePermissions } from "./platform.permissions.js";
import { getSettings } from "./platform.settings.js";
import { audit } from "./platform.audit.js";
import { handler, ok, str, badRequest, HttpError, clientIp } from "./platform.utils.js";

const SECRET =
  process.env.PLATFORM_JWT_SECRET ||
  `${process.env.JWT_ACCESS_SECRET || "dev-secret"}::platform`;

const PURPOSE = "platform-admin";
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export const publicAdmin = (admin) => ({
  id: admin.id,
  name: admin.name,
  email: admin.email,
  phone: admin.phone,
  role: admin.role,
  isActive: admin.isActive,
  lastLoginAt: admin.lastLoginAt,
  createdAt: admin.createdAt,
  permissions: effectivePermissions(admin),
  permissionOverrides: admin.permissions || {},
});

const signToken = async (admin) => {
  const { sessionHours } = await getSettings("security");
  return jwt.sign(
    { sub: admin.id, purpose: PURPOSE, v: admin.tokenVersion, role: admin.role },
    SECRET,
    { expiresIn: `${Math.max(1, Number(sessionHours) || 12)}h` },
  );
};

// ---- small in-memory cache so each request doesn't cost a DB round-trip ----
const adminCache = new Map();
const CACHE_MS = 30 * 1000;

export const invalidateAdminCache = (id) => {
  if (id) adminCache.delete(id);
  else adminCache.clear();
};

const loadAdmin = async (id) => {
  const hit = adminCache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.admin;
  const admin = await prisma.platformAdmin.findUnique({ where: { id } });
  adminCache.set(id, { admin, at: Date.now() });
  return admin;
};

// ==============================================
// MIDDLEWARE
// ==============================================

export const requirePlatformAuth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: "Platform login required." });
  }

  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    return res.status(401).json({ success: false, message: "Session expired. Please sign in again." });
  }
  if (payload.purpose !== PURPOSE) {
    return res.status(401).json({ success: false, message: "Not a platform session." });
  }

  try {
    const admin = await loadAdmin(payload.sub);
    if (!admin || !admin.isActive || admin.tokenVersion !== payload.v) {
      return res.status(401).json({ success: false, message: "Session is no longer valid." });
    }
    req.platformAdmin = { ...admin, permissionList: effectivePermissions(admin) };

    // lastSeenAt — at most once a minute per admin
    if (!admin.lastSeenAt || Date.now() - new Date(admin.lastSeenAt).getTime() > 60000) {
      admin.lastSeenAt = new Date();
      prisma.platformAdmin
        .update({ where: { id: admin.id }, data: { lastSeenAt: admin.lastSeenAt } })
        .catch(() => {});
    }
    return next();
  } catch (err) {
    return next(err);
  }
};

/** Passes when the admin holds ANY of the given permissions. */
export const can =
  (...keys) =>
  (req, res, next) => {
    const list = req.platformAdmin?.permissionList || [];
    if (keys.some((k) => list.includes(k))) return next();
    return res.status(403).json({
      success: false,
      message: "Your platform role doesn't allow this action.",
    });
  };

export const hasPerm = (req, key) => (req.platformAdmin?.permissionList || []).includes(key);

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ success: false, message: "Too many sign-in attempts. Try again in a few minutes." }),
});

// ==============================================
// HANDLERS
// ==============================================

export const login = handler(async (req, res) => {
  const email = str(req.body?.email, 200).toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) throw badRequest("Email and password are required.");

  const security = await getSettings("security");
  const admin = await prisma.platformAdmin.findUnique({ where: { email } });

  if (!admin) {
    // Same timing as a real compare, so emails can't be enumerated by latency.
    await bcrypt.compare(password, DUMMY_HASH);
    throw new HttpError(401, "Invalid email or password.");
  }
  if (!admin.isActive) throw new HttpError(403, "This platform account has been deactivated.");
  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    throw new HttpError(423, "Account temporarily locked after repeated failed sign-ins. Try again later.");
  }

  const matches = await bcrypt.compare(password, admin.passwordHash);
  if (!matches) {
    const attempts = admin.failedLoginAttempts + 1;
    const lock = attempts >= (Number(security.maxFailedLogins) || 5);
    await prisma.platformAdmin.update({
      where: { id: admin.id },
      data: {
        failedLoginAttempts: lock ? 0 : attempts,
        lockedUntil: lock ? new Date(Date.now() + (Number(security.lockMinutes) || 15) * 60000) : null,
      },
    });
    audit({ platformAdmin: admin, headers: req.headers, socket: req.socket }, "LOGIN_FAILED", {
      entityType: "PlatformAdmin",
      entityId: admin.id,
    });
    throw new HttpError(401, "Invalid email or password.");
  }

  const updated = await prisma.platformAdmin.update({
    where: { id: admin.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastSeenAt: new Date() },
  });
  invalidateAdminCache(admin.id);
  audit({ platformAdmin: updated, headers: req.headers, socket: req.socket }, "LOGIN", {
    entityType: "PlatformAdmin",
    entityId: admin.id,
    metadata: { ip: clientIp(req) },
  });

  return ok(res, { token: await signToken(updated), admin: publicAdmin(updated) });
});

export const me = handler(async (req, res) => ok(res, { admin: publicAdmin(req.platformAdmin) }));

export const updateMe = handler(async (req, res) => {
  const data = {};
  if (req.body?.name !== undefined) {
    const name = str(req.body.name, 120);
    if (!name) throw badRequest("Name can't be empty.");
    data.name = name;
  }
  if (req.body?.phone !== undefined) data.phone = str(req.body.phone, 30) || null;
  const admin = await prisma.platformAdmin.update({ where: { id: req.platformAdmin.id }, data });
  invalidateAdminCache(admin.id);
  return ok(res, { admin: publicAdmin(admin) });
});

export const changePassword = handler(async (req, res) => {
  const current = String(req.body?.currentPassword || "");
  const next = String(req.body?.newPassword || "");
  const { minPasswordLength } = await getSettings("security");
  if (next.length < (Number(minPasswordLength) || 8)) {
    throw badRequest(`New password must be at least ${minPasswordLength} characters.`);
  }
  const admin = await prisma.platformAdmin.findUnique({ where: { id: req.platformAdmin.id } });
  if (!(await bcrypt.compare(current, admin.passwordHash))) {
    throw badRequest("Current password is incorrect.");
  }
  const updated = await prisma.platformAdmin.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(next, 10), tokenVersion: { increment: 1 } },
  });
  invalidateAdminCache(admin.id);
  audit(req, "PASSWORD_CHANGED", { entityType: "PlatformAdmin", entityId: admin.id });
  // Password change logs out every other session; hand this one a fresh token.
  return ok(res, { token: await signToken(updated), message: "Password updated." });
});
