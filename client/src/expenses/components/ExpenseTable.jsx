// client/src/expenses/components/ExpenseTable.jsx
import { Link } from "react-router-dom";
import { FiEdit2, FiTrash2, FiInbox } from "react-icons/fi";
import { ui, STATUS_STYLES, STATUS_LABELS, PAYMENT_STYLES, formatMoney } from "../expenseTheme";
import { Badge, SkeletonRows, EmptyState } from "../ExpenseUI";

const ExpenseTable = ({ expenses = [], loading = false, onDelete }) => {
  if (loading) {
    return <SkeletonRows count={5} />;
  }

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={<FiInbox className="mx-auto" />}
        title="No expenses found"
        subtitle="Try a different search, or add a new expense to get started."
      />
    );
  }

  return (
    <div className={`${ui.card} overflow-hidden`}>
      {/* Desktop */}
      <table className="w-full hidden md:table">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase border-b border-[#E7EAE1] dark:border-[#262B24] bg-[#F3F5EE] dark:bg-[#1A1F19] text-[#6B7280] dark:text-[#9CA8A0]">
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
            <tr
              key={expense.id}
              className="border-b border-[#E7EAE1] dark:border-[#262B24] last:border-0 hover:bg-[#F3F5EE]/60 dark:hover:bg-[#1E241C] transition-colors"
            >
              <td className="px-6 py-4">
                <Link to={`/expenses/${expense.id}`} className={`font-semibold ${ui.heading} hover:text-[#3FA34D] dark:hover:text-[#43B75A]`}>
                  {expense.title}
                </Link>
                <p className={`text-xs ${ui.faint}`}>{expense.expenseNumber}</p>
              </td>
              <td className={`px-6 py-4 ${ui.muted}`}>{expense.category?.name || "—"}</td>
              <td className={`px-6 py-4 ${ui.muted}`}>{expense.store}</td>
              <td className={`px-6 py-4 ${ui.muted}`}>{new Date(expense.expenseDate).toLocaleDateString()}</td>
              <td className={`px-6 py-4 font-semibold ${ui.heading}`}>{formatMoney(expense.totalPaid)}</td>
              <td className="px-6 py-4">
                <Badge styles={STATUS_STYLES[expense.status]} label={STATUS_LABELS[expense.status] || expense.status} />
              </td>
              <td className="px-6 py-4">
                <Badge styles={PAYMENT_STYLES[expense.paymentStatus]} label={expense.paymentStatus} />
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3 justify-end">
                  <Link to={`/expenses/edit/${expense.id}`} className={`${ui.faint} hover:text-[#3FA34D] dark:hover:text-[#43B75A]`} title="Edit">
                    <FiEdit2 />
                  </Link>
                  <button onClick={() => onDelete(expense.id, expense.title)} className={`${ui.faint} hover:text-[#EF5350]`} title="Delete">
                    <FiTrash2 />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
        {expenses.map((expense) => (
          <div key={expense.id} className="p-5">
            <Link to={`/expenses/${expense.id}`} className="flex justify-between items-start gap-3">
              <div>
                <p className={`font-semibold ${ui.heading}`}>{expense.title}</p>
                <p className={`text-xs mt-0.5 ${ui.faint}`}>
                  {expense.category?.name} · {expense.store} · {new Date(expense.expenseDate).toLocaleDateString()}
                </p>
              </div>
              <p className={`font-bold whitespace-nowrap ${ui.heading}`}>{formatMoney(expense.totalPaid)}</p>
            </Link>
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-2">
                <Badge styles={STATUS_STYLES[expense.status]} label={STATUS_LABELS[expense.status] || expense.status} />
                <Badge styles={PAYMENT_STYLES[expense.paymentStatus]} label={expense.paymentStatus} />
              </div>
              <div className="flex items-center gap-3">
                <Link to={`/expenses/edit/${expense.id}`} className={ui.faint}><FiEdit2 /></Link>
                <button onClick={() => onDelete(expense.id, expense.title)} className={ui.faint}><FiTrash2 /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpenseTable;
