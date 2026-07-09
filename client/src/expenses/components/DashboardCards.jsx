// ==============================================
// src/expenses/components/DashboardCards.jsx
// ==============================================

import {
  FiCalendar,
  FiTrendingUp,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

const formatMoney = (value = 0) =>
  `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const Card = ({ icon, tone, title, value, sub }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${tone}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1 truncate">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const DashboardCards = ({ dashboard }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <Card
        icon={<FiCalendar className="text-blue-600" />}
        tone="bg-blue-50"
        title="Today"
        value={formatMoney(dashboard.todaysExpense)}
        sub="Spent so far today"
      />
      <Card
        icon={<FiTrendingUp className="text-indigo-600" />}
        tone="bg-indigo-50"
        title="This Month"
        value={formatMoney(dashboard.monthlyExpense)}
        sub="Total this month"
      />
      <Card
        icon={<FiClock className="text-amber-600" />}
        tone="bg-amber-50"
        title="Waiting for Approval"
        value={formatMoney(dashboard.pendingApproval)}
        sub="Needs sign-off"
      />
      <Card
        icon={<FiCheckCircle className="text-emerald-600" />}
        tone="bg-emerald-50"
        title="Paid"
        value={formatMoney(dashboard.paidExpenses)}
        sub="Already settled"
      />
      <Card
        icon={<FiAlertCircle className="text-rose-600" />}
        tone="bg-rose-50"
        title="Unpaid"
        value={formatMoney(dashboard.unpaidExpenses)}
        sub="Still owed"
      />
    </div>
  );
};

export default DashboardCards;