// src/pos/OrdersPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WifiOff } from "lucide-react";
import TableOrderCard, {
  deriveTableCategory,
  CATEGORY_RANK,
} from "./components/TableOrderCard";
import MoveKotItemsModal from "./components/MoveKotItemsModal";
import { getTablesBoard, getOrders, updateKotStatus } from "./api/posApi";
import { fetchWithOfflineFallback } from "../offline/offlineCache";
import {
  markOrderDeliveredOffline,
  getPendingOrderIds,
  subscribeToOrdersQueue,
} from "../offline/ordersQueue";
// FIX: an order queued offline patches the cached tables board (see
// patchCachedTableAfterOfflineOrder in offlineCache.js) but this page only
// re-reads that cache on its own poll/mount — subscribe so a newly placed
// offline order (or one that just synced) shows up here immediately too.
import { subscribeToQueue } from "../offline/offlineQueue";
// FIX: a Ready/Served tap on the Kitchen Display changes this table's
// kitchenStatus badge here too, but only the KDS itself was told about
// it (via load() in its own handler) — this board just polled every 8s
// blind to it. Subscribing means the badge updates immediately instead
// of lagging behind the kitchen by up to POLL_INTERVAL_MS.
import { subscribeToKdsQueue } from "../offline/kdsQueue";

const POLL_INTERVAL_MS = 8000;

// Statuses that mean "still on the board" for a takeaway or delivery
// order — mirrors Billings.jsx's ACTIVE_STATUSES. COMPLETED/CANCELLED/
// REFUNDED fall off.
const ACTIVE_ORDER_STATUSES = [
  "NEW",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "SERVED",
  "ON_HOLD",
  "OUT_FOR_DELIVERY",
];

// Mirrors deriveKitchenStatus in server/src/pos/tables/tables.service.js.
// The tables board computes this server-side, but /pos/orders returns raw
// orders, so takeaway and delivery cards derive it here from the same
// KitchenOrder rows the Kitchen Display reads. Showing the LEAST advanced
// ticket is deliberate — an order isn't really "Ready" until every kitchen
// section's ticket is ready.
const KITCHEN_STAGE_RANK = {
  NEW: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  SERVED: 4,
  COMPLETED: 5,
};

function deriveKitchenStatus(kitchenOrders) {
  const active = (kitchenOrders || []).filter((k) => k.status !== "CANCELLED");
  if (active.length === 0) return null;
  return active.reduce((least, k) =>
    (KITCHEN_STAGE_RANK[k.status] ?? 99) <
    (KITCHEN_STAGE_RANK[least.status] ?? 99)
      ? k
      : least,
  ).status;
}

// Normalizes a raw Order (takeaway or delivery) into the same shape
// TableOrderCard expects for a table: { id, name, section, capacity, order }.
// There's no real table backing these, so section/capacity are left blank —
// TableOrderCard already knows to hide them once it sees the order type.
//
// The `order` sub-object is also topped up with the three derived fields the
// tables board sends but /pos/orders doesn't: kitchenStatus, customerName
// and itemCount. Without itemCount the card's "Items" row rendered blank.
function orderToBoardItem(order) {
  return {
    id: order.id,
    name: order.orderNumber,
    section: null,
    capacity: null,
    order: {
      ...order,
      kitchenStatus: deriveKitchenStatus(order.kitchenOrders),
      customerName: order.customer?.name || null,
      itemCount: (order.items || []).reduce(
        (sum, i) => sum + (i.quantity || 0),
        0,
      ),
      // Same shape the tables board sends (see tables.service.js) so the
      // hover tooltip in TableOrderCard works identically for every card.
      itemLines: (order.items || []).map((i) => ({
        id: i.id,
        name: i.menuItem?.name || "Item",
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
      kitchenOrderIds: (order.kitchenOrders || []).map((k) => k.id),
      kitchenBranchName: order.kitchenBranch?.name || null,
      // Online Orders are stored as ordinary DELIVERY orders tagged with a
      // platform (see PosOrderScreen.jsx — the OrderType enum has no
      // "ONLINE" member). This flattened name is what the card badges.
      platformName: order.onlinePlatform?.name || null,
    },
  };
}

// An "online order" is a DELIVERY order that came in through an aggregator
// (Swiggy, Zomato, ...) rather than the restaurant's own delivery.
function isOnlineOrder(order) {
  return Boolean(order?.onlinePlatformId || order?.onlinePlatform);
}

// ─────────────────────────────────────────────────────────────────────────
// FIX: takeaway orders never appeared on this page.
//
// Takeaway is billed UP FRONT: PosOrderScreen hands off to /billing the
// moment the order is placed, and billing.service.js's completeBilling ends
// with updateOrderStatus(orderId, "COMPLETED"). So by the time the order
// reaches this board it is already COMPLETED — and the old filter kept only
// ACTIVE_ORDER_STATUSES, which excludes COMPLETED. Every takeaway order was
// therefore filtered out the instant it was paid for, which is why the
// header read "0 takeaway" while the Kitchen Display was still showing live
// takeaway tickets for the very same orders.
//
// Paid is not the same as finished. The food still has to be cooked and
// handed over, so the right question isn't "is the order still open?" but
// "is the KITCHEN still done with it?" — which is exactly what the Kitchen
// Display already tracks.
//
// Note this is not a problem for dine-in, which is billed at the END of
// service: a dine-in order goes COMPLETED only once it's genuinely finished,
// and it comes from the tables board anyway, not from this filter.
function isOnBoard(order) {
  if (["CANCELLED", "REFUNDED"].includes(order.status)) return false;
  if (ACTIVE_ORDER_STATUSES.includes(order.status)) return true;

  // Already billed. Keep it until the kitchen tickets are closed out —
  // which is what "Order Delivered" does (see handleOrderDelivered).
  if (order.status === "COMPLETED") {
    const kitchenStatus = deriveKitchenStatus(order.kitchenOrders);
    return kitchenStatus !== null && kitchenStatus !== "COMPLETED";
  }
  return false;
}

// Only today's orders are candidates. Without this bound, every takeaway
// order ever paid for whose tickets were left at SERVED would come back onto
// the board — the KDS's last button is "Served", so tickets don't reach
// COMPLETED on their own.
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const FILTERS = [
  { key: "ALL", label: "All Orders" },
  { key: "SERVING", label: "Serving" },
  { key: "PENDING", label: "Pending" },
  { key: "AVAILABLE", label: "Available" },
  { key: "TAKEAWAY", label: "Takeaway" },
  // Delivery shows EVERY delivery order, own-fleet and aggregator alike —
  // an online order is a delivery order, so it belongs here too. Online
  // then narrows that to just the aggregator-tagged ones.
  { key: "DELIVERY", label: "Delivery" },
  { key: "ONLINE", label: "Online Orders" },
];

// Tabs that show a flat list of orders rather than the table grid.
const ORDER_LIST_TABS = ["TAKEAWAY", "DELIVERY", "ONLINE"];

const EMPTY_MESSAGE = {
  TAKEAWAY: "No active takeaway orders.",
  DELIVERY: "No active delivery orders.",
  ONLINE: "No active online orders. Orders placed from the POS \u201cOnline Orders\u201d tab appear here.",
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [takeawayOrders, setTakeawayOrders] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("ALL");

  // Which order is currently having its status updated — disables just that
  // card's button instead of freezing the whole board.
  const [completingOrderId, setCompletingOrderId] = useState(null);

  // Lightweight "Completed Orders / History" panel for takeaway, fetched
  // lazily since it's only relevant once someone actually wants to look back.
  const [showCompletedTakeaway, setShowCompletedTakeaway] = useState(false);
  const [completedTakeaway, setCompletedTakeaway] = useState([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedError, setCompletedError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  // orderIds with a "delivered" update queued but not yet synced.
  const [pendingOrderIds, setPendingOrderIds] = useState(new Set());

  // Phase 1.4 — "Move KOT/Items" dialog
  const [showMoveModal, setShowMoveModal] = useState(false);

  const loadTables = useCallback(async () => {
    const { data, fromCache } = await fetchWithOfflineFallback(
      "orders:tables-board",
      getTablesBoard,
    );
    if (fromCache) setIsOffline(true);
    return data;
  }, []);

  const loadTakeaway = useCallback(async () => {
    const { data, fromCache } = await fetchWithOfflineFallback(
      "orders:takeaway",
      async () => {
        const res = await getOrders({
          orderType: "TAKEAWAY",
          from: startOfToday(),
          limit: 100,
        });
        return (res?.data || []).filter(isOnBoard);
      },
    );
    if (fromCache) setIsOffline(true);
    return data;
  }, []);

  // FIX: delivery orders were never fetched at all, which is why nothing
  // placed from the POS "Online Orders" tab ever appeared on this page —
  // those are saved as DELIVERY orders tagged with an onlinePlatformId, and
  // this board only ever asked for tables and TAKEAWAY.
  const loadDelivery = useCallback(async () => {
    const { data, fromCache } = await fetchWithOfflineFallback(
      "orders:delivery",
      async () => {
        const res = await getOrders({
          orderType: "DELIVERY",
          from: startOfToday(),
          limit: 100,
        });
        return (res?.data || []).filter(isOnBoard);
      },
    );
    if (fromCache) setIsOffline(true);
    return data;
  }, []);

  const load = useCallback(async () => {
    const [tablesResult, takeawayResult, deliveryResult] =
      await Promise.allSettled([loadTables(), loadTakeaway(), loadDelivery()]);

    if (tablesResult.status === "fulfilled") {
      setTables(tablesResult.value);
    }
    if (takeawayResult.status === "fulfilled") {
      setTakeawayOrders(takeawayResult.value);
    }
    if (deliveryResult.status === "fulfilled") {
      setDeliveryOrders(deliveryResult.value);
    }

    const failure = [tablesResult, takeawayResult, deliveryResult].find(
      (r) => r.status === "rejected",
    );
    setError(failure ? failure.reason.message : null);
    setLoading(false);
  }, [loadTables, loadTakeaway, loadDelivery]);

  const refreshPendingIds = useCallback(async () => {
    setPendingOrderIds(await getPendingOrderIds());
  }, []);

  useEffect(() => {
    load();
    refreshPendingIds();
    const id = setInterval(load, POLL_INTERVAL_MS);
    const unsubscribe = subscribeToOrdersQueue(refreshPendingIds);
    const unsubscribeOrdersOutbox = subscribeToQueue(load);
    const unsubscribeKds = subscribeToKdsQueue(load);
    return () => {
      clearInterval(id);
      unsubscribe();
      unsubscribeOrdersOutbox();
      unsubscribeKds();
    };
  }, [load, refreshPendingIds]);

  const loadCompletedTakeaway = useCallback(async () => {
    setCompletedLoading(true);
    setCompletedError(null);
    try {
      const data = await getOrders({
        orderType: "TAKEAWAY",
        status: "COMPLETED",
        limit: 20,
      });
      setCompletedTakeaway(data?.data || []);
    } catch (err) {
      setCompletedError(err.message);
    } finally {
      setCompletedLoading(false);
    }
  }, []);

  function toggleCompletedTakeaway() {
    const next = !showCompletedTakeaway;
    setShowCompletedTakeaway(next);
    if (next) loadCompletedTakeaway();
  }

  // Dine-in only: unchanged from before — navigates to Billing, which is
  // still where a dine-in order gets its bill and payment.
  function handleCompleteService(orderId) {
    navigate(`/billing?orderId=${orderId}`);
  }

  // Takeaway only: already billed and paid up front (see Billings.jsx), so
  // "delivered" just closes the order out directly — no billing step.
  // markOrderDeliveredOffline tries the network first and only falls back
  // to the local queue (+ an optimistic cache patch) on a genuine
  // connectivity failure — see ordersQueue.js.
  async function handleOrderDelivered(orderId) {
    const order = [...takeawayOrders, ...deliveryOrders].find(
      (o) => o.id === orderId,
    );

    setCompletingOrderId(orderId);
    try {
      if (order?.status === "COMPLETED") {
        // Already billed and closed (takeaway/online are paid up front), so
        // there's no order status left to change — marking it delivered
        // means closing out the kitchen tickets. That's also what takes it
        // off this board, via isOnBoard above.
        const openKotIds = (order.kitchenOrders || [])
          .filter((k) => k.status !== "COMPLETED" && k.status !== "CANCELLED")
          .map((k) => k.id);
        await Promise.all(
          openKotIds.map((id) =>
            updateKotStatus(id, "COMPLETED", "Handed to customer"),
          ),
        );
      } else {
        await markOrderDeliveredOffline(orderId);
      }
      // Drop it from the active lists immediately rather than waiting up to
      // POLL_INTERVAL_MS for the next poll. Delivery orders close out the
      // same way takeaway does — see TableOrderCard for which order types
      // get the "Mark Delivered" button versus a trip to Billing.
      setTakeawayOrders((prev) => prev.filter((o) => o.id !== orderId));
      setDeliveryOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (showCompletedTakeaway) loadCompletedTakeaway();
      await refreshPendingIds();
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCompletingOrderId(null);
    }
  }

  const occupiedTableCount = tables.filter((t) => t.order).length;
  const onlineOrderCount = deliveryOrders.filter(isOnlineOrder).length;

  const visibleItems = useMemo(() => {
    const takeawayItems = takeawayOrders.map(orderToBoardItem);
    const deliveryItems = deliveryOrders.map(orderToBoardItem);

    // The three order-list tabs are flat lists, not the table grid, so they
    // short-circuit before any table gets mixed in.
    if (filter === "TAKEAWAY") return takeawayItems;
    if (filter === "DELIVERY") return deliveryItems;
    if (filter === "ONLINE")
      return deliveryItems.filter((i) => isOnlineOrder(i.order));

    const combined = [...tables, ...takeawayItems, ...deliveryItems];
    const filtered =
      filter === "ALL"
        ? combined
        : combined.filter((t) => deriveTableCategory(t) === filter);

    return filtered
      .slice()
      .sort(
        (a, b) =>
          CATEGORY_RANK[deriveTableCategory(a)] -
          CATEGORY_RANK[deriveTableCategory(b)],
      );
  }, [tables, takeawayOrders, deliveryOrders, filter]);

  const isTakeawayTab = filter === "TAKEAWAY";
  const isOrderListTab = ORDER_LIST_TABS.includes(filter);

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
                <path
                  d="M4 6h16M4 12h16M4 18h7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1F2937] dark:text-white">Orders</h1>
              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                {occupiedTableCount} active table
                {occupiedTableCount === 1 ? "" : "s"} of {tables.length} ·{" "}
                {takeawayOrders.length} takeaway ·{" "}
                {deliveryOrders.length} delivery
                {onlineOrderCount > 0 ? ` (${onlineOrderCount} online)` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMoveModal(true)}
              disabled={occupiedTableCount === 0}
              className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-3 py-1.5 text-sm font-semibold text-[#6B7280] dark:text-[#9CA8A0] transition-colors hover:bg-[#F3F5EE] dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Move KOT / Items
            </button>
            {error && <p className="text-sm font-medium text-[#EF5350] dark:text-red-400">{error}</p>}
          </div>
        </div>

        {isOffline && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            <WifiOff className="h-3.5 w-3.5" />
            Offline — showing last-synced orders. "Order Delivered" will sync
            automatically once back online.
          </div>
        )}

        <div className="mt-3 flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-[#3FA34D] text-white hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
                  : "bg-[#F3F5EE] dark:bg-white/5 text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#E7EAE1] dark:hover:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">Loading orders…</p>
        ) : visibleItems.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-center text-[#9CA3AF] dark:text-[#6B7280]">
              {EMPTY_MESSAGE[filter] || "No orders match this filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleItems.map((item) => {
              const type = item.order?.orderType;
              const isOrderCard = type === "TAKEAWAY" || type === "DELIVERY";
              return (
                <TableOrderCard
                  key={`${isOrderCard ? "order" : "table"}-${item.id}`}
                  table={item}
                  onCompleteService={handleCompleteService}
                  onOrderDelivered={handleOrderDelivered}
                  completing={completingOrderId === item.order?.id}
                  pendingSync={
                    isOrderCard && pendingOrderIds.has(item.order?.id)
                  }
                />
              );
            })}
          </div>
        )}

        {isTakeawayTab && (
          <div className="mt-8">
            <button
              onClick={toggleCompletedTakeaway}
              className="text-sm font-semibold text-[#3FA34D] dark:text-[#43B75A] hover:underline"
            >
              {showCompletedTakeaway
                ? "Hide completed orders"
                : "Show completed orders"}
            </button>

            {showCompletedTakeaway && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17]">
                <div className="border-b border-[#E7EAE1] dark:border-[#262B24] bg-[#F3F5EE] dark:bg-white/5 px-4 py-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#9CA8A0]">
                    Completed Takeaway Orders
                  </h2>
                </div>
                {completedLoading ? (
                  <p className="p-4 text-sm text-[#9CA3AF] dark:text-[#6B7280]">Loading…</p>
                ) : completedError ? (
                  <p className="p-4 text-sm font-medium text-[#EF5350] dark:text-red-400">
                    {completedError}
                  </p>
                ) : completedTakeaway.length === 0 ? (
                  <p className="p-4 text-sm text-[#9CA3AF] dark:text-[#6B7280]">
                    No completed takeaway orders yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
                    {completedTakeaway.map((order) => (
                      <li
                        key={order.id}
                        className="flex items-center justify-between px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-mono text-xs font-medium text-[#6B7280] dark:text-[#9CA8A0]">
                            {order.orderNumber}
                          </p>
                          <p className="font-medium text-[#1F2937] dark:text-white">
                            {order.customerName || "Walk-in"}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="rounded-full border border-[#E7EAE1] dark:border-[#262B24] bg-[#F3F5EE] dark:bg-white/5 px-2.5 py-1 text-xs font-semibold text-[#6B7280] dark:text-[#9CA8A0]">
                            Completed
                          </span>
                          <span className="font-mono text-sm font-bold text-[#3FA34D] dark:text-[#43B75A]">
                            ₹{Number(order.grandTotal).toFixed(2)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <MoveKotItemsModal
        open={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        tables={tables}
        onMoved={load}
      />
    </div>
  );
}