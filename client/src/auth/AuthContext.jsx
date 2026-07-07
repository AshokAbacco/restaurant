import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import authService from "./authService";

// ==========================================
// AUTH CONTEXT
// ==========================================

const AuthContext = createContext(null);

// ==========================================
// ROLES
// ==========================================

export const ROLES = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
  KITCHEN: "KITCHEN",
};

// ==========================================
// PROVIDER
// ==========================================

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ==========================================
  // RESTORE SESSION ON LOAD
  // Tries the httpOnly refresh cookie (if present) to get a fresh access
  // token, then fetches /auth/me. If either step fails, the user is simply
  // treated as logged out — no error thrown to the UI.
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const restoredUser = await authService.restoreSession();

      if (cancelled) return;

      if (restoredUser) {
        setUser(restoredUser);
        setIsAuthenticated(true);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  // LOGIN
  // ==========================================

  const login = async (email, password) => {
    setLoading(true);

    try {
      const result = await authService.login(email, password);

      if (!result.success) {
        return result;
      }

      setUser(result.user);
      setIsAuthenticated(true);

      return { success: true, user: result.user };
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = async () => {
    await authService.logout();

    setUser(null);
    setIsAuthenticated(false);
  };

  // ==========================================
  // UPDATE USER (local cache only — call a profile-update endpoint separately
  // if the change needs to be persisted server-side)
  // ==========================================

  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  // ==========================================
  // CHANGE PASSWORD
  // ==========================================

  const changePassword = async (currentPassword, newPassword) => {
    return authService.changePassword(currentPassword, newPassword);
  };

  // ==========================================
  // ROLE HELPERS
  // ==========================================

  const hasRole = (roles = []) => {
    if (!user) return false;

    return roles.includes(user.role);
  };

  const isOwner = () => user?.role === ROLES.OWNER;

  const isManager = () => user?.role === ROLES.MANAGER;

  const isCashier = () => user?.role === ROLES.CASHIER;

  const isKitchen = () => user?.role === ROLES.KITCHEN;

  // ==========================================
  // PERMISSION HELPERS
  // ==========================================

  const canManageUsers = () => isOwner();

  const canManageSettings = () => isOwner();

  const canViewReports = () => isOwner() || isManager();

  const canAccessPOS = () => isOwner() || isManager() || isCashier();

  const canAccessKitchen = () => isOwner() || isManager() || isKitchen();

  const canManageInventory = () => isOwner() || isManager();

  const canViewProfit = () => isOwner();

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value = useMemo(
    () => ({
      user,

      loading,

      isAuthenticated,

      login,

      logout,

      updateUser,

      changePassword,

      hasRole,

      isOwner,

      isManager,

      isCashier,

      isKitchen,

      canManageUsers,

      canManageSettings,

      canViewReports,

      canAccessPOS,

      canAccessKitchen,

      canManageInventory,

      canViewProfit,
    }),
    [user, loading, isAuthenticated],
  );
  // ==========================================
  // PROVIDER
  // ==========================================

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ==========================================
// CUSTOM HOOK
// ==========================================

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};

// ==========================================
// EXPORT
// ==========================================

export default AuthContext;
