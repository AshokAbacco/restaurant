// client/src/pos/Kitchen/KitchenNotesPage.jsx
import { useCallback, useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import {
  getRecentKitchenNotes,
  getKitchenDisplay,
  addKitchenNote,
} from "../api/posApi";
import { useAuth } from "../../auth/AuthContext";
// FEATURE: offline mode. Reads (recent notes + the ticket picker list) fall
// back to the last-synced copy in IndexedDB, same pattern as
// KitchenDisplayScreen.jsx — this page shares the "kds:display" cache key
// with that screen since it's the same underlying ticket list. Adding a
// NEW note is deliberately NOT queued for later sync: unlike a KOT status
// flip (idempotent, safe to replay), a note is free-form text tied to a
// specific ticket the kitchen picked live — queuing it silently risks it
// landing on the wrong (by-then-changed) ticket state with no way for the
// kitchen to confirm it actually went through. So the form is simply
// disabled while offline, with an explicit message instead of a silent
// failure.
import { fetchWithOfflineFallback } from "../../offline/offlineCache";

const NOTES_CACHE_KEY = "kitchenNotes:recent";
const TICKETS_CACHE_KEY = "kds:display";

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
  const [isOffline, setIsOffline] = useState(false);

  // Active tickets, used only to populate the ticket picker in the form
  // below — a note must be attached to a specific KOT (kitchenOrderId is
  // required by the schema), so kitchen staff pick which ticket it's about.
  const [tickets, setTickets] = useState([]);
  const [selectedKotId, setSelectedKotId] = useState("");
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Both reads run together each poll so isOffline reflects the CURRENT
  // cycle (reset to false the moment a fetch actually reaches the network
  // again), not just latched true forever the first time either one falls
  // back to cache — same pattern as MenuList.jsx's combined offline flag.
  const load = useCallback(async () => {
    const [notesR, ticketsR] = await Promise.allSettled([
      fetchWithOfflineFallback(NOTES_CACHE_KEY, getRecentKitchenNotes),
      canAddNotes
        ? fetchWithOfflineFallback(TICKETS_CACHE_KEY, getKitchenDisplay)
        : Promise.resolve(null),
    ]);

    if (notesR.status === "fulfilled") {
      setNotes(notesR.value.data);
      setError(null);
    } else {
      setError(notesR.reason?.message || "Failed to load notes");
    }

    if (canAddNotes && ticketsR.status === "fulfilled" && ticketsR.value) {
      const data = ticketsR.value.data;
      setTickets(data);
      // Keep the current selection if it's still active; otherwise default
      // to the first ticket so the form isn't left pointing at nothing.
      setSelectedKotId((prev) =>
        data.some((k) => k.id === prev) ? prev : data[0]?.id || "",
      );
    }

    const wasFromCache = (r) => r.status === "fulfilled" && r.value?.fromCache;
    setIsOffline(wasFromCache(notesR) || wasFromCache(ticketsR));
    setLoading(false);
  }, [canAddNotes]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    const text = noteText.trim();
    if (!text || !selectedKotId) return;
    // Notes aren't queued for offline sync (see the import comment above) —
    // fail fast with a clear message rather than letting the request throw
    // a generic network error.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setFormError("You're offline — notes need a connection to send.");
      return;
    }
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
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-amber-600"
              >
                <path
                  d="M4 4h16v12H8l-4 4V4z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Kitchen Notes
              </h1>
              <p className="text-xs text-slate-400">
                {notes.length} note{notes.length === 1 ? "" : "s"} from the
                kitchen
              </p>
            </div>
          </div>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
        {isOffline && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            <WifiOff className="h-3.5 w-3.5" />
            Offline — showing last-synced notes and tickets. Adding a note needs
            a connection.
          </div>
        )}
      </header>

      {canAddNotes && (
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-start"
          >
            <select
              value={selectedKotId}
              onChange={(e) => setSelectedKotId(e.target.value)}
              disabled={tickets.length === 0 || isOffline}
              className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none sm:w-48"
            >
              {tickets.length === 0 ? (
                <option value="">No active tickets</option>
              ) : (
                tickets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.kotNumber}{" "}
                    {t.order?.table?.name ? `· ${t.order.table.name}` : ""}
                  </option>
                ))
              )}
            </select>
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={
                isOffline
                  ? "Notes need a connection…"
                  : "Add a note about the selected ticket…"
              }
              disabled={tickets.length === 0 || isOffline}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={
                submitting || !noteText.trim() || !selectedKotId || isOffline
              }
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? "Adding…" : "Add Note"}
            </button>
          </form>
          {formError && (
            <p className="mx-auto mt-1.5 max-w-2xl text-xs text-red-600">
              {formError}
            </p>
          )}
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
                      {n.kitchenOrder?.kitchenSection?.name
                        ? ` · ${n.kitchenOrder.kitchenSection.name}`
                        : ""}
                      {n.kitchenOrder?.order?.orderNumber
                        ? ` · ${n.kitchenOrder.order.orderNumber}`
                        : ""}
                      {n.kitchenOrder?.order?.table?.name
                        ? ` · ${n.kitchenOrder.order.table.name}`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {timeAgo(n.createdAt)}
                  </span>
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
