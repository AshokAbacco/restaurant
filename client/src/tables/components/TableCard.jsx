// src/pos/components/TableCard.jsx
import { Pencil, Trash2, Users } from "lucide-react";

const STATUS_META = {
  FREE: { label: "Available", className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  OCCUPIED: { label: "Occupied", className: "bg-red-50 text-red-600 border-red-200" },
  RESERVED: { label: "Reserved", className: "bg-amber-50 text-amber-600 border-amber-200" },
};

export default function TableCard({ table, onEdit, onDelete, deleting, confirmingDelete, onRequestDelete, onCancelDelete }) {
  const status = STATUS_META[table.status] || STATUS_META.FREE;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-base font-bold text-slate-800">{table.name}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <Users className="h-3.5 w-3.5" />
            {table.capacity ? `${table.capacity} seats` : "Capacity not set"}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      {confirmingDelete ? (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
          <span className="text-xs font-medium text-red-600">Delete this table?</span>
          <div className="flex gap-3">
            <button onClick={onCancelDelete} className="text-xs font-medium text-slate-500 hover:text-slate-700">
              Cancel
            </button>
            <button
              onClick={() => onDelete(table.id)}
              disabled={deleting}
              className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Confirm"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex justify-end gap-1 border-t border-slate-100 pt-3">
          <button
            onClick={() => onEdit(table)}
            title="Edit table"
            className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onRequestDelete(table.id)}
            title="Delete table"
            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}