// ==============================================
// src/context/RestaurantProfileContext.jsx
// ==============================================
//
// The outlet's branding (logo + display name), fetched once per session and
// shared, so the navbar and the sidebar can't disagree about which
// restaurant you're looking at — and so opening the sidebar doesn't fire a
// second request for a logo the header already has.
//
// Source of truth is Settings → Restaurant Profile
// (GET /settings/restaurant-profile), the same endpoint that screen reads
// and writes. `refresh()` is exported so saving there can update the
// chrome without a page reload.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiRequest } from "../api/apiClient";
import { useAuth } from "../auth/AuthContext";

const RestaurantProfileContext = createContext(null);

export const RestaurantProfileProvider = ({ children }) => {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { ok, data } = await apiRequest("/settings/restaurant-profile");
    // A failed fetch is not worth surfacing anywhere — the header falls
    // back to the outlet name from the session and a default icon, which
    // is a perfectly usable header.
    setProfile(ok ? data : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    refresh();
  }, [user, refresh]);

  const value = useMemo(() => {
    // The outlet name on the session is the better fallback than the
    // product name: an account with no profile saved yet still knows which
    // branch it's logged into.
    const name =
      profile?.name?.trim() || user?.outlet?.name?.trim() || "Restaurant";

    return {
      loading,
      profile,
      restaurantName: name,
      logoUrl: profile?.logoUrl?.trim() || null,
      refresh,
    };
  }, [profile, user, loading, refresh]);

  return (
    <RestaurantProfileContext.Provider value={value}>
      {children}
    </RestaurantProfileContext.Provider>
  );
};

// Safe outside the provider: auth screens and the kiosk render no chrome,
// so they get sensible defaults rather than a crash.
export const useRestaurantProfile = () =>
  useContext(RestaurantProfileContext) || {
    loading: false,
    profile: null,
    restaurantName: "Restaurant",
    logoUrl: null,
    refresh: () => {},
  };

export default RestaurantProfileContext;