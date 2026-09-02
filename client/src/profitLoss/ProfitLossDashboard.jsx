// ==============================================
// client/src/profitLoss/ProfitLossDashboard.jsx
// ==============================================
// Requires `recharts` (npm install recharts) and `react-icons`
// (npm install react-icons) if not already in the project.

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiPieChart,
  FiAlertTriangle,
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  fetchProfitLossSummary,
  fetchProfitLossTrend,
  fetchExpenseBreakdown,
} from "./profitLossService";

// ==========================================
// HELPERS
// ==========================================

const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const toISODate = (date) => date.toISOString().slice(0, 10);

const PRESETS = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];

const resolvePresetRange = (preset) => {
  const today = new Date();

  if (preset === "month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toISODate(from), to: toISODate(today) };
  }

  const days = { "7d": 7, "30d": 30, "90d": 90 }[preset] ?? 30;
  const from = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: toISODate(from), to: toISODate(today) };
};

const PIE_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#ca8a04",
];

const formatPeriodLabel = (isoString) => {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};

// ==========================================
// SMALL PRESENTATIONAL PIECES
// ==========================================

const SummaryCard = ({ label, value, icon: Icon, tone = "neutral", sub }) => {
  const toneClasses = {
    neutral: "text-gray-800 dark:text-white",
    positive: "text-green-600 dark:text-green-400",
    negative: "text-red-600 dark:text-red-400",
  }[tone];

  return (
    <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500 dark:text-[#9CA8A0]">
          {label}
        </span>
        {Icon && <Icon className={`w-5 h-5 ${toneClasses}`} />}
      </div>
      <div className={`text-2xl font-bold ${toneClasses}`}>{value}</div>
      {sub && (
        <div className="text-xs text-gray-400 dark:text-[#6B7280] mt-1">
          {sub}
        </div>
      )}
    </div>
  );
};

const Loader = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-10 h-10 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

// ==========================================
// MAIN DASHBOARD
// ==========================================

const ProfitLossDashboard = () => {
  const [preset, setPreset] = useState("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [store, setStore] = useState("");

  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const range = useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    return resolvePresetRange(preset);
  }, [preset, customFrom, customTo]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = {
      from: range.from,
      to: range.to,
      store: store || undefined,
    };

    try {
      const [summaryData, trendData, breakdownData] = await Promise.all([
        fetchProfitLossSummary(params),
        fetchProfitLossTrend({ ...params, groupBy: "day" }),
        fetchExpenseBreakdown(params),
      ]);

      setSummary(summaryData);
      setTrend(trendData);
      setExpenseBreakdown(breakdownData);
    } catch (err) {
      setError(err.message || "Something went wrong loading the P&L data.");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, store]);

  useEffect(() => {
    // custom preset with an incomplete range shouldn't fire a request yet
    if (preset === "custom" && (!customFrom || !customTo)) return;
    loadData();
  }, [loadData, preset, customFrom, customTo]);

  const netProfitPositive = (summary?.netProfit ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#12160F]">
      {/* ========================================== HEADER ========================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Profit &amp; Loss
          </h1>
          <p className="text-sm text-gray-500 dark:text-[#9CA8A0] mt-1">
            {summary
              ? `${new Date(summary.period.from).toLocaleDateString("en-IN")} – ${new Date(
                  summary.period.to,
                ).toLocaleDateString("en-IN")} · ${summary.store}`
              : "Revenue, cost of goods sold, and operating expenses"}
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-200 dark:border-[#262B24] bg-white dark:bg-[#171C17] px-4 py-2 text-sm font-medium text-gray-600 dark:text-[#9CA8A0] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* ========================================== FILTERS ========================================== */}
      <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                preset === p.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-[#9CA8A0] hover:bg-gray-200 dark:hover:bg-white/10"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-[#262B24] bg-white dark:bg-[#171C17] px-3 py-1.5 text-sm text-gray-700 dark:text-[#E4E9E2] dark:[color-scheme:dark]"
            />
            <span className="text-gray-400 dark:text-[#6B7280] text-sm">
              to
            </span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-[#262B24] bg-white dark:bg-[#171C17] px-3 py-1.5 text-sm text-gray-700 dark:text-[#E4E9E2] dark:[color-scheme:dark]"
            />
          </div>
        )}

        <input
          type="text"
          placeholder="Filter by store (optional)"
          value={store}
          onChange={(e) => setStore(e.target.value)}
          className="ml-auto rounded-lg border border-gray-200 dark:border-[#262B24] bg-white dark:bg-[#171C17] px-3 py-1.5 text-sm text-gray-700 dark:text-[#E4E9E2] placeholder-gray-400 dark:placeholder-[#6B7280] w-56"
        />
      </div>

      {/* ========================================== ERROR ========================================== */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <FiAlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <Loader />
      ) : (
        summary && (
          <>
            {/* ========================================== SUMMARY CARDS ========================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                label="Net Revenue"
                value={currency(summary.revenue.netRevenue)}
                icon={FiDollarSign}
                sub={`${summary.revenue.orderCount} completed orders`}
              />
              <SummaryCard
                label="Cost of Goods Sold"
                value={currency(summary.cogs.totalCogs)}
                icon={FiTrendingDown}
                tone="negative"
                sub={
                  summary.cogs.itemsMissingCostPrice > 0
                    ? `${summary.cogs.itemsMissingCostPrice} line items missing a cost price`
                    : undefined
                }
              />
              <SummaryCard
                label="Gross Profit"
                value={currency(summary.grossProfit)}
                icon={FiTrendingUp}
                tone={summary.grossProfit >= 0 ? "positive" : "negative"}
                sub={`${summary.grossMarginPct}% margin`}
              />
              <SummaryCard
                label="Operating Expenses"
                value={currency(summary.operatingExpenses.total)}
                icon={FiTrendingDown}
                tone="negative"
                sub="Expenses + salaries + utilities"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <SummaryCard
                label="Net Profit"
                value={currency(summary.netProfit)}
                icon={netProfitPositive ? FiTrendingUp : FiTrendingDown}
                tone={netProfitPositive ? "positive" : "negative"}
                sub={`${summary.netMarginPct}% net margin`}
              />
              <SummaryCard
                label="Wastage"
                value={currency(summary.wastage.total)}
                icon={FiAlertTriangle}
                tone="negative"
                sub={`${summary.wastage.count} recorded incidents`}
              />
            </div>

            {summary.capex.count > 0 && (
              <div className="mb-6 text-xs text-gray-400 dark:text-[#6B7280]">
                Note: {currency(summary.capex.total)} in asset purchases this
                period is shown for reference only and is not included in Net
                Profit above.
              </div>
            )}

            {/* ========================================== TREND CHART ========================================== */}
            <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-5 mb-6">
              <h2 className="text-base font-semibold text-gray-700 dark:text-[#E4E9E2] mb-4">
                Revenue vs. Expenses
              </h2>

              {trend.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-[#6B7280] py-10 text-center">
                  No data for the selected period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
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
                        <stop
                          offset="95%"
                          stopColor="#2563eb"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="expenseFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#dc2626"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#dc2626"
                          stopOpacity={0}
                        />
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
                      formatter={(value, name) => [currency(value), name]}
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
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses (incl. COGS)"
                      stroke="#dc2626"
                      fill="url(#expenseFill)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="netProfit"
                      name="Net Profit"
                      stroke="#16a34a"
                      fill="none"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ========================================== EXPENSE BREAKDOWN ========================================== */}
            <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-5">
              <h2 className="text-base font-semibold text-gray-700 dark:text-[#E4E9E2] mb-4 flex items-center gap-2">
                <FiPieChart className="w-4 h-4" />
                Expense Breakdown
              </h2>

              {!expenseBreakdown || expenseBreakdown.items.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-[#6B7280] py-10 text-center">
                  No expenses recorded for this period.
                </p>
              ) : (
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  <ResponsiveContainer
                    width="100%"
                    height={260}
                    className="lg:w-1/2"
                  >
                    <PieChart>
                      <Pie
                        data={expenseBreakdown.items}
                        dataKey="amount"
                        nameKey="label"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                      >
                        {expenseBreakdown.items.map((_, index) => (
                          <Cell
                            key={index}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => currency(value)} />
                    </PieChart>
                  </ResponsiveContainer>

                  <ul className="flex-1 w-full space-y-2">
                    {expenseBreakdown.items.map((item, index) => (
                      <li
                        key={item.label}
                        className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 dark:border-[#262B24] last:border-0"
                      >
                        <span className="flex items-center gap-2 text-gray-600 dark:text-[#9CA8A0]">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                PIE_COLORS[index % PIE_COLORS.length],
                            }}
                          />
                          {item.label}
                        </span>
                        <span className="font-medium text-gray-800 dark:text-white">
                          {currency(item.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
};

export default ProfitLossDashboard;