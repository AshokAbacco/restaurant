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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2937]/40 dark:bg-black/60 p-4"
      onClick={handleClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl bg-white dark:bg-[#171C17] shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E7EAE1] dark:border-[#262B24] px-5 py-4">
            <h2 className="text-lg font-bold text-[#1F2937] dark:text-white">
              {editingFloor ? "Edit Floor" : "Add Floor"}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#F3F5EE] dark:hover:bg-white/10 hover:text-[#6B7280] dark:hover:text-[#9CA8A0]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            {error && (
              <div className="mb-3 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-[#EF5350] dark:text-red-400">
                {error}
              </div>
            )}
            <label className="mb-1 block text-sm font-medium text-[#6B7280] dark:text-[#9CA8A0]">
              Floor name *
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rooftop"
              className="w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] px-3 py-2 text-sm text-[#1F2937] dark:text-[#E4E9E2] placeholder:text-[#9CA3AF] dark:placeholder:text-[#6B7280] outline-none focus:border-[#3FA34D] dark:focus:border-[#43B75A]"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-[#E7EAE1] dark:border-[#262B24] px-5 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#3FA34D] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : editingFloor ? "Update Floor" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}