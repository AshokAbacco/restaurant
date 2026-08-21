//client\src\pos\Kitchen\KitchenDisplayScreen.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { WifiOff } from "lucide-react";
import KotCard from "./Kotcard";
import { getKitchenDisplay, addKitchenNote } from "../api/posApi";
import { useAuth } from "../../auth/AuthContext";
import { fetchWithOfflineFallback } from "../../offline/offlineCache";
import {
  updateKotStatusOffline,
  getPendingKotIds,
  subscribeToKdsQueue,
} from "../../offline/kdsQueue";
// FIX: orders placed while offline were queued in IndexedDB (see
// offlineQueue.js) but this screen only ever read getKitchenDisplay's
// cached SERVER response — so an order created offline never appeared
// here at all until it synced. getQueuedKots() turns those queued orders
// into the same shape as a real KOT (see kot.service.js's one-ticket-
// per-kitchen-section grouping) so they show up immediately, marked as
// "Awaiting sync" and not actionable until the real ticket exists.
import {
  getQueuedKots,
  subscribeToQueue,
  advanceQueuedKotStatus,
} from "../../offline/offlineQueue";

const POLL_INTERVAL_MS = 8000;

// Display grouping for the kitchen — Pending tickets need action first, Ready
// next (waiting for pickup), Served last (already done, lowest urgency).
// NEW/ACCEPTED/PREPARING all count as "Pending" here since the simplified
// workflow only exposes Pending -> Ready -> Served as visible stages.
const DISPLAY_RANK = { NEW: 0, ACCEPTED: 0, PREPARING: 0, READY: 1, SERVED: 2 };

export default function KitchenDisplayScreen() {
  const { isKitchen } = useAuth();
  // Only kitchen staff can write notes — owner/manager/cashier land on this
  // same screen but see notes read-only. The backend enforces this too
  // (POST /pos/kot/:id/notes is locked to KITCHEN), this just keeps the form
  // from being shown to someone who'd get a 403 for using it.
  const canAddNotes = isKitchen();

  const [kots, setKots] = useState([]);
  // Orders still sitting in the offline outbox, not yet created on the
  // server — see getQueuedKots() in offlineQueue.js. Kept separate from
  // `kots` (real server data) and merged in `allKots` below, so a failed
  // fetch/cache-miss never wipes these out.
  const [queuedKots, setQueuedKots] = useState([]);
  const [activeSectionId, setActiveSectionId] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  // kotIds with a status update queued but not yet synced — shown as a
  // small badge on the affected card so kitchen staff can tell "I tapped
  // this, it just hasn't reached the server yet" from "nothing happened."
  const [pendingKotIds, setPendingKotIds] = useState(new Set());

  const load = useCallback(async () => {
    try {
      const { data, fromCache } = await fetchWithOfflineFallback(
        "kds:display",
        getKitchenDisplay,
      );
      setKots(data);
      setIsOffline(fromCache);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadQueued = useCallback(async () => {
    setQueuedKots(await getQueuedKots());
  }, []);

  const refreshPendingIds = useCallback(async () => {
    setPendingKotIds(await getPendingKotIds());
  }, []);

  useEffect(() => {
    load();
    loadQueued();
    refreshPendingIds();
    const id = setInterval(load, POLL_INTERVAL_MS);
    // Re-check which tickets have a queued update whenever the KDS queue
    // changes (a tap queues one, a sync clears one) — independent of the
    // 8s poll, so the badge disappears the moment a sync actually succeeds.
    const unsubscribeKds = subscribeToKdsQueue(refreshPendingIds);
    // Re-read the offline outbox (AND re-fetch the server list) whenever
    // it changes — an order enqueued (this device or another tab on it),
    // synced, or retried. Both, not just loadQueued: once an order syncs,
    // its "Awaiting sync" placeholder needs to disappear (loadQueued) AND
    // the real ticket needs to appear right away (load) instead of
    // waiting up to POLL_INTERVAL_MS for the next scheduled poll.
    const unsubscribeOrders = subscribeToQueue(() => {
      load();
      loadQueued();
    });
    return () => {
      clearInterval(id);
      unsubscribeKds();
      unsubscribeOrders();
    };
  }, [load, loadQueued, refreshPendingIds]);

  // Combine server-confirmed tickets with still-queued (offline) ones.
  // Concatenation order here doesn't matter — the Pending/Ready/Served +
  // createdAt sort in visibleKots below re-orders everything anyway, so a
  // queued ticket lands wherever its timestamp actually puts it.
  const allKots = useMemo(() => [...queuedKots, ...kots], [queuedKots, kots]);

  // Sections are derived from whatever's actually on the board right now —
  // no separate kitchen-sections endpoint needed for this screen.
  const sections = useMemo(() => {
    const map = new Map();
    for (const kot of allKots) {
      if (kot.kitchenSection)
        map.set(kot.kitchenSection.id, kot.kitchenSection.name);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [allKots]);

  const visibleKots = useMemo(() => {
    const filtered =
      activeSectionId === "ALL"
        ? allKots
        : allKots.filter((k) => k.kitchenSectionId === activeSectionId);

    return filtered.slice().sort((a, b) => {
      // Pending -> Ready -> Served
      const rankDiff =
        (DISPLAY_RANK[a.status] ?? 0) - (DISPLAY_RANK[b.status] ?? 0);

      if (rankDiff !== 0) return rankDiff;

      // SERVED: newest completed first
      if (a.status === "SERVED" && b.status === "SERVED") {
        const aTime = new Date(
          a.completedAt || a.servedAt || a.updatedAt || a.createdAt,
        ).getTime();
        const bTime = new Date(
          b.completedAt || b.servedAt || b.updatedAt || b.createdAt,
        ).getTime();

        return bTime - aTime;
      }

      // Pending & Ready: oldest first
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [allKots, activeSectionId]);

  async function handleAdvance(kot, nextStatus) {
    // Queued/not-yet-synced tickets (awaitingCreate) don't exist on the
    // server yet — there's no real kotId to PATCH. Advance the status
    // LOCALLY instead (see advanceQueuedKotStatus in offlineQueue.js) so
    // Ready/Served genuinely work while still offline; it's replayed onto
    // the real KOT automatically once the underlying order syncs.
    if (kot.awaitingCreate) {
      await advanceQueuedKotStatus(
        kot.clientRequestId,
        kot.kitchenSectionId,
        nextStatus,
      );
      await loadQueued();
      return;
    }

    setUpdatingId(kot.id);
    try {
      // updateKotStatusOffline tries the network first, and only falls
      // back to the local queue (+ an optimistic cache patch) on a
      // genuine connectivity failure — see kdsQueue.js.
      await updateKotStatusOffline(kot.id, nextStatus);
      await load();
      await refreshPendingIds();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  // Adding a note doesn't touch `updating`/the button-disabled state — it's a
  // side conversation on the ticket, not a status change, so the Ready/Served
  // button stays clickable while a note is being typed elsewhere on the card.
  async function handleAddNote(id, note) {
    await addKitchenNote(id, note);
    await load();
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-blue-600"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="14"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Kitchen Display
              </h1>
              <p className="text-xs text-slate-400">
                {visibleKots.length} active ticket
                {visibleKots.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
        {isOffline && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            <WifiOff className="h-3.5 w-3.5" />
            Offline — showing last-synced tickets plus any new orders placed on
            this device. Everything syncs automatically once back online.
          </div>
        )}
      </header>

      {sections.length > 0 && (
        <div className="flex gap-2 border-b border-slate-200 bg-white px-6 py-2">
          <button
            onClick={() => setActiveSectionId("ALL")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeSectionId === "ALL"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Stations
          </button>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSectionId(s.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeSectionId === s.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                onAddNote={
                  canAddNotes && !kot.awaitingCreate ? handleAddNote : undefined
                }
                updating={updatingId === kot.id}
                pendingSync={pendingKotIds.has(kot.id)}
                awaitingCreate={kot.awaitingCreate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
