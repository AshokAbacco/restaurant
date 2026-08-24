// ==============================================
// src/settings/counters/CountersSettings.jsx
// ==============================================
// FEATURE (Phase 2.2 — Counter/Terminal tracking): Owner/Admin manage the
// list of physical POS counters/terminals here (e.g. "Counter 1",
// "Captain", "Billing Station"). Staff on the actual POS screen just PICK
// one for their device (see pos/components/CounterPicker.jsx, a
// localStorage choice) — renaming/adding/removing the counters themselves
// is restricted to Owner/Admin, same as the backend enforces
// (counters.routes.js).

import React, { useEffect, useState } from "react";
import { FiMapPin, FiPlus, FiEdit2, FiTrash2, FiX, FiCheck } from "react-icons/fi";
import { apiRequest } from "../../api/apiClient";

const CountersSettings = () => {
  const [counters, setCounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null); // null = not editing, "new" = creating
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    const { ok, data } = await apiRequest("/pos/counters");
    if (!ok) {
      setError(data?.message || "Failed to load counters.");
    } else {
      setCounters(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditingId("new");
    setNameDraft("");
    setError("");
  }

  function startEdit(counter) {
    setEditingId(counter.id);
    setNameDraft(counter.name);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setNameDraft("");
  }

  async function handleSave() {
    if (!nameDraft.trim()) {
      setError("Counter name is required.");
      return;
    }
    setSaving(true);
    setError("");

    const isNew = editingId === "new";
    const { ok, data } = await apiRequest(
      isNew ? "/pos/counters" : `/pos/counters/${editingId}`,
      {
        method: isNew ? "POST" : "PUT",
        body: JSON.stringify({ name: nameDraft.trim() }),
      },
    );

    setSaving(false);

    if (!ok) {
      setError(data?.message || "Couldn't save that counter.");
      return;
    }

    setEditingId(null);
    setNameDraft("");
    load();
  }

  async function handleToggleActive(counter) {
    setError("");
    const { ok, data } = await apiRequest(`/pos/counters/${counter.id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: !counter.isActive }),
    });
    if (!ok) {
      setError(data?.message || "Couldn't update that counter.");
      return;
    }
    load();
  }

  async function handleDelete(id) {
    setError("");
    const { ok, data } = await apiRequest(`/pos/counters/${id}`, { method: "DELETE" });
    setConfirmDeleteId(null);
    if (!ok) {
      setError(data?.message || "Couldn't remove that counter.");
      return;
    }
    load();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-gray-500">Loading counters…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-8 py-8 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
            <FiMapPin size={30} />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Billing Counters</h1>
            <p className="mt-2 text-gray-500">
              Every physical POS terminal in this outlet — "Counter 1",
              "Captain", etc. Staff pick one on their device; renaming or
              removing a counter here is an Owner/Admin action.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-5 py-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border p-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-700">
              {counters.length} counter{counters.length === 1 ? "" : "s"}
            </h2>
            {editingId === null && (
              <button
                onClick={startCreate}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <FiPlus /> Add Counter
              </button>
            )}
          </div>

          {editingId === "new" && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="e.g. Counter 1"
                className="flex-1 h-10 rounded-lg border px-3 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 h-10 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Add"}
              </button>
              <button onClick={cancelEdit} className="rounded-lg border px-4 h-10 text-sm">
                Cancel
              </button>
            </div>
          )}

          {counters.length === 0 && editingId !== "new" ? (
            <p className="text-center text-gray-400 py-10">
              No counters yet — add one so staff can select it on the POS screen.
            </p>
          ) : (
            <div className="space-y-3">
              {counters.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border p-4"
                >
                  {editingId === c.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        autoFocus
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        className="flex-1 h-10 rounded-lg border px-3 text-sm"
                        onKeyDown={(e) => e.key === "Enter" && handleSave()}
                      />
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        <FiCheck />
                      </button>
                      <button onClick={cancelEdit} className="rounded-lg border p-2">
                        <FiX />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            c.isActive ? "bg-emerald-500" : "bg-gray-300"
                          }`}
                        />
                        <span className="font-medium">{c.name}</span>
                        {!c.isActive && (
                          <span className="text-xs text-gray-400">(inactive)</span>
                        )}
                      </div>

                      {confirmDeleteId === c.id ? (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">Remove this counter?</span>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="font-semibold text-red-600 hover:text-red-700"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleActive(c)}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100"
                          >
                            {c.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => startEdit(c)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(c.id)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CountersSettings;