// src/tableReservation/pages/TableReservationsPage.jsx
//
// This is the missing "page" — it owns all the tableReservationApi.js calls
// (per the comment in ReservationModal.jsx: "parent page own all
// tableReservationApi.js calls") and renders ReservationModal (add/edit) +
// ReservationDetailsModal (view/actions) as children.
//
// Route: mount this at /table-reservations, e.g. in your router:
//   <Route path="/table-reservations" element={<TableReservationsPage />} />
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { FiPlus, FiSearch, FiRefreshCw, FiCalendar } from "react-icons/fi";
import {
  getReservations,
  createReservation,
  updateReservation,
  seatReservation,
  cancelReservation,
  noShowReservation,
  completeReservation,
} from "./api/tableReservationApi";
import { apiRequest } from "../api/apiClient";
import ReservationModal from "./components/ReservationModal";
import ReservationDetailsModal from "./components/ReservationDetailsModal";

const STATUS_STYLES = {
  BOOKED: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  SEATED: "bg-[#EAF6EC] text-[#3FA34D] dark:bg-[#43B75A]/10 dark:text-[#43B75A]",
  CANCELLED: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-[#9CA8A0]",
  NO_SHOW: "bg-red-50 text-[#EF5350] dark:bg-red-500/10 dark:text-red-400",
  COMPLETED: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
};

const STATUS_OPTIONS = ["BOOKED", "SEATED", "CANCELLED", "NO_SHOW", "COMPLETED"];

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
        STATUS_STYLES[status] || STATUS_STYLES.BOOKED
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function TableReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({ date: "", status: "", customer: "" });

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null); // reservation object when editing
  const [saving, setSaving] = useState(false);

  const [detailsReservation, setDetailsReservation] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  // ------------------------------------------------------------------
  // Data loading
  // ------------------------------------------------------------------

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReservations(filters);
      setReservations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Couldn't load reservations.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadTables = useCallback(async () => {
    // Adjust this path if your tables endpoint differs — this follows the
    // same /pos/<resource> convention as /pos/reservations.
    try {
      const { ok, data } = await apiRequest("/pos/tables");
      if (ok) {
        setTables(Array.isArray(data) ? data : data?.tables || []);
      }
    } catch {
      // Non-fatal — the add/edit modal's table picker will just be empty.
      setTables([]);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  // ------------------------------------------------------------------
  // Add / Edit
  // ------------------------------------------------------------------

  function openAdd() {
    setEditing(null);
    setAddOpen(true);
  }

  function openEditFromDetails() {
    setEditing(detailsReservation);
    setDetailsReservation(null);
    setAddOpen(true);
  }

  function closeModal() {
    setAddOpen(false);
    setEditing(null);
  }

  async function handleSave(payload) {
    setSaving(true);
    try {
      if (editing) {
        await updateReservation(editing.id, payload);
      } else {
        await createReservation(payload);
      }
      closeModal();
      await loadReservations();
    } catch (err) {
      // Surface the error inside the modal instead of swallowing it.
      window.alert(err.message || "Couldn't save the reservation.");
    } finally {
      setSaving(false);
    }
  }

  // ------------------------------------------------------------------
  // Status transitions (from the details modal)
  // ------------------------------------------------------------------

  async function runAction(action, reservationId, successMessage) {
    setActionBusy(true);
    try {
      const updated = await action(reservationId);
      setDetailsReservation(updated);
      await loadReservations();
    } catch (err) {
      window.alert(err.message || "That action failed.");
    } finally {
      setActionBusy(false);
    }
  }

  // ------------------------------------------------------------------
  // Derived / filtered view
  // ------------------------------------------------------------------

  const filteredReservations = useMemo(() => {
    if (!filters.customer) return reservations;
    // Client-side fallback filter in case the backend `customer` filter
    // isn't applied yet — harmless no-op otherwise since it already matches.
    const q = filters.customer.toLowerCase();
    return reservations.filter((r) => r.customerName?.toLowerCase().includes(q));
  }, [reservations, filters.customer]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937] dark:text-white">
            Table Reservations
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
            {loading ? "Loading…" : `${filteredReservations.length} reservation${filteredReservations.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#3FA34D] hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] transition-colors"
        >
          <FiPlus /> Add Reservation
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#6B7280]" />
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
            className="pl-9 pr-3 py-2 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231D] text-sm text-[#1F2937] dark:text-white outline-none focus:border-[#3FA34D]"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="px-3 py-2 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231D] text-sm text-[#1F2937] dark:text-white outline-none focus:border-[#3FA34D]"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search customer…"
            value={filters.customer}
            onChange={(e) => setFilters((f) => ({ ...f, customer: e.target.value }))}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231D] text-sm text-[#1F2937] dark:text-white outline-none focus:border-[#3FA34D]"
          />
        </div>

        <button
          onClick={loadReservations}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-sm text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] overflow-hidden bg-white dark:bg-[#171C17]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F3F5EE] dark:bg-white/5 text-left text-[#6B7280] dark:text-[#9CA8A0]">
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Table</th>
              <th className="px-4 py-3 font-semibold">Party</th>
              <th className="px-4 py-3 font-semibold">Date &amp; Time</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
            {!loading && filteredReservations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#9CA3AF] dark:text-[#6B7280]">
                  No reservations found.
                </td>
              </tr>
            )}

            {filteredReservations.map((r) => {
              const dt = new Date(r.reservedFor);
              return (
                <tr
                  key={r.id}
                  onClick={() => setDetailsReservation(r)}
                  className="cursor-pointer hover:bg-[#F3F5EE] dark:hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-[#1F2937] dark:text-white">
                    {r.customerName}
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] dark:text-[#9CA8A0]">
                    {r.customerPhone || "—"}
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] dark:text-[#9CA8A0]">
                    {r.table?.name || "—"}
                    {r.table?.floor?.name ? ` — ${r.table.floor.name}` : ""}
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] dark:text-[#9CA8A0]">{r.partySize}</td>
                  <td className="px-4 py-3 text-[#6B7280] dark:text-[#9CA8A0]">
                    {dt.toLocaleDateString()}{" "}
                    {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      <ReservationModal
        open={addOpen}
        reservation={editing}
        tables={tables}
        onClose={closeModal}
        onSave={handleSave}
        saving={saving}
      />

      {/* Details modal */}
      <ReservationDetailsModal
        open={Boolean(detailsReservation)}
        reservation={detailsReservation}
        onClose={() => setDetailsReservation(null)}
        onEdit={openEditFromDetails}
        onSeat={() => runAction((id) => seatReservation(id), detailsReservation.id)}
        onCancel={() => runAction((id) => cancelReservation(id), detailsReservation.id)}
        onNoShow={() => runAction((id) => noShowReservation(id), detailsReservation.id)}
        onComplete={() => runAction((id) => completeReservation(id), detailsReservation.id)}
        busy={actionBusy}
      />
    </div>
  );
}