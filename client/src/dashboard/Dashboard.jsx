// ==============================================
// src/dashboard/Dashboard.jsx
// ==============================================
//
// Table View — the screen the restaurant actually runs on. Every table in
// the building, grouped by floor, colour-coded by where it is in its
// lifecycle, with the two actions staff take all day (print the bill, open
// the order) on the card itself.
//
// The analytics dashboard this replaced is still here, at
// /dashboard/analytics — see dashboardRoutes.jsx.
//
// A NOTE ON "SAVE"
// ----------------
// completeBilling closes the order, raises the invoice, records payment and
// frees the table in a single server transaction, so by the time a card
// turns orange the order is already on the Payments page. Save is an
// acknowledgement — it clears the card off the board — and it's currently
// remembered per-device in localStorage (see utils/tableStatus.js). Making
// it shared across terminals means adding a `clearedAt` column to Order,
// which needs a migration.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiRefreshCw, FiWifiOff } from "react-icons/fi";

import {
  getTablesBoard,
  getOrders,
  getOnlinePlatforms,
} from "../pos/api/posApi";
import MoveKotItemsModal from "../pos/components/MoveKotItemsModal";
import { fetchWithOfflineFallback } from "../offline/offlineCache";

import FloorTableCard from "./components/FloorTableCard";
import CounterOrderCard from "./components/CounterOrderCard";
import NewOrderTile from "./components/NewOrderTile";
import {
  TABLE_STATE_META,
  TABLE_STATE_ORDER,
  cardOrder,
  deriveTableState,
  minutesSince,
  normalizeCounterOrder,
  readClearedOrderIds,
  writeClearedOrderIds,
} from "./utils/tableStatus";

// Matches the Orders page. Frequent enough that a bill raised on another
// terminal shows up before anyone notices it hasn't, cheap enough to leave
// running on a tablet all service.
const POLL_INTERVAL_MS = 15000;

// Elapsed times are minutes, so re-deriving them every 30s keeps every card
// within half a minute of correct without re-rendering the grid constantly.
const CLOCK_INTERVAL_MS = 30000;

// Tables with no floor set still have to go somewhere. "Other" is what the
// reference layout calls the same bucket.
const UNGROUPED_KEY = "__ungrouped__";
const UNGROUPED_LABEL = "Other";

const Dashboard = () => {
  const navigate = useNavigate();

  const [tables, setTables] = useState([]);
  const [takeawayOrders, setTakeawayOrders] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);

  // Every platform the outlet has configured, not just the ones with an
  // order right now. Swiggy and Zomato need to be on screen at 11am with
  // nothing on them — an empty section is what tells you there's nothing
  // waiting, where a missing section just looks like the page didn't load.
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isOffline, setIsOffline] = useState(false);

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [clearedOrderIds, setClearedOrderIds] = useState(() =>
    readClearedOrderIds(),
  );

  // Drives the elapsed-minute recalculation below. A counter rather than a
  // Date, since nothing renders the value itself.
  const [, setTick] = useState(0);

  // Guards against overlapping loads. If a refresh ever takes longer than
  // the poll interval, every tick would queue another one on top of the one
  // still running — so a single slow response turns into a pile-up that
  // makes the page slower the longer it's left open. A ref, not state,
  // because the check has to be synchronous.
  const inFlight = useRef(false);

  // ==========================================
  // LOAD
  // ==========================================

  const load = useCallback(async ({ silent = true } = {}) => {
    // A manual refresh press is worth waiting for; a background poll that
    // lands on a busy moment is not — there'll be another in 15 seconds.
    if (inFlight.current && silent) return;
    inFlight.current = true;

    if (!silent) setRefreshing(true);

    try {
      // Today only. Takeaway is billed up front, so an outlet doing 300
      // covers a day would otherwise pull months of closed orders down to
      // render a counter that only ever shows the last few.
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      // view=board: the slim card-shaped payload. The default response
      // carries every order's items, add-ons and menu items, which is
      // megabytes of JSON to draw cards that show four fields each — and
      // this refetches every 15 seconds.
      const counterParams = {
        from: dayStart.toISOString(),
        limit: 100,
        view: "board",
      };

      // The board is the one that matters — if the counter lists fail, the
      // floor should still render, so their rejections are caught
      // individually rather than taking the whole load down with them.
      const [board, takeaway, delivery, platformList] = await Promise.all([
        fetchWithOfflineFallback("dashboard:tables-board", getTablesBoard),
        getOrders({ ...counterParams, orderType: "TAKEAWAY" }).catch(() => null),
        getOrders({ ...counterParams, orderType: "DELIVERY" }).catch(() => null),
        getOnlinePlatforms({ activeOnly: true }).catch(() => null),
      ]);

      setTables(Array.isArray(board.data) ? board.data : []);
      setIsOffline(Boolean(board.fromCache));

      // listOrders paginates, so the rows are under `data`.
      const rows = (result) =>
        Array.isArray(result) ? result : result?.data || [];
      if (takeaway) setTakeawayOrders(rows(takeaway));
      if (delivery) setDeliveryOrders(rows(delivery));
      if (platformList) setPlatforms(rows(platformList));

      setError("");
    } catch (err) {
      setError(err.message || "Couldn't load the floor.");
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(() => load(), POLL_INTERVAL_MS);
    const clock = setInterval(() => setTick((n) => n + 1), CLOCK_INTERVAL_MS);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load]);

  // ==========================================
  // GROUP BY FLOOR
  // ==========================================

  const floors = useMemo(() => {
    const groups = new Map();

    for (const table of tables) {
      const key = table.floorId || UNGROUPED_KEY;
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          name: table.floorName || UNGROUPED_LABEL,
          tables: [],
        });
      }
      groups.get(key).tables.push(table);
    }

    // Floors keep whatever order the board returned them in; the
    // unassigned bucket always lands last, since it's a leftover rather
    // than a place in the restaurant.
    return [...groups.values()].sort((a, b) => {
      if (a.id === UNGROUPED_KEY) return 1;
      if (b.id === UNGROUPED_KEY) return -1;
      return 0;
    });
  }, [tables]);

  // Every card's derived state, computed once per load so the legend counts
  // and the cards themselves are always reading the same numbers.
  const cardsByTableId = useMemo(() => {
    const map = new Map();
    for (const table of tables) {
      const order = cardOrder(table, clearedOrderIds);
      map.set(table.id, {
        order,
        state: deriveTableState(order),
        elapsedMinutes: order ? minutesSince(order.createdAt) : null,
      });
    }
    return map;
    // `clearedOrderIds` is a Set replaced wholesale on change, so identity
    // comparison is enough here.
  }, [tables, clearedOrderIds]);

  // Takeaway and delivery cards, shaped exactly like the table cards so the
  // same card state, colours and counts apply. Cancelled and refunded orders
  // drop out entirely; completed ones stay until Save clears them, matching
  // how a paid table behaves on the floor above.
  const buildCounterCards = (orders) =>
    orders
      .filter((o) => !["CANCELLED", "REFUNDED"].includes(o.status))
      .filter((o) => !clearedOrderIds.has(o.id))
      .map((raw) => {
        const order = normalizeCounterOrder(raw);
        return {
          order,
          state: deriveTableState(order),
          elapsedMinutes: minutesSince(order.createdAt),
        };
      });

  const takeawayCards = useMemo(
    () => buildCounterCards(takeawayOrders),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [takeawayOrders, clearedOrderIds],
  );

  // Delivery is grouped by platform (Swiggy, Zomato, anything else the
  // outlet has configured) because that's how the money is reconciled and
  // how the packing station works — one platform's bag at a time.
  const deliveryGroups = useMemo(() => {
    const cards = buildCounterCards(deliveryOrders);
    const groups = new Map();

    // Seed a group for every configured platform first, so Swiggy and
    // Zomato hold their place on the screen whether or not either has an
    // order right now. Staff learn where a platform sits and reach for it;
    // groups that appear and vanish with the order flow can't be learned.
    for (const platform of platforms) {
      groups.set(platform.id, { id: platform.id, name: platform.name, cards: [] });
    }

    for (const card of cards) {
      const platform = card.order.onlinePlatform;
      // Orders taken over the phone have no platform. They're still
      // delivery, so they get their own group rather than being dropped.
      const key = platform?.id || "__direct__";
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          name: platform?.name || "Direct / Phone",
          cards: [],
        });
      }
      groups.get(key).cards.push(card);
    }

    // Direct/Phone is a fallback bucket rather than a platform, so it sits
    // last — and only appears when something is actually in it.
    return [...groups.values()]
      .filter((g) => g.id !== "__direct__" || g.cards.length > 0)
      .sort((a, b) => {
        if (a.id === "__direct__") return 1;
        if (b.id === "__direct__") return -1;
        return a.name.localeCompare(b.name);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryOrders, platforms, clearedOrderIds]);

  const counts = useMemo(() => {
    const tally = Object.fromEntries(
      TABLE_STATE_ORDER.map((state) => [state, 0]),
    );
    for (const card of cardsByTableId.values()) tally[card.state] += 1;

    // Counter orders count too — "3 running KOTs" should mean three tickets
    // in the kitchen, wherever they came from.
    for (const card of takeawayCards) tally[card.state] += 1;
    for (const group of deliveryGroups)
      for (const card of group.cards) tally[card.state] += 1;

    return tally;
  }, [cardsByTableId, takeawayCards, deliveryGroups]);

  // ==========================================
  // ACTIONS
  // ==========================================

  // Billing is where a dine-in bill is raised and printed — the same
  // destination the Orders page's "Complete Service" uses.
  const handlePrint = (order) => navigate(`/billing?orderId=${order.id}`);

  // POS opens with this table already selected, so an order is one tap from
  // being added to rather than four.
  const handleOpenTable = (table) => navigate(`/pos?tableId=${table.id}`);

  // Takeaway and delivery cards open the order itself rather than a table —
  // there's no table to preselect, and POS reads ?orderId= to load what's
  // already on it.
  const handleOpenOrder = (order) => navigate(`/pos?orderId=${order.id}`);

  function handleSave(order) {
    const next = new Set(clearedOrderIds);
    next.add(order.id);
    setClearedOrderIds(next);
    writeClearedOrderIds(next);
  }

  // Counts actual cards, not groups — delivery groups now exist for every
  // configured platform, so a group count would be non-zero on an outlet
  // that has Swiggy set up and nothing ordered.
  const hasCounterOrders =
    takeawayCards.length > 0 ||
    deliveryGroups.some((g) => g.cards.length > 0);
  const showEmptyState = !loading && tables.length === 0 && !hasCounterOrders;

  return (
    <div className="-m-3 min-h-screen bg-[#F3F5EE] p-3 transition-colors sm:-m-4 sm:p-4 lg:-m-6 lg:p-6 dark:bg-[#0D110C]">
      {/* ======================================
          PAGE HEADER
      ====================================== */}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[#1F2937] dark:text-white">
          Table View
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => load({ silent: false })}
            disabled={refreshing}
            aria-label="Refresh the floor"
            title="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7EAE1] bg-white text-[#6B7280] transition-colors hover:text-[#3FA34D] disabled:opacity-50 dark:border-[#262B24] dark:bg-[#171C17] dark:text-[#9CA8A0] dark:hover:text-[#43B75A]"
          >
            <FiRefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
          </button>

          <button
            type="button"
            onClick={() => navigate("/tables")}
            className="rounded-lg bg-[#3FA34D] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
          >
            Add Table
          </button>

          <button
            type="button"
            onClick={() => navigate("/pos?orderType=DELIVERY")}
            className="rounded-lg border border-[#E7EAE1] bg-white px-4 py-2 text-[14px] font-semibold text-[#1F2937] transition-colors hover:border-[#3FA34D] hover:text-[#3FA34D] dark:border-[#262B24] dark:bg-[#171C17] dark:text-white dark:hover:border-[#43B75A] dark:hover:text-[#43B75A]"
          >
            Delivery
          </button>

          <button
            type="button"
            onClick={() => navigate("/pos?orderType=TAKEAWAY")}
            className="rounded-lg border border-[#E7EAE1] bg-white px-4 py-2 text-[14px] font-semibold text-[#1F2937] transition-colors hover:border-[#3FA34D] hover:text-[#3FA34D] dark:border-[#262B24] dark:bg-[#171C17] dark:text-white dark:hover:border-[#43B75A] dark:hover:text-[#43B75A]"
          >
            Pick Up
          </button>
        </div>
      </div>

      {/* ======================================
          TOOLBAR — reservation / move / legend
      ====================================== */}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/table-reservations")}
            className="rounded-lg bg-[#3FA34D] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
          >
            + Table Reservation
          </button>

          <button
            type="button"
            onClick={() => setShowMoveModal(true)}
            className="rounded-full border border-[#E7EAE1] bg-white px-4 py-2 text-[12px] font-semibold text-[#1F2937] transition-colors hover:border-[#3FA34D] dark:border-[#262B24] dark:bg-[#171C17] dark:text-white dark:hover:border-[#43B75A]"
          >
            Move KOT / Items
          </button>
        </div>

        {/* The legend doubles as a live count — how many tables are cooking
            right now is one of the things this screen exists to answer. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {TABLE_STATE_ORDER.map((state) => (
            <span
              key={state}
              className="flex items-center gap-1.5 text-[12px] text-[#6B7280] dark:text-[#9CA8A0]"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${TABLE_STATE_META[state].swatch}`}
              />
              {TABLE_STATE_META[state].label}
              <span className="font-semibold text-[#1F2937] dark:text-white">
                {counts[state]}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* ======================================
          NOTICES
      ====================================== */}

      {isOffline && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-[#FDF6DC] px-3 py-2 text-[12px] font-medium text-[#8A6D0B] dark:bg-[#332C10] dark:text-[#F0DC96]">
          <FiWifiOff size={14} />
          Offline — showing the last synced floor. Amounts and statuses may
          have moved on.
        </div>
      )}

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-[#EF5350] dark:bg-red-500/10 dark:text-red-400">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => load({ silent: false })}
            className="font-semibold underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {/* ======================================
          FLOORS
      ====================================== */}

      {loading ? (
        <FloorSkeleton />
      ) : showEmptyState ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E7EAE1] py-16 text-center dark:border-[#262B24]">
          <p className="text-[14px] font-medium text-[#6B7280] dark:text-[#9CA8A0]">
            No tables yet. Add a floor and its tables to see them here.
          </p>
          <button
            type="button"
            onClick={() => navigate("/tables")}
            className="mt-4 rounded-lg bg-[#3FA34D] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
          >
            Add Table
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {floors.map((floor) => (
            <section key={floor.id}>
              <h2 className="mb-2 text-[14px] font-semibold text-[#1F2937] dark:text-white">
                {floor.name}
              </h2>

              {/* auto-fill rather than a fixed column count: a 90px minimum
                  means a phone gets 3 across and a POS monitor gets 16,
                  with no breakpoint list to keep in sync. */}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
                {floor.tables.map((table) => {
                  const card = cardsByTableId.get(table.id);
                  return (
                    <FloorTableCard
                      key={table.id}
                      table={table}
                      order={card.order}
                      state={card.state}
                      elapsedMinutes={card.elapsedMinutes}
                      onPrint={() => handlePrint(card.order)}
                      onView={() => handleOpenTable(table)}
                      onSave={() => handleSave(card.order)}
                      onOpen={() => handleOpenTable(table)}
                    />
                  );
                })}
              </div>
            </section>
          ))}

          {/* ============ TAKEAWAY ============ */}

          {/* Always rendered, empty or not. This section is part of the
              floor's layout, not a result of it — staff should be able to
              glance at the same spot every time and see either orders or
              nothing waiting. */}
          <section>
            <h2 className="mb-2 text-[14px] font-semibold text-[#1F2937] dark:text-white">
              Takeaway
              <span className="ml-2 text-[12px] font-normal text-[#6B7280] dark:text-[#9CA8A0]">
                {takeawayCards.length}
              </span>
            </h2>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
              {takeawayCards.map((card) => (
                <CounterOrderCard
                  key={card.order.id}
                  order={card.order}
                  state={card.state}
                  elapsedMinutes={card.elapsedMinutes}
                  onPrint={() => handlePrint(card.order)}
                  onView={() => handleOpenOrder(card.order)}
                  onSave={() => handleSave(card.order)}
                />
              ))}

              <NewOrderTile
                label="New Takeaway"
                onClick={() => navigate("/pos?orderType=TAKEAWAY")}
              />
            </div>
          </section>

          {/* ============ DELIVERY ============ */}

          <section>
              <h2 className="mb-2 text-[14px] font-semibold text-[#1F2937] dark:text-white">
                Delivery
              </h2>

              {/* One sub-heading per platform. Nested rather than flat
                  because a delivery rider asks for "the Zomato order", and
                  the counter reconciles each platform's takings
                  separately. */}
              <div className="space-y-4">
                {deliveryGroups.map((group) => (
                  <div key={group.id}>
                    <h3 className="mb-2 text-[12px] font-semibold text-[#6B7280] dark:text-[#9CA8A0]">
                      {group.name}
                      <span className="ml-2 font-normal">
                        {group.cards.length}
                      </span>
                    </h3>

                    <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
                      {group.cards.map((card) => (
                        <CounterOrderCard
                          key={card.order.id}
                          order={card.order}
                          state={card.state}
                          elapsedMinutes={card.elapsedMinutes}
                          onPrint={() => handlePrint(card.order)}
                          onView={() => handleOpenOrder(card.order)}
                          onSave={() => handleSave(card.order)}
                        />
                      ))}

                      {/* Direct/Phone is a catch-all for orders that
                          arrived without a platform, so there's nothing
                          sensible to preselect — no tile there. */}
                      {group.id !== "__direct__" && (
                        <NewOrderTile
                          label={`New ${group.name}`}
                          onClick={() =>
                            navigate(
                              `/pos?orderType=DELIVERY&platformId=${group.id}`,
                            )
                          }
                        />
                      )}
                    </div>
                  </div>
                ))}

                {/* No platforms configured yet — point at where they're
                    added rather than showing an empty Delivery heading with
                    nothing under it. */}
                {deliveryGroups.length === 0 && (
                  <p className="text-[12px] text-[#6B7280] dark:text-[#9CA8A0]">
                    No delivery platforms set up yet. Add Swiggy, Zomato or
                    another platform from the POS screen's Delivery tab and
                    orders will group here.
                  </p>
                )}
              </div>
            </section>
        </div>
      )}

      {/* ======================================
          MOVE KOT / ITEMS
      ====================================== */}

      <MoveKotItemsModal
        open={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        tables={tables}
        onMoved={() => load({ silent: false })}
      />
    </div>
  );
};

// Mirrors the real grid's shape so the layout doesn't jump when data lands.
const FloorSkeleton = () => (
  <div className="space-y-6">
    {[0, 1].map((section) => (
      <div key={section}>
        <div className="mb-2 h-4 w-28 animate-pulse rounded bg-[#E7EAE1] dark:bg-[#262B24]" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="h-[104px] animate-pulse rounded-lg bg-[#E7EAE1] dark:bg-[#1B211A]"
            />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default Dashboard;