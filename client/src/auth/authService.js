// ==============================================
// src/auth/authService.js
// Restaurant ERP Authentication Service (backend-integrated)
// ==============================================

import { apiRequest, setAccessToken, getAccessToken } from "../api/apiClient";

// ==============================================
// LOGIN
// ==============================================

const login = async (identifier, password) => {
  const { ok, data } = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });

  if (!ok || !data?.success) {
    return {
      success: false,
      message: data?.message || "Invalid email or password",
    };
  }

  setAccessToken(data.accessToken);

  return { success: true, token: data.accessToken, user: data.user };
};

// ==============================================
// LOGOUT
// ==============================================

const logout = async () => {
  await apiRequest("/auth/logout", { method: "POST" }, { skipRefresh: true });
  setAccessToken(null);
};

// ==============================================
// SESSION RESTORE
// Called on app load. Tries a silent refresh first (the refresh cookie may
// still be valid even though we have no access token in memory yet), then
// fetches the current user.
// ==============================================

const restoreSession = async () => {
  // Prime the access token via refresh (apiRequest's 401 fallback handles this
  // automatically as long as we hit a protected endpoint first).
  const { ok, data } = await apiRequest("/auth/me");

  if (!ok || !data?.success) {
    setAccessToken(null);
    return null;
  }

  return data.user;
};

// ==============================================
// CURRENT USER / TOKEN (in-memory only)
// ==============================================

const getToken = () => getAccessToken();

const isAuthenticated = () => !!getAccessToken();

// ==============================================
// CHANGE PASSWORD
// ==============================================

const changePassword = async (currentPassword, newPassword) => {
  const { ok, data } = await apiRequest("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!ok || !data?.success) {
    return {
      success: false,
      message: data?.message || "Unable to change password.",
    };
  }

  return { success: true, message: data.message };
};

// ==============================================
// FORGOT PASSWORD
// ==============================================

const forgotPassword = async (email) => {
  const { ok, data } = await apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  if (!ok) {
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }

  return { success: true, message: data?.message };
};

// ==============================================
// RESET PASSWORD
// ==============================================

const resetPassword = async (token, password) => {
  const { ok, data } = await apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });

  if (!ok || !data?.success) {
    return {
      success: false,
      message: data?.message || "Unable to reset password.",
    };
  }

  return { success: true, message: data.message };
};

// ==============================================
// EXPORT
// ==============================================

const authService = {
  login,
  logout,
  restoreSession,
  getToken,
  isAuthenticated,
  changePassword,
  forgotPassword,
  resetPassword,
};

export default authService;
