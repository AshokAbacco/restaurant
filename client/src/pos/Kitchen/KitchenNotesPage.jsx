// client/src/pos/Kitchen/KitchenNotesPage.jsx
import { useCallback, useEffect, useState } from "react";
import { getRecentKitchenNotes, getKitchenDisplay, addKitchenNote } from "../api/posApi";
import { useAuth } from "../../auth/AuthContext";

const POLL_INTERVAL_MS = 15000;

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function KitchenNotesPage() {
  const { isKitchen } = useAuth();
  // Only kitchen staff can add a note from this page — owner/manager land
  // here too but the form below simply isn't rendered for them. Backend
  // enforces the same rule independently (POST /pos/kot/:id/notes is
  // locked to KITCHEN), so this is a UI convenience, not the real gate.
  const canAddNotes = isKitchen();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active tickets, used only to populate the ticket picker in the form
  // below — a note must be attached to a specific KOT (kitchenOrderId is
  // required by the schema), so kitchen staff pick which ticket it's about.
  const [tickets, setTickets] = useState([]);
  const [selectedKotId, setSelectedKotId] = useState("");
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getRecentKitchenNotes();
      setNotes(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    if (!canAddNotes) return; // no point fetching if the form won't render
    try {
      const data = await getKitchenDisplay();
      setTickets(data);
      // Keep the current selection if it's still active; otherwise default
      // to the first ticket so the form isn't left pointing at nothing.
      setSelectedKotId((prev) => (data.some((k) => k.id === prev) ? prev : data[0]?.id || ""));
    } catch {
      // Silently skip — the notes feed above still works even if this fails.
    }
  }, [canAddNotes]);

  useEffect(() => {
    load();
    loadTickets();
    const id = setInterval(() => {
      load();
      loadTickets();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load, loadTickets]);

  async function handleSubmit(e) {
    e.preventDefault();
    const text = noteText.trim();
    if (!text || !selectedKotId) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await addKitchenNote(selectedKotId, text);
      setNoteText("");
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-amber-600">
                <path
                  d="M4 4h16v12H8l-4 4V4z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Kitchen Notes</h1>
              <p className="text-xs text-slate-400">
                {notes.length} note{notes.length === 1 ? "" : "s"} from the kitchen
              </p>
            </div>
          </div>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
      </header>

      {canAddNotes && (
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-start">
            <select
              value={selectedKotId}
              onChange={(e) => setSelectedKotId(e.target.value)}
              disabled={tickets.length === 0}
              className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none sm:w-48"
            >
              {tickets.length === 0 ? (
                <option value="">No active tickets</option>
              ) : (
                tickets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.kotNumber} {t.order?.table?.name ? `· ${t.order.table.name}` : ""}
                  </option>
                ))
              )}
            </select>
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note about the selected ticket…"
              disabled={tickets.length === 0}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting || !noteText.trim() || !selectedKotId}
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? "Adding…" : "Add Note"}
            </button>
          </form>
          {formError && <p className="mx-auto mt-1.5 max-w-2xl text-xs text-red-600">{formError}</p>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading notes…</p>
        ) : notes.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-slate-400">No notes from the kitchen yet.</p>
          </div>
        ) : (
          <ul className="mx-auto max-w-2xl space-y-3">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {n.chef?.fullName || "Kitchen"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {n.kitchenOrder?.kotNumber}
                      {n.kitchenOrder?.kitchenSection?.name ? ` · ${n.kitchenOrder.kitchenSection.name}` : ""}
                      {n.kitchenOrder?.order?.orderNumber ? ` · ${n.kitchenOrder.order.orderNumber}` : ""}
                      {n.kitchenOrder?.order?.table?.name ? ` · ${n.kitchenOrder.order.table.name}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{n.note}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}