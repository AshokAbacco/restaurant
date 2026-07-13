// client/src/expenses/components/DashboardCards.jsx
import { FiCalendar, FiTrendingUp, FiClock, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { ui, formatMoney } from "../expenseTheme";

const Card = ({ icon, tone, title, value, sub }) => (
  <div className={`${ui.card} p-5 flex items-start gap-4`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${tone}`}>{icon}</div>
    <div className="min-w-0">
      <p className={`text-sm ${ui.muted}`}>{title}</p>
      <p className={`text-2xl font-bold mt-1 truncate ${ui.heading}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${ui.faint}`}>{sub}</p>}
    </div>
  </div>
);

const DashboardCards = ({ dashboard }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <Card
        icon={<FiCalendar className="text-[#3FA34D] dark:text-[#43B75A]" />}
        tone="bg-[#3FA34D]/10 dark:bg-[#43B75A]/15"
        title="Today"
        value={formatMoney(dashboard.todaysExpense)}
        sub="Spent so far today"
      />
      <Card
        icon={<FiTrendingUp className="text-[#3FA34D] dark:text-[#43B75A]" />}
        tone="bg-[#3FA34D]/10 dark:bg-[#43B75A]/15"
        title="This Month"
        value={formatMoney(dashboard.monthlyExpense)}
        sub="Total this month"
      />
      <Card
        icon={<FiClock className="text-[#E8873A] dark:text-[#FFA94D]" />}
        tone="bg-[#FFA94D]/15"
        title="Waiting for Approval"
        value={formatMoney(dashboard.pendingApproval)}
        sub="Needs sign-off"
      />
      <Card
        icon={<FiCheckCircle className="text-[#3FA34D] dark:text-[#43B75A]" />}
        tone="bg-[#3FA34D]/10 dark:bg-[#43B75A]/15"
        title="Paid"
        value={formatMoney(dashboard.paidExpenses)}
        sub="Already settled"
      />
      <Card
        icon={<FiAlertCircle className="text-[#EF5350]" />}
        tone="bg-[#EF5350]/10"
        title="Unpaid"
        value={formatMoney(dashboard.unpaidExpenses)}
        sub="Still owed"
      />
    </div>
  );
};

export default DashboardCards;
