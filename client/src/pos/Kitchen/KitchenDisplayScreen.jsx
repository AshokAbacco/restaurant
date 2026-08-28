//client\src\pos\Kitchen\KitchenDisplayScreen.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { WifiOff } from "lucide-react";
import KotCard from "./Kotcard";
import {
  getKitchenDisplay,
  addKitchenNote,
  getKitchenBranches,
} from "../api/posApi";
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

// True lifecycle order, used to pick a group's status. Distinct from
// DISPLAY_RANK above, which deliberately flattens NEW/ACCEPTED/PREPARING
// into one visible "Pending" bucket for sorting.
const STAGE_RANK = {
  NEW: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  SERVED: 4,
  COMPLETED: 5,
};

// Most urgent first — matches PRIORITY_RANK in server/src/pos/kot/kot.service.js.
const PRIORITY_RANK = {
  VIP: 1,
  EXPRESS: 2,
  SENIOR_CITIZEN: 3,
  ONLINE_DELIVERY: 4,
  SPECIAL_REQUEST: 5,
  NORMAL: 99,
};

// ─────────────────────────────────────────────────────────────────────────
// FIX: one customer order was rendering as several cards.
//
// kot.service.js creates one KitchenOrder per kitchen section, because
// KitchenOrder.kitchenSectionId is required and the station tabs, station
// routing and per-station prep reports all depend on that split. An order
// with a grill item, a drink and a dessert is three rows in the database,
// and this screen was rendering one card per row — so ORD-000006 showed up
// as KOT-000008 (Arabic Coffee) and KOT-000009 (Chicken Shawarma, Mixed
// Grill Platter), with nothing tying them together for the kitchen.
//
// The database split is correct and stays. What changes is the display:
// tickets are collapsed by orderId into a single card carrying every item.
// Grouping here rather than in the API also means the station tabs keep
// working untouched — filter first, group second, so the Grill Station tab
// still shows one card per order containing only that station's items.
// ─────────────────────────────────────────────────────────────────────────
function groupKotsByOrder(kots) {
  const groups = new Map();

  for (const kot of kots) {
    // Real tickets group on orderId. Offline placeholders (see
    // getQueuedKots in offlineQueue.js) have no server order yet, so they
    // group on the clientRequestId that will become one.
    const key =
      kot.orderId ||
      kot.order?.id ||
      (kot.clientRequestId ? `offline-${kot.clientRequestId}` : kot.id);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        orderId: kot.orderId || kot.order?.id || null,
        clientRequestId: kot.clientRequestId || null,
        order: kot.order,
        kots: [],
        kotNumbers: [],
        sections: [],
        notes: [],
        awaitingCreate: false,
      });
    }

    const group = groups.get(key);
    group.kots.push(kot);
    group.kotNumbers.push(kot.kotNumber);
    group.sections.push({
      id: kot.kitchenSectionId,
      name: kot.kitchenSection?.name || "Kitchen",
      items: kot.items || [],
    });
    group.notes.push(...(kot.notes || []));
    if (kot.awaitingCreate) group.awaitingCreate = true;
    // A queued placeholder carries less order detail than a real ticket;
    // keep whichever object actually has an orderNumber.
    if (!group.order?.orderNumber && kot.order?.orderNumber) {
      group.order = kot.order;
    }
  }

  for (const group of groups.values()) {
    const { kots: rows } = group;

    // The card shows the LEAST advanced ticket — the same rule the tables
    // board uses. An order isn't Ready until every station's ticket is,
    // and tapping Ready with a station still cooking would lie to the
    // waiter.
    group.status = rows.reduce(
      (least, k) =>
        (STAGE_RANK[k.status] ?? 99) < (STAGE_RANK[least] ?? 99)
          ? k.status
          : least,
      rows[0].status,
    );

    group.priority = rows.reduce(
      (top, k) =>
        (PRIORITY_RANK[k.priority] ?? 99) < (PRIORITY_RANK[top] ?? 99)
          ? k.priority
          : top,
      "NORMAL",
    );

    // Timer runs from when the order first hit the kitchen...
    group.createdAt = rows.reduce(
      (earliest, k) =>
        new Date(k.createdAt) < new Date(earliest) ? k.createdAt : earliest,
      rows[0].createdAt,
    );

    // ...and only freezes once EVERY station is done, at the last one's
    // timestamp. Freezing on the first would stop the clock while food was
    // still being cooked.
    const endTimes = rows.map((k) => k.completedAt || k.servedAt);
    group.frozenAt = endTimes.every(Boolean)
      ? endTimes.reduce((latest, t) =>
          new Date(t) > new Date(latest) ? t : latest,
        )
      : null;

    // Stations cook in parallel, so the order is due when the SLOWEST
    // station's target elapses — hence max, not sum.
    const targets = rows
      .map((k) => k.targetPrepMinutes)
      .filter((t) => typeof t === "number");
    group.targetPrepMinutes = targets.length ? Math.max(...targets) : null;

    group.sections.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    group.notes.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );
  }

  return Array.from(groups.values());
}

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
  // Which PHYSICAL kitchen this screen is showing. Persisted per-device: a
  // display mounted in the rooftop kitchen should still be showing the
  // rooftop after a browser restart, without anyone reconfiguring it.
  //
  // This is only a convenience filter. Staff pinned to a kitchen via
  // Employee.kitchenBranchId are enforced SERVER-side (see
  // kot.controller.js) — their assignment overrides whatever is chosen here,
  // so this control can't be used to peek at another kitchen.
  const [kitchenBranches, setKitchenBranches] = useState([]);
  const [activeKitchenBranchId, setActiveKitchenBranchId] = useState(
    () => localStorage.getItem("kds:kitchenBranchId") || "ALL",
  );

  useEffect(() => {
    getKitchenBranches()
      .then((b) => setKitchenBranches(Array.isArray(b) ? b : []))
      .catch(() => setKitchenBranches([]));
  }, []);

  useEffect(() => {
    localStorage.setItem("kds:kitchenBranchId", activeKitchenBranchId);
  }, [activeKitchenBranchId]);
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
      const branchId =
        activeKitchenBranchId === "ALL" ? null : activeKitchenBranchId;
      const { data, fromCache } = await fetchWithOfflineFallback(
        // Cache key includes the kitchen, or switching kitchens offline would
        // show the previous kitchen's tickets from cache.
        `kds:display:${branchId || "all"}`,
        () => getKitchenDisplay(undefined, branchId),
      );
      setKots(data);
      setIsOffline(fromCache);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeKitchenBranchId]);

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
  // createdAt sort in visibleTickets below re-orders everything anyway, so a
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

  // Station filter FIRST, then group — so the Grill Station tab shows one
  // card per order containing only the grill items, rather than the whole
  // order's contents under a grill heading.
  const visibleTickets = useMemo(() => {
    const filtered =
      activeSectionId === "ALL"
        ? allKots
        : allKots.filter((k) => k.kitchenSectionId === activeSectionId);

    return groupKotsByOrder(filtered).sort((a, b) => {
      // Pending -> Ready -> Served
      const rankDiff =
        (DISPLAY_RANK[a.status] ?? 0) - (DISPLAY_RANK[b.status] ?? 0);

      if (rankDiff !== 0) return rankDiff;

      // SERVED: newest completed first. Groups expose a single frozenAt
      // (the moment the LAST station finished) rather than the per-ticket
      // completedAt/servedAt the ungrouped list used to sort on.
      if (a.status === "SERVED" && b.status === "SERVED") {
        const aTime = new Date(a.frozenAt || a.createdAt).getTime();
        const bTime = new Date(b.frozenAt || b.createdAt).getTime();

        return bTime - aTime;
      }

      // Pending & Ready: oldest first
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [allKots, activeSectionId]);

  // Advancing acts on the whole ORDER: every station ticket in the card that
  // hasn't already reached the target status moves forward together. The
  // server's own KOT_STAGE_RANK guard makes a redundant call a harmless
  // no-op, but filtering here saves the round trips.
  async function handleAdvance(ticket, nextStatus) {
    const behind = ticket.kots.filter(
      (k) => (STAGE_RANK[k.status] ?? 0) < (STAGE_RANK[nextStatus] ?? 0),
    );
    if (behind.length === 0) return;

    setUpdatingId(ticket.key);
    try {
      // Queued/not-yet-synced tickets (awaitingCreate) don't exist on the
      // server yet — there's no real kotId to PATCH. Advance the status
      // LOCALLY instead (see advanceQueuedKotStatus in offlineQueue.js) so
      // Ready/Served genuinely work while still offline; it's replayed onto
      // the real KOT automatically once the underlying order syncs.
      const queued = behind.filter((k) => k.awaitingCreate);
      const live = behind.filter((k) => !k.awaitingCreate);

      for (const k of queued) {
        await advanceQueuedKotStatus(
          k.clientRequestId,
          k.kitchenSectionId,
          nextStatus,
        );
      }

      // updateKotStatusOffline tries the network first, and only falls
      // back to the local queue (+ an optimistic cache patch) on a
      // genuine connectivity failure — see kdsQueue.js.
      await Promise.all(
        live.map((k) => updateKotStatusOffline(k.id, nextStatus)),
      );

      if (queued.length) await loadQueued();
      if (live.length) {
        await load();
        await refreshPendingIds();
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  // Notes belong to a single KitchenOrder row in the schema, so a note added
  // from a grouped card is attached to the order's first station ticket. The
  // card merges notes from every ticket for display, so it shows up either
  // way.
  async function handleAddNote(ticket, note) {
    const target = ticket.kots.find((k) => !k.awaitingCreate);
    if (!target) return;
    await addKitchenNote(target.id, note);
    await load();
  }


  return (
    <div className="flex h-screen flex-col bg-[#F3F5EE] dark:bg-[#12160F]">
      <header className="border-b border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF6EC] dark:bg-[#43B75A]/10">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-[#3FA34D] dark:text-[#43B75A]"
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
              <h1 className="text-lg font-bold text-[#1F2937] dark:text-white">
                Kitchen Display
              </h1>
              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                {visibleTickets.length} active order
                {visibleTickets.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {error && (
            <p className="text-sm font-medium text-[#EF5350] dark:text-red-400">
              {error}
            </p>
          )}
        </div>
        {isOffline && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            <WifiOff className="h-3.5 w-3.5" />
            Offline — showing last-synced tickets plus any new orders placed on
            this device. Everything syncs automatically once back online.
          </div>
        )}
      </header>

      {/* Physical-kitchen selector. Only rendered when the outlet actually has
          more than one kitchen — a single-kitchen restaurant never sees it. */}
      {kitchenBranches.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E7EAE1] dark:border-[#262B24] bg-[#F8FAF6] dark:bg-[#12160F] px-6 py-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
            Kitchen
          </span>
          <button
            onClick={() => setActiveKitchenBranchId("ALL")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeKitchenBranchId === "ALL"
                ? "bg-[#1F2937] text-white dark:bg-white dark:text-[#12160F]"
                : "bg-white dark:bg-white/5 text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#E7EAE1] dark:hover:bg-white/10"
            }`}
          >
            All Kitchens
          </button>
          {kitchenBranches.map((k) => (
            <button
              key={k.id}
              onClick={() => setActiveKitchenBranchId(k.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeKitchenBranchId === k.id
                  ? "bg-[#1F2937] text-white dark:bg-white dark:text-[#12160F]"
                  : "bg-white dark:bg-white/5 text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#E7EAE1] dark:hover:bg-white/10"
              }`}
            >
              {k.name}
            </button>
          ))}
        </div>
      )}

      {sections.length > 0 && (
        <div className="flex gap-2 border-b border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] px-6 py-2">
          <button
            onClick={() => setActiveSectionId("ALL")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeSectionId === "ALL"
                ? "bg-[#3FA34D] text-white hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
                : "bg-[#F3F5EE] dark:bg-white/5 text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#E7EAE1] dark:hover:bg-white/10"
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
                  ? "bg-[#3FA34D] text-white hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
                  : "bg-[#F3F5EE] dark:bg-white/5 text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#E7EAE1] dark:hover:bg-white/10"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">
            Loading tickets…
          </p>
        ) : visibleTickets.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-[#9CA3AF] dark:text-[#6B7280]">
              No active tickets. All caught up.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleTickets.map((ticket) => (
              <KotCard
                key={ticket.key}
                ticket={ticket}
                onAdvance={handleAdvance}
                onAddNote={
                  canAddNotes && !ticket.awaitingCreate
                    ? handleAddNote
                    : undefined
                }
                updating={updatingId === ticket.key}
                // Any station ticket in this order awaiting sync marks the
                // whole card, since the card is the order.
                pendingSync={ticket.kots.some((k) => pendingKotIds.has(k.id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}