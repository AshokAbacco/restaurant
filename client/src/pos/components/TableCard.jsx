// src/pos/components/TableCard.jsx
import { useState } from "react";
import { Pencil, Trash2, Users, UserCog, X, CalendarClock, Check } from "lucide-react";

const STATUS_META = {
  FREE: {
    label: "Available",
    className: "bg-[#EAF6EC] dark:bg-[#43B75A]/10 text-[#3FA34D] dark:text-[#43B75A] border-[#3FA34D]/20 dark:border-[#43B75A]/30",
  },
  OCCUPIED: {
    label: "Occupied",
    className: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30",
  },
  RESERVED: {
    label: "Reserved",
    className: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
  },
};

export default function TableCard({
  table,
  onEdit,
  onDelete,
  deleting,
  confirmingDelete,
  onRequestDelete,
  onCancelDelete,
  // Waiter-assignment additions (all optional; card works standalone without them)
  assignMode = false,
  selected = false,
  onToggleSelect,
  onUnassign,
  unassigning = false,
  // Reservation additions (Phase 1.3 — all optional; card works standalone
  // without them, same convention as the assignment props above).
  onReserve,
  onSeatReservation,
  onCancelReservation,
}) {
  const status = STATUS_META[table.status] || STATUS_META.FREE;
  const [showReservationActions, setShowReservationActions] = useState(false);
  const reservation = table.upcomingReservation;

  return (
    <div
      onClick={assignMode ? () => onToggleSelect?.(table.id) : undefined}
      className={`rounded-2xl border bg-white dark:bg-[#1D231D] p-4 shadow-sm transition-shadow hover:shadow-md dark:hover:shadow-black/30 ${
        assignMode ? "cursor-pointer" : ""
      } ${selected ? "border-[#3FA34D] dark:border-[#43B75A] ring-2 ring-[#EAF6EC] dark:ring-[#43B75A]/20" : "border-[#E7EAE1] dark:border-[#262B24]"}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          {assignMode && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.(table.id)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 h-4 w-4 rounded border-[#9CA3AF] dark:border-[#4B5563]"
            />
          )}
          <div>
            <p className="font-mono text-base font-bold text-[#1F2937] dark:text-white">
              {table.name}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
              <Users className="h-3.5 w-3.5" />
              {table.capacity ? `${table.capacity} seats` : "Capacity not set"}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* Assigned waiter badge */}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-[#F3F5EE] dark:bg-white/5 px-2.5 py-1.5">
        <span className="flex items-center gap-1.5 text-xs text-[#6B7280] dark:text-[#9CA8A0]">
          <UserCog className="h-3.5 w-3.5" />
          {table.waiter ? (
            <span className="font-medium text-[#1F2937] dark:text-white">
              {table.waiter.fullName}
            </span>
          ) : (
            "Unassigned"
          )}
        </span>
        {!assignMode && table.waiter && onUnassign && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnassign(table.id);
            }}
            disabled={unassigning}
            title="Unassign waiter"
            className="rounded-md p-1 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Upcoming reservation badge (Phase 1.3) — click to seat/cancel it */}
      {reservation && !assignMode && (
        <div className="relative mt-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowReservationActions((v) => !v);
            }}
            className="flex w-full items-center justify-between rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1.5 text-left"
          >
            <span className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <CalendarClock className="h-3.5 w-3.5" />
              <span className="font-medium">
                {new Date(reservation.reservedFor).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              — {reservation.customerName} ({reservation.partySize})
            </span>
          </button>

          {showReservationActions && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 flex gap-1 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231D] p-1.5 shadow-lg">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReservationActions(false);
                  onSeatReservation?.(reservation.id);
                }}
                className="flex flex-1 items-center justify-center gap-1 rounded-md bg-[#EAF6EC] dark:bg-[#43B75A]/10 px-2 py-1.5 text-xs font-semibold text-[#3FA34D] dark:text-[#43B75A] hover:bg-[#D9F3E2] dark:hover:bg-[#43B75A]/20"
              >
                <Check className="h-3.5 w-3.5" />
                Seat now
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReservationActions(false);
                  onCancelReservation?.(reservation.id);
                }}
                className="flex flex-1 items-center justify-center gap-1 rounded-md bg-red-50 dark:bg-red-500/10 px-2 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {!assignMode &&
        (confirmingDelete ? (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2">
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              Delete this table?
            </span>
            <div className="flex gap-3">
              <button
                onClick={onCancelDelete}
                className="text-xs font-medium text-[#6B7280] dark:text-[#9CA8A0] hover:text-[#1F2937] dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => onDelete(table.id)}
                disabled={deleting}
                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Confirm"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex justify-end gap-1 border-t border-[#E7EAE1] dark:border-[#262B24] pt-3">
            {onReserve && (
              <button
                onClick={() => onReserve(table)}
                title="Reserve this table"
                className="rounded-lg p-2 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400"
              >
                <CalendarClock className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => onEdit(table)}
              title="Edit table"
              className="rounded-lg p-2 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#EAF6EC] dark:hover:bg-[#43B75A]/10 hover:text-[#3FA34D] dark:hover:text-[#43B75A]"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onRequestDelete(table.id)}
              title="Delete table"
              className="rounded-lg p-2 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
    </div>
  );
}