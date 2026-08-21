// src/tableReservation/components/ReservationDetailsModal.jsx
//
// Read-only details view. Actions here call the onSeat/onCancel/onNoShow/
// onComplete/onEdit callbacks passed down from TableReservation.jsx, which
// is the only place tableReservationApi.js is actually called from — this
// modal never imports the API module directly.
import React from "react";
import {
  FiX,
  FiUser,
  FiPhone,
  FiUsers,
  FiGrid,
  FiCalendar,
  FiClock,
  FiFileText,
  FiCheckCircle,
  FiXCircle,
  FiUserX,
  FiEdit2,
} from "react-icons/fi";

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
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
        STATUS_STYLES[status] || STATUS_STYLES.BOOKED
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function Field({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 w-9 h-9 rounded-xl bg-[#F3F5EE] dark:bg-white/5 flex items-center justify-center text-[#3FA34D] dark:text-[#43B75A] shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">{label}</p>
        <p className="text-sm font-medium text-[#1F2937] dark:text-white break-words">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

export default function ReservationDetailsModal({
  open,
  reservation,
  onClose,
  onEdit,
  onSeat,
  onCancel,
  onNoShow,
  onComplete,
  busy,
}) {
  if (!open || !reservation) return null;

  const { status } = reservation;
  const reservedDate = new Date(reservation.reservedFor);

  const canEdit = status === "BOOKED";
  const canSeat = status === "BOOKED";
  const canCancel = status === "BOOKED";
  const canNoShow = status === "BOOKED";
  const canComplete = status === "SEATED";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white dark:bg-[#171C17] rounded-3xl shadow-2xl border border-[#E7EAE1] dark:border-[#262B24] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E7EAE1] dark:border-[#262B24]">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-[#1F2937] dark:text-white">
              Reservation Details
            </h3>
            <StatusBadge status={status} />
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/10 transition-colors"
          >
            <FiX />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <Field icon={<FiUser />} label="Customer Name" value={reservation.customerName} />
            <Field icon={<FiPhone />} label="Phone" value={reservation.customerPhone} />
            <Field icon={<FiUsers />} label="Party Size" value={reservation.partySize} />
            <Field
              icon={<FiGrid />}
              label="Table"
              value={
                reservation.table
                  ? `${reservation.table.name}${
                      reservation.table.floor?.name
                        ? ` — ${reservation.table.floor.name}`
                        : ""
                    }`
                  : "—"
              }
            />
            <Field
              icon={<FiCalendar />}
              label="Reservation Date"
              value={reservedDate.toLocaleDateString()}
            />
            <Field
              icon={<FiClock />}
              label="Reservation Time"
              value={reservedDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
            <Field
              icon={<FiClock />}
              label="Duration"
              value={`${reservation.durationMinutes} mins`}
            />
            <Field
              icon={<FiUser />}
              label="Created By"
              value={reservation.createdByEmployee?.fullName}
            />
          </div>

          <Field icon={<FiFileText />} label="Notes" value={reservation.notes} />

          <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
            Created {new Date(reservation.createdAt).toLocaleString()}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#E7EAE1] dark:border-[#262B24]">
            {canEdit && (
              <button
                onClick={onEdit}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-[#1F2937] dark:text-white border border-[#E7EAE1] dark:border-[#262B24] hover:bg-[#F3F5EE] dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                <FiEdit2 /> Edit
              </button>
            )}

            {canSeat && (
              <button
                onClick={onSeat}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white bg-[#3FA34D] hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] transition-colors disabled:opacity-50"
              >
                <FiCheckCircle /> Seat
              </button>
            )}

            {canComplete && (
              <button
                onClick={onComplete}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                <FiCheckCircle /> Complete
              </button>
            )}

            {canNoShow && (
              <button
                onClick={onNoShow}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-[#E8873A] dark:text-[#FFA94D] border border-[#E8873A]/30 dark:border-[#FFA94D]/30 hover:bg-[#E8873A]/5 transition-colors disabled:opacity-50"
              >
                <FiUserX /> No Show
              </button>
            )}

            {canCancel && (
              <button
                onClick={onCancel}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-[#EF5350] border border-[#EF5350]/30 hover:bg-[#EF5350]/5 transition-colors disabled:opacity-50"
              >
                <FiXCircle /> Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}