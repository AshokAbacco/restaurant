// src/pos/KitchenDisplayScreen.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import KotCard from "./KotCard";
import { getKitchenDisplay, updateKotStatus } from "../api/posApi";

const POLL_INTERVAL_MS = 8000;

export default function KitchenDisplayScreen() {
  const [kots, setKots] = useState([]);
  const [activeSectionId, setActiveSectionId] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getKitchenDisplay();
      setKots(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Sections are derived from whatever's actually on the board right now —
  // no separate kitchen-sections endpoint needed for this screen.
  const sections = useMemo(() => {
    const map = new Map();
    for (const kot of kots) {
      if (kot.kitchenSection) map.set(kot.kitchenSection.id, kot.kitchenSection.name);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [kots]);

  const visibleKots = useMemo(() => {
    if (activeSectionId === "ALL") return kots;
    return kots.filter((k) => k.kitchenSectionId === activeSectionId);
  }, [kots, activeSectionId]);

  async function handleAdvance(id, nextStatus) {
    setUpdatingId(id);
    try {
      await updateKotStatus(id, nextStatus);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-blue-600">
                <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Kitchen Display</h1>
              <p className="text-xs text-slate-400">
                {visibleKots.length} active ticket{visibleKots.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
      </header>

      {sections.length > 0 && (
        <div className="flex gap-2 border-b border-slate-200 bg-white px-6 py-2">
          <button
            onClick={() => setActiveSectionId("ALL")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeSectionId === "ALL" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Stations
          </button>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSectionId(s.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeSectionId === s.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading tickets…</p>
        ) : visibleKots.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-slate-400">No active tickets. All caught up.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleKots.map((kot) => (
              <KotCard
                key={kot.id}
                kot={kot}
                onAdvance={handleAdvance}
                updating={updatingId === kot.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}