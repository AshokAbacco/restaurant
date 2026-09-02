// src/pos/components/TableOrderCard.jsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  // Online Orders are stored as ordinary DELIVERY orders tagged with an
  // onlinePlatformId (the OrderType enum has no "ONLINE" member), so they
  // share this badge — the platform name is shown as a second badge next to
  // it, which is what distinguishes an aggregator order from own-fleet
  // delivery at a glance.
  DELIVERY: {
    label: "🛵 Delivery",
    className: "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30",
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

function money(n) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

// Width of the tooltip card below (`w-72` = 18rem = 288px at the default
// text size). Kept as a constant so the clamping math and the className
// can't drift apart.
const TOOLTIP_WIDTH = 288;

// Hover detail for a card: every line item with its quantity and cost, plus
// the order total.
//
// FIX: this used to be `position: absolute` inside the card, shown via a
// `group-hover` CSS trick. That broke on laptop-width screens — the orders
// grid's wrapper has `overflow-y-auto`, and per the CSS spec setting
// overflow on one axis forces the other axis to clip too, so the tooltip
// got sliced off wherever it crossed that container's left edge (visible in
// the client's screenshot: the card next to the sidebar had its tooltip cut
// clean off). No z-index fix could help — it wasn't a stacking problem, it
// was actually being clipped by an ancestor.
//
// Now the tooltip is portaled straight to `document.body` as
// `position: fixed`, positioned from the card's own
// getBoundingClientRect(), and clamped to stay within the viewport. That
// takes it out of every scrollable/overflow-clipped ancestor (the grid, and
// any future scrolling wrapper) and guarantees it never renders under the
// sidebar or off the right edge on narrow screens either.
//
// `itemLines` is supplied in the same shape by both sources of cards: the
// tables board flattens it server-side (tables.service.js) and OrdersPage's
// orderToBoardItem flattens the raw /pos/orders response the same way.
function OrderItemsTooltip({ order, anchorRect, visible }) {
  const lines = order.itemLines || [];
  if (lines.length === 0 || !anchorRect) return null;

  const totalQty = lines.reduce((sum, l) => sum + (l.quantity || 0), 0);

  // Center over the card like before, but clamp so the tooltip always has
  // an 8px margin from both viewport edges — this is what stops it sliding
  // under the sidebar or off-screen on the right at laptop widths.
  const edgeMargin = 8;
  const idealLeft = anchorRect.left + anchorRect.width / 2 - TOOLTIP_WIDTH / 2;
  const left = Math.min(
    Math.max(idealLeft, edgeMargin),
    window.innerWidth - TOOLTIP_WIDTH - edgeMargin,
  );
  // Sits just above where the card's own top edge is, matching the old
  // `top-2` offset the absolutely-positioned version used.
  const top = anchorRect.top + 8;

  return createPortal(
    <div
      className={`pointer-events-none fixed z-50 w-72 transition-all duration-150 ${
        visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
      }`}
      style={{ top, left }}
    >
      <div className="rounded-xl border border-[#E7EAE1] dark:border-[#2E3A2E] bg-white dark:bg-[#1D231D] p-3 shadow-xl shadow-black/10 dark:shadow-black/50">
        <div className="flex items-baseline justify-between gap-2 border-b border-[#E7EAE1] dark:border-[#262B24] pb-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[#1F2937] dark:text-white">
            Order Items
          </span>
          <span className="font-mono text-[11px] text-[#6B7280] dark:text-[#9CA8A0]">
            {totalQty} item{totalQty === 1 ? "" : "s"}
          </span>
        </div>

        <ul className="max-h-64 space-y-1.5 overflow-y-auto py-2">
          {lines.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-3 text-xs">
              <span className="min-w-0 text-[#1F2937] dark:text-[#E4E9E2]">
                <span className="font-mono font-semibold text-[#6B7280] dark:text-[#9CA8A0]">
                  {line.quantity}×
                </span>{" "}
                {line.name}
                <span className="ml-1 font-mono text-[10px] text-[#9CA3AF] dark:text-[#6B7280]">
                  @ {money(line.unitPrice)}
                </span>
              </span>
              <span className="shrink-0 font-mono font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                {money(line.totalPrice)}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-baseline justify-between border-t border-[#E7EAE1] dark:border-[#262B24] pt-2">
          <span className="text-xs font-bold text-[#1F2937] dark:text-white">
            Total
          </span>
          <span className="font-mono text-sm font-bold text-[#3FA34D] dark:text-[#43B75A]">
            {money(order.grandTotal)}
          </span>
        </div>
        {/* Line totals are pre-tax snapshots; the order total includes GST,
            add-ons and any charges, so the two legitimately differ. */}
        <p className="mt-1 text-[10px] text-[#9CA3AF] dark:text-[#6B7280]">
          Total includes GST, add-ons and charges
        </p>
      </div>
    </div>,
    document.body,
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
  const isDelivery = order?.orderType === "DELIVERY";
  // Aggregator order (Swiggy/Zomato/...) rather than the restaurant's own
  // delivery. platformName is flattened on by OrdersPage's orderToBoardItem.
  const platformName = order?.platformName || order?.onlinePlatform?.name || null;
  const isOnline = isDelivery && Boolean(platformName);
  // Who closes the order out without a billing step: takeaway (already paid
  // up front at the counter) and aggregator orders (the platform settles
  // separately, there's nothing to collect here). Own-fleet delivery still
  // has a bill to raise, so it goes to Billing like dine-in does.
  const closesWithoutBilling = isTakeaway || isOnline;
  const isFree = !order;
  // kitchenStatus comes straight from the order's live KitchenOrder rows —
  // the same source the Kitchen Display itself reads from. Falls back to
  // order.status only for an order that hasn't been sent to the kitchen yet.
  const displayStatus = order?.kitchenStatus || order?.status;
  const canComplete = displayStatus === "SERVED" && !order.awaitingCreate;
  const category = deriveTableCategory(table);
  const categoryMeta = CATEGORY_META[category];
  const typeBadge = order?.orderType ? ORDER_TYPE_BADGE[order.orderType] : null;

  // Drives the portaled tooltip above — see the FIX note on
  // OrderItemsTooltip for why this replaced the old group-hover approach.
  const cardRef = useRef(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);

  const handleMouseEnter = () => {
    if (cardRef.current) {
      setAnchorRect(cardRef.current.getBoundingClientRect());
    }
    setTooltipVisible(true);
  };
  const handleMouseLeave = () => setTooltipVisible(false);

  return (
    <div
      ref={cardRef}
      className="group relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!isFree && (
        <OrderItemsTooltip order={order} anchorRect={anchorRect} visible={tooltipVisible} />
      )}
      <div
      className={`flex h-full flex-col rounded-2xl border bg-white dark:bg-[#1D231D] p-5 shadow-sm transition-shadow ${
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
              : isDelivery
                ? platformName
                  ? `${platformName} · online order`
                  : "Delivery order"
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
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {typeBadge && (
              <span
                className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${typeBadge.className}`}
              >
                {typeBadge.label}
              </span>
            )}
            {/* Which physical kitchen this order was routed to. Only shown
                when the outlet actually routes orders — a single-kitchen
                restaurant leaves this null and sees no badge. */}
            {(order?.kitchenBranchName || order?.kitchenBranch?.name) && (
              <span className="inline-flex w-fit items-center rounded-full border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                {order.kitchenBranchName || order.kitchenBranch?.name}
              </span>
            )}
            {platformName && (
              <span className="inline-flex w-fit items-center rounded-full border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-400">
                {platformName}
              </span>
            )}
          </div>
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

          {closesWithoutBilling ? (
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
                {completing
                  ? "Marking Delivered…"
                  : isTakeaway
                    ? "Order Delivered"
                    : "Mark Delivered"}
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
    </div>
  );
}