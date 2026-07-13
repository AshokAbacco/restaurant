// src/pos/components/KotCard.jsx
import { useEffect, useState } from "react";

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

const STATUS_BADGE = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200",
  ACCEPTED: "bg-blue-50 text-blue-700 border-blue-200",
  PREPARING: "bg-blue-50 text-blue-700 border-blue-200",
  READY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SERVED: "bg-slate-100 text-slate-600 border-slate-300",
};

const PRIORITY_LABEL = {
  VIP: "VIP",
  ONLINE_DELIVERY: "Online",
  EXPRESS: "Express",
  SENIOR_CITIZEN: "Senior",
  SPECIAL_REQUEST: "Special",
};

// Order type gets its own badge (separate from the Pending/Ready/Served
// status badge) so kitchen staff can tell dine-in and takeaway tickets apart
// at a glance — both flow through the exact same Pending -> Ready -> Served
// stages, this is purely a visual identifier.
const ORDER_TYPE_BADGE = {
  DINE_IN: { label: "🍽️ Dine In", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  TAKEAWAY: { label: "🥡 Takeaway", className: "bg-orange-50 text-orange-700 border-orange-200" },
};

// Ticks live while the ticket is active. Once the kitchen order has a
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

export default function KotCard({ kot, onAdvance, updating }) {
  const elapsedMinutes = useElapsedMinutes(kot.createdAt, kot.completedAt || kot.servedAt);
  const elapsedSeconds = Math.floor(elapsedMinutes * 60);
  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const ss = String(elapsedSeconds % 60).padStart(2, "0");

  const isOverdue = kot.targetPrepMinutes && elapsedMinutes > kot.targetPrepMinutes;
  const timerColor = isOverdue ? "text-red-600" : elapsedMinutes > 8 ? "text-amber-600" : "text-emerald-600";

  const action = NEXT_STATUS[kot.status];

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
        isOverdue ? "border-red-300 ring-1 ring-red-100" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-sm font-bold text-slate-900">{kot.kotNumber}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {kot.order?.orderNumber}
            {kot.order?.table?.name ? ` · ${kot.order.table.name}` : ""}
          </p>
        </div>
        <span className={`font-mono text-lg font-bold tabular-nums ${timerColor}`}>
          {mm}:{ss}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {kot.order?.orderType && (
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
              (ORDER_TYPE_BADGE[kot.order.orderType] || {}).className ||
              "bg-slate-50 text-slate-600 border-slate-200"
            }`}
          >
            {(ORDER_TYPE_BADGE[kot.order.orderType] || {}).label || kot.order.orderType.replace("_", " ")}
          </span>
        )}
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[kot.status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
          {STATUS_LABEL[kot.status] || kot.status}
        </span>
        {kot.priority !== "NORMAL" && (
          <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
            {PRIORITY_LABEL[kot.priority] || kot.priority}
          </span>
        )}
        {isOverdue && (
          <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
            Delayed
          </span>
        )}
      </div>

      <ul className="mt-3 flex-1 space-y-2 border-t border-slate-100 pt-3">
        {kot.items.map((item) => (
          <li key={item.id} className="text-sm">
            <div className="flex justify-between text-slate-800">
              <span className="font-medium">
                {item.quantity} × {item.orderItem.menuItem.name}
              </span>
            </div>
            {item.orderItem.notes && (
              <p className="mt-0.5 text-xs italic text-amber-600">"{item.orderItem.notes}"</p>
            )}
          </li>
        ))}
      </ul>

      {action && (
        <button
          onClick={() => onAdvance(kot.id, action.next)}
          disabled={updating}
          className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {updating ? "Updating…" : action.label}
        </button>
      )}
    </div>
  );
}