// ==============================================
// src/dashboard/components/LowStockAlert.jsx
// ==============================================

import React from "react";
import {
  FiAlertTriangle,
  FiBox,
  FiArrowRight,
  FiTrendingDown,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
const statusStyles = {
  Critical: {
    badge: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    progress: "bg-red-500",
  },
  Low: {
    badge:
      "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
    progress: "bg-orange-500",
  },
};

const LowStockAlert = ({ items = [], loading = false }) => {
  const criticalItems = items.filter(
    (item) => item.status === "Critical",
  ).length;

  const navigate = useNavigate();
  return (
    <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm shadow-black/[0.02] dark:shadow-none transition-colors">
      {/* Header */}

      <div className="flex items-center justify-between p-6 border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div>
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white">
            Low Stock Alerts
          </h2>
          <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-1">
            Ingredients requiring restocking
          </p>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center text-red-600 dark:text-red-400">
          <FiAlertTriangle size={28} />
        </div>
      </div>

      {/* Summary */}

      <div className="grid grid-cols-2 gap-4 p-6 border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 p-4">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">
            Critical
          </p>
          <h3 className="text-3xl font-bold mt-2 text-[#1F2937] dark:text-white">
            {loading ? "—" : criticalItems}
          </h3>
        </div>

        <div className="rounded-xl bg-orange-50 dark:bg-orange-500/10 p-4">
          <p className="text-orange-600 dark:text-orange-400 text-sm font-medium">
            Total Low Stock
          </p>
          <h3 className="text-3xl font-bold mt-2 text-[#1F2937] dark:text-white">
            {loading ? "—" : items.length}
          </h3>
        </div>
      </div>

      {/* Item List */}

      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="p-10 text-center text-[#9CA3AF] dark:text-[#6B7280]">
            Loading inventory...
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-[#9CA3AF] dark:text-[#6B7280]">
            All ingredients are above their minimum stock level. 🎉
          </div>
        ) : (
          items.map((item) => {
            const style = statusStyles[item.status] || statusStyles.Low;

            return (
              <div
                key={item.id}
                className="p-5 border-b border-[#E7EAE1] dark:border-[#262B24] hover:bg-[#F3F5EE] dark:hover:bg-[#232A22] transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <FiBox className="text-[#6B7280] dark:text-[#9CA8A0]" />
                      <h4 className="font-semibold text-[#1F2937] dark:text-white">
                        {item.name}
                      </h4>
                    </div>

                    <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] mt-1">
                      {item.category}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${style.badge}`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="mt-4 flex justify-between text-sm">
                  <span className="text-[#6B7280] dark:text-[#9CA8A0]">
                    Available
                  </span>
                  <span className="font-semibold text-[#1F2937] dark:text-white">
                    {item.available}
                  </span>
                </div>

                <div className="flex justify-between text-sm mt-2">
                  <span className="text-[#6B7280] dark:text-[#9CA8A0]">
                    Minimum Required
                  </span>
                  <span className="font-semibold text-[#1F2937] dark:text-white">
                    {item.minimum}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-[#6B7280] dark:text-[#9CA8A0]">
                      Stock Level
                    </span>
                    <span className="font-semibold text-[#1F2937] dark:text-white">
                      {item.percentage}%
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-[#F3F5EE] dark:bg-[#232A22] overflow-hidden">
                    <div
                      className={`h-full ${style.progress}`}
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}

      <div className="flex items-center justify-between px-6 py-4 border-t border-[#E7EAE1] dark:border-[#262B24]">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
          <FiTrendingDown />
          Restock Required
        </div>

        <button
         onClick={() => navigate("/inventory")}
         className="flex items-center gap-2 text-blue-600 hover:cursor-pointer dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition">
          Manage Inventory
          <FiArrowRight />
        </button>
      </div>
    </div>
  );
};

export default LowStockAlert;