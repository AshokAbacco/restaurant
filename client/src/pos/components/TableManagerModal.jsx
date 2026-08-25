// src/pos/components/TableManagerModal.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getTables, createTable, updateTable, deleteTable } from "../api/posApi";

const STATUS_BADGE = {
  FREE: "bg-[#EAF6EC] dark:bg-[#43B75A]/10 text-[#3FA34D] dark:text-[#43B75A] border-[#3FA34D]/20 dark:border-[#43B75A]/30",
  OCCUPIED: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30",
  RESERVED: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
};

const EMPTY_FORM = { name: "", capacity: "", section: "", status: "FREE" };

function EditIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0-1 14a1 1 0 01-1 1H7a1 1 0 01-1-1L5 6h14z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TableManagerModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("ALL");
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (isOpen) refreshTables();
  }, [isOpen]);

  async function refreshTables() {
    setLoading(true);
    try {
      const data = await getTables();
      setTables(data);
    } catch (err) {
      setError(err.message || "Couldn't load tables.");
    } finally {
      setLoading(false);
    }
  }

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setActiveTab("ADD");
  }

  function startEdit(table) {
    setEditingId(table.id);
    setForm({
      name: table.name || "",
      capacity: table.capacity ?? "",
      section: table.section || "",
      status: table.status || "FREE",
    });
    setError(null);
    setActiveTab("ADD");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Table name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      capacity: form.capacity ? Number(form.capacity) : null,
      section: form.section.trim() || null,
      status: form.status,
    };
    try {
      if (editingId) {
        await updateTable(editingId, payload);
      } else {
        await createTable(payload);
      }
      await refreshTables();
      setForm(EMPTY_FORM);
      setEditingId(null);
      setActiveTab("ALL");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await deleteTable(id);
      setTables((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#1D231D] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7EAE1] dark:border-[#262B24] px-5 py-4">
          <h2 className="text-lg font-bold text-[#1F2937] dark:text-white">Tables</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#F3F5EE] dark:hover:bg-white/5 hover:text-[#6B7280] dark:hover:text-[#9CA8A0]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#E7EAE1] dark:border-[#262B24] px-5 pt-3">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "ALL"
                ? "border-b-2 border-[#3FA34D] dark:border-[#43B75A] text-[#3FA34D] dark:text-[#43B75A]"
                : "text-[#9CA3AF] dark:text-[#6B7280] hover:text-[#6B7280] dark:hover:text-[#9CA8A0]"
            }`}
          >
            All Tables
          </button>
          <button
            onClick={startAdd}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "ADD"
                ? "border-b-2 border-[#3FA34D] dark:border-[#43B75A] text-[#3FA34D] dark:text-[#43B75A]"
                : "text-[#9CA3AF] dark:text-[#6B7280] hover:text-[#6B7280] dark:hover:text-[#9CA8A0]"
            }`}
          >
            {editingId ? "Edit Table" : "Add Table"}
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "ALL" ? (
            loading ? (
              <div className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">Loading tables…</div>
            ) : tables.length === 0 ? (
              <div className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">No tables yet. Add one to get started.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {tables.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-4 transition-shadow hover:shadow-sm dark:hover:shadow-black/20"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-base font-semibold text-[#1F2937] dark:text-white">{t.name}</p>
                        <p className="mt-0.5 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                          {t.section || "No section"}
                          {t.capacity ? ` · ${t.capacity}p` : ""}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          STATUS_BADGE[t.status] || STATUS_BADGE.FREE
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    {confirmDeleteId === t.id ? (
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50 dark:bg-red-500/10 px-2 py-1.5">
                        <span className="text-xs text-red-600 dark:text-red-400">Delete this table?</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-medium text-[#6B7280] dark:text-[#9CA8A0] hover:text-[#1F2937] dark:hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={deletingId === t.id}
                            className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                          >
                            {deletingId === t.id ? "Deleting…" : "Confirm"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex justify-end gap-1">
                        <button
                          onClick={() => startEdit(t)}
                          className="rounded-lg p-1.5 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#EAF6EC] dark:hover:bg-[#43B75A]/10 hover:text-[#3FA34D] dark:hover:text-[#43B75A]"
                          title="Edit table"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(t.id)}
                          className="rounded-lg p-1.5 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete table"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#6B7280] dark:text-[#9CA8A0]">Table name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. T-01"
                  className="w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#262B24] text-[#1F2937] dark:text-white px-3 py-2 text-sm outline-none focus:border-[#3FA34D] dark:focus:border-[#43B75A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#6B7280] dark:text-[#9CA8A0]">Capacity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.capacity}
                    onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                    placeholder="4"
                    className="w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#262B24] text-[#1F2937] dark:text-white px-3 py-2 text-sm outline-none focus:border-[#3FA34D] dark:focus:border-[#43B75A]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#6B7280] dark:text-[#9CA8A0]">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#262B24] text-[#1F2937] dark:text-white px-3 py-2 text-sm outline-none focus:border-[#3FA34D] dark:focus:border-[#43B75A]"
                  >
                    <option value="FREE">Free</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="RESERVED">Reserved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#6B7280] dark:text-[#9CA8A0]">Section</label>
                <input
                  value={form.section}
                  onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                  placeholder="e.g. Main Hall"
                  className="w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#262B24] text-[#1F2937] dark:text-white px-3 py-2 text-sm outline-none focus:border-[#3FA34D] dark:focus:border-[#43B75A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={startAdd}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
                  >
                    Cancel edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#3FA34D] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#358F42] disabled:opacity-50 dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
                >
                  {saving ? "Saving…" : editingId ? "Update Table" : "Add Table"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}