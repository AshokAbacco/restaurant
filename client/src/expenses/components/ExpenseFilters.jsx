// client/src/expenses/components/ExpenseFilters.jsx
import { useState } from "react";
import { FiSearch, FiFilter, FiX } from "react-icons/fi";
import { ui, STATUS_LABELS } from "../expenseTheme";

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
          <FiSearch className={`absolute left-4 top-3.5 ${ui.faint}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, expense number, or invoice"
            className={`${ui.input} pl-11 py-3`}
          />
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl border font-medium transition-colors ${
            open || activeCount
              ? "border-[#3FA34D] dark:border-[#43B75A] text-[#3FA34D] dark:text-[#43B75A] bg-[#3FA34D]/10 dark:bg-[#43B75A]/15"
              : "border-[#E7EAE1] dark:border-[#262B24] text-[#6B7280] dark:text-[#9CA8A0] bg-white dark:bg-[#171C17]"
          }`}
        >
          <FiFilter />
          Filters
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#3FA34D] dark:bg-[#43B75A] text-white text-xs flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        <button onClick={onRefresh} className={ui.btnSecondary}>
          Refresh
        </button>
      </div>

      {open && (
        <div className={`${ui.card} mt-3 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4`}>
          <div>
            <label className={ui.labelSm}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${ui.input} text-sm`}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={ui.labelSm}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${ui.input} text-sm`}>
              <option value="">Any status</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={ui.labelSm}>Payment</label>
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={`${ui.input} text-sm`}>
              <option value="">Any payment status</option>
              {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className={`col-span-full flex items-center gap-1.5 text-sm ${ui.muted} hover:opacity-80 justify-self-start`}
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
