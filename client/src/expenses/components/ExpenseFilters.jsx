// ==============================================
// src/expenses/components/ExpenseFilters.jsx
// ==============================================

import { useState } from "react";
import { FiSearch, FiFilter, FiX } from "react-icons/fi";

const STATUS_LABELS = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Waiting for Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

const PAYMENT_LABELS = {
  UNPAID: "Unpaid",
  PARTIAL: "Partial",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

const ExpenseFilters = ({
  search,
  setSearch,
  status,
  setStatus,
  paymentStatus,
  setPaymentStatus,
  category,
  setCategory,
  categories = [],
  onRefresh,
}) => {
  const [open, setOpen] = useState(false);

  const activeCount = [status, paymentStatus, category].filter(Boolean).length;

  const clearAll = () => {
    setStatus("");
    setPaymentStatus("");
    setCategory("");
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, expense number, or invoice"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 outline-none bg-white"
          />
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl border font-medium ${
            open || activeCount
              ? "border-blue-600 text-blue-700 bg-blue-50"
              : "border-gray-300 text-gray-600 bg-white"
          }`}
        >
          <FiFilter />
          Filters
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        <button
          onClick={onRefresh}
          className="px-5 py-3 rounded-xl border border-gray-300 text-gray-600 bg-white font-medium hover:border-blue-200 hover:text-blue-600"
        >
          Refresh
        </button>
      </div>

      {open && (
        <div className="mt-3 bg-white rounded-2xl border border-gray-200 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-blue-600 bg-white text-sm"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-blue-600 bg-white text-sm"
            >
              <option value="">Any status</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Payment
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-blue-600 bg-white text-sm"
            >
              <option value="">Any payment status</option>
              {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="col-span-full flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 justify-self-start"
            >
              <FiX /> Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpenseFilters;