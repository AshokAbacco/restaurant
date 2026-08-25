// src/pos/components/AssignWaiterModal.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, UserCog } from "lucide-react";

// Handles all three assignment scopes the owner can pick from:
//  - "selected"  -> the table ids the user checked on the grid (selectedTableIds)
//  - "floor"     -> every table on the currently open floor tab
//  - "all"       -> every table in the restaurant, across every floor
//
// `scope` is fixed by whichever button opened the modal (see Tables.jsx),
// so this component just needs a waiter picker + confirm.
export default function AssignWaiterModal({
  open,
  onClose,
  scope, // "selected" | "floor" | "all"
  selectedCount = 0,
  floorName,
  waiters,
  waitersLoading,
  onConfirm, // (waiterId) => Promise
}) {
  const [waiterId, setWaiterId] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setWaiterId("");
      setError(null);
    }
  }, [open, scope]);

  if (!open) return null;

  const scopeLabel =
    scope === "all"
      ? "all tables across every floor"
      : scope === "floor"
        ? `every table on "${floorName}"`
        : `${selectedCount} selected table${selectedCount === 1 ? "" : "s"}`;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!waiterId) {
      setError("Please select a waiter.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onConfirm(waiterId);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't assign tables.");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2937]/40 dark:bg-black/60 p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl bg-white dark:bg-[#171C17] shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-[#E7EAE1] dark:border-[#262B24] px-5 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#1F2937] dark:text-white">
              <UserCog className="h-5 w-5" />
              Assign Waiter
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#F3F5EE] dark:hover:bg-white/10 hover:text-[#6B7280] dark:hover:text-[#9CA8A0]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 px-5 py-4">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-[#EF5350] dark:text-red-400">
                {error}
              </div>
            )}

            <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
              This will assign{" "}
              <span className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                {scopeLabel}
              </span>{" "}
              to the waiter you choose below. Any previous assignment on those
              tables will be replaced.
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#6B7280] dark:text-[#9CA8A0]">
                Select waiter *
              </label>
              {waitersLoading ? (
                <div className="rounded-lg border border-[#E7EAE1] dark:border-[#262B24] px-3 py-2 text-sm text-[#9CA3AF] dark:text-[#6B7280]">
                  Loading waiters…
                </div>
              ) : waiters.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#E7EAE1] dark:border-[#262B24] px-3 py-2 text-sm text-[#9CA3AF] dark:text-[#6B7280]">
                  No waiter logins found. Create one from Employees → select
                  employee → Account tab.
                </div>
              ) : (
                <select
                  value={waiterId}
                  onChange={(e) => setWaiterId(e.target.value)}
                  className="w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] px-3 py-2 text-sm text-[#1F2937] dark:text-[#E4E9E2] outline-none focus:border-[#3FA34D] dark:focus:border-[#43B75A]"
                >
                  <option value="" disabled>
                    Choose a waiter
                  </option>
                  {waiters.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.fullName} ({w.employeeCode}) — {w.assignedTableCount}{" "}
                      table
                      {w.assignedTableCount === 1 ? "" : "s"} currently
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#E7EAE1] dark:border-[#262B24] px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || waitersLoading || waiters.length === 0}
              className="rounded-lg bg-[#3FA34D] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Assigning…" : "Assign"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}