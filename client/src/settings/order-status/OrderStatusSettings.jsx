// ==============================================
// src/settings/order-status/OrderStatusSettings.jsx
// ==============================================
// FEATURE (Phase 1.1 — Custom Order Status): lets an outlet relabel/
// recolor the system order statuses shown across POS/KDS/reports, without
// touching the actual state machine — see server/src/settings/. Unlike
// the other settings pages (still console.log placeholders as of this
// writing), this one is fully wired to a real backend since that's what
// this feature actually is.

import React, { useEffect, useState } from "react";
import { FiTag, FiSave, FiRefreshCw, FiCheck } from "react-icons/fi";
import { apiRequest } from "../../api/apiClient";

const OrderStatusSettings = () => {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(null); // which row is mid-save
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(null); // which row just saved, for a brief checkmark

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { ok, data } = await apiRequest("/settings/order-status-labels");
      if (cancelled) return;

      if (!ok) {
        setError(data?.message || "Failed to load order status settings.");
      } else {
        setLabels(data);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateLocalField = (systemStatus, field, value) => {
    setLabels((prev) =>
      prev.map((l) => (l.systemStatus === systemStatus ? { ...l, [field]: value } : l)),
    );
  };

  const handleSaveRow = async (systemStatus) => {
    const row = labels.find((l) => l.systemStatus === systemStatus);
    if (!row) return;

    setSavingStatus(systemStatus);
    setError("");

    const { ok, data } = await apiRequest(
      `/settings/order-status-labels/${systemStatus}`,
      {
        method: "PUT",
        body: JSON.stringify({
          customLabel: row.customLabel,
          color: row.color,
          sortOrder: row.sortOrder,
          isActive: row.isActive,
        }),
      },
    );

    setSavingStatus(null);

    if (!ok) {
      setError(data?.message || `Failed to save "${systemStatus}".`);
      return;
    }

    setSavedFlash(systemStatus);
    setTimeout(() => setSavedFlash(null), 1500);
  };

  const handleResetRow = async (systemStatus) => {
    setSavingStatus(systemStatus);
    setError("");

    const { ok, data } = await apiRequest(
      `/settings/order-status-labels/${systemStatus}`,
      { method: "DELETE" },
    );

    if (!ok) {
      setSavingStatus(null);
      setError(data?.message || `Failed to reset "${systemStatus}".`);
      return;
    }

    // Re-fetch this one row's default rather than hand-rolling the
    // fallback logic client-side — the backend is the single source of
    // truth for what "default" means (see settings.service.js).
    const refreshed = await apiRequest("/settings/order-status-labels");
    if (refreshed.ok) setLabels(refreshed.data);
    setSavingStatus(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410] flex items-center justify-center">
        <p className="text-gray-500 dark:text-[#9CA8A0]">Loading order status settings…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="max-w-5xl mx-auto px-8 py-8 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center">
            <FiTag size={30} />
          </div>

          <div>
            <h1 className="text-4xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">Order Status Labels</h1>

            <p className="mt-2 text-gray-500 dark:text-[#9CA8A0]">
              Rename and recolor how each order status appears on your POS,
              Kitchen Display, and reports. The underlying workflow stays
              the same — this only changes what your staff sees it called.
            </p>
          </div>
        </div>
      </div>

      {/* ======================================
          CONTENT
      ====================================== */}

      <div className="max-w-5xl mx-auto p-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 px-5 py-4">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8">
          <div className="space-y-4">
            {labels.map((row) => (
              <div
                key={row.systemStatus}
                className="flex flex-col md:flex-row md:items-center gap-4 border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5"
              >
                <div className="w-40 shrink-0">
                  <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-[#6B7280]">
                    System status
                  </p>
                  <p className="font-mono font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{row.systemStatus}</p>
                </div>

                <div className="flex-1">
                  <label className="block mb-1 text-sm font-medium text-gray-600 dark:text-[#9CA8A0]">
                    Display label
                  </label>
                  <input
                    type="text"
                    value={row.customLabel}
                    onChange={(e) =>
                      updateLocalField(row.systemStatus, "customLabel", e.target.value)
                    }
                    className="w-full h-11 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-3 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
                  />
                </div>

                <div className="w-32 shrink-0">
                  <label className="block mb-1 text-sm font-medium text-gray-600 dark:text-[#9CA8A0]">
                    Color
                  </label>
                  <input
                    type="color"
                    value={row.color || "#6B7280"}
                    onChange={(e) =>
                      updateLocalField(row.systemStatus, "color", e.target.value)
                    }
                    className="w-full h-11 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg cursor-pointer bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSaveRow(row.systemStatus)}
                    disabled={savingStatus === row.systemStatus}
                    className="h-11 px-4 rounded-lg bg-blue-600 dark:bg-[#60A5FA] hover:bg-blue-700 dark:hover:bg-[#3B82F6] disabled:opacity-60 text-white flex items-center gap-2"
                  >
                    {savedFlash === row.systemStatus ? (
                      <FiCheck />
                    ) : (
                      <FiSave />
                    )}
                    {savingStatus === row.systemStatus ? "Saving…" : "Save"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResetRow(row.systemStatus)}
                    disabled={savingStatus === row.systemStatus}
                    title="Reset to default label/color"
                    className="h-11 px-3 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] hover:bg-gray-100 dark:hover:bg-[#1D231C] disabled:opacity-60"
                  >
                    <FiRefreshCw />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusSettings;