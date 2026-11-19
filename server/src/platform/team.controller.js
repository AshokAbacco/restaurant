// ==============================================
// server/src/platform/team.controller.js
// /api/platform/team — platform staff accounts, roles and permissions.
// ==============================================

import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../../prisma/client.js";
import { ROLES, PERMISSIONS, ROLE_DEFAULTS } from "./platform.permissions.js";
import { publicAdmin, invalidateAdminCache } from "./platform.auth.js";
import { getAllSettings } from "./platform.settings.js";
import { sendMail, esc } from "../config/mailer.js";
import { audit } from "./platform.audit.js";
import { handler, ok, str, notFound, badRequest, oneOf, bool } from "./platform.utils.js";

const ROLE_KEYS = ROLES.map((r) => r.key);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const tempPassword = () => `${crypto.randomBytes(6).toString("base64url")}#${crypto.randomInt(10, 99)}`;

const ensureSuperAdminRemains = async (excludingId) => {
  const others = await prisma.platformAdmin.count({
    where: { role: "SUPER_ADMIN", isActive: true, id: { not: excludingId } },
  });
  if (!others) throw badRequest("There must always be at least one active super admin.");
};

export const meta = handler(async (req, res) => ok(res, { roles: ROLES, permissions: PERMISSIONS, roleDefaults: ROLE_DEFAULTS }));

export const list = handler(async (req, res) => {
  const [admins, fu, convos] = await Promise.all([
    prisma.platformAdmin.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "asc" }] }),
    prisma.platformFollowUp.groupBy({ by: ["assignedToId"], where: { status: { in: ["PENDING", "IN_PROGRESS"] } }, _count: { _all: true } }),
    prisma.platformConversation.groupBy({ by: ["assignedToId"], where: { status: { in: ["OPEN", "PENDING"] } }, _count: { _all: true } }),
  ]);
  const fuMap = Object.fromEntries(fu.map((r) => [r.assignedToId, r._count._all]));
  const cMap = Object.fromEntries(convos.map((r) => [r.assignedToId, r._count._all]));
  return ok(res, {
    team: admins.map((a) => ({
      ...publicAdmin(a),
      lastSeenAt: a.lastSeenAt,
      openFollowUps: fuMap[a.id] || 0,
      openConversations: cMap[a.id] || 0,
    })),
  });
});

/** Short list for "assign to" dropdowns — available to anyone signed in. */
export const options = handler(async (req, res) => {
  const admins = await prisma.platformAdmin.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  return ok(res, { options: admins });
});

export const create = handler(async (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 120);
  const email = str(b.email, 200).toLowerCase();
  if (!name) throw badRequest("Name is required.");
  if (!EMAIL_RE.test(email)) throw badRequest("Enter a valid email.");
  const role = oneOf(b.role, ROLE_KEYS, "SUPPORT");
  const { minPasswordLength } = (await getAllSettings()).security;
  let password = String(b.password || "");
  const generated = !password;
  if (generated) password = tempPassword();
  if (password.length < minPasswordLength) throw badRequest(`Password must be at least ${minPasswordLength} characters.`);

  const admin = await prisma.platformAdmin.create({
    data: {
      name,
      email,
      phone: str(b.phone, 30) || null,
      role,
      permissions: b.permissions && typeof b.permissions === "object" ? b.permissions : undefined,
      passwordHash: await bcrypt.hash(password, 10),
      createdById: req.platformAdmin.id,
    },
  });

  let emailed = false;
  if (bool(b.sendInvite, true)) {
    const settings = await getAllSettings();
    const loginUrl = `${(process.env.CLIENT_ORIGIN || "").replace(/\/+$/, "")}/platform/login`;
    const r = await sendMail({
      to: email,
      subject: `You've been added to the ${settings.general.platformName} platform team`,
      text: `Hi ${name},\n\nYou now have ${role} access to the platform admin.\n\nSign in: ${loginUrl}\nEmail: ${email}\nTemporary password: ${password}\n\nPlease change your password after signing in.`,
      html: `<p>Hi ${esc(name)},</p><p>You now have <b>${esc(role)}</b> access to the platform admin.</p><p>Sign in: <a href="${esc(loginUrl)}">${esc(loginUrl)}</a><br/>Email: ${esc(email)}<br/>Temporary password: <code>${esc(password)}</code></p><p>Please change your password after signing in.</p>`,
    }).catch(() => ({ skipped: true }));
    emailed = !r?.skipped;
  }

  audit(req, "TEAM_MEMBER_CREATED", { entityType: "PlatformAdmin", entityId: admin.id, metadata: { email, role } });
  return ok(res, { admin: publicAdmin(admin), temporaryPassword: generated ? password : undefined, emailed }, 201);
});

export const update = handler(async (req, res) => {
  const existing = await prisma.platformAdmin.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Team member not found.");
  const b = req.body || {};
  const self = existing.id === req.platformAdmin.id;
  const data = {};
  if (b.name !== undefined) data.name = str(b.name, 120) || existing.name;
  if (b.phone !== undefined) data.phone = str(b.phone, 30) || null;
  if (b.role !== undefined) {
    const role = oneOf(b.role, ROLE_KEYS, existing.role);
    if (role !== existing.role) {
      if (self) throw badRequest("You can't change your own role.");
      if (existing.role === "SUPER_ADMIN") await ensureSuperAdminRemains(existing.id);
      data.role = role;
      data.tokenVersion = { increment: 1 };
    }
  }
  if (b.permissions !== undefined) {
    data.permissions = b.permissions && typeof b.permissions === "object" ? b.permissions : {};
  }
  if (b.isActive !== undefined) {
    const active = bool(b.isActive);
    if (!active && self) throw badRequest("You can't deactivate yourself.");
    if (!active && existing.role === "SUPER_ADMIN") await ensureSuperAdminRemains(existing.id);
    data.isActive = active;
    if (!active) data.tokenVersion = { increment: 1 };
  }
  const admin = await prisma.platformAdmin.update({ where: { id: existing.id }, data });
  invalidateAdminCache(existing.id);
  audit(req, "TEAM_MEMBER_UPDATED", { entityType: "PlatformAdmin", entityId: existing.id, metadata: { ...b, password: undefined } });
  return ok(res, { admin: publicAdmin(admin) });
});

export const resetPassword = handler(async (req, res) => {
  const existing = await prisma.platformAdmin.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Team member not found.");
  const password = String(req.body?.password || "") || tempPassword();
  const { minPasswordLength } = (await getAllSettings()).security;
  if (password.length < minPasswordLength) throw badRequest(`Password must be at least ${minPasswordLength} characters.`);
  await prisma.platformAdmin.update({
    where: { id: existing.id },
    data: { passwordHash: await bcrypt.hash(password, 10), tokenVersion: { increment: 1 }, failedLoginAttempts: 0, lockedUntil: null },
  });
  invalidateAdminCache(existing.id);
  audit(req, "TEAM_PASSWORD_RESET", { entityType: "PlatformAdmin", entityId: existing.id });
  return ok(res, { temporaryPassword: req.body?.password ? undefined : password });
});

export const remove = handler(async (req, res) => {
  const existing = await prisma.platformAdmin.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Team member not found.");
  if (existing.id === req.platformAdmin.id) throw badRequest("You can't delete yourself.");
  if (existing.role === "SUPER_ADMIN") await ensureSuperAdminRemains(existing.id);
  await prisma.platformAdmin.delete({ where: { id: existing.id } });
  invalidateAdminCache(existing.id);
  audit(req, "TEAM_MEMBER_DELETED", { entityType: "PlatformAdmin", entityId: existing.id, metadata: { email: existing.email } });
  return ok(res, { deleted: true });
});
