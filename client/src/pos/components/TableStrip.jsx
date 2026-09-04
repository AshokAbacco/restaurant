// src/pos/components/TableStrip.jsx
import { useEffect, useRef, useState } from "react";
import { Plus, WifiOff } from "lucide-react";
import { getTablesBoard, getFloors } from "../api/posApi";
import TableManagerModal from "./TableManagerModal";
import { fetchWithOfflineFallback } from "../../offline/offlineCache";
import { subscribeToQueue } from "../../offline/offlineQueue";

const STATUS_STYLE = {
  FREE: "border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] text-[#1F2937] dark:text-[#9CA8A0] hover:border-[#3FA34D] dark:hover:border-[#43B75A]",
  OCCUPIED:
    "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:border-amber-400",
  RESERVED:
    "border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 cursor-not-allowed opacity-60",
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
//
// FEATURE: offline mode, phase 1 step 7. Floors/tables fall back to the
// last-synced cache when the network fails. IMPORTANT: that cached
// FREE/OCCUPIED status can be stale (another device may have occupied a
// table since the last sync) — so while offline, tapping an OCCUPIED table
// to "add items to an existing order" is disabled entirely. Only starting
// a brand-new order on a table shown as FREE is supported offline; that's
// the one flow the offline queue (offlineQueue.js) actually knows how to
// replay safely.
// `initialFloorId` lets a deep link (Table View -> POS) open the strip on
// the floor its table actually lives on, instead of defaulting to the first
// floor and leaving the selected table hidden under another tab.
export default function TableStrip({
  selectedTableId,
  initialFloorId = null,
  onSelect,
}) {
  const [floors, setFloors] = useState([]);
  const [floorsLoading, setFloorsLoading] = useState(true);
  const [selectedFloorId, setSelectedFloorId] = useState(null);

  // Whether the person has picked a floor tab themselves. loadFloors
  // defaults to the first floor immediately, so without this the deep-linked
  // floor (which resolves a beat later, from a separate request) would find
  // selectedFloorId already set and quietly do nothing.
  const floorChosenByUser = useRef(false);

  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [showManager, setShowManager] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    loadFloors();
  }, []);

  async function loadFloors() {
    setFloorsLoading(true);
    try {
      const { data, fromCache } = await fetchWithOfflineFallback(
        "floors",
        getFloors,
      );
      setFloors(data);
      if (fromCache) setIsOffline(true);
      // Default to the first floor rather than an "all floors" view — the
      // point of this step is picking one floor before seeing its tables.
      setSelectedFloorId((prev) => prev ?? initialFloorId ?? data[0]?.id ?? null);
    } catch {
      setFloors([]);
    } finally {
      setFloorsLoading(false);
    }
  }

  function loadTables(floorId) {
    setTablesLoading(true);
    fetchWithOfflineFallback(`tables:${floorId}`, () =>
      getTablesBoard(floorId ? { floorId } : {}),
    )
      .then(({ data, fromCache }) => {
        setTables(data);
        if (fromCache) setIsOffline(true);
      })
      .catch(() => setTables([]))
      .finally(() => setTablesLoading(false));
  }

  // The deep-linked floor usually resolves a beat after floors load, since
  // it comes from a separate board request — so this overrides the default
  // first-floor selection, but never a deliberate one.
  useEffect(() => {
    if (!initialFloorId || floorChosenByUser.current) return;
    setSelectedFloorId(initialFloorId);
  }, [initialFloorId]);

  useEffect(() => {
    if (!selectedFloorId) {
      setTables([]);
      setTablesLoading(false);
      return;
    }
    loadTables(selectedFloorId);
    // FIX: without this, placing an offline order left this same screen
    // still showing the table as FREE (the cache patch happens, but
    // nothing told this component to re-read it) — a waiter could tap it
    // again and queue a duplicate order on the same table before ever
    // reloading. Re-reads from the (now-patched) cache the instant an
    // order is queued or synced.
    const unsubscribe = subscribeToQueue(() => loadTables(selectedFloorId));
    return unsubscribe;
  }, [selectedFloorId]);

  // Sort a copy — never mutate state directly. Ties (e.g. two FREE tables)
  // fall back to name so the order stays stable/predictable.
  const sortedTables = [...tables].sort((a, b) => {
    const rankDiff =
      (STATUS_SORT_RANK[a.status] ?? 99) - (STATUS_SORT_RANK[b.status] ?? 99);
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
      {isOffline && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          <WifiOff className="h-3.5 w-3.5" />
          Offline — showing last-synced tables. Occupied tables can't be added
          to until back online.
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[#9CA3AF] dark:text-[#6B7280]">
          Select a floor
        </span>
        {/* <button
          onClick={() => setShowManager(true)}
          className="flex items-center gap-1 rounded-xl bg-[#3FA34D] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Table
        </button> */}
      </div>

      {floorsLoading ? (
        <div className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">Loading floors…</div>
      ) : floors.length === 0 ? (
        <div className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">
          No floors set up yet. Add a table to create one.
        </div>
      ) : (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {floors.map((floor) => (
            <button
              key={floor.id}
              onClick={() => {
                floorChosenByUser.current = true;
                setSelectedFloorId(floor.id);
              }}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedFloorId === floor.id
                  ? "bg-[#3FA34D] text-white dark:bg-[#43B75A]"
                  : "bg-[#F3F5EE] dark:bg-white/5 text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#E7EAE1] dark:hover:bg-white/10"
              }`}
            >
              {floor.name}
            </button>
          ))}
        </div>
      )}

      {floors.length > 0 && (
        <>
          <span className="mb-2 block text-xs font-medium text-[#9CA3AF] dark:text-[#6B7280]">
            Select a table
          </span>

          {tablesLoading ? (
            <div className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">Loading tables…</div>
          ) : sortedTables.length === 0 ? (
            <div className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">
              No tables on this floor yet.
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sortedTables.map((t) => {
                const isSelected = t.id === selectedTableId;
                const isReserved = t.status === "RESERVED";
                // Offline + occupied = can't safely add to an existing
                // order (see file header) — disable it, same as RESERVED.
                const isLockedOffline =
                  isOffline && t.status === "OCCUPIED" && !isSelected;
                const isDisabled =
                  (isReserved && !isSelected) || isLockedOffline;
                return (
                  <button
                    key={t.id}
                    disabled={isDisabled}
                    title={
                      isLockedOffline
                        ? "Adding to an occupied table needs a connection"
                        : undefined
                    }
                    onClick={() => onSelect(t)}
                    className={`shrink-0 rounded-lg border px-3 py-2 font-mono text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-[#3FA34D] bg-[#3FA34D] text-white dark:border-[#43B75A] dark:bg-[#43B75A]"
                        : STATUS_STYLE[t.status] || STATUS_STYLE.FREE
                    } ${isLockedOffline ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    {t.name}
                    {t.capacity ? (
                      <span className="ml-1 text-xs opacity-70">
                        · {t.capacity}p
                      </span>
                    ) : null}
                    {t.status === "OCCUPIED" &&
                      !isSelected &&
                      !isLockedOffline && (
                        <span className="ml-1 text-xs font-semibold">
                          · Add items
                        </span>
                      )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <TableManagerModal
        isOpen={showManager}
        onClose={handleManagerClose}
        defaultFloorId={selectedFloorId}
      />
    </div>
  );
}