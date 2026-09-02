// ==============================================
// src/dashboard/components/TopSellingItems.jsx
// ==============================================

import React from "react";
import { FiTrendingUp, FiShoppingBag, FiArrowRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
const badgeColors = [
  "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
  "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400",
  "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
];

const TopSellingItems = ({ items = [], loading = false }) => {
  const totalSold = items.reduce((sum, item) => sum + item.sold, 0);
  const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);

  const navigate = useNavigate();
  return (
    <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm shadow-black/[0.02] dark:shadow-none transition-colors">
      {/* Header */}

      <div className="flex items-center justify-between p-6 border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div>
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white">
            Top Selling Items
          </h2>
          <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-1">
            Best performing menu items today
          </p>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-500/15 flex items-center justify-center text-green-600 dark:text-green-400">
          <FiTrendingUp size={28} />
        </div>
      </div>

      {/* List */}

      <div className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
        {loading ? (
          <div className="p-10 text-center text-[#9CA3AF] dark:text-[#6B7280]">
            Loading top items...
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-[#9CA3AF] dark:text-[#6B7280]">
            No items sold yet today.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className="p-5 hover:bg-[#F3F5EE] dark:hover:bg-[#232A22] transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold ${
                        badgeColors[index % badgeColors.length]
                      }`}
                    >
                      <FiShoppingBag />
                    </div>

                    <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-[#1F2937] dark:text-white">
                      {item.name}
                    </h3>
                    <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] mt-1">
                      {item.category}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <h4 className="text-xl font-bold text-[#1F2937] dark:text-white">
                    ₹{item.revenue.toLocaleString("en-IN")}
                  </h4>
                  <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] mt-1">
                    {item.sold} Sold
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}

      <div className="grid grid-cols-2 border-t border-[#E7EAE1] dark:border-[#262B24]">
        <div className="text-center py-5">
          <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
            Total Sold
          </p>
          <h3 className="text-2xl font-bold mt-2 text-[#1F2937] dark:text-white">
            {loading ? "—" : totalSold}
          </h3>
        </div>

        <div className="text-center py-5 border-l border-[#E7EAE1] dark:border-[#262B24]">
          <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
            Revenue
          </p>
          <h3 className="text-2xl font-bold mt-2 text-[#1F2937] dark:text-white">
            {loading ? "—" : `₹${totalRevenue.toLocaleString("en-IN")}`}
          </h3>
        </div>
      </div>

      {/* Footer */}

      <div className="flex items-center justify-between px-6 py-4 border-t border-[#E7EAE1] dark:border-[#262B24]">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium text-sm">
          <FiTrendingUp />
          Sales Increasing
        </div>

        <button 
        onClick={() => navigate("/menu")}
        className="flex items-center gap-2 text-blue-600 hover:cursor-pointer dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition">
          View Menu Analytics
          <FiArrowRight />
        </button>
      </div>
    </div>
  );
};

export default TopSellingItems;