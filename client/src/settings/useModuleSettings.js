// src/settings/useModuleSettings.js
//
// Plain .js on purpose — no JSX in this file. The save toast lives in
// SaveToast.jsx.
//
// Load + save one Settings module (payment | kiosk | tax | crm) from
// /settings/modules/:section. Replaces the old "console.log(settings) //
// Backend Integration Later" handlers, so these pages now actually persist.
// The outlet comes from the session token, never from the page.
import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../api/apiClient";

export default function useModuleSettings(section, defaults) {
  const defaultsRef = useRef(defaults);
  const [settings, setSettings] = useState(defaults);
  const [meta, setMeta] = useState({ enabled: undefined, updatedAt: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: "success" | "error", text }

  const apply = (data) => {
    setSettings({ ...defaultsRef.current, ...(data?.data || {}) });
    setMeta({ enabled: data?.enabled, updatedAt: data?.updatedAt || null });
  };

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/settings/modules/${section}`).then(({ ok, data }) => {
      if (cancelled) return;
      if (ok) apply(data);
      else setMessage({ type: "error", text: data?.error || data?.message || "Couldn't load settings." });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [section]);

  // Auto-hide the status message.
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

  const save = useCallback(
    async (extra = {}) => {
      setSaving(true);
      const { ok, data } = await apiRequest(`/settings/modules/${section}`, {
        method: "PUT",
        body: JSON.stringify({ ...settings, ...extra }),
      });
      setSaving(false);
      if (ok) {
        apply(data);
        setMessage({ type: "success", text: "Settings saved." });
      } else {
        setMessage({ type: "error", text: data?.error || data?.message || "Couldn't save settings." });
      }
      return ok ? data : null;
    },
    [section, settings],
  );

  const reset = useCallback(async () => {
    if (!window.confirm("Restore the default settings for this page?")) return null;
    setSaving(true);
    const { ok, data } = await apiRequest(`/settings/modules/${section}`, { method: "DELETE" });
    setSaving(false);
    if (ok) {
      apply(data);
      setMessage({ type: "success", text: "Defaults restored." });
    } else {
      setMessage({ type: "error", text: data?.error || data?.message || "Couldn't reset settings." });
    }
    return ok ? data : null;
  }, [section]);

  return { settings, setSettings, meta, loading, saving, message, save, reset };
}