// src/tableReservation/components/ReservationModal.jsx
//
// One modal for both Add and Edit — mode is inferred from whether
// `reservation` is passed in. Matches the design language already used in
// Login.jsx / Dashboard.jsx (rounded-2xl cards, #3FA34D green accent,
// #E7EAE1 / #262B24 borders, same light/dark palette).
//
// This component does NOT call the API directly — it only builds the
// payload and calls onSave(payload), letting the parent page own all
// tableReservationApi.js calls (matches the project's existing pattern in
// Tables.jsx, where mutation calls live in the page, not the modal).
import React, { useEffect, useState } from "react";
import { FiX, FiUser, FiPhone, FiUsers, FiCalendar, FiClock, FiGrid, FiFileText } from "react-icons/fi";

const inputClass =
  "w-full pl-11 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1D231D] text-[#1F2937] dark:text-white outline-none transition-all border-[#E7EAE1] dark:border-[#262B24] focus:border-[#3FA34D] dark:focus:border-[#43B75A]";

const errorInputClass =
  "w-full pl-11 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1D231D] text-[#1F2937] dark:text-white outline-none transition-all border-[#EF5350]";

function toLocalDateValue(isoOrDate) {
  if (!isoOrDate) return "";

  const d = new Date(isoOrDate);

  if (Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function to12HourTimeParts(isoOrDate) {
  if (!isoOrDate) {
    return {
      hour: "",
      minute: "",
      period: "AM",
    };
  }

  const d = new Date(isoOrDate);

  if (Number.isNaN(d.getTime())) {
    return {
      hour: "",
      minute: "",
      period: "AM",
    };
  }

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");

  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  return {
    hour: String(hours).padStart(2, "0"),
    minute: minutes,
    period,
  };
}

function getTodayLocalDate() {
  const d = new Date();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ReservationModal({
  open,
  reservation, // if present -> Edit mode, else Add mode
  tables, // [{ id, name, floor: { name } }, ...] from existing tablesManagementApi
  onClose,
  onSave, // async (payload) => void — parent handles create vs update + API call
  saving,
}) {
  const isEdit = Boolean(reservation);

    const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    partySize: "2",
    date: "",
    timeHour: "",
    timeMinute: "",
    period: "AM",
    durationMinutes: "60",
    tableId: "",
    notes: "",
    });
  const [errors, setErrors] = useState({});

    useEffect(() => {
    if (!open) return;

    if (reservation) {
        const localTime = to12HourTimeParts(reservation.reservedFor);

        setForm({
        customerName: reservation.customerName || "",
        customerPhone: reservation.customerPhone || "",
        partySize: String(reservation.partySize ?? "2"),
        date: toLocalDateValue(reservation.reservedFor),
        timeHour: localTime.hour,
        timeMinute: localTime.minute,
        period: localTime.period,
        durationMinutes: String(reservation.durationMinutes ?? "60"),
        tableId: reservation.tableId || reservation.table?.id || "",
        notes: reservation.notes || "",
        });
    } else {
        setForm({
        customerName: "",
        customerPhone: "",
        partySize: "2",
        date: getTodayLocalDate(),
        timeHour: "",
        timeMinute: "",
        period: "AM",
        durationMinutes: "60",
        tableId: "",
        notes: "",
        });
    }

    setErrors({});
    }, [open, reservation]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.customerName.trim()) next.customerName = "Customer name is required";
    if (!form.customerPhone.trim()) next.customerPhone = "Phone number is required";
    if (!form.partySize || Number(form.partySize) <= 0)
      next.partySize = "Party size must be greater than 0";
    if (!form.date) next.date = "Date is required";
    if (!form.timeHour || !form.timeMinute) {
    next.time = "Time is required";
    }
    if (!form.tableId) next.tableId = "Please select a table";
    if (!form.durationMinutes || Number(form.durationMinutes) <= 0)
      next.durationMinutes = "Duration must be greater than 0";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

    const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    let hours = Number(form.timeHour);
    const minutes = Number(form.timeMinute);

    if (
        !hours ||
        Number.isNaN(minutes) ||
        hours < 1 ||
        hours > 12 ||
        minutes < 0 ||
        minutes > 59
    ) {
        setErrors((prev) => ({
        ...prev,
        time: "Please select a valid time",
        }));
        return;
    }

    if (form.period === "PM" && hours !== 12) {
        hours += 12;
    }

    if (form.period === "AM" && hours === 12) {
        hours = 0;
    }

    const localDate = new Date(form.date);
    localDate.setHours(hours, minutes, 0, 0);

    const reservedFor = localDate.toISOString();

    await onSave({
        tableId: form.tableId,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        partySize: Number(form.partySize),
        reservedFor,
        durationMinutes: Number(form.durationMinutes),
        notes: form.notes.trim() || undefined,
    });
    };
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl bg-white dark:bg-[#171C17] rounded-3xl shadow-2xl border border-[#E7EAE1] dark:border-[#262B24] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E7EAE1] dark:border-[#262B24]">
          <h3 className="text-lg font-bold text-[#1F2937] dark:text-white">
            {isEdit ? "Edit Reservation" : "Add Reservation"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/10 transition-colors"
          >
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Customer Name */}
          <div>
            <label className="block text-sm font-semibold text-[#1F2937] dark:text-[#E5E7EB] mb-1.5">
              Customer Name
            </label>
            <div className="relative">
              <FiUser className="absolute left-4 top-3.5 text-[#9CA3AF] dark:text-[#6B7280]" />
              <input
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="e.g. Ravi Kumar"
                className={errors.customerName ? errorInputClass : inputClass}
              />
            </div>
            {errors.customerName && (
              <p className="text-[#EF5350] text-xs mt-1.5">{errors.customerName}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-[#1F2937] dark:text-[#E5E7EB] mb-1.5">
              Customer Phone
            </label>
            <div className="relative">
              <FiPhone className="absolute left-4 top-3.5 text-[#9CA3AF] dark:text-[#6B7280]" />
              <input
                name="customerPhone"
                value={form.customerPhone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className={errors.customerPhone ? errorInputClass : inputClass}
              />
            </div>
            {errors.customerPhone && (
              <p className="text-[#EF5350] text-xs mt-1.5">{errors.customerPhone}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Party Size */}
            <div>
              <label className="block text-sm font-semibold text-[#1F2937] dark:text-[#E5E7EB] mb-1.5">
                Party Size
              </label>
              <div className="relative">
                <FiUsers className="absolute left-4 top-3.5 text-[#9CA3AF] dark:text-[#6B7280]" />
                <input
                  type="number"
                  min="1"
                  name="partySize"
                  value={form.partySize}
                  onChange={handleChange}
                  className={errors.partySize ? errorInputClass : inputClass}
                />
              </div>
              {errors.partySize && (
                <p className="text-[#EF5350] text-xs mt-1.5">{errors.partySize}</p>
              )}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold text-[#1F2937] dark:text-[#E5E7EB] mb-1.5">
                Duration (mins)
              </label>
              <div className="relative">
                <FiClock className="absolute left-4 top-3.5 text-[#9CA3AF] dark:text-[#6B7280]" />
                <input
                  type="number"
                  min="15"
                  step="15"
                  name="durationMinutes"
                  value={form.durationMinutes}
                  onChange={handleChange}
                  className={errors.durationMinutes ? errorInputClass : inputClass}
                />
              </div>
              {errors.durationMinutes && (
                <p className="text-[#EF5350] text-xs mt-1.5">
                  {errors.durationMinutes}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-[#1F2937] dark:text-[#E5E7EB] mb-1.5">
                Reservation Date
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-4 top-3.5 text-[#9CA3AF] dark:text-[#6B7280]" />
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className={errors.date ? errorInputClass : inputClass}
                />
              </div>
              {errors.date && (
                <p className="text-[#EF5350] text-xs mt-1.5">{errors.date}</p>
              )}
            </div>

            {/* Time */}
            <div>
            <label className="block text-sm font-semibold text-[#1F2937] dark:text-[#E5E7EB] mb-1.5">
                Reservation Time
            </label>

            <div className="flex gap-2">
                {/* Hour */}
                <div className="relative flex-1">
                <FiClock className="absolute left-4 top-3.5 text-[#9CA3AF] dark:text-[#6B7280] pointer-events-none" />

                <select
                    name="timeHour"
                    value={form.timeHour}
                    onChange={handleChange}
                    className={`w-full pl-11 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1D231D] text-[#1F2937] dark:text-white outline-none ${
                    errors.time
                        ? "border-[#EF5350]"
                        : "border-[#E7EAE1] dark:border-[#262B24] focus:border-[#3FA34D]"
                    }`}
                >
                    <option value="">HH</option>

                    {Array.from({ length: 12 }, (_, i) => {
                    const hour = String(i + 1).padStart(2, "0");

                    return (
                        <option key={hour} value={hour}>
                        {hour}
                        </option>
                    );
                    })}
                </select>
                </div>

                {/* Minute */}
                <div className="flex-1">
                <select
                    name="timeMinute"
                    value={form.timeMinute}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#1D231D] text-[#1F2937] dark:text-white outline-none ${
                    errors.time
                        ? "border-[#EF5350]"
                        : "border-[#E7EAE1] dark:border-[#262B24] focus:border-[#3FA34D]"
                    }`}
                >
                    <option value="">MM</option>

                    {Array.from({ length: 60 }, (_, i) => {
                    const minute = String(i).padStart(2, "0");

                    return (
                        <option key={minute} value={minute}>
                        {minute}
                        </option>
                    );
                    })}
                </select>
                </div>

                {/* AM / PM */}
                <div className="w-[100px]">
                <select
                    name="period"
                    value={form.period}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#1D231D] text-[#1F2937] dark:text-white outline-none border-[#E7EAE1] dark:border-[#262B24] focus:border-[#3FA34D]"
                >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                </select>
                </div>
            </div>

            {errors.time && (
                <p className="text-[#EF5350] text-xs mt-1.5">
                {errors.time}
                </p>
            )}
            </div>
          </div>

          {/* Table */}
          <div>
            <label className="block text-sm font-semibold text-[#1F2937] dark:text-[#E5E7EB] mb-1.5">
              Table
            </label>
            <div className="relative">
              <FiGrid className="absolute left-4 top-3.5 text-[#9CA3AF] dark:text-[#6B7280]" />
              <select
                name="tableId"
                value={form.tableId}
                onChange={handleChange}
                className={`appearance-none ${errors.tableId ? errorInputClass : inputClass}`}
              >
                <option value="">Select a table</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.floor?.name ? ` — ${t.floor.name}` : ""}
                    {t.capacity ? ` (seats ${t.capacity})` : ""}
                  </option>
                ))}
              </select>
            </div>
            {errors.tableId && (
              <p className="text-[#EF5350] text-xs mt-1.5">{errors.tableId}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-[#1F2937] dark:text-[#E5E7EB] mb-1.5">
              Notes
            </label>
            <div className="relative">
              <FiFileText className="absolute left-4 top-3.5 text-[#9CA3AF] dark:text-[#6B7280]" />
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Any special requests..."
                className={`${inputClass} pt-3 resize-none`}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-semibold text-[#6B7280] dark:text-[#9CA8A0] border border-[#E7EAE1] dark:border-[#262B24] hover:bg-[#F3F5EE] dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl font-semibold text-white bg-[#3FA34D] hover:bg-[#358F42] disabled:bg-[#3FA34D]/50 dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] dark:disabled:bg-[#43B75A]/50 shadow-lg transition-all"
            >
              {saving
                ? "Saving..."
                : isEdit
                ? "Save Changes"
                : "Add Reservation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}