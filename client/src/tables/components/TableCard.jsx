// src/pos/components/TableCard.jsx
import { Pencil, Trash2, Users, UserCog, X } from "lucide-react";

const STATUS_META = {
  FREE: {
    label: "Available",
    className:
      "bg-[#EAF6EC] text-[#2F7D3A] border-[#C9E7CF] dark:bg-[#43B75A]/10 dark:text-[#43B75A] dark:border-[#43B75A]/30",
  },
  OCCUPIED: {
    label: "Occupied",
    className:
      "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
  },
  RESERVED: {
    label: "Reserved",
    className:
      "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
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
}) {
  const status = STATUS_META[table.status] || STATUS_META.FREE;

  return (
    <div
      onClick={assignMode ? () => onToggleSelect?.(table.id) : undefined}
      className={`rounded-2xl border bg-white dark:bg-[#171C17] p-4 shadow-sm transition-shadow hover:shadow-md ${
        assignMode ? "cursor-pointer" : ""
      } ${
        selected
          ? "border-[#3FA34D] ring-2 ring-[#3FA34D]/20 dark:border-[#43B75A] dark:ring-[#43B75A]/25"
          : "border-[#E7EAE1] dark:border-[#262B24]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          {assignMode && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.(table.id)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 h-4 w-4 rounded border-[#D5DAD0] dark:border-[#3A4238] bg-white dark:bg-[#12160F] accent-[#3FA34D] dark:accent-[#43B75A]"
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
            <span className="font-medium text-[#1F2937] dark:text-[#E4E9E2]">
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
            className="rounded-md p-1 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-[#EF5350] dark:hover:text-red-400 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!assignMode &&
        (confirmingDelete ? (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2">
            <span className="text-xs font-medium text-[#EF5350] dark:text-red-400">
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
                className="text-xs font-semibold text-[#EF5350] dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Confirm"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex justify-end gap-1 border-t border-[#E7EAE1] dark:border-[#262B24] pt-3">
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
              className="rounded-lg p-2 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-[#EF5350] dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
    </div>
  );
}