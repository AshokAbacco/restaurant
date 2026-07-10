// ==============================================
// src/dashboard/components/StatCard.jsx
// ==============================================

import React from "react";
import { FiArrowUp, FiArrowDown, FiTrendingUp } from "react-icons/fi";

// Brand theme: Green / adapts to light (cream+white) or dark (charcoal) mode
const colorClasses = {
  green: {
    icon: "bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 text-[#3FA34D] dark:text-[#43B75A]",
    trend: "text-[#3FA34D] dark:text-[#43B75A]",
    blob: "bg-[#3FA34D] dark:bg-[#43B75A]",
  },
  orange: {
    icon: "bg-[#FFA94D]/15 text-[#E8873A] dark:text-[#FFA94D]",
    trend: "text-[#E8873A] dark:text-[#FFA94D]",
    blob: "bg-[#FFA94D]",
  },
  red: {
    icon: "bg-[#EF5350]/10 text-[#EF5350]",
    trend: "text-[#EF5350]",
    blob: "bg-[#EF5350]",
  },
  blue: {
    icon: "bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400",
    trend: "text-sky-600 dark:text-sky-400",
    blob: "bg-sky-500",
  },
  purple: {
    icon: "bg-violet-500/10 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400",
    trend: "text-violet-600 dark:text-violet-400",
    blob: "bg-violet-500",
  },
  black: {
    icon: "bg-[#F3F5EE] dark:bg-[#232A22] text-[#1F2937] dark:text-white",
    trend: "text-[#1F2937] dark:text-white",
    blob: "bg-[#1F2937] dark:bg-white",
  },
};

const StatCard = ({
  title,
  value,
  icon,
  color = "green",
  change = "",
  changeType = "up", // up | down
  subtitle = "",
  loading = false,
  onClick,
}) => {
  const theme = colorClasses[color] || colorClasses.green;

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm dark:shadow-none p-6 animate-pulse">
        <div className="flex justify-between">
          <div className="space-y-3">
            <div className="h-4 w-32 bg-[#F3F5EE] dark:bg-[#232A22] rounded" />
            <div className="h-8 w-24 bg-[#F3F5EE] dark:bg-[#232A22] rounded" />
            <div className="h-3 w-20 bg-[#F3F5EE] dark:bg-[#232A22] rounded" />
          </div>

          <div className="w-16 h-16 rounded-2xl bg-[#F3F5EE] dark:bg-[#232A22]" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        relative
        overflow-hidden
        bg-white
        dark:bg-[#171C17]
        rounded-2xl
        border
        border-[#E7EAE1]
        dark:border-[#262B24]
        shadow-sm
        shadow-black/[0.02]
        dark:shadow-none
        hover:shadow-lg
        hover:shadow-black/5
        dark:hover:shadow-black/30
        hover:border-[#3FA34D]/30
        dark:hover:border-[#43B75A]/40
        hover:-translate-y-0.5
        transition-all
        duration-300
        p-6
        group
        ${onClick ? "cursor-pointer" : ""}
      `}
    >
      {/* Background Decoration */}

      <div
        className={`
          absolute
          -right-8
          -top-8
          w-28
          h-28
          rounded-full
          opacity-[0.08]
          dark:opacity-10
          ${theme.blob}
        `}
      />

      {/* Content */}

      <div className="relative z-10 flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm font-medium text-[#6B7280] dark:text-[#9CA8A0]">{title}</p>

          <h2 className="mt-3 text-3xl font-bold text-[#1F2937] dark:text-white">{value}</h2>

          {subtitle && <p className="mt-2 text-sm text-[#9CA3AF] dark:text-[#6B7280]">{subtitle}</p>}

          {change && (
            <div className="mt-5 flex items-center gap-2">
              <div
                className={`flex items-center gap-1 text-sm font-semibold ${
                  changeType === "up" ? "text-[#3FA34D] dark:text-[#43B75A]" : "text-[#EF5350]"
                }`}
              >
                {changeType === "up" ? <FiArrowUp /> : <FiArrowDown />}

                {change}
              </div>

              <span className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">vs yesterday</span>
            </div>
          )}
        </div>

        {/* Icon */}

        <div
          className={`
            w-16
            h-16
            rounded-2xl
            flex
            items-center
            justify-center
            text-3xl
            transition-transform
            duration-300
            group-hover:scale-110
            ${theme.icon}
          `}
        >
          {icon}
        </div>
      </div>

      {/* Bottom Accent */}

      <div
        className={`
          mt-6
          pt-4
          border-t
          border-[#E7EAE1]
          dark:border-[#262B24]
          flex
          items-center
          justify-between
        `}
      >
        <div className="flex items-center gap-2 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
          <FiTrendingUp className={theme.trend} />
          Live Statistics
        </div>

        <span className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">Updated now</span>
      </div>
    </div>
  );
};

export default StatCard;