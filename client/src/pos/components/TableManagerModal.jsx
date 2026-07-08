// src/pos/components/TableManagerModal.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getTables, createTable, updateTable, deleteTable } from "../api/posApi";

const STATUS_BADGE = {
  FREE: "bg-emerald-50 text-emerald-600 border-emerald-200",
  OCCUPIED: "bg-red-50 text-red-600 border-red-200",
  RESERVED: "bg-amber-50 text-amber-600 border-amber-200",
};

const EMPTY_FORM = { name: "", capacity: "", section: "", store: "", status: "FREE" };

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
      store: table.store || "",
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
      store: form.store.trim() || null,
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
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-[#1C3044]">Tables</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 px-5 pt-3">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "ALL"
                ? "border-b-2 border-[#27435B] text-[#27435B]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            All Tables
          </button>
          <button
            onClick={startAdd}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "ADD"
                ? "border-b-2 border-[#27435B] text-[#27435B]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {editingId ? "Edit Table" : "Add Table"}
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "ALL" ? (
            loading ? (
              <div className="text-sm text-slate-400">Loading tables…</div>
            ) : tables.length === 0 ? (
              <div className="text-sm text-slate-400">No tables yet. Add one to get started.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {tables.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-base font-semibold text-slate-800">{t.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
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
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50 px-2 py-1.5">
                        <span className="text-xs text-red-600">Delete this table?</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={deletingId === t.id}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            {deletingId === t.id ? "Deleting…" : "Confirm"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex justify-end gap-1">
                        <button
                          onClick={() => startEdit(t)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                          title="Edit table"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(t.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
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
                <label className="mb-1 block text-sm font-medium text-slate-600">Table name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. T-01"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Capacity</label>
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
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="FREE">Free</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="RESERVED">Reserved</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Section</label>
                  <input
                    value={form.section}
                    onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                    placeholder="e.g. Main Hall"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Store</label>
                  <input
                    value={form.store}
                    onChange={(e) => setForm((f) => ({ ...f, store: e.target.value }))}
                    placeholder="e.g. Main Store"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={startAdd}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
                  >
                    Cancel edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#1C3044] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#27435B] disabled:opacity-50"
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