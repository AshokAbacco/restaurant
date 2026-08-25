// ==============================================
// src/reports/ReportsDashboard.jsx
// ==============================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FiBarChart2,
  FiDownload,
  FiPrinter,
  FiDollarSign,
  FiShoppingCart,
  FiUsers,
  FiBox,
  FiTrendingUp,
  FiCreditCard,
  FiPieChart,
  FiActivity,
  FiSearch,
  FiArrowUp,
  FiArrowDownRight,
  FiClock,
  FiTruck,
  FiCoffee,
  FiAlertTriangle,
  FiRefreshCw,
} from "react-icons/fi";

import PageHeader from "../components/layout/PageHeader";
import { getAccessToken } from "../api/apiClient";
// If your app already has a central API base / axios instance, swap this out.
const API_BASE = import.meta.env.VITE_API_BASE_URL; 

const CATEGORY_COLORS = [
  "bg-green-500",
  "bg-blue-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-purple-500",
  "bg-teal-500",
];
const PAYMENT_COLORS = [
  "bg-green-500",
  "bg-blue-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-gray-400",
];
const EXPENSE_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-blue-500",
  "bg-gray-500",
  "bg-gray-400",
];

function formatCurrency(value) {
  const num = Number(value) || 0;
  return "₹" + Math.round(num).toLocaleString("en-IN");
}

function formatChange(change) {
  const num = Number(change) || 0;
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(1)}%`;
}

function formatTime(isoString) {
  if (!isoString) return "-";
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

const ReportsDashboard = () => {
  const [dateRange, setDateRange] = useState("Today");
  const [orderType, setOrderType] = useState("All Types");
  const [payment, setPayment] = useState("All Methods");
  const [category, setCategory] = useState("All Categories");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);

  const requestIdRef = useRef(0);

  const fetchDashboard = useCallback(async () => {
    const thisRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        period: dateRange,
        orderType,
        payment,
        category,
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      });

      const token = getAccessToken();

      const res = await fetch(
        `${API_BASE}/reports/dashboard?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        },
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json.message || `Request failed with status ${res.status}`,
        );
      }

      // ignore stale responses if filters changed again mid-flight
      if (thisRequestId !== requestIdRef.current) return;

      setData(json.data);
      setRefreshedAt(new Date());
    } catch (err) {
      if (thisRequestId !== requestIdRef.current) return;
      setError(err.message || "Something went wrong while loading the report.");
    } finally {
      if (thisRequestId === requestIdRef.current) setLoading(false);
    }
  }, [dateRange, orderType, payment, category, debouncedSearch]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const getSeverityStyle = (severity) => {
    const styles = {
      critical:
        "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
      high:
        "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30",
      medium:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
    };
    return styles[severity] || styles.medium;
  };

  const getOrderTypeIcon = (type) => {
    switch (type) {
      case "Dine In":
        return <FiCoffee className="w-4 h-4" />;
      case "Takeaway":
        return <FiShoppingCart className="w-4 h-4" />;
      case "Delivery":
        return <FiTruck className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getOrderTypeStyle = (type) => {
    switch (type) {
      case "Dine In":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
      case "Takeaway":
        return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300";
      case "Delivery":
        return "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300";
      default:
        return "bg-gray-50 text-gray-700 dark:bg-white/5 dark:text-[#9CA8A0]";
    }
  };

  // Build the primary/secondary KPI card definitions from fetched data
  const kpis = data
    ? [
        {
          title: "Sales",
          value: formatCurrency(data.kpis.sales.value),
          change: formatChange(data.kpis.sales.change),
          trend: data.kpis.sales.trend,
          icon: FiDollarSign,
          bg: "from-emerald-500 to-green-600",
        },
        {
          title: "Total Orders",
          value: String(data.kpis.orders.value),
          change: formatChange(data.kpis.orders.change),
          trend: data.kpis.orders.trend,
          icon: FiShoppingCart,
          bg: "from-blue-500 to-indigo-600",
        },
        {
          title: "Net Profit",
          value: formatCurrency(data.kpis.netProfit.value),
          change: formatChange(data.kpis.netProfit.change),
          trend: data.kpis.netProfit.trend,
          icon: FiTrendingUp,
          bg: "from-violet-500 to-purple-600",
        },
        {
          title: "Average Bill",
          value: formatCurrency(data.kpis.averageBill.value),
          change: formatChange(data.kpis.averageBill.change),
          trend: data.kpis.averageBill.trend,
          icon: FiCreditCard,
          bg: "from-amber-500 to-orange-600",
        },
      ]
    : [];

  const secondaryKpis = data
    ? [
        {
          title: "Customers",
          value: String(data.secondaryKpis.customers.value),
          change: formatChange(data.secondaryKpis.customers.change),
          trend: data.secondaryKpis.customers.trend,
          icon: FiUsers,
        },
        {
          title: "Inventory Value",
          value: formatCurrency(data.secondaryKpis.inventoryValue.value),
          change: "",
          trend: "up",
          icon: FiBox,
        },
        {
          title: "Expenses",
          value: formatCurrency(data.secondaryKpis.expenses.value),
          change: formatChange(data.secondaryKpis.expenses.change),
          trend: data.secondaryKpis.expenses.trend,
          icon: FiActivity,
        },
        {
          title: "GST Collected",
          value: formatCurrency(data.secondaryKpis.gstCollected.value),
          change: formatChange(data.secondaryKpis.gstCollected.change),
          trend: data.secondaryKpis.gstCollected.trend,
          icon: FiPieChart,
        },
      ]
    : [];

  const topSelling = data?.topSelling || [];
  const categoryData = (data?.categoryData || []).map((c, i) => ({
    ...c,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));
  const paymentData = (data?.paymentData || []).map((p, i) => ({
    ...p,
    color: PAYMENT_COLORS[i % PAYMENT_COLORS.length],
  }));
  const expenses = (data?.expenseBreakdown || []).map((e, i) => ({
    ...e,
    color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
  }));
  const employees = data?.employees || [];
  const transactions = data?.transactions || [];
  const inventoryAlerts = data?.inventoryAlerts || [];
  const segments = data?.customerSegments;
  const topCustomer = data?.topCustomer;
  const kitchen = data?.kitchenPerformance;
  const summary = data?.businessSummary;

  const maxEmployeeOrders = employees.length
    ? Math.max(...employees.map((e) => e.orders))
    : 1;

  return (
    <div className="space-y-6 bg-[#F3F5EE] dark:bg-[#12160F] min-h-screen -m-6 p-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Restaurant business intelligence dashboard"
        icon={<FiBarChart2 />}
      />

      {/* ================= ERROR BANNER ================= */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FiAlertTriangle className="w-4 h-4" />
            {error}
          </div>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-1.5 text-sm font-semibold bg-white dark:bg-[#171C17] border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-1.5 hover:bg-red-100 dark:hover:bg-red-500/20 transition"
          >
            <FiRefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* ================= FILTER BAR ================= */}
      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-gray-100 dark:border-[#262B24] shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-gray-500 dark:text-[#6B7280] uppercase tracking-wider">
              Period
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="mt-1.5 w-full border border-gray-200 dark:border-[#262B24] rounded-xl p-2.5 text-sm bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-[#E4E9E2] focus:bg-white dark:focus:bg-white/10 focus:ring-2 focus:ring-green-500 dark:focus:ring-[#43B75A] focus:border-transparent transition dark:[color-scheme:dark]"
            >
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-gray-500 dark:text-[#6B7280] uppercase tracking-wider">
              Order Type
            </label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="mt-1.5 w-full border border-gray-200 dark:border-[#262B24] rounded-xl p-2.5 text-sm bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-[#E4E9E2] focus:bg-white dark:focus:bg-white/10 focus:ring-2 focus:ring-green-500 dark:focus:ring-[#43B75A] focus:border-transparent transition dark:[color-scheme:dark]"
            >
              <option>All Types</option>
              <option>Dine In</option>
              <option>Takeaway</option>
              <option>Delivery</option>
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-gray-500 dark:text-[#6B7280] uppercase tracking-wider">
              Payment
            </label>
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              className="mt-1.5 w-full border border-gray-200 dark:border-[#262B24] rounded-xl p-2.5 text-sm bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-[#E4E9E2] focus:bg-white dark:focus:bg-white/10 focus:ring-2 focus:ring-green-500 dark:focus:ring-[#43B75A] focus:border-transparent transition dark:[color-scheme:dark]"
            >
              <option>All Methods</option>
              <option>CASH</option>
              <option>UPI</option>
              <option>CARD</option>
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-gray-500 dark:text-[#6B7280] uppercase tracking-wider">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 w-full border border-gray-200 dark:border-[#262B24] rounded-xl p-2.5 text-sm bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-[#E4E9E2] focus:bg-white dark:focus:bg-white/10 focus:ring-2 focus:ring-green-500 dark:focus:ring-[#43B75A] focus:border-transparent transition dark:[color-scheme:dark]"
            >
              <option>All Categories</option>
              {categoryData.map((c) => (
                <option key={c.category}>{c.category}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-semibold text-gray-500 dark:text-[#6B7280] uppercase tracking-wider">
              Search
            </label>
            <div className="relative mt-1.5">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#6B7280] w-4 h-4" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Invoice or customer..."
                className="w-full border border-gray-200 dark:border-[#262B24] rounded-xl py-2.5 pl-9 pr-3 text-sm bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-[#E4E9E2] placeholder:text-gray-400 dark:placeholder:text-[#6B7280] focus:bg-white dark:focus:bg-white/10 focus:ring-2 focus:ring-green-500 dark:focus:ring-[#43B75A] focus:border-transparent transition"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchDashboard}
              className="border border-gray-200 dark:border-[#262B24] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-[#9CA8A0] rounded-xl px-3.5 py-2.5 text-sm font-medium flex items-center gap-2 transition"
              title="Refresh"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button className="bg-green-600 dark:bg-[#43B75A] hover:bg-green-700 dark:hover:bg-[#3AA34E] text-white rounded-xl px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition shadow-sm shadow-green-600/20 dark:shadow-none">
              <FiDownload className="w-4 h-4" />
              Export
            </button>
            <button className="border border-gray-200 dark:border-[#262B24] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-[#9CA8A0] rounded-xl px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition">
              <FiPrinter className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
        {refreshedAt && (
          <p className="text-xs text-gray-400 dark:text-[#6B7280] mt-3">
            Last updated {refreshedAt.toLocaleTimeString("en-IN")}
          </p>
        )}
      </div>

      {/* ================= LOADING SKELETON (first load) ================= */}
      {loading && !data && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#171C17] rounded-2xl border border-gray-100 dark:border-[#262B24] shadow-sm p-5 h-32 animate-pulse"
            />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* ================= PRIMARY KPIs ================= */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {kpis.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-[#171C17] rounded-2xl border border-gray-100 dark:border-[#262B24] shadow-sm overflow-hidden hover:shadow-md dark:hover:shadow-none transition-all duration-300 group"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.bg} flex items-center justify-center text-white shadow-lg shadow-black/10 dark:shadow-black/30`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div
                        className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                          card.trend === "up"
                            ? "bg-emerald-50 dark:bg-[#43B75A]/10 text-emerald-600 dark:text-[#43B75A]"
                            : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {card.trend === "up" ? (
                          <FiArrowUp className="w-3 h-3" />
                        ) : (
                          <FiArrowDownRight className="w-3 h-3" />
                        )}
                        {card.change}
                      </div>
                    </div>
                    <h3 className="text-sm text-gray-500 dark:text-[#9CA8A0] mt-4 font-medium">
                      {card.title}
                    </h3>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tracking-tight">
                      {card.value}
                    </h2>
                  </div>
                  <div
                    className="h-1 bg-gradient-to-r opacity-60 group-hover:opacity-100 transition"
                    style={{
                      backgroundImage: card.bg.includes("emerald")
                        ? "linear-gradient(to right, #10b981, #16a34a)"
                        : card.bg.includes("blue")
                          ? "linear-gradient(to right, #3b82f6, #4f46e5)"
                          : card.bg.includes("violet")
                            ? "linear-gradient(to right, #8b5cf6, #9333ea)"
                            : "linear-gradient(to right, #f59e0b, #ea580c)",
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* ================= SECONDARY KPIs ================= */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {secondaryKpis.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-[#171C17] rounded-xl border border-gray-100 dark:border-[#262B24] p-4 flex items-center gap-4 hover:shadow-sm dark:hover:bg-white/[0.02] transition"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      card.trend === "up"
                        ? "bg-green-50 dark:bg-[#43B75A]/10 text-green-600 dark:text-[#43B75A]"
                        : "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-[#6B7280] font-medium truncate">
                      {card.title}
                    </p>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-lg font-bold text-gray-900 dark:text-white truncate">
                        {card.value}
                      </span>
                      {card.change && (
                        <span
                          className={`text-xs font-semibold ${card.trend === "up" ? "text-green-600 dark:text-[#43B75A]" : "text-red-500 dark:text-red-400"}`}
                        >
                          {card.change}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ================= CHARTS ROW (placeholders — wire up Recharts/Chart.js with the same data) ================= */}
          <div className="grid xl:grid-cols-5 gap-5">
            <div className="xl:col-span-3 bg-white dark:bg-[#171C17] rounded-2xl border border-gray-100 dark:border-[#262B24] shadow-sm p-6">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Sales Trend
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-[#6B7280] mt-0.5">
                    Revenue over time
                  </p>
                </div>
              </div>
              <div className="h-72 mt-4 rounded-xl bg-gradient-to-br from-green-50/80 via-emerald-50/50 to-transparent dark:from-[#43B75A]/10 dark:via-[#43B75A]/5 dark:to-transparent border border-green-100/50 dark:border-[#43B75A]/20 flex items-center justify-center">
                <div className="text-center">
                  <FiBarChart2 className="w-12 h-12 text-green-400 dark:text-[#43B75A]/70 mx-auto mb-3" />
                  <p className="text-green-600 dark:text-[#43B75A] font-bold text-lg">LINE CHART</p>
                  <p className="text-green-500/70 dark:text-[#43B75A]/60 text-sm mt-1">
                    Plug topSelling/time-series data into Recharts here
                  </p>
                </div>
              </div>
            </div>

            <div className="xl:col-span-2 bg-white dark:bg-[#171C17] rounded-2xl border border-gray-100 dark:border-[#262B24] shadow-sm p-6">
              <div className="mb-1">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  By Order Type
                </h2>
                <p className="text-sm text-gray-500 dark:text-[#6B7280] mt-0.5">
                  Revenue distribution
                </p>
              </div>
              <div className="h-52 mt-4 rounded-xl bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-transparent dark:from-blue-500/10 dark:via-indigo-500/5 dark:to-transparent border border-blue-100/50 dark:border-blue-500/20 flex items-center justify-center">
                <div className="text-center">
                  <FiPieChart className="w-12 h-12 text-blue-400 dark:text-blue-400/70 mx-auto mb-3" />
                  <p className="text-blue-600 dark:text-blue-400 font-bold text-lg">DONUT CHART</p>
                </div>
              </div>
            </div>
          </div>

          {/* ================= CATEGORY + PAYMENT ================= */}
          <div className="grid xl:grid-cols-5 gap-5">
            <div className="xl:col-span-3 bg-white dark:bg-[#171C17] rounded-2xl border border-gray-100 dark:border-[#262B24] shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Category Performance
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-[#6B7280] mt-0.5">
                    Orders and revenue by category
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {categoryData.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-[#6B7280]">
                    No category data for this period.
                  </p>
                )}
                {categoryData.map((item, index) => (
                  <div key={index} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-sm ${item.color}`} />
                        <span className="font-semibold text-gray-800 dark:text-[#E4E9E2] text-sm">
                          {item.category}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-[#6B7280]">
                          {item.orders} line items
                        </span>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-500`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="xl:col-span-2 bg-white dark:bg-[#171C17] rounded-2xl border border-gray-100 dark:border-[#262B24] shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Payments</h2>
                  <p className="text-sm text-gray-500 dark:text-[#6B7280] mt-0.5">
                    Method distribution
                  </p>
                </div>
                <FiCreditCard className="w-5 h-5 text-gray-400 dark:text-[#6B7280]" />
              </div>

              <div className="space-y-4">
                {paymentData.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-[#6B7280]">
                    No payment data for this period.
                  </p>
                )}
                {paymentData.map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="font-medium text-gray-800 dark:text-[#E4E9E2] text-sm">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900 dark:text-white text-sm">
                          {item.pct}%
                        </span>
                        <span className="text-xs text-gray-400 dark:text-[#6B7280] ml-2">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-500`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================= TOP SELLING + EXPENSES ================= */}
          <div className="grid xl:grid-cols-5 gap-5">
            <div className="xl:col-span-3 bg-white dark:bg-[#171C17] rounded-2xl border border-gray-100 dark:border-[#262B24] shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Top Selling Items
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-[#6B7280] mt-0.5">
                    Best performers by quantity
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {topSelling.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-[#6B7280]">
                    No sales in this period yet.
                  </p>
                )}
                {topSelling.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition group"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : index === 1
                            ? "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-[#9CA8A0]"
                            : index === 2
                              ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400"
                              : "bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-[#6B7280]"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                        {item.item}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-[#6B7280] mt-0.5">
                        {item.qty} sold · Profit {formatCurrency(item.profit)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white text-sm">
                        {formatCurrency(item.revenue)}
                      </p>
                      <div className="w-20 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-green-500 dark:bg-[#43B75A] rounded-full"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="xl:col-span-2 bg-white dark:bg-[#171C17] rounded-2xl border border-gray-100 dark:border-[#262B24] shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Expenses</h2>
                  <p className="text-sm text-gray-500 dark:text-[#6B7280] mt-0.5">Cost breakdown</p>
                </div>
                <FiDollarSign className="w-5 h-5 text-gray-400 dark:text-[#6B7280]" />
              </div>

              <div className="space-y-3">
                {expenses.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-[#6B7280]">
                    No expenses recorded for this period.
                  </p>
                )}
                {expenses.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                      <span className="text-sm text-gray-700 dark:text-[#9CA8A0]">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#262B24] flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-[#6B7280]">Total</span>
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  {formatCurrency(data.expenseTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* ================= CUSTOMER + EMPLOYEE ================= */}
          <div className="grid xl:grid-cols-5 gap-5">
            <div className="xl:col-span-2 bg-white dark:bg-[#171C17] rounded-2xl border border-gray-100 dark:border-[#262B24] shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Customers</h2>
                  <p className="text-sm text-gray-500 dark:text-[#6B7280] mt-0.5">
                    Segmentation overview
                  </p>
                </div>
                <FiUsers className="w-5 h-5 text-gray-400 dark:text-[#6B7280]" />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  {
                    title: "New",
                    value: segments?.newCustomers ?? 0,
                    color: "text-blue-600 dark:text-blue-400",
                    bg: "bg-blue-50 dark:bg-blue-500/10",
                  },
                  {
                    title: "Returning",
                    value: segments?.returning ?? 0,
                    color: "text-green-600 dark:text-[#43B75A]",
                    bg: "bg-green-50 dark:bg-[#43B75A]/10",
                  },
                  {
                    title: "Loyal",
                    value: segments?.loyal ?? 0,
                    color: "text-purple-600 dark:text-purple-400",
                    bg: "bg-purple-50 dark:bg-purple-500/10",
                  },
                  {
                    title: "Inactive",
                    value: segments?.inactive ?? 0,
                    color: "text-red-500 dark:text-red-400",
                    bg: "bg-red-50 dark:bg-red-500/10",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`${item.bg} rounded-xl p-3.5 text-center`}
                  >
                    <p className={`text-2xl font-bold ${item.color}`}>
                      {item.value}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-[#9CA8A0] mt-1 font-medium">
                      {item.title}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-[#6B7280] font-semibold uppercase tracking-wider mb-3">
                  Top Customer
                </p>
                {topCustomer ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-[#43B75A]/10 text-green-700 dark:text-[#43B75A] flex items-center justify-center font-bold text-sm">
                      {topCustomer.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {topCustomer.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-[#6B7280]">
                        {topCustomer.orders} orders
                      </p>
                    </div>
                    <p className="font-bold text-green-600 dark:text-[#43B75A] text-sm">
                      {formatCurrency(topCustomer.totalSpent)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-[#6B7280]">
                    No customer orders in this period.
                  </p>
                )}
              </div>
            </div>

            <div className="xl:col-span-3 bg-white dark:bg-[#171C17] rounded-2xl border border-gray-100 dark:border-[#262B24] shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Employee Performance
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-[#6B7280] mt-0.5">
                    Orders handled and sales generated
                  </p>
                </div>
                <FiActivity className="w-5 h-5 text-gray-400 dark:text-[#6B7280]" />
              </div>
              <div className="space-y-3">
                {employees.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-[#6B7280]">
                    No waiter-assigned orders in this period.
                  </p>
                )}
                {employees.map((emp, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 dark:from-[#43B75A] dark:to-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {emp.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-[#6B7280]">{emp.role}</p>
                    </div>
                    <div className="text-center px-4">
                      <p className="font-bold text-gray-900 dark:text-white text-sm">
                        {emp.orders}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-[#6B7280]">orders</p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="font-bold text-green-600 dark:text-[#43B75A] text-sm">
                        {formatCurrency(emp.sales)}
                      </p>
                    </div>
                    <div className="w-24 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="h-full bg-green-500 dark:bg-[#43B75A] rounded-full"
                        style={{
                          width: `${(emp.orders / maxEmployeeOrders) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================= INVENTORY + KITCHEN ================= */}
          <div className="grid xl:grid-cols-5 gap-5">
            <div className="xl:col-span-2 bg-white dark:bg-[#171C17] rounded-2xl border border-gray-100 dark:border-[#262B24] shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Inventory Alerts
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-[#6B7280] mt-0.5">
                    Items needing attention
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <FiAlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
                </div>
              </div>
              <div className="space-y-2.5">
                {inventoryAlerts.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-[#6B7280]">
                    No active inventory alerts.
                  </p>
                )}
                {inventoryAlerts.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-xl border ${getSeverityStyle(item.severity)}`}
                  >
                    <div>
                      <h4 className="font-semibold text-sm">{item.item}</h4>
                      <p className="text-xs opacity-70 mt-0.5">
                        Remaining: {item.stock}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/80 dark:bg-black/20">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="xl:col-span-3 bg-white dark:bg-[#171C17] rounded-2xl border border-gray-100 dark:border-[#262B24] shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Kitchen Performance
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-[#6B7280] mt-0.5">
                    Kitchen metrics for this period
                  </p>
                </div>
                <FiClock className="w-5 h-5 text-gray-400 dark:text-[#6B7280]" />
              </div>

              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  {
                    label: "Prepared",
                    value: kitchen?.prepared ?? 0,
                    color: "text-green-600 dark:text-[#43B75A]",
                    bg: "bg-green-50 dark:bg-[#43B75A]/10",
                  },
                  {
                    label: "Pending",
                    value: kitchen?.pending ?? 0,
                    color: "text-amber-600 dark:text-amber-400",
                    bg: "bg-amber-50 dark:bg-amber-500/10",
                  },
                  {
                    label: "Avg Time",
                    value: `${kitchen?.avgPrepMinutes ?? 0}m`,
                    color: "text-blue-600 dark:text-blue-400",
                    bg: "bg-blue-50 dark:bg-blue-500/10",
                  },
                  {
                    label: "Cancelled",
                    value: kitchen?.cancelled ?? 0,
                    color: "text-red-500 dark:text-red-400",
                    bg: "bg-red-50 dark:bg-red-500/10",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`${item.bg} rounded-xl p-3 text-center`}
                  >
                    <p className={`text-xl font-bold ${item.color}`}>
                      {item.value}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-[#9CA8A0] mt-0.5 font-medium">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="h-36 rounded-xl bg-gradient-to-br from-green-50/80 via-emerald-50/50 to-transparent dark:from-[#43B75A]/10 dark:via-[#43B75A]/5 dark:to-transparent border border-green-100/50 dark:border-[#43B75A]/20 flex items-center justify-center">
                <div className="text-center">
                  <FiBarChart2 className="w-8 h-8 text-green-400 dark:text-[#43B75A]/70 mx-auto mb-2" />
                  <p className="text-green-500 dark:text-[#43B75A] font-bold text-sm">
                    KITCHEN THROUGHPUT CHART
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ================= RECENT TRANSACTIONS ================= */}
          <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-gray-100 dark:border-[#262B24] shadow-sm overflow-hidden">
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Recent Transactions
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-[#6B7280] mt-0.5">
                    Latest sales activity
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-gray-100 dark:border-[#262B24] bg-gray-50/50 dark:bg-[#1D231C]/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-[#6B7280] uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-[#6B7280] uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-[#6B7280] uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 dark:text-[#6B7280] uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 dark:text-[#6B7280] uppercase tracking-wider">
                      Time
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-[#6B7280] uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 dark:text-[#6B7280] uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-8 text-center text-sm text-gray-400 dark:text-[#6B7280]"
                      >
                        No transactions found for this period/filter.
                      </td>
                    </tr>
                  )}
                  {transactions.map((item, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-50 dark:border-[#262B24] hover:bg-gray-50/50 dark:hover:bg-white/5 transition"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold text-green-700 dark:text-[#43B75A] bg-green-50 dark:bg-[#43B75A]/10 px-2 py-0.5 rounded">
                          {item.invoice}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {item.customer}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${getOrderTypeStyle(item.type)}`}
                        >
                          {getOrderTypeIcon(item.type)}
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-[#9CA8A0]">
                        {item.payment}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-[#6B7280]">
                        {formatTime(item.time)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
                            item.status === "Paid"
                              ? "bg-green-100 dark:bg-[#43B75A]/10 text-green-700 dark:text-[#43B75A]"
                              : "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================= BUSINESS SUMMARY ================= */}
          <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 dark:from-[#1F6B3A] dark:via-[#1B5E36] dark:to-[#124436] rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />

            <div className="relative flex flex-col lg:flex-row justify-between gap-8">
              <div className="max-w-md">
                <h2 className="text-2xl font-bold">Business Summary</h2>
                <p className="mt-2 text-green-100 dark:text-emerald-100/80 text-sm leading-relaxed">
                  Restaurant performance overview generated from sales,
                  inventory, customers, employees and financial data.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                {[
                  { label: "Best Item", value: summary?.bestItem },
                  { label: "Best Category", value: summary?.bestCategory },
                  { label: "Refunds", value: formatCurrency(summary?.refunds) },
                  {
                    label: "Discounts",
                    value: formatCurrency(summary?.discounts),
                  },
                  {
                    label: "Net Margin",
                    value: `${(summary?.netMargin ?? 0).toFixed(1)}%`,
                  },
                  {
                    label: "Growth",
                    value: formatChange(summary?.growth),
                    icon: (summary?.growth ?? 0) >= 0,
                  },
                ].map((item, i) => (
                  <div key={i}>
                    <p className="text-green-200 dark:text-emerald-200/70 text-xs font-medium">
                      {item.label}
                    </p>
                    <p className="font-bold mt-0.5 flex items-center gap-1.5">
                      {item.icon && <FiArrowUp className="w-4 h-4" />}
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsDashboard;