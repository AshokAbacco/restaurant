// ==============================================
// src/dashboard/Dashboard.jsx
// ==============================================

import React from "react";

import {
  FiDollarSign,
  FiShoppingCart,
  FiUsers,
  FiBox,
} from "react-icons/fi";

import PageHeader from "../components/layout/PageHeader";

import StatCard from "./components/StatCard";
import SalesChart from "./components/SalesChart";
import KitchenStatus from "./components/KitchenStatus";
import RecentOrders from "./components/RecentOrders";
import LowStockAlert from "./components/LowStockAlert";
import PaymentSummary from "./components/PaymentSummary";
import TopSellingItems from "./components/TopSellingItems";
import RecentActivities from "./components/RecentActivities";

const Dashboard = () => {
  return (
    <div className="space-y-6 bg-[#F3F5EE] dark:bg-[#0D110C] min-h-screen -m-6 p-6 transition-colors">
      <PageHeader
        title="Restaurant Dashboard"
        subtitle="Welcome back! Here's what's happening in your restaurant today."
        icon={<FiShoppingCart />}
      />

      {/* ======================================
          KPI CARDS
      ====================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Today's Revenue"
          value="₹24,560"
          icon={<FiDollarSign />}
          color="green"
          change="+12.4%"
          changeType="up"
          subtitle="Compared to yesterday"
        />

        <StatCard
          title="Orders Today"
          value="148"
          icon={<FiShoppingCart />}
          color="orange"
          change="+18"
          changeType="up"
          subtitle="Orders received today"
        />

        <StatCard
          title="Customers"
          value="96"
          icon={<FiUsers />}
          color="purple"
          change="+9%"
          changeType="up"
          subtitle="Visited today"
        />

        <StatCard
          title="Low Stock Items"
          value="12"
          icon={<FiBox />}
          color="red"
          change="-3"
          changeType="down"
          subtitle="Need immediate attention"
        />
      </div>

      {/* ======================================
          CHART + KITCHEN
      ====================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SalesChart />
        </div>

        <KitchenStatus />
      </div>
      {/* ======================================
          RECENT ORDERS
      ====================================== */}

      <RecentOrders />

      {/* ======================================
          LOW STOCK + PAYMENT SUMMARY
      ====================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <LowStockAlert />

        <PaymentSummary />
      </div>

      {/* ======================================
          TOP SELLING + RECENT ACTIVITIES
      ====================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TopSellingItems />

        <RecentActivities />
      </div>
      {/* ======================================
          DASHBOARD SUMMARY
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm shadow-black/[0.02] dark:shadow-none transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-6">
          {/* Left */}

          <div>
            <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white">
              Today's Restaurant Summary
            </h2>

            <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-2">
              Overall business performance for today.
            </p>
          </div>

          {/* Right */}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">Revenue</p>

              <h3 className="text-2xl font-bold text-[#3FA34D] dark:text-[#43B75A] mt-2">
                ₹24,560
              </h3>
            </div>

            <div className="text-center">
              <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">Orders</p>

              <h3 className="text-2xl font-bold text-[#E8873A] dark:text-[#FFA94D] mt-2">148</h3>
            </div>

            <div className="text-center">
              <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">Customers</p>

              <h3 className="text-2xl font-bold text-violet-600 dark:text-violet-400 mt-2">96</h3>
            </div>

            <div className="text-center">
              <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">Avg. Order</p>

              <h3 className="text-2xl font-bold text-[#EF5350] mt-2">₹825</h3>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================
          FOOTER
      ====================================== */}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-[#171C17] border border-[#E7EAE1] dark:border-[#262B24] rounded-2xl px-6 py-5 transition-colors">
        <div>
          <h4 className="font-semibold text-[#1F2937] dark:text-white">
            Restaurant ERP Dashboard
          </h4>

          <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] mt-1">
            Live dashboard connected to your restaurant operations.
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">Last Updated</p>

            <p className="font-semibold text-[#1F2937] dark:text-white">Just Now</p>
          </div>

          <div className="h-10 w-px bg-[#E7EAE1] dark:bg-[#262B24]" />

          <div className="text-center">
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">Status</p>

            <div className="flex items-center gap-2 justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3FA34D] dark:bg-[#43B75A] animate-pulse"></span>

              <span className="font-semibold text-[#3FA34D] dark:text-[#43B75A]">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;