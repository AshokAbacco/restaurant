// src/pos/components/AddFloorModal.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Doubles as "Add Floor" and "Edit Floor" — pass `editingFloor` to prefill
// and switch the button label; leave it null/undefined for the add flow.
export default function AddFloorModal({ open, onClose, editingFloor, onSave }) {
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editingFloor?.name || "");
    setError(null);
  }, [open, editingFloor]);

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Floor name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim() }, editingFloor?.id);
      handleClose();
    } catch (err) {
      setError(err.message || "Couldn't save the floor.");
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
            <h2 className="text-lg font-bold text-[#1C3044]">{editingFloor ? "Edit Floor" : "Add Floor"}</h2>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            <label className="mb-1 block text-sm font-medium text-slate-600">Floor name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rooftop"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
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
              {saving ? "Saving…" : editingFloor ? "Update Floor" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}