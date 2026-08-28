// src/pos/Kitchen/Kotcard.jsx
//
// ONE CARD = ONE CUSTOMER ORDER.
//
// The backend still stores one KitchenOrder row per kitchen section — it has
// to, since KitchenOrder.kitchenSectionId is required and the station tabs,
// the per-station prep-time reports and the station routing all depend on
// it. A three-item order spanning grill, beverage and dessert is genuinely
// three physical tickets down in the database.
//
// What was wrong was showing those rows as three separate CARDS: the kitchen
// saw "ORD-000006 · Chicken Shawarma" and "ORD-000006 · Arabic Coffee" as
// two unrelated jobs with no way to tell they belonged to one customer.
//
// So this component now takes a `ticket` — a group of KitchenOrder rows that
// share an orderId, assembled by KitchenDisplayScreen's groupKotsByOrder —
// and renders them as a single card carrying every item in the order. When
// the order spans more than one station, the items are sub-grouped under a
// small station heading so the routing information the split used to convey
// isn't lost.
import { useEffect, useMemo, useState } from "react";

// Simplified workflow: NEW is shown as "Pending" and set automatically when
// the order is sent to the kitchen — no button for it. Staff only ever click
// two things: Ready (food is prepared) and Served (delivered to the table).
// ACCEPTED/PREPARING still exist as enum values on the backend but are no
// longer exposed as separate steps in this UI.
const NEXT_STATUS = {
  NEW: { next: "READY", label: "Ready" },
  READY: { next: "SERVED", label: "Served" },
};

const STATUS_LABEL = {
  NEW: "Pending",
  ACCEPTED: "Pending",
  PREPARING: "Pending",
  READY: "Ready",
  SERVED: "Served",
};

// Pending keeps a cool blue-slate so it reads as "waiting" without
// competing with the brand green (Ready) or the amber sync badges.
const PENDING_BADGE =
  "bg-[#EDF3F8] text-[#3D5A73] border-[#D6E3ED] dark:bg-[#4A7FB5]/10 dark:text-[#8FB4D9] dark:border-[#4A7FB5]/30";

const STATUS_BADGE = {
  NEW: PENDING_BADGE,
  ACCEPTED: PENDING_BADGE,
  PREPARING: PENDING_BADGE,
  READY:
    "bg-[#EAF6EC] text-[#2F7D3A] border-[#C9E7CF] dark:bg-[#43B75A]/10 dark:text-[#43B75A] dark:border-[#43B75A]/30",
  SERVED:
    "bg-[#F3F5EE] text-[#6B7280] border-[#E7EAE1] dark:bg-white/5 dark:text-[#9CA8A0] dark:border-[#262B24]",
};

const PRIORITY_LABEL = {
  VIP: "VIP",
  ONLINE_DELIVERY: "Online",
  EXPRESS: "Express",
  SENIOR_CITIZEN: "Senior",
  SPECIAL_REQUEST: "Special",
};

// Order type gets its own badge (separate from the Pending/Ready/Served
// status badge) so kitchen staff can tell dine-in, takeaway, and delivery
// tickets apart at a glance — all three flow through the exact same
// Pending -> Ready -> Served stages, this is purely a visual identifier.
const ORDER_TYPE_BADGE = {
  DINE_IN: {
    label: "🍽️ Dine In",
    className:
      "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30",
  },
  TAKEAWAY: {
    label: "🥡 Takeaway",
    className:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
  },
  DELIVERY: {
    label: "🛵 Delivery",
    className:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30",
  },
};

// Every card is the same height regardless of how many items it holds, so a
// nine-item order can't stretch its whole grid row and leave two-item cards
// full of dead space. Anything that doesn't fit scrolls inside the item list;
// the header, badges, note form and action button stay pinned so Ready/Served
// is always reachable without scrolling first.
//
// Tune here — it's the one place the height is set.
const CARD_HEIGHT = "h-[26rem]";

// Ticks while the order is active. Once every ticket in it has a
// servedAt/completedAt timestamp, the timer freezes at that exact moment
// instead of continuing to count — no interval even gets set up, so it's
// not just visually frozen, it stops doing any work too.
function useElapsedMinutes(since, frozenAt) {
  const frozenMs = frozenAt ? new Date(frozenAt).getTime() : null;

  const [minutes, setMinutes] = useState(() => {
    const end = frozenMs ?? Date.now();
    return (end - new Date(since).getTime()) / 60000;
  });

  useEffect(() => {
    if (frozenMs) return; // already served/completed — nothing left to tick
    const id = setInterval(() => {
      setMinutes((Date.now() - new Date(since).getTime()) / 60000);
    }, 1000);
    return () => clearInterval(id);
  }, [since, frozenMs]);

  return minutes;
}

// onAddNote is optional — when the parent screen doesn't pass it (i.e. the
// logged-in user isn't KITCHEN), the whole add-note form is simply not
// rendered. Existing notes still show for everyone, read-only.
export default function KotCard({
  ticket,
  onAdvance,
  updating,
  onAddNote,
  pendingSync = false,
}) {
  const {
    order,
    kots,
    status,
    priority,
    createdAt,
    frozenAt,
    targetPrepMinutes,
    sections,
    notes,
    awaitingCreate,
    kotNumbers,
  } = ticket;

  const elapsedMinutes = useElapsedMinutes(createdAt, frozenAt);
  const elapsedSeconds = Math.floor(elapsedMinutes * 60);
  const hh = Math.floor(elapsedSeconds / 3600);
  const mm = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsedSeconds % 60).padStart(2, "0");
  // Under an hour: MM:SS (e.g. "23:32"). An hour or more: H:MM:SS (e.g.
  // "6:11:47") instead of letting the minutes column run past 60.
  const timerLabel = hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;

  const isOverdue = targetPrepMinutes && elapsedMinutes > targetPrepMinutes;
  const timerColor = isOverdue
    ? "text-[#EF5350] dark:text-red-400"
    : elapsedMinutes > 8
      ? "text-amber-600 dark:text-amber-400"
      : "text-[#3FA34D] dark:text-[#43B75A]";

  const action = NEXT_STATUS[status];

  // Only worth labelling which station cooks what when the order actually
  // spans more than one — a single-station order would just get a redundant
  // heading over its only list.
  const showSectionHeadings = sections.length > 1;
  const totalItemCount = useMemo(
    () =>
      sections.reduce(
        (sum, s) => sum + s.items.reduce((n, i) => n + (i.quantity || 0), 0),
        0,
      ),
    [sections],
  );

  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState(null);

  async function handleAddNote(e) {
    e.preventDefault();
    const text = noteText.trim();
    if (!text || !onAddNote) return;
    setAddingNote(true);
    setNoteError(null);
    try {
      await onAddNote(ticket, text);
      setNoteText("");
    } catch (err) {
      setNoteError(err.message);
    } finally {
      setAddingNote(false);
    }
  }

  // Online Orders (Swiggy, Zomato, etc.) get a visually distinct card so
  // the kitchen can tell them apart from walk-in/dine-in tickets at a
  // glance — isOverdue still takes priority when both apply, since a late
  // ticket is more urgent than which platform it came from.
  const isOnlineOrder = !!order?.onlinePlatform;

  return (
    <div
      className={`${CARD_HEIGHT} flex flex-col overflow-hidden rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
        isOverdue
          ? "bg-white dark:bg-[#171C17] border-red-300 ring-1 ring-red-100 dark:border-red-500/40 dark:ring-red-500/20"
          : isOnlineOrder
            ? "bg-violet-50 dark:bg-violet-500/10 border-violet-300 dark:border-violet-500/40 ring-1 ring-violet-100 dark:ring-violet-500/20"
            : "bg-white dark:bg-[#171C17] border-[#E7EAE1] dark:border-[#262B24]"
      }`}
    >
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          {/* The ORDER is the headline now, not the KOT — one customer
              order is one card, however many station tickets back it. */}
          <p className="truncate font-mono text-sm font-bold text-[#1F2937] dark:text-white">
            {order?.orderNumber || "Pending sync"}
            {order?.table?.name ? ` · ${order.table.name}` : ""}
          </p>
          <p className="mt-0.5 truncate text-xs text-[#9CA3AF] dark:text-[#6B7280]">
            {kotNumbers.join(" · ")}
            {totalItemCount > 0
              ? ` · ${totalItemCount} item${totalItemCount === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
        <span
          className={`shrink-0 font-mono text-lg font-bold tabular-nums ${timerColor}`}
        >
          {timerLabel}
        </span>
      </div>

      <div className="mt-2 flex shrink-0 flex-wrap items-center gap-1.5">
        {order?.orderType && (
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
              (ORDER_TYPE_BADGE[order.orderType] || {}).className ||
              "bg-[#F3F5EE] text-[#6B7280] border-[#E7EAE1] dark:bg-white/5 dark:text-[#9CA8A0] dark:border-[#262B24]"
            }`}
          >
            {(ORDER_TYPE_BADGE[order.orderType] || {}).label ||
              order.orderType.replace("_", " ")}
          </span>
        )}
        {isOnlineOrder && (
          <span className="rounded-full border border-violet-300 bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/20 dark:text-violet-300">
            🛵 {order.onlinePlatform.name}
          </span>
        )}
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[status] || "bg-[#F3F5EE] text-[#6B7280] border-[#E7EAE1] dark:bg-white/5 dark:text-[#9CA8A0] dark:border-[#262B24]"}`}
        >
          {STATUS_LABEL[status] || status}
        </span>
        {priority !== "NORMAL" && (
          <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">
            {PRIORITY_LABEL[priority] || priority}
          </span>
        )}
        {isOverdue && (
          <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            Delayed
          </span>
        )}
        {pendingSync && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
            Sync pending
          </span>
        )}
        {awaitingCreate && (
          <span
            title="This order was placed offline and hasn't reached the server yet. Ready/Served still work — they'll sync automatically once the connection is back."
            className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
          >
            Awaiting sync
          </span>
        )}
      </div>

      {/* Every item in the order, in one list. Sub-grouped by station only
          when the order actually spans several, so the kitchen still knows
          which pass each dish belongs to. */}
      {/* The only scrollable region. min-h-0 is what actually makes it
          scroll: a flex child defaults to min-height:auto, which refuses to
          shrink below its content and would push the card taller instead of
          overflowing. */}
      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto border-t border-[#E7EAE1] dark:border-[#262B24] pt-3">
        {sections.map((section) => (
          <div key={section.id}>
            {showSectionHeadings && (
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
                {section.name}
              </p>
            )}
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item.id} className="text-sm">
                  <div className="flex justify-between text-[#1F2937] dark:text-[#E4E9E2]">
                    <span className="font-medium">
                      {item.quantity} × {item.orderItem?.menuItem?.name}
                    </span>
                  </div>
                  {item.orderItem?.notes && (
                    <p className="mt-0.5 text-xs italic text-amber-600 dark:text-amber-400">
                      "{item.orderItem.notes}"
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {notes.length > 0 && (
        <ul className="mt-3 max-h-24 shrink-0 space-y-1.5 overflow-y-auto border-t border-[#E7EAE1] dark:border-[#262B24] pt-3">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-lg bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300"
            >
              <span className="font-semibold">
                {n.chef?.fullName || "Kitchen"}:
              </span>{" "}
              {n.note}
            </li>
          ))}
        </ul>
      )}

      {onAddNote && (
        <form onSubmit={handleAddNote} className="mt-3 flex shrink-0 gap-1.5">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note…"
            className="min-w-0 flex-1 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] px-2.5 py-1.5 text-xs text-[#1F2937] dark:text-[#E4E9E2] placeholder:text-[#9CA3AF] dark:placeholder:text-[#6B7280] focus:border-[#3FA34D] dark:focus:border-[#43B75A] focus:outline-none"
          />
          <button
            type="submit"
            disabled={addingNote || !noteText.trim()}
            className="shrink-0 rounded-lg bg-[#F3F5EE] dark:bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-[#6B7280] dark:text-[#9CA8A0] transition-colors hover:bg-[#E7EAE1] dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addingNote ? "…" : "Add"}
          </button>
        </form>
      )}
      {noteError && (
        <p className="mt-1 text-xs text-[#EF5350] dark:text-red-400">
          {noteError}
        </p>
      )}

      {action && (
        <button
          onClick={() => onAdvance(ticket, action.next)}
          disabled={updating}
          className="mt-4 w-full shrink-0 rounded-xl bg-[#3FA34D] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] disabled:cursor-not-allowed disabled:bg-[#D5DAD0] dark:disabled:bg-white/10 dark:disabled:text-[#6B7280]"
        >
          {updating ? "Updating…" : action.label}
        </button>
      )}
      {/* One tap moves every station ticket in this order forward, so the
          kitchen never has to remember it tapped Ready on two of three
          cards for the same customer. */}
      {action && kots.length > 1 && (
        <p className="mt-1.5 shrink-0 text-center text-[11px] text-[#9CA3AF] dark:text-[#6B7280]">
          Applies to all {kots.length} station tickets
        </p>
      )}
    </div>
  );
}