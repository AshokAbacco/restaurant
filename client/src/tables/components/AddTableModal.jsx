// src/pos/components/AddTableModal.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "FREE", label: "Available" },
  { value: "OCCUPIED", label: "Occupied" },
  { value: "RESERVED", label: "Reserved" },
];

const emptyForm = (defaultFloorId) => ({
  floorId: defaultFloorId || "",
  name: "",
  capacity: "",
  status: "FREE",
});

// Doubles as both "Add Table" and "Edit Table" — pass `editingTable` to
// prefill the form and change the save button's label; leave it null/undefined
// for the add flow. `floors` populates the required floor dropdown and
// `defaultFloorId` preselects whichever floor tab is currently active.
export default function AddTableModal({ open, onClose, floors, defaultFloorId, editingTable, onSave }) {
  const [form, setForm] = useState(emptyForm(defaultFloorId));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingTable) {
      setForm({
        floorId: editingTable.floorId,
        name: editingTable.name || "",
        capacity: editingTable.capacity ?? "",
        status: editingTable.status || "FREE",
      });
    } else {
      setForm(emptyForm(defaultFloorId));
    }
    setError(null);
  }, [open, editingTable, defaultFloorId]);

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.floorId) {
      setError("Please select a floor.");
      return;
    }
    if (!form.name.trim()) {
      setError("Table name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(
        {
          floorId: form.floorId,
          name: form.name.trim(),
          capacity: form.capacity ? Number(form.capacity) : null,
          status: form.status,
        },
        editingTable?.id
      );
      handleClose();
    } catch (err) {
      setError(err.message || "Couldn't save the table.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={handleClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-[#1C3044]">{editingTable ? "Edit Table" : "Add Table"}</h2>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 px-5 py-4">
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Select floor *</label>
              <select
                value={form.floorId}
                onChange={(e) => setForm((f) => ({ ...f, floorId: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
              >
                <option value="" disabled>
                  Choose a floor
                </option>
                {floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Table name / number *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. T-05"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Seating capacity</label>
                <input
                  type="number"
                  min="0"
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  placeholder="4"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#1C3044] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#27435B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : editingTable ? "Update Table" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}