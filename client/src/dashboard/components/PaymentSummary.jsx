// ==============================================
// src/dashboard/components/PaymentSummary.jsx
// ==============================================

import React from "react";
import {
  FiCreditCard,
  FiDollarSign,
  FiSmartphone,
  FiPieChart,
  FiTrendingUp,
  FiArrowRight,
  FiRepeat,
  FiFileText,
} from "react-icons/fi";
import { humanizeEnum } from "../utils/format";
import { useNavigate } from "react-router-dom";
// Visual styling keyed by the PaymentMethod enum from schema.prisma
const methodStyles = {
  CASH: {
    color: "bg-green-500",
    icon: <FiDollarSign />,
    bg: "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400",
  },
  UPI: {
    color: "bg-blue-500",
    icon: <FiSmartphone />,
    bg: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  },
  CARD: {
    color: "bg-purple-500",
    icon: <FiCreditCard />,
    bg: "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  },
  BANK_TRANSFER: {
    color: "bg-indigo-500",
    icon: <FiRepeat />,
    bg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
  },
  CHEQUE: {
    color: "bg-yellow-500",
    icon: <FiFileText />,
    bg: "bg-yellow-100 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-400",
  },
  OTHER: {
    color: "bg-gray-500",
    icon: <FiDollarSign />,
    bg: "bg-gray-100 text-gray-600 dark:bg-[#232A22] dark:text-[#9CA8A0]",
  },
};

const PaymentSummary = ({ data, loading = false }) => {
  const { totalAmount = 0, totalTransactions = 0, methods = [] } = data || {};
  const navigate = useNavigate();
  return (
    <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm shadow-black/[0.02] dark:shadow-none transition-colors">
      {/* Header */}

      <div className="flex items-center justify-between p-6 border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div>
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white">
            Payment Summary
          </h2>
          <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-1">
            Today's payment collection
          </p>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <FiPieChart size={28} />
        </div>
      </div>

      {/* Total */}

      <div className="p-6 border-b border-[#E7EAE1] dark:border-[#262B24]">
        <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">
          Total Collection
        </p>
        <h2 className="text-4xl font-bold text-[#1F2937] dark:text-white mt-2">
          {loading ? "—" : `₹${totalAmount.toLocaleString("en-IN")}`}
        </h2>
      </div>

      {/* Payment Methods */}

      <div className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
        {loading ? (
          <div className="p-10 text-center text-[#9CA3AF] dark:text-[#6B7280]">
            Loading payments...
          </div>
        ) : methods.length === 0 ? (
          <div className="p-10 text-center text-[#9CA3AF] dark:text-[#6B7280]">
            No payments recorded today.
          </div>
        ) : (
          methods.map((item) => {
            const style = methodStyles[item.name] || methodStyles.OTHER;

            return (
              <div
                key={item.name}
                className="p-5 hover:bg-[#F3F5EE] dark:hover:bg-[#232A22] transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${style.bg}`}
                    >
                      {style.icon}
                    </div>

                    <div>
                      <h4 className="font-semibold text-[#1F2937] dark:text-white">
                        {humanizeEnum(item.name)}
                      </h4>
                      <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] mt-1">
                        {item.transactions} Transactions
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <h3 className="font-bold text-lg text-[#1F2937] dark:text-white">
                      ₹{item.amount.toLocaleString("en-IN")}
                    </h3>
                    <span className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="h-2 bg-[#F3F5EE] dark:bg-[#232A22] rounded-full overflow-hidden">
                    <div
                      className={`${style.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Summary */}

      <div className="grid grid-cols-2 border-t border-[#E7EAE1] dark:border-[#262B24]">
        <div className="text-center py-5">
          <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
            Transactions
          </p>
          <h3 className="text-3xl font-bold mt-2 text-[#1F2937] dark:text-white">
            {loading ? "—" : totalTransactions}
          </h3>
        </div>

        <div className="text-center py-5 border-l border-[#E7EAE1] dark:border-[#262B24]">
          <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
            Avg Transaction
          </p>
          <h3 className="text-3xl font-bold mt-2 text-[#1F2937] dark:text-white">
            {loading || totalTransactions === 0
              ? "—"
              : `₹${Math.round(totalAmount / totalTransactions).toLocaleString("en-IN")}`}
          </h3>
        </div>
      </div>

      {/* Footer */}

      <div className="flex items-center justify-between border-t border-[#E7EAE1] dark:border-[#262B24] px-6 py-4">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium text-sm">
          <FiTrendingUp />
          Live Collection
        </div>

        <button
         onClick={() => navigate("/payments")}
         className="flex items-center gap-2 hover:cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition font-medium">
          Payment Report
          <FiArrowRight />
        </button>
      </div>
    </div>
  );
};

export default PaymentSummary;