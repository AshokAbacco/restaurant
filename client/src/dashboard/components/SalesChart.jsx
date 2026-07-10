// ==============================================
// src/dashboard/components/SalesChart.jsx
// ==============================================

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { FiTrendingUp, FiCalendar } from "react-icons/fi";

import { useTheme } from "../../context/ThemeContext";

const dailyData = [
  { name: "Mon", sales: 12500 },
  { name: "Tue", sales: 18200 },
  { name: "Wed", sales: 16400 },
  { name: "Thu", sales: 21500 },
  { name: "Fri", sales: 27800 },
  { name: "Sat", sales: 35400 },
  { name: "Sun", sales: 30100 },
];

const weeklyData = [
  { name: "Week 1", sales: 145000 },
  { name: "Week 2", sales: 169000 },
  { name: "Week 3", sales: 184000 },
  { name: "Week 4", sales: 201000 },
];

const monthlyData = [
  { name: "Jan", sales: 520000 },
  { name: "Feb", sales: 610000 },
  { name: "Mar", sales: 580000 },
  { name: "Apr", sales: 720000 },
  { name: "May", sales: 695000 },
  { name: "Jun", sales: 810000 },
];

// ==========================================
// THEME-AWARE CHART TOKENS
// (Recharts needs real color strings, not Tailwind classes)
// ==========================================

const chartTokens = {
  light: {
    accent: "#3FA34D",
    grid: "#EFF2E9",
    axis: "#E7EAE1",
    tick: "#6B7280",
    tooltipBg: "#FFFFFF",
    tooltipBorder: "#E7EAE1",
    tooltipLabel: "#1F2937",
  },
  dark: {
    accent: "#43B75A",
    grid: "#262B24",
    axis: "#262B24",
    tick: "#9CA8A0",
    tooltipBg: "#171C17",
    tooltipBorder: "#262B24",
    tooltipLabel: "#FFFFFF",
  },
};

const SalesChart = () => {
  const [period, setPeriod] = useState("daily");

  const { theme } = useTheme();

  const tokens = chartTokens[theme] || chartTokens.light;

  const data = useMemo(() => {
    switch (period) {
      case "weekly":
        return weeklyData;

      case "monthly":
        return monthlyData;

      default:
        return dailyData;
    }
  }, [period]);

  const totalSales = data.reduce((sum, item) => sum + item.sales, 0);

  const averageSales = Math.round(totalSales / data.length);

  const formatCurrency = (value) => `₹${value.toLocaleString("en-IN")}`;

  return (
    <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm shadow-black/[0.02] dark:shadow-none transition-colors">
      {/* Header */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6 border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div>
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white">Sales Overview</h2>

          <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-1">
            Revenue analytics and sales performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {["daily", "weekly", "monthly"].map((item) => (
            <button
              key={item}
              onClick={() => setPeriod(item)}
              className={`px-4 py-2 rounded-full capitalize transition-all ${
                period === item
                  ? "bg-[#3FA34D] dark:bg-[#43B75A] text-white"
                  : "bg-[#F3F5EE] dark:bg-[#232A22] hover:bg-[#E7EAE1] dark:hover:bg-[#2A322A] text-[#6B7280] dark:text-[#9CA8A0]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 py-5 border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div>
          <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">Total Sales</p>

          <h3 className="text-3xl font-bold mt-2 text-[#1F2937] dark:text-white">
            {formatCurrency(totalSales)}
          </h3>
        </div>

        <div>
          <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">Average</p>

          <h3 className="text-3xl font-bold mt-2 text-[#1F2937] dark:text-white">
            {formatCurrency(averageSales)}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#3FA34D]/10 dark:bg-[#43B75A]/10 flex items-center justify-center text-[#3FA34D] dark:text-[#43B75A]">
            <FiTrendingUp size={26} />
          </div>

          <div>
            <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">Growth</p>

            <h3 className="text-2xl font-bold text-[#3FA34D] dark:text-[#43B75A]">+18.6%</h3>
          </div>
        </div>
      </div>

      {/* Chart */}

      <div className="h-[420px] p-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={tokens.accent} stopOpacity={0.35} />

                <stop offset="95%" stopColor={tokens.accent} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={tokens.grid} />

            <XAxis dataKey="name" tick={{ fill: tokens.tick }} axisLine={{ stroke: tokens.axis }} />

            <YAxis
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
              tick={{ fill: tokens.tick }}
              axisLine={{ stroke: tokens.axis }}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: tokens.tooltipBg,
                border: `1px solid ${tokens.tooltipBorder}`,
                borderRadius: "0.75rem",
              }}
              formatter={(value) => formatCurrency(value)}
              labelStyle={{
                color: tokens.tooltipLabel,
              }}
              itemStyle={{
                color: tokens.accent,
              }}
            />

            <Area
              type="monotone"
              dataKey="sales"
              stroke={tokens.accent}
              strokeWidth={3}
              fill="url(#salesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-[#E7EAE1] dark:border-[#262B24] px-6 py-5">
        <div className="flex items-center gap-2 text-[#6B7280] dark:text-[#9CA8A0]">
          <FiCalendar className="text-[#3FA34D] dark:text-[#43B75A]" />
          Updated just now
        </div>

        <div className="text-sm text-[#3FA34D] dark:text-[#43B75A] font-semibold">
          Revenue is increasing compared to the previous period.
        </div>
      </div>
    </div>
  );
};

export default SalesChart;