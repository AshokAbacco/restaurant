// ==============================================
// src/components/layout/PageHeader.jsx
// ==============================================

import React from "react";
import { FiRefreshCw } from "react-icons/fi";
import Breadcrumb from "./Breadcrumb";

const PageHeader = ({
  title,
  subtitle = "",
  icon = null,
  action = null,
  onRefresh = null,
  showRefresh = false,
  loading = false,
}) => {
  return (
    <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm shadow-black/[0.02] dark:shadow-none p-6 mb-6 transition-colors">
      {/* Top */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        {/* Left */}

        <div className="flex items-start gap-4">
          {icon && (
            <div className="w-14 h-14 rounded-2xl bg-[#3FA34D]/10 dark:bg-[#43B75A]/10 text-[#3FA34D] dark:text-[#43B75A] flex items-center justify-center text-2xl">
              {icon}
            </div>
          )}

          <div>
            <Breadcrumb />

            <h1 className="mt-3 text-3xl font-bold text-[#1F2937] dark:text-white">{title}</h1>

            {subtitle && (
              <p className="mt-2 text-[#6B7280] dark:text-[#9CA8A0] leading-7 max-w-3xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right */}

        <div className="flex items-center gap-3 flex-wrap">
          {showRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] text-[#1F2937] dark:text-white hover:bg-[#F3F5EE] dark:hover:bg-[#1E241E] transition disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          )}

          {action}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;