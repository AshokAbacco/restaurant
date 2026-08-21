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
  WAITER: "WAITER",
};

// ==========================================
// PROVIDER
// ==========================================

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // FEATURE (multi-tenancy): the full list of outlets this account can
  // access (populated from /auth/me and from login()/selectOutlet()'s
  // responses) — powers the outlet switcher in the header. Empty array for
  // single-outlet accounts (nothing to switch between) and for anyone not
  // yet authenticated.
  const [outlets, setOutlets] = useState([]);

  // FEATURE (multi-tenancy): set only during the brief window between
  // "password verified" and "outlet chosen" for a multi-outlet account —
  // see login() below. Login.jsx checks this to know whether to show the
  // outlet-picker screen instead of navigating to the dashboard.
  const [pendingOutletSelection, setPendingOutletSelection] = useState(null);

  // FIX: `loading` gates the provider's render below (`{!loading &&
  // children}`) — while it's true, the ENTIRE app (everything under
  // AuthProvider, including whatever page is currently mounted) renders
  // nothing at all. This is only meant to cover the one-time "still
  // restoring the session on first load" check in the effect below.
  //
  // `login()` used to also flip this same flag on/off for the duration of
  // a login request. That meant submitting the form — even a WRONG
  // password — unmounted the entire app (including the Login page that was
  // mid-submit) the instant the request started, then remounted a brand
  // new Login instance once it finished. The old instance's later
  // setErrors()/setToastMessage() calls were landing on an already-
  // unmounted component and got silently dropped, while the new instance
  // came up with empty state — which is exactly what read as "the page
  // just refreshed and I never saw what was wrong." Login.jsx already
  // tracks its own local `loading` for the button spinner, so the context
  // doesn't need to touch this flag for login at all.
  const [loading, setLoading] = useState(true);

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ==========================================
  // RESTORE SESSION ON LOAD
  // Tries the httpOnly refresh cookie (if present) to get a fresh access
  // token, then fetches /auth/me. If either step fails, the user is simply
  // treated as logged out — no error thrown to the UI.
  //
  // FIX: this had no try/catch. authService.restoreSession() calling
  // fetch() while offline throws a TypeError ("Failed to fetch") — with
  // no catch here, that exception propagated out of this effect entirely
  // and setLoading(false) below was NEVER reached. Since the provider
  // renders `{!loading && children}`, that meant `loading` stayed true
  // forever and the ENTIRE APP rendered nothing, permanently, on any
  // network failure during boot — exactly what a hard reload while
  // offline triggers. authService.restoreSession() itself now also
  // handles the offline case gracefully (falls back to decoding the
  // locally-stored token), but this try/finally stays regardless as a
  // hard guarantee: no failure inside restoreSession, now or in the
  // future, can ever leave the app stuck showing nothing.
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const restored = await authService.restoreSession();

        if (cancelled) return;

        if (restored) {
          setUser(restored.user);
          setOutlets(restored.outlets || []);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error("Session restore failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  // LOGIN
  // ==========================================

  const login = async (email, password) => {
    // Deliberately NOT touching the top-level `loading` state here — see
    // the comment on its declaration above. A login attempt (successful or
    // not) should never cause the app to unmount/remount.
    const result = await authService.login(email, password);

    if (!result.success) {
      return result;
    }

    // FEATURE (multi-tenancy): password was correct, but this account has
    // more than one outlet — no real session exists yet. Stash the
    // pre-auth token + outlet list and tell the caller (Login.jsx) to show
    // the picker instead of treating this as a completed login.
    if (result.requiresOutletSelection) {
      setPendingOutletSelection({
        preAuthToken: result.preAuthToken,
        outlets: result.outlets,
      });
      return { success: true, requiresOutletSelection: true, outlets: result.outlets };
    }

    setUser(result.user);
    setOutlets(result.user?.outlet ? [result.user.outlet] : []);
    setIsAuthenticated(true);

    return { success: true, user: result.user };
  };

  // ==========================================
  // SELECT OUTLET
  // Second step of login, only relevant when login() above returned
  // requiresOutletSelection: true.
  // ==========================================

  const selectOutlet = async (outletId) => {
    if (!pendingOutletSelection) {
      return { success: false, message: "No pending login to complete." };
    }

    const result = await authService.selectOutlet(
      pendingOutletSelection.preAuthToken,
      outletId,
    );

    if (!result.success) {
      return result;
    }

    setUser(result.user);
    setOutlets(pendingOutletSelection.outlets || []);
    setIsAuthenticated(true);
    setPendingOutletSelection(null);

    return { success: true, user: result.user };
  };

  // ==========================================
  // SWITCH OUTLET
  // Used AFTER a full session already exists (the header switcher) — an
  // OWNER/ADMIN picking a different outlet than the one they're currently
  // on. Reuses the same backend endpoint as the login-time picker, just
  // triggered from a different UI moment; the server doesn't distinguish
  // between the two.
  //
  // A full page reload after the token updates is the simplest correct way
  // to make every already-mounted page (which may have already fetched
  // outlet-scoped data under the OLD outlet) refetch under the new one,
  // rather than trying to track down and invalidate every data hook in the
  // app individually.
  // ==========================================

  const switchOutlet = async (outletId) => {
    const result = await authService.switchOutlet(outletId);
    if (!result.success) return result;

    window.location.reload();
    return { success: true };
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
  // UPDATE PROFILE
  // FEATURE: powers the Profile page's Edit mode. On success, refreshes the
  // local `user` so the page (and anywhere else showing name/avatar/etc.)
  // reflects the change immediately without needing a full session reload.
  // ==========================================

  const updateProfile = async (payload) => {
    const result = await authService.updateProfile(payload);

    if (result.success) {
      setUser(result.user);
    }

    return result;
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

  const isWaiter = () => user?.role === ROLES.WAITER;

  // ==========================================
  // PERMISSION HELPERS
  // ==========================================

  const canManageUsers = () => isOwner();

  const canManageSettings = () => isOwner();

  const canViewReports = () => isOwner() || isManager();

  const canAccessPOS = () =>
    isOwner() || isManager() || isCashier() || isWaiter();

  const canAccessKitchen = () => isOwner() || isManager() || isKitchen();

  const canManageInventory = () => isOwner() || isManager();

  const canManageMenu = () => isOwner() || isManager();

  const canDeleteMenuItems = () => isOwner();

  const canViewProfit = () => isOwner();

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value = useMemo(
    () => ({
      user,

      outlets,

      pendingOutletSelection,

      loading,

      isAuthenticated,

      login,

      selectOutlet,

      switchOutlet,

      logout,

      updateUser,

      changePassword,

      updateProfile,

      hasRole,

      isOwner,

      isManager,

      isCashier,

      isKitchen,

      isWaiter,

      canManageUsers,

      canManageSettings,

      canViewReports,

      canAccessPOS,

      canAccessKitchen,

      canManageInventory,

      canManageMenu,

      canDeleteMenuItems,

      canViewProfit,
    }),
    [user, outlets, pendingOutletSelection, loading, isAuthenticated],
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