// ==============================================
// src/dashboard/components/RecentOrders.jsx
// ==============================================

import React from "react";
import { FiEye, FiClock, FiCheckCircle } from "react-icons/fi";
import { formatTimeAgo, humanizeEnum } from "../utils/format";
import { useNavigate } from "react-router-dom";
// Keys match the OrderStatus / PaymentStatus enums from schema.prisma
const statusStyle = {
  NEW: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  ACCEPTED: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  PREPARING: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  READY: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  SERVED: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  OUT_FOR_DELIVERY:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
  COMPLETED: "bg-gray-100 text-gray-700 dark:bg-[#232A22] dark:text-[#9CA8A0]",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  REFUNDED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  ON_HOLD:
    "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
};

const paymentStyle = {
  PAID: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  PARTIAL:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  UNPAID: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

const RecentOrders = ({
  orders = [],
  loading = false,
  title = "Recent Orders",
}) => {
  const navigate = useNavigate();
  return (
    <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm shadow-black/[0.02] dark:shadow-none transition-colors">
      {/* Header */}

      <div className="flex items-center justify-between p-6 border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div>
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white">
            {title}
          </h2>
          <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-1">
            Latest restaurant orders
          </p>
        </div>

        <button 
         onClick={() => navigate("/pos/orders")}
         className="text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 transition hover:cursor-pointer">
          View All
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-[#9CA3AF] dark:text-[#6B7280]">
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="p-10 text-center text-[#9CA3AF] dark:text-[#6B7280]">
          No orders yet.
        </div>
      ) : (
        <>
          {/* Desktop Table */}

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F3F5EE] dark:bg-[#232A22]">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[#6B7280] dark:text-[#9CA8A0]">
                    Order
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[#6B7280] dark:text-[#9CA8A0]">
                    Customer
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[#6B7280] dark:text-[#9CA8A0]">
                    Table
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[#6B7280] dark:text-[#9CA8A0]">
                    Items
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[#6B7280] dark:text-[#9CA8A0]">
                    Amount
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[#6B7280] dark:text-[#9CA8A0]">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[#6B7280] dark:text-[#9CA8A0]">
                    Payment
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[#6B7280] dark:text-[#9CA8A0]">
                    Time
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-[#6B7280] dark:text-[#9CA8A0]">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-[#E7EAE1] dark:border-[#262B24] hover:bg-[#F3F5EE] dark:hover:bg-[#232A22] transition"
                  >
                    <td className="px-6 py-5 font-semibold text-blue-600 dark:text-blue-400">
                      {order.id}
                    </td>
                    <td className="px-6 py-5 text-[#1F2937] dark:text-white">
                      {order.customer}
                    </td>
                    <td className="px-6 py-5 text-[#1F2937] dark:text-white">
                      {order.table}
                    </td>
                    <td className="px-6 py-5 text-[#1F2937] dark:text-white">
                      {order.items}
                    </td>
                    <td className="px-6 py-5 font-semibold text-[#1F2937] dark:text-white">
                      ₹{order.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          statusStyle[order.status] ||
                          "bg-gray-100 text-gray-700 dark:bg-[#232A22] dark:text-[#9CA8A0]"
                        }`}
                      >
                        {humanizeEnum(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          paymentStyle[order.payment] ||
                          "bg-gray-100 text-gray-700 dark:bg-[#232A22] dark:text-[#9CA8A0]"
                        }`}
                      >
                        {humanizeEnum(order.payment)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-[#6B7280] dark:text-[#9CA8A0]">
                      {formatTimeAgo(order.time)}
                    </td>
                    <td className="px-6 py-5 text-center">
                     <button
                      onClick={() => navigate("/pos/orders")}
                      className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto transition hover:cursor-pointer"
                    >
                      <FiEye />
                    </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}

          <div className="lg:hidden p-4 space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-4"
              >
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-600 dark:text-blue-400">
                      {order.id}
                    </h3>
                    <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-1">
                      {order.customer}
                    </p>
                  </div>

                  <button className="text-blue-600 dark:text-blue-400">
                    <FiEye size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <span className="text-[#6B7280] dark:text-[#9CA8A0]">
                      Table
                    </span>
                    <p className="text-[#1F2937] dark:text-white">
                      {order.table}
                    </p>
                  </div>

                  <div>
                    <span className="text-[#6B7280] dark:text-[#9CA8A0]">
                      Items
                    </span>
                    <p className="text-[#1F2937] dark:text-white">
                      {order.items}
                    </p>
                  </div>

                  <div>
                    <span className="text-[#6B7280] dark:text-[#9CA8A0]">
                      Amount
                    </span>
                    <p className="text-[#1F2937] dark:text-white">
                      ₹{order.amount.toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div>
                    <span className="text-[#6B7280] dark:text-[#9CA8A0]">
                      Time
                    </span>
                    <p className="text-[#1F2937] dark:text-white">
                      {formatTimeAgo(order.time)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      statusStyle[order.status] ||
                      "bg-gray-100 text-gray-700 dark:bg-[#232A22] dark:text-[#9CA8A0]"
                    }`}
                  >
                    {humanizeEnum(order.status)}
                  </span>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      paymentStyle[order.payment] ||
                      "bg-gray-100 text-gray-700 dark:bg-[#232A22] dark:text-[#9CA8A0]"
                    }`}
                  >
                    {humanizeEnum(order.payment)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Footer */}

      <div className="border-t border-[#E7EAE1] dark:border-[#262B24] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#6B7280] dark:text-[#9CA8A0] text-sm">
          <FiClock />
          Updated just now
        </div>

        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
          <FiCheckCircle />
          Live Order Tracking
        </div>
      </div>
    </div>
  );
};

export default RecentOrders;