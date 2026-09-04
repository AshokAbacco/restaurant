// ==============================================
// src/counterSummary/CounterSummary.jsx
// ==============================================
//
// Counter-wise sales and payment breakdown for a date range. This is the
// end-of-shift reconciliation screen: what each till rang up, and in what
// form the money arrived.
//
// The table is wide (17 columns) and deliberately not made narrower by
// hiding things behind a toggle by default — someone balancing a drawer
// needs the payment split and the order counts on the same row, in one
// glance. Instead the columns scroll horizontally with the first column
// pinned, so the counter's name stays visible while you scroll to UPI.
//
// Every money column comes from the same server response
// (GET /api/reports/counter-summary), so the Total row is computed here by
// summing the rows rather than fetched separately — two sources for the
// same number is how a report starts disagreeing with itself.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw, FiDownload, FiAlertCircle } from "react-icons/fi";

import { fetchCounterSummary, exportCounterSummary } from "./counterSummaryApi";

// ==============================================
// COLUMNS
// ==============================================
//
// One list drives the header, every body row and the total row, so a column
// can't appear in one and not the others.
//
// `value` reads a number off a summary row. `money` decides formatting
// (2dp with a ₹ header suffix) versus a plain count.

const COLUMNS = [
  { key: "complimentaryOrders", label: "Complimentary Orders", value: (r) => r.complimentaryOrders },
  { key: "salesReturnOrders", label: "Sales Return Orders", value: (r) => r.salesReturnOrders },
  { key: "cancelledOrders", label: "Cancelled Orders", value: (r) => r.cancelledOrders },
  { key: "successOrders", label: "Success Orders", value: (r) => r.successOrders },

  { key: "netAmount", label: "Net Amount", money: true, value: (r) => r.netAmount },
  { key: "totalDiscount", label: "Total Discount", money: true, value: (r) => r.totalDiscount },
  { key: "totalTax", label: "Total Tax", money: true, value: (r) => r.totalTax },
  { key: "totalSales", label: "Total Sales", money: true, value: (r) => r.totalSales },
  { key: "notPaid", label: "Not Paid", money: true, value: (r) => r.notPaid },

  { key: "cash", label: "Cash", money: true, value: (r) => r.paymentBreakdown?.CASH },
  { key: "card", label: "Card", money: true, value: (r) => r.paymentBreakdown?.CARD },
  { key: "duePayment", label: "Due Payment", money: true, value: (r) => r.duePayment },

  // BANK_TRANSFER and CHEQUE are folded into "Other" rather than given
  // their own columns: they're the same thing to whoever is balancing the
  // drawer (money that isn't cash, card, UPI or a tab), and two more
  // near-always-zero columns on an already-wide table costs more than it
  // tells anyone.
  {
    key: "other",
    label: "Other",
    money: true,
    value: (r) =>
      (r.paymentBreakdown?.OTHER || 0) +
      (r.paymentBreakdown?.BANK_TRANSFER || 0) +
      (r.paymentBreakdown?.CHEQUE || 0),
  },

  // Wallet has no PaymentMethod to read from yet — see the note under the
  // table. Rendered so the column exists and lines up with the reference,
  // and so adding the enum value later is a one-line change here.
  { key: "wallet", label: "Wallet", money: true, value: () => 0 },

  { key: "upi", label: "UPI", money: true, value: (r) => r.paymentBreakdown?.UPI },
  { key: "onlineCash", label: "Online Cash", money: true, value: (r) => r.onlineCash },
];

// ==============================================
// DATE HELPERS
// ==============================================

const isoDate = (d) => {
  // Local date parts, not toISOString() — that converts to UTC first, which
  // in IST rolls the date back a day for anything before 05:30.
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const TODAY = () => isoDate(new Date());

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "thisweek", label: "This Week" },
  { id: "thismonth", label: "This Month" },
  { id: "custom", label: "Custom Range" },
];

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDisplayDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
};

// ==============================================
// PAGE
// ==============================================

const CounterSummary = () => {
  const [preset, setPreset] = useState("today");
  const [from, setFrom] = useState(TODAY);
  const [to, setTo] = useState(TODAY);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  // What actually gets sent. A preset goes as `period` and lets the server
  // work out the boundaries; Custom sends explicit dates. Keeping that
  // decision in one place stops the two from fighting.
  const filters = useMemo(
    () =>
      preset === "custom"
        ? { startDate: from, endDate: to }
        : { period: preset },
    [preset, from, to],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchCounterSummary(filters));
      setError("");
    } catch (err) {
      setError(err.message || "Couldn't load the counter summary.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // ==========================================
  // TOTAL ROW
  // ==========================================

  const totals = useMemo(() => {
    const sum = (fn) => rows.reduce((total, row) => total + (Number(fn(row)) || 0), 0);
    return Object.fromEntries(COLUMNS.map((c) => [c.key, sum(c.value)]));
  }, [rows]);

  // A counter has to exist before anything can be attributed to it, so an
  // empty result is much more likely to mean "no counters set up" than
  // "no sales" — and the fix for that lives on another page.
  const noCounters = !loading && !error && rows.length === 0;

  async function handleExport(format) {
    setExporting(true);
    try {
      await exportCounterSummary(format, filters);
    } catch (err) {
      setError(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  const rangeLabel =
    preset === "custom"
      ? `From ${formatDisplayDate(from)} to ${formatDisplayDate(to)}`
      : PRESETS.find((p) => p.id === preset)?.label;

  return (
    <div className="space-y-4">
      {/* ============ HEADER ============ */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[#1F2937] dark:text-white">
          Counter Summary
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Refresh"
            title="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7EAE1] bg-white text-[#6B7280] transition-colors hover:text-[#3FA34D] disabled:opacity-50 dark:border-[#262B24] dark:bg-[#171C17] dark:text-[#9CA8A0] dark:hover:text-[#43B75A]"
          >
            <FiRefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={exporting || rows.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-[#E7EAE1] bg-white px-3 py-2 text-[12px] font-semibold text-[#1F2937] transition-colors hover:border-[#3FA34D] hover:text-[#3FA34D] disabled:opacity-50 dark:border-[#262B24] dark:bg-[#171C17] dark:text-white dark:hover:border-[#43B75A]"
          >
            <FiDownload size={13} />
            CSV
          </button>

          <button
            type="button"
            onClick={() => handleExport("xlsx")}
            disabled={exporting || rows.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-[#E7EAE1] bg-white px-3 py-2 text-[12px] font-semibold text-[#1F2937] transition-colors hover:border-[#3FA34D] hover:text-[#3FA34D] disabled:opacity-50 dark:border-[#262B24] dark:bg-[#171C17] dark:text-white dark:hover:border-[#43B75A]"
          >
            <FiDownload size={13} />
            Excel
          </button>
        </div>
      </div>

      {/* ============ FILTERS ============ */}

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPreset(p.id)}
            className={`rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${
              preset === p.id
                ? "bg-[#3FA34D] text-white dark:bg-[#43B75A]"
                : "border border-[#E7EAE1] bg-white text-[#6B7280] hover:border-[#3FA34D] hover:text-[#3FA34D] dark:border-[#262B24] dark:bg-[#171C17] dark:text-[#9CA8A0] dark:hover:border-[#43B75A]"
            }`}
          >
            {p.label}
          </button>
        ))}

        {preset === "custom" && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
              className="rounded-lg border border-[#E7EAE1] bg-white px-3 py-2 text-[12px] text-[#1F2937] focus:border-[#3FA34D] focus:outline-none dark:border-[#262B24] dark:bg-[#171C17] dark:text-white dark:focus:border-[#43B75A]"
            />
            <span className="text-[12px] text-[#6B7280] dark:text-[#9CA8A0]">to</span>
            <input
              type="date"
              value={to}
              min={from}
              max={TODAY()}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
              className="rounded-lg border border-[#E7EAE1] bg-white px-3 py-2 text-[12px] text-[#1F2937] focus:border-[#3FA34D] focus:outline-none dark:border-[#262B24] dark:bg-[#171C17] dark:text-white dark:focus:border-[#43B75A]"
            />
          </div>
        )}
      </div>

      {/* ============ RANGE BANNER ============ */}

      <div className="rounded-lg bg-[#EAF6EC] px-4 py-3 text-[14px] text-[#1F2937] dark:bg-[#43B75A]/10 dark:text-white">
        Counter Summary : {rangeLabel}
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-[#EF5350] dark:bg-red-500/10 dark:text-red-400">
          <span className="flex items-center gap-2">
            <FiAlertCircle size={14} />
            {error}
          </span>
          <button
            type="button"
            onClick={load}
            className="font-semibold underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {/* ============ TABLE ============ */}

      {noCounters ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E7EAE1] py-16 text-center dark:border-[#262B24]">
          <p className="text-[14px] font-medium text-[#6B7280] dark:text-[#9CA8A0]">
            No billing counters set up yet.
          </p>
          <p className="mt-1 max-w-md text-[12px] text-[#9CA3AF] dark:text-[#6B7280]">
            Orders are attributed to the counter they were rung up on, so this
            report stays empty until at least one exists.
          </p>
          <Link
            to="/settings/counters"
            className="mt-4 rounded-lg bg-[#3FA34D] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
          >
            Add a counter
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E7EAE1] dark:border-[#262B24]">
          <table className="w-full min-w-max border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#EAF6EC] dark:bg-[#43B75A]/10">
                {/* Sticky so the counter's name stays put while you scroll
                    right to the payment columns — otherwise row 4 of an
                    8-counter report is anonymous by the time you reach UPI. */}
                <th className="sticky left-0 z-10 bg-[#EAF6EC] px-4 py-3 text-left font-semibold text-[#1F2937] dark:bg-[#1B2A1E] dark:text-white">
                  Counter Name
                </th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#1F2937] dark:text-white"
                  >
                    {col.label}
                    {col.money ? " (₹)" : ""}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length + 1}
                    className="px-4 py-10 text-center text-[#9CA3AF] dark:text-[#6B7280]"
                  >
                    Loading…
                  </td>
                </tr>
              ) : (
                <>
                  {/* Total first, matching the reference. The number people
                      came for is the one they shouldn't have to scroll to. */}
                  <tr className="border-b border-[#E7EAE1] bg-[#F7F8F4] font-semibold dark:border-[#262B24] dark:bg-white/5">
                    <td className="sticky left-0 z-10 bg-[#F7F8F4] px-4 py-3 text-left text-[#1F2937] dark:bg-[#1B211A] dark:text-white">
                      Total
                    </td>
                    {COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className="whitespace-nowrap px-4 py-3 text-right font-mono text-[#1F2937] dark:text-white"
                      >
                        {col.money ? money(totals[col.key]) : totals[col.key]}
                      </td>
                    ))}
                  </tr>

                  {rows.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b border-[#E7EAE1] last:border-0 hover:bg-[#F7F8F4] dark:border-[#262B24] dark:hover:bg-white/5"
                    >
                      <td className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-medium text-[#1F2937] dark:bg-[#12160F] dark:text-white">
                        {row.label}
                      </td>
                      {COLUMNS.map((col) => {
                        const value = Number(col.value(row)) || 0;
                        return (
                          <td
                            key={col.key}
                            className={`whitespace-nowrap px-4 py-3 text-right font-mono ${
                              value === 0
                                ? "text-[#9CA3AF] dark:text-[#6B7280]"
                                : "text-[#1F2937] dark:text-white"
                            }`}
                          >
                            {col.money ? money(value) : value}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ============ COLUMN NOTES ============ */}

      {/* Several of these columns look similar and mean different things,
          and a report that gets read wrong is worse than one that isn't
          read at all. */}
      <div className="rounded-lg border border-[#E7EAE1] p-4 text-[12px] leading-relaxed text-[#6B7280] dark:border-[#262B24] dark:text-[#9CA8A0]">
        <p>
          <strong className="text-[#1F2937] dark:text-white">Net Amount</strong>{" "}
          is sales before tax.{" "}
          <strong className="text-[#1F2937] dark:text-white">Total Sales</strong>{" "}
          includes it.{" "}
          <strong className="text-[#1F2937] dark:text-white">Not Paid</strong> is
          money on invoices that were raised and never fully collected;{" "}
          <strong className="text-[#1F2937] dark:text-white">Due Payment</strong>{" "}
          is the part of that which was deliberately put on a customer's tab, so
          the two never count the same rupee twice.{" "}
          <strong className="text-[#1F2937] dark:text-white">Online Cash</strong>{" "}
          is cash collected on platform delivery orders — it's also inside the
          Cash column, shown separately for till reconciliation.
        </p>
        <p className="mt-2">
          <strong className="text-[#1F2937] dark:text-white">Wallet</strong> reads
          zero for now: there's no wallet payment method in the system yet, so
          nothing can be recorded against it.{" "}
          <strong className="text-[#1F2937] dark:text-white">
            Complimentary Orders
          </strong>{" "}
          currently counts orders that totalled ₹0, which is a stand-in until
          orders can be explicitly marked complimentary at billing.
        </p>
      </div>
    </div>
  );
};

export default CounterSummary;