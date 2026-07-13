// src/payment/Payment.jsx
//
// Date-wise Payments overview: how many orders were placed vs completed,
// and how much payment came in vs is still pending, for a chosen day/range.
// Pulls from GET /pos/orders (via posApi.getOrders), which already supports
// from/to filtering on createdAt server-side (see pos.service.js listOrders).
import { useCallback, useEffect, useMemo, useState } from "react";
import { getOrders } from "../pos/api/posApi";

const COMPLETED_ORDER_STATUSES = ["COMPLETED"];
const CANCELLED_ORDER_STATUSES = ["CANCELLED", "REFUNDED"];

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { from: toDateInputValue(start), to: toDateInputValue(end) };
}

function toDateInputValue(d) {
  return d.toISOString().slice(0, 10);
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
  const [{ from, to }, setRange] = useState(todayRange());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback((fromDate, toDate) => {
    setLoading(true);
    setError(null);
    getOrders({ from: startOfDayISO(fromDate), to: endOfDayISO(toDate), limit: 500 })
      .then((data) => setOrders(data?.data || []))
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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#212121]">Payments</h1>
          <p className="text-sm text-slate-400">Orders and payment totals, date-wise</p>
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
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
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
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
          {error}
        </p>
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
          sub={stats.ordersCancelled > 0 ? `${stats.ordersCancelled} cancelled` : "awaiting completion"}
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
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Orders in range</h2>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          {loading ? (
            <p className="p-5 text-sm text-slate-400">Loading orders…</p>
          ) : orders.length === 0 ? (
            <p className="p-5 text-sm text-slate-400">No orders in this date range.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-2">Order</th>
                  <th className="px-5 py-2">Table / Type</th>
                  <th className="px-5 py-2">Status</th>
                  <th className="px-5 py-2 text-right">Grand Total</th>
                  <th className="px-5 py-2 text-right">Paid</th>
                  <th className="px-5 py-2 text-right">Balance</th>
                  <th className="px-5 py-2">Payment</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const paid = orderPaidAmount(order);
                  const due = orderBalanceDue(order);
                  const isCancelled = CANCELLED_ORDER_STATUSES.includes(order.status);
                  const paymentLabel = isCancelled ? "—" : due <= 0 ? "Paid" : paid > 0 ? "Partial" : "Pending";
                  const paymentColor = isCancelled
                    ? "text-slate-400"
                    : due <= 0
                    ? "text-emerald-600"
                    : paid > 0
                    ? "text-amber-600"
                    : "text-[#E53935]";

                  return (
                    <tr key={order.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-2.5 font-mono text-xs font-semibold text-slate-600">
                        {order.orderNumber}
                      </td>
                      <td className="px-5 py-2.5 text-slate-700">
                        {order.table?.name || order.orderType?.replace("_", " ")}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-slate-700">
                        ₹{Number(order.grandTotal).toFixed(2)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-slate-700">₹{paid.toFixed(2)}</td>
                      <td className="px-5 py-2.5 text-right font-mono text-slate-700">₹{due.toFixed(2)}</td>
                      <td className={`px-5 py-2.5 text-xs font-semibold ${paymentColor}`}>{paymentLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
    </div>
  );
}