// src/pos/components/TableOrderCard.jsx
import { useEffect, useState } from "react";

const STATUS_BADGE = {
  NEW: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
  ACCEPTED: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
  PREPARING: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
  READY: "bg-[#EAF6EC] dark:bg-[#43B75A]/10 text-[#3FA34D] dark:text-[#43B75A] border-[#3FA34D]/20 dark:border-[#43B75A]/30",
  SERVED: "bg-[#F3F5EE] dark:bg-white/5 text-[#6B7280] dark:text-[#9CA8A0] border-[#E7EAE1] dark:border-[#262B24]",
  ON_HOLD: "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30",
  OUT_FOR_DELIVERY: "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30",
  COMPLETED: "bg-[#F3F5EE] dark:bg-white/5 text-[#6B7280] dark:text-[#9CA8A0] border-[#E7EAE1] dark:border-[#262B24]",
};

const STATUS_LABEL = {
  NEW: "Pending",
  ACCEPTED: "Pending",
  PREPARING: "Pending",
  READY: "Ready",
  SERVED: "Served",
  ON_HOLD: "On Hold",
  OUT_FOR_DELIVERY: "Out for Delivery",
  COMPLETED: "Completed",
};

// Order-type identifier badge — purely a visual tag, shown on every card
// (Dine In and Takeaway alike) so both are easy to tell apart in the
// combined "All Orders" view. Does not affect status/category logic below.
const ORDER_TYPE_BADGE = {
  DINE_IN: {
    label: "🍽️ Dine In",
    className: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30",
  },
  TAKEAWAY: {
    label: "🥡 Takeaway",
    className: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30",
  },
};

// Table-level category — the thing that decides sort order and the headline
// badge, distinct from the more granular kitchen STATUS_LABEL above.
// SERVING: food is ready or already served — needs immediate front-of-house attention.
// PENDING: order placed but kitchen hasn't finished — still cooking.
// AVAILABLE: no active order at all (dine-in tables only — a takeaway entry
// only ever exists on this board while it has an active order attached).
export const CATEGORY_RANK = { SERVING: 0, PENDING: 1, AVAILABLE: 2 };

export function deriveTableCategory(table) {
  if (!table.order) return "AVAILABLE";
  const status = table.order.kitchenStatus || table.order.status;
  return ["READY", "SERVED"].includes(status) ? "SERVING" : "PENDING";
}

const CATEGORY_META = {
  SERVING: {
    label: "Serving",
    className: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
  },
  PENDING: {
    label: "Pending",
    className: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
  },
  AVAILABLE: {
    label: "Available",
    className: "bg-[#EAF6EC] dark:bg-[#43B75A]/10 text-[#3FA34D] dark:text-[#43B75A] border-[#3FA34D]/20 dark:border-[#43B75A]/30",
  },
};

function useElapsed(since) {
  const [seconds, setSeconds] = useState(() =>
    Math.floor((Date.now() - new Date(since).getTime()) / 1000),
  );

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
  const label =
    h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;

  return (
    <span className="font-mono text-sm font-semibold tabular-nums text-[#6B7280] dark:text-[#9CA8A0]">
      {label}
    </span>
  );
}

// `table` is either:
//  - a real dine-in table: { id, name, section, capacity, order }
//  - a normalized takeaway entry: { id, name, order } (no section/capacity —
//    `order` is always present, takeaway entries only show up on this board
//    for the lifetime of their active order)
//
// `onCompleteService` (dine-in only) — navigates to the Billing page.
// `onOrderDelivered` (takeaway only) — marks the order COMPLETED in place,
// no billing step, since takeaway is billed up front before it ever reaches
// the kitchen. Dine-in behavior is completely untouched by this prop.
export default function TableOrderCard({
  table,
  onCompleteService,
  onOrderDelivered,
  completing,
  pendingSync = false,
}) {
  const { order } = table;
  const isTakeaway = order?.orderType === "TAKEAWAY";
  const isFree = !order;
  // kitchenStatus comes straight from the order's live KitchenOrder rows —
  // the same source the Kitchen Display itself reads from. Falls back to
  // order.status only for an order that hasn't been sent to the kitchen yet.
  const displayStatus = order?.kitchenStatus || order?.status;
  const canComplete = displayStatus === "SERVED" && !order.awaitingCreate;
  const category = deriveTableCategory(table);
  const categoryMeta = CATEGORY_META[category];
  const typeBadge = order?.orderType ? ORDER_TYPE_BADGE[order.orderType] : null;

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white dark:bg-[#1D231D] p-5 shadow-sm transition-shadow ${
        isFree
          ? "border-[#E7EAE1] dark:border-[#262B24]"
          : "border-blue-200 dark:border-blue-500/30 shadow-blue-50 dark:shadow-black/20 hover:shadow-md dark:hover:shadow-black/40"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#1F2937] dark:text-white">{table.name}</h3>
          <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
            {isTakeaway
              ? "Takeaway order"
              : `${table.section || "—"} ${table.capacity ? `· ${table.capacity} seats` : ""}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${categoryMeta.className}`}
          >
            {categoryMeta.label}
          </span>
          {!isFree && <Timer since={order.createdAt} />}
        </div>
      </div>

      {isFree ? (
        <div className="mt-6 flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#E7EAE1] dark:border-[#262B24] py-8">
          <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">No active order</p>
        </div>
      ) : (
        <>
          {typeBadge && (
            <span
              className={`mt-3 inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${typeBadge.className}`}
            >
              {typeBadge.label}
            </span>
          )}
          {pendingSync && (
            <span className="mt-2 inline-flex w-fit items-center rounded-full border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
              Sync pending
            </span>
          )}
          {order.awaitingCreate && (
            <span
              title="This order was placed offline and hasn't reached the server yet."
              className="mt-2 inline-flex w-fit items-center rounded-full border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400"
            >
              Awaiting sync
            </span>
          )}

          <div className="mt-3 space-y-2.5 border-t border-[#E7EAE1] dark:border-[#262B24] pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B7280] dark:text-[#9CA8A0]">Customer</span>
              <span className="font-medium text-[#1F2937] dark:text-white">
                {order.customerName || "Walk-in"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B7280] dark:text-[#9CA8A0]">Order</span>
              <span className="font-mono text-xs font-medium text-[#6B7280] dark:text-[#9CA8A0]">
                {order.orderNumber}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B7280] dark:text-[#9CA8A0]">Items</span>
              <span className="font-medium text-[#1F2937] dark:text-white">
                {order.itemCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B7280] dark:text-[#9CA8A0]">
                Total{order.awaitingCreate ? " (est.)" : ""}
              </span>
              <span className="font-mono text-base font-bold text-[#3FA34D] dark:text-[#43B75A]">
                ₹{Number(order.grandTotal).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                STATUS_BADGE[displayStatus] ||
                "bg-[#F3F5EE] dark:bg-white/5 text-[#6B7280] dark:text-[#9CA8A0] border-[#E7EAE1] dark:border-[#262B24]"
              }`}
            >
              {STATUS_LABEL[displayStatus] || displayStatus}
            </span>
          </div>

          {isTakeaway ? (
            <>
              <button
                onClick={() => onOrderDelivered(order.id)}
                disabled={completing || !canComplete}
                title={
                  canComplete
                    ? undefined
                    : "Available once the kitchen marks this order Served"
                }
                className="mt-3 w-full rounded-xl bg-[#3FA34D] py-2.5 text-sm font-bold text-white shadow-sm shadow-[#3FA34D]/20 dark:shadow-black/30 transition-colors hover:bg-[#358F42] disabled:cursor-not-allowed disabled:bg-[#D1D5DB] dark:disabled:bg-[#262B24] disabled:text-[#6B7280] dark:disabled:text-[#4B5563] disabled:shadow-none dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
              >
                {completing ? "Marking Delivered…" : "Order Delivered"}
              </button>
              {!canComplete && (
                <p className="mt-1.5 text-center text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                  Available once the kitchen marks this order Served
                </p>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => onCompleteService(order.id)}
                disabled={completing || !canComplete}
                title={
                  canComplete
                    ? undefined
                    : order.awaitingCreate
                      ? "This order hasn't reached the server yet — billing needs it to sync first"
                      : "Available once the order has been served"
                }
                className="mt-3 w-full rounded-xl bg-[#3FA34D] py-2.5 text-sm font-bold text-white shadow-sm shadow-[#3FA34D]/20 dark:shadow-black/30 transition-colors hover:bg-[#358F42] disabled:cursor-not-allowed disabled:bg-[#D1D5DB] dark:disabled:bg-[#262B24] disabled:text-[#6B7280] dark:disabled:text-[#4B5563] disabled:shadow-none dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
              >
                {completing ? "Completing…" : "Complete Service"}
              </button>
              {!canComplete && (
                <p className="mt-1.5 text-center text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                  {order.awaitingCreate
                    ? "Billing available once this order syncs"
                    : "Available once the order is marked Served"}
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}