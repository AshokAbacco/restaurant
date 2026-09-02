// ==============================================
// client/src/profitLoss/profitLossUI.jsx
// ==============================================
// Small shared presentational pieces reused across every P&L tab, kept in
// one file so the tabs stay lightweight.

import React from "react";
import { FiAlertTriangle } from "react-icons/fi";

export const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export const toISODate = (date) => date.toISOString().slice(0, 10);

export const PRESETS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Last 7 days" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom" },
];

export const PIE_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#ca8a04",
];

export const formatPeriodLabel = (isoString) =>
  new Date(isoString).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });

export const SummaryCard = ({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  sub,
}) => {
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

export const Loader = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-10 h-10 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

export const ErrorBanner = ({ message }) => {
  if (!message) return null;
  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
      <FiAlertTriangle className="w-5 h-5 shrink-0" />
      {message}
    </div>
  );
};

export const EmptyState = ({
  message = "No data for the selected filters.",
}) => (
  <p className="text-sm text-gray-400 dark:text-[#6B7280] py-10 text-center">
    {message}
  </p>
);

// Shared filter bar: date preset + custom range + store input.
// Emits the resolved { period, from, to } via onChange whenever it changes.
export const useDateRange = (initialPreset = "month") => {
  const [preset, setPreset] = React.useState(initialPreset);
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");

  const range = React.useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    return { period: preset };
  }, [preset, customFrom, customTo]);

  const ready = preset !== "custom" || (customFrom && customTo);

  return {
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    range,
    ready,
  };
};

export const FilterBar = ({ dateRange, store, setStore, extra }) => (
  <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-4 mb-6 flex flex-wrap items-center gap-3">
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => dateRange.setPreset(p.key)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            dateRange.preset === p.key
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-[#9CA8A0] hover:bg-gray-200 dark:hover:bg-white/10"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>

    {dateRange.preset === "custom" && (
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={dateRange.customFrom}
          onChange={(e) => dateRange.setCustomFrom(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-[#262B24] bg-white dark:bg-[#171C17] px-3 py-1.5 text-sm text-gray-700 dark:text-[#E4E9E2] dark:[color-scheme:dark]"
        />
        <span className="text-gray-400 dark:text-[#6B7280] text-sm">to</span>
        <input
          type="date"
          value={dateRange.customTo}
          onChange={(e) => dateRange.setCustomTo(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-[#262B24] bg-white dark:bg-[#171C17] px-3 py-1.5 text-sm text-gray-700 dark:text-[#E4E9E2] dark:[color-scheme:dark]"
        />
      </div>
    )}

    {extra}

    <input
      type="text"
      placeholder="Filter by store (optional)"
      value={store}
      onChange={(e) => setStore(e.target.value)}
      className="ml-auto rounded-lg border border-gray-200 dark:border-[#262B24] bg-white dark:bg-[#171C17] px-3 py-1.5 text-sm text-gray-700 dark:text-[#E4E9E2] placeholder-gray-400 dark:placeholder-[#6B7280] w-56"
    />
  </div>
);