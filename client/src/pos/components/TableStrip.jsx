// src/pos/components/TableStrip.jsx
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { getTablesBoard, getFloors } from "../api/posApi";
import TableManagerModal from "./TableManagerModal";

const STATUS_STYLE = {
  FREE: "border-slate-200 bg-white text-slate-700 hover:border-blue-400",
  OCCUPIED: "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400",
  RESERVED: "border-purple-200 bg-purple-50 text-purple-600 cursor-not-allowed opacity-60",
};

// FREE tables are the most common thing staff tap (starting a new order), so
// they still lead. OCCUPIED now comes next rather than last — it's a valid,
// clickable action (adding items to what's already there), not a dead end.
// RESERVED stays last/disabled since there's nothing to do with it yet.
const STATUS_SORT_RANK = { FREE: 0, OCCUPIED: 1, RESERVED: 2 };

// onSelect now receives the FULL table object (id, status, and — if
// occupied — its active `order`), not just an id string. PosOrderScreen
// needs the order to decide "new order" vs "add items to existing order".
//
// Staff now pick a floor first (Ground Floor / First Floor / Rooftop / …),
// then the table strip below only shows that floor's tables — instead of
// every table across the whole restaurant in one long scrolling row.
export default function TableStrip({ selectedTableId, onSelect }) {
  const [floors, setFloors] = useState([]);
  const [floorsLoading, setFloorsLoading] = useState(true);
  const [selectedFloorId, setSelectedFloorId] = useState(null);

  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [showManager, setShowManager] = useState(false);

  useEffect(() => {
    loadFloors();
  }, []);

  async function loadFloors() {
    setFloorsLoading(true);
    try {
      const data = await getFloors();
      setFloors(data);
      // Default to the first floor rather than an "all floors" view — the
      // point of this step is picking one floor before seeing its tables.
      setSelectedFloorId((prev) => prev ?? data[0]?.id ?? null);
    } catch {
      setFloors([]);
    } finally {
      setFloorsLoading(false);
    }
  }

  function loadTables(floorId) {
    setTablesLoading(true);
    getTablesBoard(floorId ? { floorId } : {})
      .then(setTables)
      .catch(() => setTables([]))
      .finally(() => setTablesLoading(false));
  }

  useEffect(() => {
    if (!selectedFloorId) {
      setTables([]);
      setTablesLoading(false);
      return;
    }
    loadTables(selectedFloorId);
  }, [selectedFloorId]);

  // Sort a copy — never mutate state directly. Ties (e.g. two FREE tables)
  // fall back to name so the order stays stable/predictable.
  const sortedTables = [...tables].sort((a, b) => {
    const rankDiff = (STATUS_SORT_RANK[a.status] ?? 99) - (STATUS_SORT_RANK[b.status] ?? 99);
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name);
  });

  function handleManagerClose() {
    setShowManager(false);
    loadFloors(); // pick up any new/renamed/deleted floors made in the modal
    if (selectedFloorId) loadTables(selectedFloorId); // ...and any table adds/edits/deletes
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">Select a floor</span>
        {/* <button
          onClick={() => setShowManager(true)}
          className="flex items-center gap-1 rounded-lg bg-[#1C3044] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#27435B]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Table
        </button> */}
      </div>

      {floorsLoading ? (
        <div className="text-sm text-slate-400">Loading floors…</div>
      ) : floors.length === 0 ? (
        <div className="text-sm text-slate-400">No floors set up yet. Add a table to create one.</div>
      ) : (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {floors.map((floor) => (
            <button
              key={floor.id}
              onClick={() => setSelectedFloorId(floor.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedFloorId === floor.id
                  ? "bg-[#1C3044] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {floor.name}
            </button>
          ))}
        </div>
      )}

      {floors.length > 0 && (
        <>
          <span className="mb-2 block text-xs font-medium text-slate-400">Select a table</span>

          {tablesLoading ? (
            <div className="text-sm text-slate-400">Loading tables…</div>
          ) : sortedTables.length === 0 ? (
            <div className="text-sm text-slate-400">No tables on this floor yet.</div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sortedTables.map((t) => {
                const isSelected = t.id === selectedTableId;
                const isReserved = t.status === "RESERVED";
                return (
                  <button
                    key={t.id}
                    disabled={isReserved && !isSelected}
                    onClick={() => onSelect(t)}
                    className={`shrink-0 rounded-lg border px-3 py-2 font-mono text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : STATUS_STYLE[t.status] || STATUS_STYLE.FREE
                    }`}
                  >
                    {t.name}
                    {t.capacity ? <span className="ml-1 text-xs opacity-70">· {t.capacity}p</span> : null}
                    {t.status === "OCCUPIED" && !isSelected && (
                      <span className="ml-1 text-xs font-semibold">· Add items</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <TableManagerModal isOpen={showManager} onClose={handleManagerClose} defaultFloorId={selectedFloorId} />
    </div>
  );
}