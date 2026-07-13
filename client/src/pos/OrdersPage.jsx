// src/pos/OrdersPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TableOrderCard, { deriveTableCategory, CATEGORY_RANK } from "./components/TableOrderCard";
import { getTablesBoard, getOrders, updateOrderStatus } from "./api/posApi";

const POLL_INTERVAL_MS = 8000;

// Statuses that mean "still on the board" for a takeaway order — mirrors
// Billings.jsx's ACTIVE_STATUSES. COMPLETED/CANCELLED/REFUNDED fall off.
const ACTIVE_TAKEAWAY_STATUSES = [
  "NEW",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "SERVED",
  "ON_HOLD",
  "OUT_FOR_DELIVERY",
];

// Normalizes a raw takeaway Order into the same shape TableOrderCard expects
// for a table: { id, name, section, capacity, order }. There's no real table
// backing a takeaway order, so section/capacity are just left blank —
// TableOrderCard already knows to hide them once it sees orderType TAKEAWAY.
function takeawayToBoardItem(order) {
  return {
    id: order.id,
    name: order.orderNumber,
    section: null,
    capacity: null,
    order,
  };
}

const FILTERS = [
  { key: "ALL", label: "All Orders" },
  { key: "SERVING", label: "Serving" },
  { key: "PENDING", label: "Pending" },
  { key: "AVAILABLE", label: "Available" },
  { key: "TAKEAWAY", label: "Takeaway" },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [takeawayOrders, setTakeawayOrders] = useState([]);
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

  const loadTables = useCallback(async () => {
    return getTablesBoard();
  }, []);

  const loadTakeaway = useCallback(async () => {
    const data = await getOrders({ orderType: "TAKEAWAY", limit: 100 });
    const list = data?.data || [];
    return list.filter((o) => ACTIVE_TAKEAWAY_STATUSES.includes(o.status));
  }, []);

  const load = useCallback(async () => {
    const [tablesResult, takeawayResult] = await Promise.allSettled([loadTables(), loadTakeaway()]);

    if (tablesResult.status === "fulfilled") {
      setTables(tablesResult.value);
    }
    if (takeawayResult.status === "fulfilled") {
      setTakeawayOrders(takeawayResult.value);
    }

    const failure = [tablesResult, takeawayResult].find((r) => r.status === "rejected");
    setError(failure ? failure.reason.message : null);
    setLoading(false);
  }, [loadTables, loadTakeaway]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  const loadCompletedTakeaway = useCallback(async () => {
    setCompletedLoading(true);
    setCompletedError(null);
    try {
      const data = await getOrders({ orderType: "TAKEAWAY", status: "COMPLETED", limit: 20 });
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
  async function handleOrderDelivered(orderId) {
    setCompletingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, "COMPLETED");
      // Drop it from the active takeaway list immediately rather than
      // waiting up to POLL_INTERVAL_MS for the next poll.
      setTakeawayOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (showCompletedTakeaway) loadCompletedTakeaway();
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCompletingOrderId(null);
    }
  }

  const occupiedTableCount = tables.filter((t) => t.order).length;

  const visibleItems = useMemo(() => {
    const takeawayItems = takeawayOrders.map(takeawayToBoardItem);

    if (filter === "TAKEAWAY") return takeawayItems;

    const combined = [...tables, ...takeawayItems];
    const filtered = filter === "ALL" ? combined : combined.filter((t) => deriveTableCategory(t) === filter);

    return filtered
      .slice()
      .sort((a, b) => CATEGORY_RANK[deriveTableCategory(a)] - CATEGORY_RANK[deriveTableCategory(b)]);
  }, [tables, takeawayOrders, filter]);

  const isTakeawayTab = filter === "TAKEAWAY";

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-blue-600">
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
              <h1 className="text-lg font-bold text-slate-900">Orders</h1>
              <p className="text-xs text-slate-400">
                {occupiedTableCount} active table{occupiedTableCount === 1 ? "" : "s"} of {tables.length} ·{" "}
                {takeawayOrders.length} active takeaway order{takeawayOrders.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>

        <div className="mt-3 flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading orders…</p>
        ) : visibleItems.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-slate-400">
              {isTakeawayTab ? "No active takeaway orders." : "No tables match this filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleItems.map((item) => {
              const isTakeawayCard = item.order?.orderType === "TAKEAWAY";
              return (
                <TableOrderCard
                  key={`${isTakeawayCard ? "takeaway" : "table"}-${item.id}`}
                  table={item}
                  onCompleteService={handleCompleteService}
                  onOrderDelivered={handleOrderDelivered}
                  completing={completingOrderId === item.order?.id}
                />
              );
            })}
          </div>
        )}

        {isTakeawayTab && (
          <div className="mt-8">
            <button
              onClick={toggleCompletedTakeaway}
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              {showCompletedTakeaway ? "Hide completed orders" : "Show completed orders"}
            </button>

            {showCompletedTakeaway && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Completed Takeaway Orders
                  </h2>
                </div>
                {completedLoading ? (
                  <p className="p-4 text-sm text-slate-400">Loading…</p>
                ) : completedError ? (
                  <p className="p-4 text-sm font-medium text-red-600">{completedError}</p>
                ) : completedTakeaway.length === 0 ? (
                  <p className="p-4 text-sm text-slate-400">No completed takeaway orders yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {completedTakeaway.map((order) => (
                      <li key={order.id} className="flex items-center justify-between px-4 py-3 text-sm">
                        <div>
                          <p className="font-mono text-xs font-medium text-slate-500">{order.orderNumber}</p>
                          <p className="font-medium text-slate-800">{order.customerName || "Walk-in"}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
                            Completed
                          </span>
                          <span className="font-mono text-sm font-bold text-blue-600">
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
    </div>
  );
}