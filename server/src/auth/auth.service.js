// ==============================================
// src/auth/auth.service.js
// ==============================================

import bcrypt from "bcrypt";
import prisma from "../../prisma/client.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
  generateResetToken,
  RESET_TOKEN_TTL_MS,
} from "./jwt.utils.js";
import { sendPasswordResetEmail } from "./email.service.js";

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ==============================================
// SHARED HELPERS
// ==============================================

const publicUser = (userAccount) => ({
  id: userAccount.employee.id,
  userAccountId: userAccount.id,
  name: userAccount.employee.fullName,
  email: userAccount.email,
  username: userAccount.username,
  role: userAccount.role,
  avatar: userAccount.employee.photoUrl || "",
});

const findAccountByIdentifier = async (identifier) => {
  return prisma.userAccount.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() },
      ],
    },
    include: { employee: true },
  });
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

  const user = publicUser(account);

  const accessToken = signAccessToken({
    sub: account.id,
    employeeId: account.employeeId,
    role: account.role,
  });

  const rawRefreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userAccountId: account.id,
      tokenHash: hashToken(rawRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { success: true, user, accessToken, refreshToken: rawRefreshToken };
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
    include: { userAccount: { include: { employee: true } } },
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

  const accessToken = signAccessToken({
    sub: account.id,
    employeeId: account.employeeId,
    role: account.role,
  });

  return { success: true, accessToken, user: publicUser(account) };
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
// GET CURRENT USER (session restore)
// ==============================================

export const getCurrentUser = async (userAccountId) => {
  const account = await prisma.userAccount.findUnique({
    where: { id: userAccountId },
    include: { employee: true },
  });

  if (!account || !account.isActive) {
    return { success: false, status: 401, message: "Session invalid." };
  }

  return { success: true, user: publicUser(account) };
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
