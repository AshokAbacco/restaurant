// src/payment/Payment.jsx
//
// Date-wise Payments overview: how many orders were placed vs completed,
// and how much payment came in vs is still pending, for a chosen day/range.
// Pulls from GET /pos/orders (via posApi.getOrders), which already supports
// from/to filtering on createdAt server-side (see pos.service.js listOrders).
//
// Excel export: uses ExcelJS (client-side) so the download gets real
// formatting — bold header row, currency number formats, colored payment
// status, a totals row with live SUM formulas — instead of a plain CSV.
// Requires `npm install exceljs` in this project.
import { useCallback, useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { Eye, Trash2, WifiOff } from "lucide-react";
import { getOrders, deleteOrder } from "../pos/api/posApi";
import { useAuth } from "../auth/AuthContext";
import { fetchWithOfflineFallback } from "../offline/offlineCache";
import OrderDetailModal from "./components/OrderDetailModal";

const COMPLETED_ORDER_STATUSES = ["COMPLETED"];
const CANCELLED_ORDER_STATUSES = ["CANCELLED", "REFUNDED"];

const BRAND_DARK = "FF1C3044";
const BORDER_LIGHT = "FFE2E8F0";
const GREEN = "FF059669";
const AMBER = "FFD97706";
const RED = "FFDC2626";
const GREY = "FF94A3B8";

// Clear, always-visible order-type badge — shown as its own column so
// "Table / Type" is no longer one blended cell that's ambiguous for
// Takeaway/Delivery orders (which have no table at all).
const ORDER_TYPE_META = {
  DINE_IN: {
    label: "Dine In",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  TAKEAWAY: {
    label: "Takeaway",
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
  DELIVERY: {
    label: "Delivery",
    className: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
};

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  return { from: toDateInputValue(start), to: toDateInputValue(end) };
}

// FIX: was `d.toISOString().slice(0, 10)` — toISOString() converts to UTC
// first, so in any timezone ahead of UTC (e.g. IST, UTC+5:30) a local
// midnight rolls back to the previous day once converted (July 21 00:00
// IST = July 20 18:30 UTC), making "Today"/"Yesterday" land on the wrong
// date. Building the string from local getters avoids the UTC round-trip.
function toDateInputValue(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDayISO(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

function endOfDayISO(dateStr) {
  return new Date(`${dateStr}T23:59:59.999`).toISOString();
}

function orderPaidAmount(order) {
  return (order.payments || [])
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

function orderBalanceDue(order) {
  return Math.max(Number(order.grandTotal) - orderPaidAmount(order), 0);
}

function paymentLabelFor(order) {
  const paid = orderPaidAmount(order);
  const due = orderBalanceDue(order);
  const isCancelled = CANCELLED_ORDER_STATUSES.includes(order.status);
  if (isCancelled) return "—";
  if (due <= 0) return "Paid";
  if (paid > 0) return "Partial";
  return "Pending";
}

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

function presetRange(key) {
  const now = new Date();
  let start, end;

  if (key === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = start;
  } else if (key === "yesterday") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    end = start;
  } else if (key === "week") {
    const day = now.getDay(); // 0 = Sunday
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    end = now;
  } else if (key === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = now;
  }

  return { from: toDateInputValue(start), to: toDateInputValue(end) };
}

export default function Payment() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  const [{ from, to }, setRange] = useState(todayRange());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // View / delete state
  const [viewingOrderId, setViewingOrderId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [isOffline, setIsOffline] = useState(false);

  // Read-only offline browsing — every stat card, filter, and the Excel
  // export all keep working off the last-synced data for this exact date
  // range if the connection drops. Delete stays online-only regardless
  // (see the Delete button/modal below) — deleting a financial record is
  // not something that should ever be queued for "whenever a connection
  // shows up later."
  const load = useCallback((fromDate, toDate) => {
    setLoading(true);
    setError(null);
    fetchWithOfflineFallback(
      `payments:orders:${fromDate}_${toDate}`,
      async () => {
        const data = await getOrders({
          from: startOfDayISO(fromDate),
          to: endOfDayISO(toDate),
          limit: 500,
        });
        return data?.data || [];
      },
    )
      .then(({ data, fromCache }) => {
        setOrders(data);
        setIsOffline(fromCache);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(from, to);
  }, [from, to, load]);

  function applyPreset(key) {
    setRange(presetRange(key));
  }

  const stats = useMemo(() => {
    let ordersCompleted = 0;
    let ordersPending = 0;
    let ordersCancelled = 0;

    let paymentsCompletedAmount = 0;
    let paymentsCompletedCount = 0;
    let paymentsPendingAmount = 0;
    let paymentsPendingCount = 0;

    for (const order of orders) {
      if (COMPLETED_ORDER_STATUSES.includes(order.status)) {
        ordersCompleted += 1;
      } else if (CANCELLED_ORDER_STATUSES.includes(order.status)) {
        ordersCancelled += 1;
      } else {
        ordersPending += 1;
      }

      const paid = orderPaidAmount(order);
      const due = orderBalanceDue(order);

      if (paid > 0) {
        paymentsCompletedAmount += paid;
        paymentsCompletedCount += 1;
      }
      if (due > 0 && !CANCELLED_ORDER_STATUSES.includes(order.status)) {
        paymentsPendingAmount += due;
        paymentsPendingCount += 1;
      }
    }

    return {
      totalOrders: orders.length,
      ordersCompleted,
      ordersPending,
      ordersCancelled,
      paymentsCompletedAmount,
      paymentsCompletedCount,
      paymentsPendingAmount,
      paymentsPendingCount,
    };
  }, [orders]);

  // ---- View / Delete handlers ----

  async function handleDelete(orderId) {
    setDeletingId(orderId);
    try {
      await deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (viewingOrderId === orderId) setViewingOrderId(null);
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't delete the order.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  // Builds a formatted .xlsx of exactly what's on screen — same date range,
  // same summary numbers, same order rows — and triggers a browser download.
  async function handleExportExcel() {
    setExporting(true);
    setError(null);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "POS";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Payments", {
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
        views: [{ showGridLines: false }],
      });

      sheet.columns = [
        { width: 18 }, // Order
        { width: 16 }, // Order Type
        { width: 18 }, // Table
        { width: 14 }, // Status
        { width: 16 }, // Grand Total
        { width: 16 }, // Paid
        { width: 16 }, // Balance
        { width: 12 }, // Payment
      ];

      // ---- Title ----
      sheet.mergeCells("A1:H1");
      const titleCell = sheet.getCell("A1");
      titleCell.value = "Payments Report";
      titleCell.font = {
        name: "Arial",
        size: 16,
        bold: true,
        color: { argb: BRAND_DARK },
      };
      sheet.getRow(1).height = 26;

      sheet.mergeCells("A2:H2");
      const rangeCell = sheet.getCell("A2");
      rangeCell.value =
        from === to ? `Date: ${from}` : `Date Range: ${from} to ${to}`;
      rangeCell.font = {
        name: "Arial",
        size: 11,
        italic: true,
        color: { argb: GREY },
      };

      // ---- Summary block ----
      let r = 4;
      sheet.getCell(`A${r}`).value = "Summary";
      sheet.getCell(`A${r}`).font = {
        name: "Arial",
        bold: true,
        size: 12,
        color: { argb: BRAND_DARK },
      };
      r++;

      const summaryRows = [
        ["Total Orders", stats.totalOrders, null],
        ["Orders Completed", stats.ordersCompleted, null],
        ["Orders Pending", stats.ordersPending, null],
        ["Orders Cancelled", stats.ordersCancelled, null],
        [
          "Payments Completed",
          stats.paymentsCompletedAmount,
          stats.paymentsCompletedCount,
        ],
        [
          "Payments Pending",
          stats.paymentsPendingAmount,
          stats.paymentsPendingCount,
        ],
      ];

      summaryRows.forEach(([label, value, count]) => {
        sheet.getCell(`A${r}`).value = label;
        sheet.getCell(`A${r}`).font = {
          name: "Arial",
          size: 10,
          color: { argb: GREY },
        };
        sheet.getCell(`B${r}`).value = value;
        sheet.getCell(`B${r}`).font = { name: "Arial", size: 10, bold: true };
        if (typeof value === "number" && label.includes("Payments")) {
          sheet.getCell(`B${r}`).numFmt = '"₹"#,##0.00';
        }
        if (count !== null) {
          sheet.getCell(`C${r}`).value =
            `${count} order${count === 1 ? "" : "s"}`;
          sheet.getCell(`C${r}`).font = {
            name: "Arial",
            size: 9,
            italic: true,
            color: { argb: GREY },
          };
        }
        r++;
      });

      r += 1;

      // ---- Data table header ----
      const headerRowNum = r;
      const headers = [
        "Order",
        "Order Type",
        "Table",
        "Status",
        "Grand Total",
        "Paid",
        "Balance",
        "Payment",
      ];
      headers.forEach((h, i) => {
        const cell = sheet.getRow(headerRowNum).getCell(i + 1);
        cell.value = h;
        cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: BRAND_DARK },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: i >= 4 && i <= 6 ? "right" : "left",
        };
      });
      sheet.getRow(headerRowNum).height = 20;
      r++;

      const dataStartRow = r;

      orders.forEach((order) => {
        const paid = orderPaidAmount(order);
        const due = orderBalanceDue(order);
        const isCancelled = CANCELLED_ORDER_STATUSES.includes(order.status);
        const paymentLabel = paymentLabelFor(order);
        const paymentColor = isCancelled
          ? GREY
          : due <= 0
            ? GREEN
            : paid > 0
              ? AMBER
              : RED;

        const row = sheet.getRow(r);
        row.getCell(1).value = order.orderNumber;
        row.getCell(2).value =
          ORDER_TYPE_META[order.orderType]?.label || order.orderType;
        row.getCell(3).value = order.table?.name || "—";
        row.getCell(4).value = order.status;
        row.getCell(5).value = Number(order.grandTotal);
        row.getCell(5).numFmt = '"₹"#,##0.00';
        row.getCell(6).value = paid;
        row.getCell(6).numFmt = '"₹"#,##0.00';
        row.getCell(7).value = due;
        row.getCell(7).numFmt = '"₹"#,##0.00';
        row.getCell(8).value = paymentLabel;
        row.getCell(8).font = {
          name: "Arial",
          bold: true,
          color: { argb: paymentColor },
        };

        row.eachCell({ includeEmpty: true }, (cell) => {
          if (!cell.font) cell.font = { name: "Arial" };
          cell.border = {
            bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
          };
        });
        r++;
      });
      const dataEndRow = r - 1;
      const hasRows = dataEndRow >= dataStartRow;

      // ---- Totals row (live SUM formulas, not hardcoded numbers) ----
      const totalsRow = sheet.getRow(r);
      totalsRow.getCell(4).value = "Totals";
      totalsRow.getCell(4).font = { name: "Arial", bold: true };
      totalsRow.getCell(4).alignment = { horizontal: "right" };

      ["E", "F", "G"].forEach((col) => {
        const cell = totalsRow.getCell(col);
        cell.value = hasRows
          ? { formula: `SUM(${col}${dataStartRow}:${col}${dataEndRow})` }
          : 0;
        cell.numFmt = '"₹"#,##0.00';
        cell.font = { name: "Arial", bold: true };
        cell.alignment = { horizontal: "right" };
        cell.border = { top: { style: "thin", color: { argb: BRAND_DARK } } };
      });

      sheet.views = [
        { state: "frozen", ySplit: headerRowNum, showGridLines: false },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filenameRange = from === to ? from : `${from}_to_${to}`;
      a.href = url;
      a.download = `Payments_${filenameRange}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Failed to export: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#212121]">Payments</h1>
          <p className="text-sm text-slate-400">
            Orders and payment totals, date-wise
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) =>
                setRange((r) => ({ ...r, from: e.target.value }))
              }
              className="bg-transparent text-xs font-medium text-slate-600 outline-none"
            />
            <span className="text-xs text-slate-300">to</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="bg-transparent text-xs font-medium text-slate-600 outline-none"
            />
          </div>
          <button
            onClick={handleExportExcel}
            disabled={loading || exporting || orders.length === 0}
            className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path
                d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {exporting ? "Preparing…" : "Export to Excel"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {isOffline && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          <WifiOff className="h-3.5 w-3.5" />
          Offline — showing last-synced data for this date range. Deleting an
          order needs a connection.
        </div>
      )}

      {/* ============ Summary cards ============ */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Orders Completed"
          value={loading ? "—" : stats.ordersCompleted}
          sub={`of ${stats.totalOrders} total`}
          accent="text-emerald-600"
        />
        <SummaryCard
          label="Orders Pending"
          value={loading ? "—" : stats.ordersPending}
          sub={
            stats.ordersCancelled > 0
              ? `${stats.ordersCancelled} cancelled`
              : "awaiting completion"
          }
          accent="text-amber-600"
        />
        <SummaryCard
          label="Payments Completed"
          value={loading ? "—" : `₹${stats.paymentsCompletedAmount.toFixed(2)}`}
          sub={`${stats.paymentsCompletedCount} order${stats.paymentsCompletedCount === 1 ? "" : "s"}`}
          accent="text-emerald-600"
        />
        <SummaryCard
          label="Payments Pending"
          value={loading ? "—" : `₹${stats.paymentsPendingAmount.toFixed(2)}`}
          sub={`${stats.paymentsPendingCount} order${stats.paymentsPendingCount === 1 ? "" : "s"}`}
          accent="text-[#E53935]"
        />
      </div>

      {/* ============ Orders table ============ */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Orders in range
          </h2>
        </div>
        <div className="max-h-[560px] overflow-y-auto">
          {loading ? (
            <p className="p-5 text-sm text-slate-400">Loading orders…</p>
          ) : orders.length === 0 ? (
            <p className="p-5 text-sm text-slate-400">
              No orders in this date range.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-2">Order</th>
                  <th className="px-5 py-2">Order Type</th>
                  <th className="px-5 py-2">Table</th>
                  <th className="px-5 py-2">Status</th>
                  <th className="px-5 py-2 text-right">Grand Total</th>
                  <th className="px-5 py-2 text-right">Paid</th>
                  <th className="px-5 py-2 text-right">Balance</th>
                  <th className="px-5 py-2">Payment</th>
                  <th className="px-5 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const paid = orderPaidAmount(order);
                  const due = orderBalanceDue(order);
                  const isCancelled = CANCELLED_ORDER_STATUSES.includes(
                    order.status,
                  );
                  const paymentLabel = paymentLabelFor(order);
                  const paymentColor = isCancelled
                    ? "text-slate-400"
                    : due <= 0
                      ? "text-emerald-600"
                      : paid > 0
                        ? "text-amber-600"
                        : "text-[#E53935]";
                  const typeBadge = ORDER_TYPE_META[order.orderType];

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-5 py-2.5 font-mono text-xs font-semibold text-slate-600">
                        {order.orderNumber}
                      </td>
                      <td className="px-5 py-2.5">
                        {typeBadge ? (
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${typeBadge.className}`}
                          >
                            {typeBadge.label}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            {order.orderType}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-slate-700">
                        {order.table?.name || "—"}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-slate-700">
                        ₹{Number(order.grandTotal).toFixed(2)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-slate-700">
                        ₹{paid.toFixed(2)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-slate-700">
                        ₹{due.toFixed(2)}
                      </td>
                      <td
                        className={`px-5 py-2.5 text-xs font-semibold ${paymentColor}`}
                      >
                        {paymentLabel}
                      </td>
                      <td className="px-5 py-2.5">
                        {confirmDeleteId === order.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs font-medium text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(order.id)}
                              disabled={deletingId === order.id}
                              className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              {deletingId === order.id
                                ? "Deleting…"
                                : "Confirm"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewingOrderId(order.id)}
                              title="View order"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {isOwner && !isOffline && (
                              <button
                                onClick={() => setConfirmDeleteId(order.id)}
                                title="Delete order"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {viewingOrderId && (
        <OrderDetailModal
          orderId={viewingOrderId}
          onClose={() => setViewingOrderId(null)}
          canDelete={isOwner && !isOffline}
          onDelete={handleDelete}
          deleting={deletingId === viewingOrderId}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
    </div>
  );
}
