// ==============================================
// client/src/platform/PlatformAuth.jsx
// Session state for /platform. Independent of the restaurant AuthContext.
// ==============================================

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { api, getPlatformToken, setPlatformToken, onPlatformSessionExpired } from "./api";
import { FullPageSpinner } from "./ui";

const Ctx = createContext(null);

export function PlatformAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(Boolean(getPlatformToken()));

  const loadMe = useCallback(async () => {
    if (!getPlatformToken()) {
      setAdmin(null);
      setLoading(false);
      return;
    }
    try {
      const { admin: me } = await api.get("/auth/me");
      setAdmin(me);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
    return onPlatformSessionExpired(() => setAdmin(null));
  }, [loadMe]);

  const login = useCallback(async (email, password) => {
    const { token, admin: me } = await api.post("/auth/login", { email, password });
    setPlatformToken(token);
    setAdmin(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    setPlatformToken(null);
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({
      admin,
      loading,
      login,
      logout,
      reload: loadMe,
      setAdmin,
      can: (perm) => Boolean(admin?.permissions?.includes(perm)),
    }),
    [admin, loading, login, logout, loadMe],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePlatformAuth = () => useContext(Ctx);

export function RequirePlatformAuth() {
  const { admin, loading } = usePlatformAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!admin) return <Navigate to="/platform/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}
