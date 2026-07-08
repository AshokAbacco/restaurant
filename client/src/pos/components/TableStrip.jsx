// src/pos/components/TableStrip.jsx
import { useEffect, useState } from "react";
import { getTables } from "../api/posApi";
import TableManagerModal from "./TableManagerModal";

const STATUS_STYLE = {
  FREE: "border-slate-200 bg-white text-slate-700 hover:border-blue-400",
  OCCUPIED: "border-red-200 bg-red-50 text-red-600 cursor-not-allowed opacity-60",
  RESERVED: "border-amber-200 bg-amber-50 text-amber-600 cursor-not-allowed opacity-60",
};

export default function TableStrip({ selectedTableId, onSelect }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManager, setShowManager] = useState(false);

  function loadTables() {
    setLoading(true);
    getTables()
      .then(setTables)
      .catch(() => setTables([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTables();
  }, []);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">Select a table</span>
        <button
          onClick={() => setShowManager(true)}
          className="flex items-center gap-1 rounded-lg bg-[#1C3044] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#27435B]"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add Table
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400">Loading tables…</div>
      ) : tables.length === 0 ? (
        <div className="text-sm text-slate-400">No tables set up yet.</div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tables.map((t) => {
            const isSelected = t.id === selectedTableId;
            const isFree = t.status === "FREE";
            return (
              <button
                key={t.id}
                disabled={!isFree && !isSelected}
                onClick={() => onSelect(t.id)}
                className={`shrink-0 rounded-lg border px-3 py-2 font-mono text-sm font-medium transition-colors ${
                  isSelected ? "border-blue-600 bg-blue-600 text-white" : STATUS_STYLE[t.status] || STATUS_STYLE.FREE
                }`}
              >
                {t.name}
                {t.capacity ? <span className="ml-1 text-xs opacity-70">· {t.capacity}p</span> : null}
              </button>
            );
          })}
        </div>
      )}

      <TableManagerModal
        isOpen={showManager}
        onClose={() => {
          setShowManager(false);
          loadTables(); // pick up any adds/edits/deletes made in the modal
        }}
      />
    </div>
  );
}