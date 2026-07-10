// ==============================================
// src/dashboard/components/KitchenStatus.jsx
// ==============================================

import React from "react";
import {
  FiClock,
  FiActivity,
  FiCheckCircle,
  FiCoffee,
  FiTrendingUp,
} from "react-icons/fi";

const kitchenData = {
  waiting: 8,
  preparing: 14,
  ready: 6,
  completed: 128,
  avgTime: "18 min",
  chefs: 5,
};

const progress = [
  {
    label: "Waiting",
    value: kitchenData.waiting,
    color: "bg-[#FFA94D]",
    text: "text-[#E8873A] dark:text-[#FFA94D]",
  },
  {
    label: "Preparing",
    value: kitchenData.preparing,
    color: "bg-[#3FA34D] dark:bg-[#43B75A]",
    text: "text-[#3FA34D] dark:text-[#43B75A]",
  },
  {
    label: "Ready",
    value: kitchenData.ready,
    color: "bg-emerald-500 dark:bg-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
  },
];

const KitchenStatus = () => {
  const totalActive =
    kitchenData.waiting + kitchenData.preparing + kitchenData.ready;

  return (
    <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm shadow-black/[0.02] dark:shadow-none transition-colors">
      {/* Header */}

      <div className="flex items-center justify-between p-6 border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div>
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white">Kitchen Status</h2>

          <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-1">Live kitchen activity</p>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-[#3FA34D]/10 dark:bg-[#43B75A]/10 text-[#3FA34D] dark:text-[#43B75A] flex items-center justify-center">
          <FiCoffee size={28} />
        </div>
      </div>

      {/* Main Stats */}

      <div className="grid grid-cols-2 gap-4 p-6">
        <div className="rounded-xl bg-[#FFA94D]/10 p-4">
          <p className="text-sm text-[#E8873A] dark:text-[#FFA94D]">Waiting</p>

          <h3 className="text-3xl font-bold mt-2 text-[#1F2937] dark:text-white">{kitchenData.waiting}</h3>
        </div>

        <div className="rounded-xl bg-[#3FA34D]/10 dark:bg-[#43B75A]/10 p-4">
          <p className="text-sm text-[#3FA34D] dark:text-[#43B75A]">Preparing</p>

          <h3 className="text-3xl font-bold mt-2 text-[#1F2937] dark:text-white">{kitchenData.preparing}</h3>
        </div>

        <div className="rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 p-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Ready</p>

          <h3 className="text-3xl font-bold mt-2 text-[#1F2937] dark:text-white">{kitchenData.ready}</h3>
        </div>

        <div className="rounded-xl bg-[#F3F5EE] dark:bg-[#232A22] p-4">
          <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">Completed</p>

          <h3 className="text-3xl font-bold mt-2 text-[#1F2937] dark:text-white">{kitchenData.completed}</h3>
        </div>
      </div>

      {/* Progress */}

      <div className="px-6 pb-6">
        <h4 className="font-semibold text-[#1F2937] dark:text-white mb-4">
          Active Kitchen Load
        </h4>

        {progress.map((item) => {
          const percentage =
            totalActive === 0 ? 0 : (item.value / totalActive) * 100;

          return (
            <div key={item.label} className="mb-5">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-[#6B7280] dark:text-[#9CA8A0]">
                  {item.label}
                </span>

                <span className={`text-sm font-semibold ${item.text}`}>
                  {item.value}
                </span>
              </div>

              <div className="h-3 rounded-full bg-[#F3F5EE] dark:bg-[#232A22] overflow-hidden">
                <div
                  className={`${item.color} h-full rounded-full transition-all duration-500`}
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Statistics */}

      <div className="border-t border-[#E7EAE1] dark:border-[#262B24] p-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <FiClock className="mx-auto text-[#3FA34D] dark:text-[#43B75A] text-xl mb-2" />

            <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">Avg Time</p>

            <h4 className="font-bold text-lg mt-1 text-[#1F2937] dark:text-white">{kitchenData.avgTime}</h4>
          </div>

          <div className="text-center">
            <FiActivity className="mx-auto text-[#1F2937] dark:text-white text-xl mb-2" />

            <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">Active Orders</p>

            <h4 className="font-bold text-lg mt-1 text-[#1F2937] dark:text-white">{totalActive}</h4>
          </div>

          <div className="text-center">
            <FiTrendingUp className="mx-auto text-[#3FA34D] dark:text-[#43B75A] text-xl mb-2" />

            <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">Chefs</p>

            <h4 className="font-bold text-lg mt-1 text-[#1F2937] dark:text-white">{kitchenData.chefs}</h4>
          </div>
        </div>
      </div>

      {/* Footer */}

      <div className="border-t border-[#E7EAE1] dark:border-[#262B24] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
          <FiCheckCircle className="text-[#3FA34D] dark:text-[#43B75A]" />
          Kitchen operating normally
        </div>

        <span className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">Updated just now</span>
      </div>
    </div>
  );
};

export default KitchenStatus;