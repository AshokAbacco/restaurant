// ==============================================
// src/expenses/components/ExpenseTable.jsx
// ==============================================

import { Link } from "react-router-dom";
import { FiEdit2, FiTrash2, FiInbox } from "react-icons/fi";

const STATUS_STYLES = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  PAID: "bg-green-100 text-green-700",
};

const STATUS_LABELS = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Waiting for Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

const PAYMENT_STYLES = {
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
  UNPAID: "bg-gray-100 text-gray-600",
};

const Badge = ({ styles, label }) => (
  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${styles}`}>
    {label}
  </span>
);

const formatMoney = (value = 0) =>
  `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const ExpenseTable = ({ expenses = [], loading = false, onDelete }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
        <FiInbox className="mx-auto text-4xl text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">No expenses found</p>
        <p className="text-gray-400 text-sm mt-1">
          Try a different search, or add a new expense to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Desktop */}
      <table className="w-full hidden md:table">
        <thead>
          <tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b border-gray-100">
            <th className="px-6 py-4">Expense</th>
            <th className="px-6 py-4">Category</th>
            <th className="px-6 py-4">Store</th>
            <th className="px-6 py-4">Date</th>
            <th className="px-6 py-4">Amount</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Payment</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
              <td className="px-6 py-4">
                <Link to={`/expenses/${expense.id}`} className="font-semibold text-gray-800 hover:text-blue-600">
                  {expense.title}
                </Link>
                <p className="text-xs text-gray-400">{expense.expenseNumber}</p>
              </td>
              <td className="px-6 py-4 text-gray-600">{expense.category?.name || "—"}</td>
              <td className="px-6 py-4 text-gray-600">{expense.store}</td>
              <td className="px-6 py-4 text-gray-600">
                {new Date(expense.expenseDate).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 font-semibold text-gray-800">
                {formatMoney(expense.totalPaid)}
              </td>
              <td className="px-6 py-4">
                <Badge styles={STATUS_STYLES[expense.status]} label={STATUS_LABELS[expense.status] || expense.status} />
              </td>
              <td className="px-6 py-4">
                <Badge styles={PAYMENT_STYLES[expense.paymentStatus]} label={expense.paymentStatus} />
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3 justify-end">
                  <Link to={`/expenses/edit/${expense.id}`} className="text-gray-400 hover:text-blue-600" title="Edit">
                    <FiEdit2 />
                  </Link>
                  <button onClick={() => onDelete(expense.id, expense.title)} className="text-gray-400 hover:text-red-600" title="Delete">
                    <FiTrash2 />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-gray-50">
        {expenses.map((expense) => (
          <div key={expense.id} className="p-5">
            <Link to={`/expenses/${expense.id}`} className="flex justify-between items-start gap-3">
              <div>
                <p className="font-semibold text-gray-800">{expense.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {expense.category?.name} · {expense.store} · {new Date(expense.expenseDate).toLocaleDateString()}
                </p>
              </div>
              <p className="font-bold text-gray-800 whitespace-nowrap">
                {formatMoney(expense.totalPaid)}
              </p>
            </Link>
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-2">
                <Badge styles={STATUS_STYLES[expense.status]} label={STATUS_LABELS[expense.status] || expense.status} />
                <Badge styles={PAYMENT_STYLES[expense.paymentStatus]} label={expense.paymentStatus} />
              </div>
              <div className="flex items-center gap-3">
                <Link to={`/expenses/edit/${expense.id}`} className="text-gray-400"><FiEdit2 /></Link>
                <button onClick={() => onDelete(expense.id, expense.title)} className="text-gray-400"><FiTrash2 /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpenseTable;