// ==============================================
// src/auth/auth.service.js
// ==============================================

import bcrypt from "bcrypt";
import prisma from "../../prisma/client.js";
import {
  signAccessToken,
  signPreAuthToken,
  verifyPreAuthToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
  generateResetToken,
  RESET_TOKEN_TTL_MS,
} from "./jwt.utils.js";
import { sendPasswordResetEmail } from "./email.service.js";

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 15;
// const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const LOCK_DURATION_MS = 30 * 1000; // 30 seconds

// Roles that manage across the whole organization rather than one physical
// branch — these are the only accounts that ever see an outlet switcher.
// Everyone else's Employee row is pinned to one outlet (see schema.prisma's
// Employee.outletId, required) and that's simply their session's outlet —
// there's nothing to choose between.
const CROSS_OUTLET_ROLES = ["OWNER", "ADMIN"];
const isCrossOutletRole = (role) => CROSS_OUTLET_ROLES.includes(role);

// Account include shared by every lookup that needs to build a publicUser()
// — pulls the employee's address (Profile page shows/edits it), the
// employee's home outlet, and the account's organization.
const ACCOUNT_INCLUDE = {
  employee: { include: { address: true, outlet: true } },
  organization: true,
};

// ==============================================
// SHARED HELPERS
// ==============================================

// FEATURE: extended beyond { id, name, email, username, role, avatar } to
// carry everything the Profile page shows — personal details, employment
// info (read-only there), and address. Every place that previously did
// `include: { employee: true }` now needs `include: { employee: { include:
// { address: true, outlet: true } } }` (see ACCOUNT_INCLUDE above) for
// `emp.address`/`emp.outlet` to exist here.
// activeOutlet is the outlet this particular SESSION is scoped to — for a
// cross-outlet OWNER/ADMIN this can be any outlet in their organization
// (whichever they picked at login/switch), not necessarily their employee
// record's home outlet, so it's passed in separately rather than always
// read off emp.outlet.
const publicUser = (userAccount, activeOutlet) => {
  const emp = userAccount.employee;
  const outlet = activeOutlet || emp.outlet || null;

  return {
    id: emp.id,
    userAccountId: userAccount.id,
    employeeCode: emp.employeeCode,
    name: emp.fullName,
    email: userAccount.email,
    username: userAccount.username,
    role: userAccount.role,
    avatar: emp.photoUrl || "",

    // Personal — editable via updateProfile() below
    gender: emp.gender || "",
    dob: emp.dob,
    mobile: emp.mobile || "",
    emergencyContact: emp.emergencyContact || "",

    // Employment — read-only here; managed via the Employees module
    department: emp.department,
    designation: emp.designation,
    joiningDate: emp.joiningDate,
    employmentType: emp.employmentType || "",

    // Multi-tenancy — organization is fixed for the account; outlet is
    // this session's active outlet (see client/src outlet switcher, built
    // in section 0.6).
    organization: userAccount.organization
      ? { id: userAccount.organization.id, name: userAccount.organization.name }
      : null,
    outlet: outlet ? { id: outlet.id, name: outlet.name } : null,

    // Address — editable via updateProfile() below
    address: emp.address
      ? {
          houseNo: emp.address.houseNo || "",
          street: emp.address.street || "",
          city: emp.address.city || "",
          state: emp.address.state || "",
          pincode: emp.address.pincode || "",
        }
      : null,
  };
};

// username is only unique WITHIN an organization now (schema.prisma:
// @@unique([organizationId, username])) — the same username can legitimately
// exist in two different restaurants' organizations. email stays globally
// unique, so it's the unambiguous path; username needs a disambiguation
// check since more than one account can now match.
const findAccountByIdentifier = async (identifier) => {
  const value = identifier.toLowerCase();

  if (value.includes("@")) {
    return prisma.userAccount.findUnique({
      where: { email: value },
      include: ACCOUNT_INCLUDE,
    });
  }

  const matches = await prisma.userAccount.findMany({
    where: { username: value },
    include: ACCOUNT_INCLUDE,
  });

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  // Same username exists in more than one organization — caller must
  // disambiguate with email instead of us silently picking one.
  return { ambiguousUsername: true };
};

// Resolve which outlet(s) an already-authenticated account may open a
// session against. OWNER/ADMIN can pick any active outlet in their
// organization; everyone else is pinned to their Employee record's outlet.
const resolveAccessibleOutlets = async (account) => {
  if (isCrossOutletRole(account.role)) {
    return prisma.outlet.findMany({
      where: { organizationId: account.organizationId, isActive: true },
      orderBy: { name: "asc" },
    });
  }
  return account.employee.outlet ? [account.employee.outlet] : [];
};

// Shared by login() (when there's only one accessible outlet, so no
// selection step is needed) and selectOutlet() (after a selection step) —
// issues the real session: access token + persisted refresh token.
const finalizeLogin = async (account, outlet) => {
  const accessToken = signAccessToken({
    sub: account.id,
    employeeId: account.employeeId,
    organizationId: account.organizationId,
    outletId: outlet.id,
    role: account.role,
  });

  const rawRefreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userAccountId: account.id,
      outletId: outlet.id,
      tokenHash: hashToken(rawRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return {
    success: true,
    user: publicUser(account, outlet),
    accessToken,
    refreshToken: rawRefreshToken,
  };
};

// ==============================================
// REGISTER (public self-signup — OWNER role only)
// ==============================================
//
// This is the ONLY endpoint that creates an account without an existing
// session, and it deliberately hardcodes role: "OWNER". Staff accounts
// (MANAGER/CASHIER/CHEF/WAITER/...) are created afterwards by the logged-in
// owner through the Employees module, which is already gated behind
// requireAuth + requireRole in index.js. Nothing about this endpoint lets a
// caller choose their own role — the role isn't read from the payload at
// all, so adding `"role": "ADMIN"` to the request body does nothing.
//
// A signup is not one row. Login needs a whole chain to exist before it can
// issue a session (see login() -> resolveAccessibleOutlets() -> publicUser()):
//
//   Organization  — the tenant
//     └─ Outlet   — the first branch; every outlet-scoped table hangs off this
//         └─ Employee     — publicUser() reads name/photo/department off this
//             └─ UserAccount — the actual login (email + passwordHash + role)
//                 └─ Owner   — the signup record itself
//
// All five are created in one $transaction. A partial signup would be worse
// than a failed one: an Organization with no UserAccount is invisible and
// unreachable, but it still holds the email on Organization.ownerEmail
// (@unique), which would then block the user from ever retrying with that
// same address.

// Derive a login username from the email's local part. Username is only
// unique per organization (schema.prisma: @@unique([organizationId,
// username])) and the organization is brand new here, so there's nothing to
// collide with — but the value still has to be non-empty and stable, hence
// the fallback for addresses whose local part is entirely punctuation.
const usernameFromEmail = (email) => {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");

  return base || `owner${Date.now()}`;
};

export const registerOwner = async (payload = {}) => {
  const { restaurantName, fullName, phone, password, address } = payload;

  // Normalized once here and reused for all three places it's written
  // (Owner.email, UserAccount.email, Organization.ownerEmail) so a signup
  // as "Owner@Cafe.com" can still log in as "owner@cafe.com" — login()
  // lowercases the identifier before looking it up.
  const email = payload.email.trim().toLowerCase();

  // Pre-flight checks. The unique constraints in the transaction below are
  // the real guarantee (two simultaneous signups with the same email can
  // still race past this point), but checking first lets us return a clear
  // "which field" message instead of a P2002 with a raw column name.
  const existingAccount = await prisma.userAccount.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingAccount) {
    return {
      success: false,
      status: 409,
      message: "An account with this email already exists. Try logging in instead.",
    };
  }

  const existingOrganization = await prisma.organization.findUnique({
    where: { ownerEmail: email },
    select: { id: true },
  });

  if (existingOrganization) {
    return {
      success: false,
      status: 409,
      message: "This email is already registered to a restaurant.",
    };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: restaurantName, ownerEmail: email },
      });

      // First outlet is seeded from the restaurant's own details — a
      // single-location restaurant never has to think about outlets at
      // all, and login() will skip the outlet picker entirely for them
      // (accessibleOutlets.length === 1). Additional outlets get added
      // later from Settings.
      const outlet = await tx.outlet.create({
        data: {
          organizationId: organization.id,
          name: restaurantName,
          address,
          phone,
        },
      });

      // EMP-0001 is safe to hardcode rather than going through
      // employees.service.js's generateEmployeeCode(): the outlet was
      // created microseconds ago inside this same transaction, so it
      // provably has no other employees to collide with.
      const employee = await tx.employee.create({
        data: {
          employeeCode: "EMP-0001",
          fullName,
          mobile: phone,
          email,
          department: "Management",
          designation: "Owner",
          joiningDate: new Date(),
          employmentType: "Full-time",
          status: "ACTIVE",
          outletId: outlet.id,
        },
      });

      const userAccount = await tx.userAccount.create({
        data: {
          outletId: outlet.id,
          organizationId: organization.id,
          employeeId: employee.id,
          username: usernameFromEmail(email),
          email,
          passwordHash,
          role: "OWNER",
        },
      });

      const owner = await tx.owner.create({
        data: {
          restaurantName,
          fullName,
          phone,
          email,
          address,
          organizationId: organization.id,
          outletId: outlet.id,
          userAccountId: userAccount.id,
        },
      });

      return { organization, outlet, owner };
    });

    // No session is issued here — registration and login stay separate
    // steps, so the owner lands on the existing Login page afterwards and
    // the whole login path (including account lockout and the outlet
    // picker) has exactly one implementation.
    return {
      success: true,
      message: "Registration successful. You can now log in.",
      owner: {
        id: created.owner.id,
        restaurantName: created.owner.restaurantName,
        fullName: created.owner.fullName,
        email: created.owner.email,
        phone: created.owner.phone,
        address: created.owner.address,
        organizationId: created.organization.id,
        outletId: created.outlet.id,
      },
    };
  } catch (err) {
    // Lost the race against a concurrent signup on the same email, or hit
    // a unique constraint the pre-flight checks above don't cover.
    if (err.code === "P2002") {
      return {
        success: false,
        status: 409,
        message: "An account with these details already exists.",
      };
    }
    throw err;
  }
};

// ==============================================
// LOGIN
// ==============================================

export const login = async (identifier, password) => {
  if (!identifier || !password) {
    return {
      success: false,
      status: 400,
      message: "Email/username and password are required.",
    };
  }

  const account = await findAccountByIdentifier(identifier);

  if (!account) {
    return { success: false, status: 401, message: "Invalid credentials." };
  }

  if (account.ambiguousUsername) {
    return {
      success: false,
      status: 409,
      message:
        "This username exists in more than one organization. Please log in with your email instead.",
    };
  }

  if (account.lockedUntil && account.lockedUntil > new Date()) {
    return {
      success: false,
      status: 423,
      message:
        "Account temporarily locked due to repeated failed logins. Try again later.",
    };
  }

  if (!account.isActive) {
    return {
      success: false,
      status: 403,
      message: "This account has been deactivated.",
    };
  }

  const passwordMatches = await bcrypt.compare(password, account.passwordHash);

  if (!passwordMatches) {
    const failedAttempts = account.failedLoginAttempts + 1;
    const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

    await prisma.userAccount.update({
      where: { id: account.id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : failedAttempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCK_DURATION_MS)
          : null,
      },
    });

    return { success: false, status: 401, message: "Invalid credentials." };
  }

  await prisma.userAccount.update({
    where: { id: account.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  const accessibleOutlets = await resolveAccessibleOutlets(account);

  if (accessibleOutlets.length === 0) {
    return {
      success: false,
      status: 403,
      message:
        "No active outlet is available for this account. Contact your organization owner.",
    };
  }

  // Single accessible outlet — most staff, and single-outlet organizations
  // — skip the selection step entirely and log straight in, same shape as
  // before this change.
  if (accessibleOutlets.length === 1) {
    return finalizeLogin(account, accessibleOutlets[0]);
  }

  // More than one outlet (an OWNER/ADMIN on a multi-outlet organization) —
  // don't issue a full session yet. Hand back a short-lived pre-auth token
  // and the outlet list; the frontend must call POST /api/auth/select-outlet
  // before a real accessToken/refreshToken pair exists. No refresh cookie
  // is set at this point (see auth.controller.js's loginHandler).
  return {
    success: true,
    requiresOutletSelection: true,
    preAuthToken: signPreAuthToken({ sub: account.id }),
    outlets: accessibleOutlets.map((o) => ({ id: o.id, name: o.name })),
  };
};

// ==============================================
// SELECT OUTLET (second step of login, only when login() returned
// requiresOutletSelection: true)
// ==============================================

export const selectOutlet = async (rawPreAuthToken, outletId) => {
  if (!rawPreAuthToken || !outletId) {
    return {
      success: false,
      status: 400,
      message: "Session token and outlet are required.",
    };
  }

  let payload;
  try {
    payload = verifyPreAuthToken(rawPreAuthToken);
  } catch {
    return {
      success: false,
      status: 401,
      message: "Outlet selection session expired. Please log in again.",
    };
  }

  const account = await prisma.userAccount.findUnique({
    where: { id: payload.sub },
    include: ACCOUNT_INCLUDE,
  });

  if (!account || !account.isActive) {
    return { success: false, status: 401, message: "Session invalid." };
  }

  const accessibleOutlets = await resolveAccessibleOutlets(account);
  const outlet = accessibleOutlets.find((o) => o.id === outletId);

  if (!outlet) {
    return {
      success: false,
      status: 403,
      message: "You don't have access to that outlet.",
    };
  }

  await prisma.userAccount.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() },
  });

  return finalizeLogin(account, outlet);
};

// ==============================================
// REFRESH ACCESS TOKEN
// ==============================================

export const refreshAccessToken = async (rawRefreshToken) => {
  if (!rawRefreshToken) {
    return {
      success: false,
      status: 401,
      message: "No refresh token provided.",
    };
  }

  const tokenHash = hashToken(rawRefreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      userAccount: { include: ACCOUNT_INCLUDE },
      outlet: true,
    },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    return {
      success: false,
      status: 401,
      message: "Session expired. Please log in again.",
    };
  }

  const account = stored.userAccount;

  if (!account.isActive) {
    return {
      success: false,
      status: 403,
      message: "This account has been deactivated.",
    };
  }

  // The outlet this specific session was scoped to at login/select-outlet
  // time (see finalizeLogin) — re-verify it's still active rather than
  // trusting the stored row forever, since an owner can deactivate an
  // outlet out from under an existing session.
  if (!stored.outlet.isActive) {
    return {
      success: false,
      status: 403,
      message: "This outlet is no longer active. Please log in again.",
    };
  }

  // Keep the stored expiry in step with the re-issued cookie (see
  // refreshHandler). If they disagree, a browser holding a cookie the DB
  // thinks is expired gets a 401 and a surprise logout.
  //
  // A failed write here must not break an otherwise-valid session — it just
  // means this particular refresh didn't extend the window.
  try {
    await prisma.refreshToken.update({
      where: { tokenHash },
      data: { expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
    });
  } catch (err) {
    console.warn("[auth] could not extend refresh token expiry:", err.message);
  }

  const accessToken = signAccessToken({
    sub: account.id,
    employeeId: account.employeeId,
    organizationId: account.organizationId,
    outletId: stored.outlet.id,
    role: account.role,
  });

  return {
    success: true,
    accessToken,
    user: publicUser(account, stored.outlet),
  };
};

// ==============================================
// LOGOUT
// ==============================================

export const logout = async (rawRefreshToken) => {
  if (!rawRefreshToken) return { success: true };

  const tokenHash = hashToken(rawRefreshToken);

  await prisma.refreshToken
    .updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => null); // token may already be gone — logout should still succeed

  return { success: true };
};

// ==============================================
// SWITCH OUTLET (already-authenticated session — the header switcher)
// Distinct from selectOutlet() above, which is only for the login-time
// picker and requires a preAuthToken since no real session exists yet at
// that point. This is called with a normal, already-valid access token —
// the account is read from userAccountId (req.user.id, set by requireAuth)
// rather than from a token payload we have to verify separately.
// ==============================================

export const switchOutlet = async (userAccountId, outletId) => {
  const account = await prisma.userAccount.findUnique({
    where: { id: userAccountId },
    include: ACCOUNT_INCLUDE,
  });

  if (!account || !account.isActive) {
    return { success: false, status: 401, message: "Session invalid." };
  }

  const accessibleOutlets = await resolveAccessibleOutlets(account);
  const outlet = accessibleOutlets.find((o) => o.id === outletId);

  if (!outlet) {
    return {
      success: false,
      status: 403,
      message: "You don't have access to that outlet.",
    };
  }

  // Deliberately does NOT revoke the account's other refresh tokens —
  // switching outlets in one tab/device shouldn't kill a session an
  // OWNER/ADMIN may have open on a different outlet elsewhere (see the
  // comment on RefreshToken.outletId in schema.prisma).
  return finalizeLogin(account, outlet);
};

// ==============================================
// GET CURRENT USER (session restore)
// activeOutletId comes from the verified access token (req.user.outletId,
// see auth.middleware.js) — this also returns the full list of outlets the
// account can switch between, for the outlet-switcher UI (section 0.6).
// ==============================================

export const getCurrentUser = async (userAccountId, activeOutletId) => {
  const account = await prisma.userAccount.findUnique({
    where: { id: userAccountId },
    include: ACCOUNT_INCLUDE,
  });

  if (!account || !account.isActive) {
    return { success: false, status: 401, message: "Session invalid." };
  }

  const accessibleOutlets = await resolveAccessibleOutlets(account);
  const activeOutlet =
    accessibleOutlets.find((o) => o.id === activeOutletId) ||
    accessibleOutlets[0] ||
    null;

  return {
    success: true,
    user: publicUser(account, activeOutlet),
    outlets: accessibleOutlets.map((o) => ({ id: o.id, name: o.name })),
  };
};

// ==============================================
// UPDATE MY PROFILE (self-service)
// FEATURE: powers the Profile page's Edit mode. Deliberately scoped to a
// small allow-list of Employee fields — name/personal-details/address —
// NOT role, department, designation, employeeCode, status, or outlet, which
// stay admin-managed via the Employees module. Email/username also aren't
// editable here since they double as login identifiers.
// ==============================================

const EDITABLE_EMPLOYEE_FIELDS = [
  "fullName",
  "gender",
  "mobile",
  "emergencyContact",
  "photoUrl",
];

export const updateProfile = async (userAccountId, payload = {}, activeOutletId) => {
  const account = await prisma.userAccount.findUnique({
    where: { id: userAccountId },
    select: { employeeId: true },
  });

  if (!account) {
    return { success: false, status: 404, message: "Account not found." };
  }

  const employeeData = {};
  for (const field of EDITABLE_EMPLOYEE_FIELDS) {
    if (payload[field] !== undefined) {
      employeeData[field] = payload[field] || null;
    }
  }

  // Same fix as employees.service.js's normalizeEmployeeDates — a bare
  // "YYYY-MM-DD" from <input type="date"> isn't a full ISO-8601 DateTime,
  // which Prisma's query engine rejects outright. Convert explicitly.
  if (payload.dob !== undefined) {
    if (payload.dob === null || payload.dob === "") {
      employeeData.dob = null;
    } else {
      const parsed = new Date(payload.dob);
      if (Number.isNaN(parsed.getTime())) {
        return {
          success: false,
          status: 400,
          message: "Invalid date of birth.",
        };
      }
      employeeData.dob = parsed;
    }
  }

  const address = payload.address;

  try {
    await prisma.employee.update({
      where: { id: account.employeeId },
      data: {
        ...employeeData,
        ...(address
          ? { address: { upsert: { create: address, update: address } } }
          : {}),
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.join(", ") || "value";
      return {
        success: false,
        status: 409,
        message: `This ${field} is already in use.`,
      };
    }
    throw err;
  }

  const updatedAccount = await prisma.userAccount.findUnique({
    where: { id: userAccountId },
    include: ACCOUNT_INCLUDE,
  });

  const accessibleOutlets = await resolveAccessibleOutlets(updatedAccount);
  const activeOutlet =
    accessibleOutlets.find((o) => o.id === activeOutletId) ||
    accessibleOutlets[0] ||
    null;

  return { success: true, user: publicUser(updatedAccount, activeOutlet) };
};

// ==============================================
// FORGOT PASSWORD
// ==============================================

export const forgotPassword = async (email, resetUrlBase) => {
  // Always respond with success regardless of whether the email exists —
  // don't leak which emails are registered.
  const genericResponse = {
    success: true,
    message:
      "If an account exists with this email, reset instructions have been sent.",
  };

  if (!email) return genericResponse;

  const account = await prisma.userAccount.findUnique({
    where: { email: email.toLowerCase() },
    include: { employee: true },
  });

  if (!account || !account.isActive) return genericResponse;

  const rawToken = generateResetToken();

  await prisma.passwordResetToken.create({
    data: {
      userAccountId: account.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${resetUrlBase}?token=${rawToken}`;

  await sendPasswordResetEmail({
    to: account.email,
    resetUrl,
    name: account.employee.fullName,
  });

  return genericResponse;
};

// ==============================================
// RESET PASSWORD (via emailed token)
// ==============================================

export const resetPassword = async (rawToken, newPassword) => {
  if (!rawToken || !newPassword) {
    return {
      success: false,
      status: 400,
      message: "Token and new password are required.",
    };
  }

  if (newPassword.length < 8) {
    return {
      success: false,
      status: 400,
      message: "Password must be at least 8 characters.",
    };
  }

  const tokenHash = hashToken(rawToken);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return {
      success: false,
      status: 400,
      message: "This reset link is invalid or has expired.",
    };
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.userAccount.update({
      where: { id: record.userAccountId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Revoke all existing sessions so a stolen token can't ride along.
    prisma.refreshToken.updateMany({
      where: { userAccountId: record.userAccountId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { success: true, message: "Password reset successfully." };
};

// ==============================================
// CHANGE PASSWORD (logged-in user)
// ==============================================

export const changePassword = async (
  userAccountId,
  currentPassword,
  newPassword,
) => {
  if (!currentPassword || !newPassword) {
    return {
      success: false,
      status: 400,
      message: "Current and new password are required.",
    };
  }

  if (newPassword.length < 8) {
    return {
      success: false,
      status: 400,
      message: "New password must be at least 8 characters.",
    };
  }

  const account = await prisma.userAccount.findUnique({
    where: { id: userAccountId },
  });

  if (!account) {
    return { success: false, status: 404, message: "Account not found." };
  }

  const matches = await bcrypt.compare(currentPassword, account.passwordHash);

  if (!matches) {
    return {
      success: false,
      status: 401,
      message: "Current password is incorrect.",
    };
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.userAccount.update({
    where: { id: userAccountId },
    data: { passwordHash },
  });

  return { success: true, message: "Password updated successfully." };
};