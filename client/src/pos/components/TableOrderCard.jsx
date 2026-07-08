// src/pos/components/TableOrderCard.jsx
import { useEffect, useState } from "react";

const STATUS_BADGE = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200",
  ACCEPTED: "bg-blue-50 text-blue-700 border-blue-200",
  PREPARING: "bg-blue-50 text-blue-700 border-blue-200",
  READY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SERVED: "bg-slate-100 text-slate-600 border-slate-300",
  ON_HOLD: "bg-purple-50 text-purple-700 border-purple-200",
  OUT_FOR_DELIVERY: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

const STATUS_LABEL = {
  NEW: "Pending",
  ACCEPTED: "Pending",
  PREPARING: "Pending",
  READY: "Ready",
  SERVED: "Served",
  ON_HOLD: "On Hold",
  OUT_FOR_DELIVERY: "Out for Delivery",
};

// Table-level category — the thing that decides sort order and the headline
// badge, distinct from the more granular kitchen STATUS_LABEL above.
// SERVING: food is ready or already served — needs immediate front-of-house attention.
// PENDING: order placed but kitchen hasn't finished — still cooking.
// AVAILABLE: no active order at all.
export const CATEGORY_RANK = { SERVING: 0, PENDING: 1, AVAILABLE: 2 };

export function deriveTableCategory(table) {
  if (!table.order) return "AVAILABLE";
  const status = table.order.kitchenStatus || table.order.status;
  return ["READY", "SERVED"].includes(status) ? "SERVING" : "PENDING";
}

const CATEGORY_META = {
  SERVING: { label: "Serving", className: "bg-blue-50 text-blue-700 border-blue-200" },
  PENDING: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
  AVAILABLE: { label: "Available", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function useElapsed(since) {
  const [seconds, setSeconds] = useState(() => Math.floor((Date.now() - new Date(since).getTime()) / 1000));

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - new Date(since).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [since]);

  return seconds;
}

function Timer({ since }) {
  const totalSeconds = useElapsed(since);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const label = h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;

  return (
    <span className="font-mono text-sm font-semibold tabular-nums text-slate-600">{label}</span>
  );
}

export default function TableOrderCard({ table, onCompleteService, completing }) {
  const { order } = table;
  const isFree = !order;
  // kitchenStatus comes straight from the order's live KitchenOrder rows —
  // the same source the Kitchen Display itself reads from. Falls back to
  // order.status only for an order that hasn't been sent to the kitchen yet.
  const displayStatus = order?.kitchenStatus || order?.status;
  const canComplete = displayStatus === "SERVED";
  const category = deriveTableCategory(table);
  const categoryMeta = CATEGORY_META[category];

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-shadow ${
        isFree ? "border-slate-200" : "border-blue-200 shadow-blue-50 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{table.name}</h3>
          <p className="text-xs text-slate-400">
            {table.section || "—"} {table.capacity ? `· ${table.capacity} seats` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${categoryMeta.className}`}>
            {categoryMeta.label}
          </span>
          {!isFree && <Timer since={order.createdAt} />}
        </div>
      </div>

      {isFree ? (
        <div className="mt-6 flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 py-8">
          <p className="text-sm text-slate-400">No active order</p>
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Customer</span>
              <span className="font-medium text-slate-800">{order.customerName || "Walk-in"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Order</span>
              <span className="font-mono text-xs font-medium text-slate-500">{order.orderNumber}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Items</span>
              <span className="font-medium text-slate-800">{order.itemCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Total</span>
              <span className="font-mono text-base font-bold text-blue-600">
                ₹{Number(order.grandTotal).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                STATUS_BADGE[displayStatus] || "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              {STATUS_LABEL[displayStatus] || displayStatus}
            </span>
          </div>

          <button
            onClick={() => onCompleteService(order.id)}
            disabled={completing || !canComplete}
            title={canComplete ? undefined : "Available once the order has been served"}
            className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-200 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            {completing ? "Completing…" : "Complete Service"}
          </button>
          {!canComplete && (
            <p className="mt-1.5 text-center text-xs text-slate-400">
              Available once the order is marked Served
            </p>
          )}
        </>
      )}
    </div>
  );
}