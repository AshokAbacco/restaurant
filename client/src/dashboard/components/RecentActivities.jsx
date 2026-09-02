// ==============================================
// src/dashboard/components/RecentActivities.jsx
// ==============================================

import React from "react";
import {
  FiShoppingCart,
  FiDollarSign,
  FiUserPlus,
  FiBox,
  FiCoffee,
  FiCheckCircle,
  FiActivity,
  FiArrowRight,
} from "react-icons/fi";
import { formatTimeAgo } from "../utils/format";

// Picks an icon/color based on keywords in the activity title, since the
// backend ActivityLog only stores a free-text `action` string.
const getActivityVisual = (title = "") => {
  const t = title.toLowerCase();

  if (t.includes("order"))
    return {
      icon: <FiShoppingCart />,
      bg: "bg-blue-100 dark:bg-blue-500/15",
      color: "text-blue-600 dark:text-blue-400",
    };
  if (t.includes("payment"))
    return {
      icon: <FiDollarSign />,
      bg: "bg-green-100 dark:bg-green-500/15",
      color: "text-green-600 dark:text-green-400",
    };
  if (t.includes("customer"))
    return {
      icon: <FiUserPlus />,
      bg: "bg-purple-100 dark:bg-purple-500/15",
      color: "text-purple-600 dark:text-purple-400",
    };
  if (t.includes("stock") || t.includes("inventory"))
    return {
      icon: <FiBox />,
      bg: "bg-red-100 dark:bg-red-500/15",
      color: "text-red-600 dark:text-red-400",
    };
  if (t.includes("kitchen"))
    return {
      icon: <FiCoffee />,
      bg: "bg-orange-100 dark:bg-orange-500/15",
      color: "text-orange-600 dark:text-orange-400",
    };
  if (t.includes("complete"))
    return {
      icon: <FiCheckCircle />,
      bg: "bg-emerald-100 dark:bg-emerald-500/15",
      color: "text-emerald-600 dark:text-emerald-400",
    };

  return {
    icon: <FiActivity />,
    bg: "bg-[#F3F5EE] dark:bg-[#232A22]",
    color: "text-[#6B7280] dark:text-[#9CA8A0]",
  };
};

const RecentActivities = ({ activities = [], loading = false }) => {
  return (
    <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm shadow-black/[0.02] dark:shadow-none transition-colors">
      {/* Header */}

      <div className="flex items-center justify-between p-6 border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div>
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white">
            Recent Activities
          </h2>
          <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-1">
            Latest restaurant activities
          </p>
        </div>

        
      </div>

      {/* Timeline */}

      <div className="max-h-[560px] overflow-y-auto p-6">
        {loading ? (
          <div className="text-center text-[#9CA3AF] dark:text-[#6B7280] py-10">
            Loading activities...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center text-[#9CA3AF] dark:text-[#6B7280] py-10">
            No recent activity.
          </div>
        ) : (
          activities.map((activity, index) => {
            const visual = getActivityVisual(activity.title);

            return (
              <div
                key={activity.id}
                className="relative flex gap-4 pb-8 last:pb-0"
              >
                {index !== activities.length - 1 && (
                  <div className="absolute left-6 top-14 w-0.5 h-full bg-[#E7EAE1] dark:bg-[#262B24]"></div>
                )}

                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${visual.bg} ${visual.color} flex-shrink-0 z-10`}
                >
                  {visual.icon}
                </div>

                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <h3 className="font-semibold text-[#1F2937] dark:text-white">
                      {activity.title}
                    </h3>
                    <span className="text-xs text-[#9CA3AF] dark:text-[#6B7280] whitespace-nowrap">
                      {formatTimeAgo(activity.time)}
                    </span>
                  </div>

                  {activity.description && (
                    <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] mt-2 leading-6">
                      {activity.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}

      <div className="border-t border-[#E7EAE1] dark:border-[#262B24] px-6 py-4 flex items-center justify-between">
        <div className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
          Showing latest {activities.length} activities
        </div>

        <button className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition">
          Activity Log
          {/* <FiArrowRight /> */}
        </button>
      </div>
    </div>
  );
};

export default RecentActivities;