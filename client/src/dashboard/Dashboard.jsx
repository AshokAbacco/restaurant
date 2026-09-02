// ==============================================
// src/dashboard/Dashboard.jsx
// ==============================================

import React, { useCallback, useEffect, useState } from "react";

import {
  FiDollarSign,
  FiShoppingCart,
  FiUsers,
  FiBox,
  FiClipboard,
  FiGrid,
} from "react-icons/fi";

import PageHeader from "../components/layout/PageHeader";
import { useAuth } from "../auth/AuthContext";

import StatCard from "./components/StatCard";
import SalesChart from "./components/SalesChart";
import KitchenStatus from "./components/KitchenStatus";
import RecentOrders from "./components/RecentOrders";
import LowStockAlert from "./components/LowStockAlert";
import PaymentSummary from "./components/PaymentSummary";
import TopSellingItems from "./components/TopSellingItems";
import RecentActivities from "./components/RecentActivities";

import dashboardService from "./dashboardService";
import { formatCurrency } from "./utils/format";

const Dashboard = () => {
  const { user, isOwner, isManager, isCashier, isKitchen, isWaiter } =
    useAuth();

  const [period, setPeriod] = useState("daily");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // LOAD DASHBOARD DATA
  // ==========================================

  const loadDashboard = useCallback(async (p) => {
    setLoading(true);
    setError("");

    const result = await dashboardService.getDashboardSummary(p);

    if (!result.success) {
      setError(result.message);
      setLoading(false);
      return;
    }

    setDashboardData(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard(period);
  }, [period, loadDashboard]);

  // ==========================================
  // ROLE-BASED VISIBILITY
  // ==========================================

  const waiterView = isWaiter();
  const showFinancials = isOwner() || isManager() || isCashier();
  const showKitchen = isOwner() || isManager() || isKitchen();
  const showInventory = isOwner() || isManager();
  const showFullOps = isOwner() || isManager();

  const stats = dashboardData?.stats;
  const waiterSummary = dashboardData?.waiterSummary;

  // ==========================================
  // ERROR STATE
  // ==========================================

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F5EE] dark:bg-[#0D110C] -m-6 p-6">
        <div className="text-center">
          <p className="text-[#EF5350] font-medium">{error}</p>

          <button
            onClick={() => loadDashboard(period)}
            className="mt-4 px-6 py-2 rounded-xl bg-[#3FA34D] hover:bg-[#358F42] text-white font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#F3F5EE] dark:bg-[#0D110C] min-h-screen -m-6 p-6 transition-colors">
      <PageHeader
        title="Restaurant Dashboard"
        subtitle={`Welcome back${
          user?.fullName ? `, ${user.fullName}` : ""
        }! Here's what's happening in your restaurant today.`}
        icon={<FiShoppingCart />}
      />

      {/* ======================================
          KPI CARDS
      ====================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {waiterView ? (
          <>
            <StatCard
              title="My Active Orders"
              value={waiterSummary?.activeOrders ?? "—"}
              icon={<FiClipboard />}
              color="green"
              subtitle="Currently in progress"
              loading={loading}
            />

            <StatCard
              title="My Orders Today"
              value={waiterSummary?.myOrdersToday ?? "—"}
              icon={<FiShoppingCart />}
              color="orange"
              subtitle="Taken today"
              loading={loading}
            />

            <StatCard
              title="My Tables Occupied"
              value={waiterSummary?.tablesOccupied ?? "—"}
              icon={<FiGrid />}
              color="purple"
              subtitle="Among tables assigned to you"
              loading={loading}
            />

            <StatCard
              title="My Assigned Tables"
              value={waiterSummary?.assignedTables ?? "—"}
              icon={<FiGrid />}
              color="blue"
              subtitle="Total tables under your section"
              loading={loading}
            />
          </>
        ) : (
          <>
            {showFinancials && (
              <StatCard
                title="Today's Revenue"
                value={stats ? formatCurrency(stats.revenue?.value) : "—"}
                icon={<FiDollarSign />}
                color="green"
                change={
                  stats?.revenue?.change !== null &&
                  stats?.revenue?.change !== undefined
                    ? `${stats.revenue.change}%`
                    : undefined
                }
                changeType={stats?.revenue?.changeType}
                subtitle="Compared to yesterday"
                loading={loading}
              />
            )}

            <StatCard
              title="Orders Today"
              value={stats?.orders?.value ?? "—"}
              icon={<FiShoppingCart />}
              color="orange"
              change={
                stats?.orders?.change !== undefined
                  ? `${stats.orders.change >= 0 ? "+" : ""}${stats.orders.change}`
                  : undefined
              }
              changeType={stats?.orders?.changeType}
              subtitle="Orders received today"
              loading={loading}
            />

            {/* <StatCard
              title="Customers"
              value={stats?.customers?.value ?? "—"}
              icon={<FiUsers />}
              color="purple"
              subtitle="Visited today"
              loading={loading}
            /> */}

            {showInventory && (
              <StatCard
                title="Low Stock Items"
                value={stats?.lowStock?.value ?? "—"}
                icon={<FiBox />}
                color="red"
                subtitle="Need immediate attention"
                loading={loading}
              />
            )}
          </>
        )}
      </div>

      {/* ======================================
          CHART + KITCHEN
      ====================================== */}

      {(showFullOps || showKitchen) && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {showFullOps && (
            <div className="xl:col-span-2">
              <SalesChart
                data={dashboardData?.salesChart || []}
                period={period}
                onPeriodChange={setPeriod}
                loading={loading}
              />
            </div>
          )}

          {showKitchen && (
            <KitchenStatus
              data={dashboardData?.kitchenStatus}
              loading={loading}
            />
          )}
        </div>
      )}

      {/* ======================================
          RECENT ORDERS
      ====================================== */}

      <RecentOrders
        orders={dashboardData?.recentOrders || []}
        loading={loading}
        title={waiterView ? "My Recent Orders" : "Recent Orders"}
      />

      {/* ======================================
          LOW STOCK + PAYMENT SUMMARY
      ====================================== */}

      {(showInventory || (showFinancials && dashboardData?.paymentSummary)) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {showInventory && (
            <LowStockAlert
              items={dashboardData?.lowStockAlerts || []}
              loading={loading}
            />
          )}

          {showFinancials && dashboardData?.paymentSummary && (
            <PaymentSummary
              data={dashboardData.paymentSummary}
              loading={loading}
            />
          )}
        </div>
      )}

      {/* ======================================
          TOP SELLING + RECENT ACTIVITIES
      ====================================== */}

      {showFullOps && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <TopSellingItems
            items={dashboardData?.topSellingItems || []}
            loading={loading}
          />

          <RecentActivities
            activities={dashboardData?.recentActivities || []}
            loading={loading}
          />
        </div>
      )}

      {/* ======================================
          DASHBOARD SUMMARY (owner / manager only)
      ====================================== */}

      {showFullOps && stats && (
        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm shadow-black/[0.02] dark:shadow-none transition-colors">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white">
                Today's Restaurant Summary
              </h2>

              <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-2">
                Overall business performance for today.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">
                  Revenue
                </p>
                <h3 className="text-2xl font-bold text-[#3FA34D] dark:text-[#43B75A] mt-2">
                  {formatCurrency(stats.revenue?.value)}
                </h3>
              </div>

              <div className="text-center">
                <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">
                  Orders
                </p>
                <h3 className="text-2xl font-bold text-[#E8873A] dark:text-[#FFA94D] mt-2">
                  {stats.orders?.value ?? 0}
                </h3>
              </div>

              {/* <div className="text-center">
                <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">
                  Customers
                </p>
                <h3 className="text-2xl font-bold text-violet-600 dark:text-violet-400 mt-2">
                  {stats.customers?.value ?? 0}
                </h3>
              </div> */}

              <div className="text-center">
                <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">
                  Avg. Order
                </p>
                <h3 className="text-2xl font-bold text-[#EF5350] mt-2">
                  {formatCurrency(stats.avgOrder)}
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
              Last Updated
            </p>
            <p className="font-semibold text-[#1F2937] dark:text-white">
              {loading ? "Refreshing..." : "Just Now"}
            </p>
          </div>

          <div className="h-10 w-px bg-[#E7EAE1] dark:bg-[#262B24]" />

          <div className="text-center">
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">Status</p>

            <div className="flex items-center gap-2 justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3FA34D] dark:bg-[#43B75A] animate-pulse"></span>
              <span className="font-semibold text-[#3FA34D] dark:text-[#43B75A]">
                Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
