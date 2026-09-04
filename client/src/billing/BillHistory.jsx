// src/billing/BillHistory.jsx
//
// Every bill raised in a date range, with what was charged, collected and
// still outstanding — the end-of-shift reconciliation list, and where staff
// come to reprint a receipt a customer asked for after the fact.
//
// Driven off invoices, not orders: an order that's still open on a table, or
// was cancelled, never produced a bill and correctly isn't listed here.
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiPrinter, FiSearch, FiX } from "react-icons/fi";
import { getBillHistory, getInvoiceForOrder } from "../pos/api/posApi";
import InvoiceView from "./InvoiceView";
import { printOnce } from "../print/printing";

const money = (n) => `₹${Number(n || 0).toFixed(2)}`;

const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const STATUS_STYLE = {
  COMPLETED: "bg-[#EAF6EC] text-[#2F7D3A] border-[#C9E7CF]",
  SERVED: "bg-blue-50 text-blue-700 border-blue-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
  REFUNDED: "bg-amber-50 text-amber-700 border-amber-200",
};

const ORDER_TYPE_LABEL = {
  DINE_IN: "Dine In",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

export default function BillHistory() {
  // The navbar's Bill No lookup lands here as ?search=INV-000021. Arriving
  // with a term means "find me this bill", so the date range starts empty
  // rather than at today — the whole point is that the bill might be old.
  // Typing in the search box below leaves the dates alone, as before.
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [from, setFrom] = useState(initialSearch ? "" : todayISO());
  const [to, setTo] = useState(initialSearch ? "" : todayISO());
  const [search, setSearch] = useState(initialSearch);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // The bill being reprinted, or null. Fetched on demand rather than being
  // bundled into every history row — the list would be many times heavier
  // for data almost nobody looks at.
  const [reprint, setReprint] = useState(null);
  const [reprinting, setReprinting] = useState(null); // orderId currently loading

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await getBillHistory({ from, to, search }));
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReprint(row) {
    setReprinting(row.orderId);
    setError("");
    try {
      const invoice = await getInvoiceForOrder(row.orderId);
      setReprint(invoice);
    } catch (err) {
      setError(`Couldn't load bill ${row.invoiceNumber}: ${err.message}`);
    } finally {
      setReprinting(null);
    }
  }

  // Totals reflect exactly what's on screen, so narrowing the dates or
  // searching gives a subtotal for that slice rather than a fixed all-time
  // figure that wouldn't match the rows beneath it.
  const totals = rows.reduce(
    (acc, r) => ({
      grandTotal: acc.grandTotal + r.grandTotal,
      paid: acc.paid + r.paid,
      balance: acc.balance + r.balance,
    }),
    { grandTotal: 0, paid: 0, balance: 0 },
  );

  return (
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#12160F] p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white">
              Bill History
            </h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
              Every bill raised in the selected dates. Reprint any receipt from
              the Actions column.
            </p>
          </div>
          {/* A plain Link rather than navigate(-1): this page is also reached
              directly by URL, where "back" would leave the app entirely. */}
          <Link
            to="/billing"
            className="flex shrink-0 items-center gap-2 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] px-4 py-2 text-sm font-semibold text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
          >
            <FiArrowLeft size={15} />
            Back to Billing
          </Link>
        </div>

        {/* ── Filters ── */}
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
              From
            </label>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] px-3 text-sm text-[#1F2937] dark:text-[#E4E9E2]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
              To
            </label>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] px-3 text-sm text-[#1F2937] dark:text-[#E4E9E2]"
            />
          </div>
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
              Search
            </label>
            <div className="relative">
              <FiSearch
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Bill or order number…"
                className="h-10 w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] pl-9 pr-3 text-sm text-[#1F2937] dark:text-[#E4E9E2]"
              />
            </div>
          </div>
        </div>

        {/* ── Totals for the current filter ── */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Bills", String(rows.length)],
            ["Total Billed", money(totals.grandTotal)],
            ["Collected", money(totals.paid)],
            ["Outstanding", money(totals.balance)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase text-[#9CA3AF] dark:text-[#6B7280]">
                {label}
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold text-[#1F2937] dark:text-white">
                {value}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#EF5350]">
            {error}
          </p>
        )}

        {/* ── Table ── */}
        <div className="overflow-x-auto rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17]">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-[#E7EAE1] dark:border-[#262B24] text-left text-xs uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
                <th className="px-4 py-3">Bill / Order</th>
                <th className="px-4 py-3">KOT</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Grand Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-[#9CA3AF]">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-[#9CA3AF]">
                    No bills in this range.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.invoiceId}
                    className="border-b border-[#E7EAE1] dark:border-[#262B24] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                        {r.invoiceNumber}
                      </p>
                      <p className="font-mono text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                        {r.orderNumber}
                      </p>
                      <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                        {new Date(r.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {r.cashier ? ` · ${r.cashier}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#6B7280] dark:text-[#9CA8A0]">
                      {r.kotNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] dark:text-[#9CA8A0]">
                      {ORDER_TYPE_LABEL[r.orderType] || r.orderType || "—"}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] dark:text-[#9CA8A0]">
                      {r.tableName || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          STATUS_STYLE[r.status] ||
                          "bg-[#F3F5EE] text-[#6B7280] border-[#E7EAE1]"
                        }`}
                      >
                        {r.status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                      {money(r.grandTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#2F7D3A] dark:text-[#43B75A]">
                      {money(r.paid)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${
                        r.balance > 0
                          ? "font-semibold text-[#EF5350]"
                          : "text-[#9CA3AF] dark:text-[#6B7280]"
                      }`}
                    >
                      {money(r.balance)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7280] dark:text-[#9CA8A0]">
                      {r.paymentMethods.length
                        ? r.paymentMethods.join(" + ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleReprint(r)}
                        disabled={reprinting === r.orderId}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] px-3 py-1.5 text-xs font-semibold text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 disabled:opacity-50"
                      >
                        <FiPrinter size={13} />
                        {reprinting === r.orderId ? "Loading…" : "Print"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reprint uses the SAME InvoiceView the billing flow does, so a
          reprinted receipt is byte-for-byte what was handed over originally —
          including the barcode and UPI QR. */}
      {reprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2937]/40 dark:bg-black/60 p-4">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#171C17] shadow-xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E7EAE1] dark:border-[#262B24] px-5 py-3 print:hidden">
              <h3 className="truncate font-bold text-[#1F2937] dark:text-white">
                Reprint {reprint.invoiceNumber}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                {/* Duplicates InvoiceView's own Print button, which sits below
                    the receipt and needs scrolling to reach. Routed through
                    printOnce() rather than window.print(): this modal is
                    position:fixed, and a raw print() left the browser free to
                    repeat that fixed box on every page — the same defect that
                    printed kitchen tickets twice. */}
                <button
                  onClick={() => printOnce()}
                  className="flex items-center gap-1.5 rounded-lg bg-[#3FA34D] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
                >
                  <FiPrinter size={14} />
                  Print
                </button>
                <button
                  onClick={() => setReprint(null)}
                  className="text-[#9CA3AF] hover:text-[#6B7280]"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* FIX: the receipt was overflowing the modal and its footer
                buttons were cut off. InvoiceView is `h-full flex-col` with its
                own scrolling body, but as a bare flex child it grew to its
                content height instead of the container's. This wrapper gives
                it a bounded box — min-h-0 is the part that matters, since a
                flex child won't shrink below its content without it. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <InvoiceView
                invoice={reprint}
                payments={reprint.order?.payments}
                onDone={() => setReprint(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}