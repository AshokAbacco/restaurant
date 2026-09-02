// ==============================================
// client/src/profitLoss/OverviewTab.jsx
// ==============================================
// Requires `recharts` and `react-icons` (npm install recharts react-icons)
// if not already in the project.

import React, { useEffect, useState, useCallback } from "react";
import {
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiRefreshCw,
} from "react-icons/fi";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  fetchDashboard,
  fetchCharts,
  fetchPaymentRevenue,
} from "./profitLossService";
import {
  currency,
  SummaryCard,
  Loader,
  ErrorBanner,
  EmptyState,
  formatPeriodLabel,
  useDateRange,
  FilterBar,
} from "./profitLossUI";

const OverviewTab = () => {
  const dateRange = useDateRange("month");
  const [store, setStore] = useState("");

  const [dashboard, setDashboard] = useState(null);
  const [trend, setTrend] = useState([]);
  const [paymentRevenue, setPaymentRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!dateRange.ready) return;
    setLoading(true);
    setError(null);

    const params = { ...dateRange.range, store: store || undefined };

    try {
      const [dashboardData, trendData, paymentData] = await Promise.all([
        fetchDashboard({ store: store || undefined }),
        fetchCharts({ ...params, type: "daily-revenue-trend" }),
        fetchPaymentRevenue(params),
      ]);

      setDashboard(dashboardData);
      setTrend(trendData.data);
      setPaymentRevenue(paymentData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange.range, dateRange.ready, store]);

  useEffect(() => {
    load();
  }, [load]);

  const netProfitPositive = (dashboard?.netProfit ?? 0) >= 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
          {dashboard
            ? `Today's snapshot, plus the trend for your selected range`
            : "Revenue, cost of goods sold, and operating expenses"}
        </p>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#262B24] bg-white dark:bg-[#171C17] px-4 py-2 text-sm font-medium text-gray-600 dark:text-[#9CA8A0] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <FilterBar dateRange={dateRange} store={store} setStore={setStore} />
      <ErrorBanner message={error} />

      {loading ? (
        <Loader />
      ) : (
        <>
          {dashboard && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                label="Today's Revenue"
                value={currency(dashboard.todaysRevenue)}
                icon={FiDollarSign}
                sub={`${dashboard.orderCount} completed orders`}
              />
              <SummaryCard
                label="Today's Expense"
                value={currency(dashboard.todaysExpense)}
                icon={FiTrendingDown}
                tone="negative"
              />
              <SummaryCard
                label="Gross Profit"
                value={currency(dashboard.grossProfit)}
                icon={FiTrendingUp}
                tone={dashboard.grossProfit >= 0 ? "positive" : "negative"}
                sub={`${dashboard.grossMarginPct}% margin`}
              />
              <SummaryCard
                label="Net Profit"
                value={currency(dashboard.netProfit)}
                icon={netProfitPositive ? FiTrendingUp : FiTrendingDown}
                tone={netProfitPositive ? "positive" : "negative"}
                sub={`${dashboard.netMarginPct}% margin`}
              />
            </div>
          )}

          <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-5 mb-6">
            <h2 className="text-base font-semibold text-gray-700 dark:text-[#E4E9E2] mb-4">
              Revenue Trend
            </h2>

            {trend.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient
                      id="revenueFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#2563eb"
                        stopOpacity={0.35}
                      />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="period"
                    tickFormatter={formatPeriodLabel}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                  />
                  <YAxis
                    tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                  />
                  <Tooltip
                    labelFormatter={formatPeriodLabel}
                    formatter={(v) => currency(v)}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#2563eb"
                    fill="url(#revenueFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-5">
            <h2 className="text-base font-semibold text-gray-700 dark:text-[#E4E9E2] mb-4">
              Payment-wise Revenue (reconciliation)
            </h2>

            {!paymentRevenue || paymentRevenue.byMethod.length === 0 ? (
              <EmptyState message="No payments recorded for this period." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {paymentRevenue.byMethod.map((m) => (
                  <div
                    key={m.method}
                    className="rounded-xl bg-gray-50 dark:bg-white/5 p-4"
                  >
                    <div className="text-xs font-medium text-gray-500 dark:text-[#9CA8A0] mb-1">
                      {m.method}
                    </div>
                    <div className="text-lg font-semibold text-gray-800 dark:text-white">
                      {currency(m.amount)}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-[#6B7280]">
                      {m.count} payments
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OverviewTab;