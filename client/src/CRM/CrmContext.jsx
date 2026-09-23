// src/crm/CrmContext.jsx
//
// Whether CRM is switched on for the current outlet (Settings -> CRM), plus
// its thresholds. Fetched once per session and shared, so the sidebar, the
// POS and the CRM pages always agree. Settings -> CRM calls refresh() after
// saving so the change shows everywhere without a reload.
//
// Reads GET /crm/config, which every POS role can call (unlike /settings,
// which is managers only) — cashiers and waiters need to know too.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getCrmConfig } from "./crmApi";

const CrmContext = createContext(null);

const FALLBACK = { enabled: false, config: {}, loyalty: { enabled: false }, loading: false, refresh: async () => {} };

export function CrmProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState({ enabled: false, config: {}, loyalty: { enabled: false }, loading: true });

  const refresh = useCallback(async () => {
    try {
      const data = await getCrmConfig();
      setState({
        enabled: Boolean(data?.enabled),
        config: data?.config || {},
        // Loyalty rides on CRM, so /crm/config reports both in one call.
        loyalty: data?.loyalty || { enabled: false },
        loading: false,
      });
    } catch {
      // Unreachable or no permission: behave as "off" — the POS then works
      // exactly as it did before CRM existed.
      setState({ enabled: false, config: {}, loyalty: { enabled: false }, loading: false });
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setState({ enabled: false, config: {}, loyalty: { enabled: false }, loading: false });
      return;
    }
    refresh();
    // Re-check per outlet — switching branch can switch CRM on or off.
  }, [user, user?.outlet?.id, refresh]);

  const value = useMemo(() => ({ ...state, refresh }), [state, refresh]);
  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export const useCrm = () => useContext(CrmContext) || FALLBACK;