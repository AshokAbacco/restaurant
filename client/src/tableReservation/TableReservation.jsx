// src/tableReservation/TableReservation.jsx
//
// Main and only page for Table Reservation. Follows the same structural
// conventions as src/dashboard/Dashboard.jsx (PageHeader, #F3F5EE/#0D110C
// page background, white/#171C17 cards, #3FA34D/#43B75A accent) and the
// same API-call-lives-in-the-page pattern already used by Tables.jsx —
// this file is the only place tableReservationApi.js is called from.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiPlus,
  FiSearch,
  FiCalendar,
  FiEye,
  FiEdit2,
  FiCheckCircle,
  FiXCircle,
  FiUserX,
  FiAlertCircle,
  FiX,
  FiCheckSquare,
} from "react-icons/fi";

import PageHeader from "../components/layout/PageHeader";

import ReservationModal from "./components/ReservationModal";
import ReservationDetailsModal from "./components/ReservationDetailsModal";

import * as tableReservationApi from "./api/tableReservationApi";
import { getAllTables } from "../tables/api/tablesManagementApi";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "BOOKED", label: "Booked" },
  { value: "SEATED", label: "Seated" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
  { value: "COMPLETED", label: "Completed" },
];

const STATUS_STYLES = {
  BOOKED: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  SEATED: "bg-[#EAF6EC] text-[#3FA34D] dark:bg-[#43B75A]/10 dark:text-[#43B75A]",
  CANCELLED: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-[#9CA8A0]",
  NO_SHOW: "bg-red-50 text-[#EF5350] dark:bg-red-500/10 dark:text-red-400",
  COMPLETED: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
};

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

// Minimal self-contained toast — same visual language as the toast on the
// Login screen (top-right, rounded-2xl, slide-in), reused here since no
// shared toast component was available to import.
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.type === "error";

  return (
    <div className="fixed right-4 top-6 z-[100]">
      <div
        role="alert"
        className={`flex w-[320px] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl border p-4 shadow-lg ring-1 ring-black/5 transition-all dark:bg-[#171C17] ${
          isError
            ? "border-red-100 bg-white dark:border-red-900/40"
            : "border-[#E7EAE1] bg-white dark:border-[#262B24]"
        }`}
      >
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isError
              ? "bg-red-50 dark:bg-red-900/30"
              : "bg-[#EAF6EC] dark:bg-[#43B75A]/20"
          }`}
        >
          {isError ? (
            <FiAlertCircle className="text-lg text-red-600 dark:text-red-400" />
          ) : (
            <FiCheckSquare className="text-lg text-[#3FA34D] dark:text-[#43B75A]" />
          )}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {isError ? "Something went wrong" : "Success"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-[#9CA8A0]">
            {toast.message}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="mt-0.5 shrink-0 rounded-lg p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 dark:hover:bg-white/10"
        >
          <FiX className="text-base" />
        </button>
      </div>
    </div>
  );
}

const inputClass =
  "w-full pl-11 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1D231D] text-[#1F2937] dark:text-white outline-none transition-all border-[#E7EAE1] dark:border-[#262B24] focus:border-[#3FA34D] dark:focus:border-[#43B75A] text-sm";

export default function TableReservation() {
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    date: "",
    status: "",
    tableId: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [saving, setSaving] = useState(false);

  const [detailsReservation, setDetailsReservation] = useState(null);

  const showToast = (type, message) => setToast({ type, message });

  // ==========================================
  // LOAD DATA
  // ==========================================

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await tableReservationApi.getReservations({
        date: filters.date || undefined,
        status: filters.status || undefined,
        tableId: filters.tableId || undefined,
        // Backend matches either name or phone loosely — send the same
        // search text as both; the service treats each independently.
        customer: filters.search || undefined,
      });
      setReservations(data);
    } catch (err) {
      setError(err.message || "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }, [filters.date, filters.status, filters.tableId, filters.search]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useEffect(() => {
    getAllTables()
      .then(setTables)
      .catch(() => setTables([]));
  }, []);

  // Client-side phone fallback: the search box should match name OR phone,
  // but the backend query param only filters name via `customer` (see
  // reservations.service.js). Re-filter here so phone search still works
  // without changing the backend contract.
  const visibleReservations = useMemo(() => {
    if (!filters.search) return reservations;
    const q = filters.search.trim().toLowerCase();
    return reservations.filter(
      (r) =>
        r.customerName?.toLowerCase().includes(q) ||
        r.customerPhone?.toLowerCase().includes(q),
    );
  }, [reservations, filters.search]);

  // ==========================================
  // CRUD HANDLERS
  // ==========================================

  const openAddModal = () => {
    setEditingReservation(null);
    setModalOpen(true);
  };

  const openEditModal = (reservation) => {
    setDetailsReservation(null);
    setEditingReservation(reservation);
    setModalOpen(true);
  };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editingReservation) {
        await tableReservationApi.updateReservation(
          editingReservation.id,
          payload,
        );
        showToast("success", "Reservation updated");
      } else {
        await tableReservationApi.createReservation(payload);
        showToast("success", "Reservation created");
      }
      setModalOpen(false);
      setEditingReservation(null);
      await loadReservations();
    } catch (err) {
      showToast("error", err.message || "Failed to save reservation");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (id, action, successMessage) => {
    setBusyId(id);
    try {
      await action(id);
      showToast("success", successMessage);
      setDetailsReservation(null);
      await loadReservations();
    } catch (err) {
      showToast("error", err.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleSeat = (id) =>
    runAction(id, tableReservationApi.seatReservation, "Table seated");
  const handleCancel = (id) =>
    runAction(id, tableReservationApi.cancelReservation, "Reservation cancelled");
  const handleNoShow = (id) =>
    runAction(id, tableReservationApi.noShowReservation, "Marked as no-show");
  const handleComplete = (id) =>
    runAction(id, tableReservationApi.completeReservation, "Reservation completed");

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="space-y-6 bg-[#F3F5EE] dark:bg-[#0D110C] min-h-screen -m-6 p-6 transition-colors">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Table Reservations"
          subtitle="Book tables ahead of time and track upcoming guests."
          icon={<FiCalendar />}
        />

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[#3FA34D] hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] shadow-lg transition-all shrink-0"
        >
          <FiPlus /> Add Reservation
        </button>
      </div>

      {/* ======================================
          FILTERS
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 transition-colors">
        <div className="relative">
          <FiSearch className="absolute left-4 top-3.5 text-[#9CA3AF] dark:text-[#6B7280]" />
          <input
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
            placeholder="Search customer or phone"
            className={inputClass}
          />
        </div>

        <div className="relative">
          <FiCalendar className="absolute left-4 top-3.5 text-[#9CA3AF] dark:text-[#6B7280]" />
          <input
            type="date"
            value={filters.date}
            onChange={(e) =>
              setFilters((f) => ({ ...f, date: e.target.value }))
            }
            className={inputClass}
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value }))
          }
          className={`${inputClass} pl-4 appearance-none`}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filters.tableId}
          onChange={(e) =>
            setFilters((f) => ({ ...f, tableId: e.target.value }))
          }
          className={`${inputClass} pl-4 appearance-none`}
        >
          <option value="">All Tables</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.floor?.name ? ` — ${t.floor.name}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* ======================================
          LIST
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] overflow-hidden transition-colors">
        {error ? (
          <div className="p-10 text-center">
            <p className="text-[#EF5350] font-medium">{error}</p>
            <button
              onClick={loadReservations}
              className="mt-4 px-6 py-2 rounded-xl bg-[#3FA34D] hover:bg-[#358F42] text-white font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="p-10 text-center text-[#6B7280] dark:text-[#9CA8A0]">
            Loading reservations...
          </div>
        ) : visibleReservations.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[#6B7280] dark:text-[#9CA8A0]">
              No reservations found.
            </p>
            <button
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[#3FA34D] hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] transition-colors"
            >
              <FiPlus /> Add Reservation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E7EAE1] dark:border-[#262B24] text-left text-xs uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">Table</th>
                  <th className="px-5 py-3 font-semibold">Party Size</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Time</th>
                  <th className="px-5 py-3 font-semibold">Duration</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleReservations.map((r) => {
                  const reservedDate = new Date(r.reservedFor);
                  const busy = busyId === r.id;
                  return (
                    <tr
                      key={r.id}
                      className="border-b last:border-0 border-[#F3F5EE] dark:border-[#20261F] hover:bg-[#F9FAF6] dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3.5 font-medium text-[#1F2937] dark:text-white">
                        {r.customerName}
                      </td>
                      <td className="px-5 py-3.5 text-[#6B7280] dark:text-[#9CA8A0]">
                        {r.customerPhone}
                      </td>
                      <td className="px-5 py-3.5 text-[#6B7280] dark:text-[#9CA8A0]">
                        {r.table?.name || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-[#6B7280] dark:text-[#9CA8A0]">
                        {r.partySize}
                      </td>
                      <td className="px-5 py-3.5 text-[#6B7280] dark:text-[#9CA8A0]">
                        {reservedDate.toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-[#6B7280] dark:text-[#9CA8A0]">
                        {reservedDate.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-[#6B7280] dark:text-[#9CA8A0]">
                        {r.durationMinutes}m
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="View"
                            onClick={() => setDetailsReservation(r)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/10 transition-colors"
                          >
                            <FiEye />
                          </button>

                          {r.status === "BOOKED" && (
                            <>
                              <button
                                title="Edit"
                                onClick={() => openEditModal(r)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/10 transition-colors"
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                title="Seat"
                                disabled={busy}
                                onClick={() => handleSeat(r.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#3FA34D] dark:text-[#43B75A] hover:bg-[#EAF6EC] dark:hover:bg-[#43B75A]/10 transition-colors disabled:opacity-50"
                              >
                                <FiCheckCircle />
                              </button>
                              <button
                                title="No Show"
                                disabled={busy}
                                onClick={() => handleNoShow(r.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#E8873A] dark:text-[#FFA94D] hover:bg-[#E8873A]/10 transition-colors disabled:opacity-50"
                              >
                                <FiUserX />
                              </button>
                              <button
                                title="Cancel"
                                disabled={busy}
                                onClick={() => handleCancel(r.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#EF5350] hover:bg-[#EF5350]/10 transition-colors disabled:opacity-50"
                              >
                                <FiXCircle />
                              </button>
                            </>
                          )}

                          {r.status === "SEATED" && (
                            <button
                              title="Complete"
                              disabled={busy}
                              onClick={() => handleComplete(r.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors disabled:opacity-50"
                            >
                              <FiCheckCircle />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReservationModal
        open={modalOpen}
        reservation={editingReservation}
        tables={tables}
        saving={saving}
        onClose={() => {
          setModalOpen(false);
          setEditingReservation(null);
        }}
        onSave={handleSave}
      />

      <ReservationDetailsModal
        open={Boolean(detailsReservation)}
        reservation={detailsReservation}
        busy={busyId === detailsReservation?.id}
        onClose={() => setDetailsReservation(null)}
        onEdit={() => openEditModal(detailsReservation)}
        onSeat={() => handleSeat(detailsReservation.id)}
        onCancel={() => handleCancel(detailsReservation.id)}
        onNoShow={() => handleNoShow(detailsReservation.id)}
        onComplete={() => handleComplete(detailsReservation.id)}
      />
    </div>
  );
}