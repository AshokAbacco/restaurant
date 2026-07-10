// client/src/expenses/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import expenseService from "../services/expenseService";
import DashboardCards from "../components/DashboardCards";
import { FiPlus, FiPieChart, FiRefreshCw, FiInbox } from "react-icons/fi";
import { ui, formatMoney } from "../expenseTheme";
import { ErrorBanner } from "../ExpenseUI";

const BAR_COLORS = [
  "bg-[#3FA34D] dark:bg-[#43B75A]",
  "bg-[#E8873A] dark:bg-[#FFA94D]",
  "bg-[#6B7280] dark:bg-[#9CA8A0]",
  "bg-[#EF5350]",
  "bg-[#358F42]",
  "bg-[#9CA8A0]",
];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dashboard, setDashboard] = useState({
    todaysExpense: 0,
    monthlyExpense: 0,
    pendingApproval: 0,
    paidExpenses: 0,
    unpaidExpenses: 0,
    categoryWise: [],
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await expenseService.getDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const maxTotal = Math.max(1, ...dashboard.categoryWise.map((c) => c.total || 0));

  return (
    <div>
      {/* Header actions */}
      <div className="flex items-center justify-end gap-3 mb-6">
        <button
          onClick={loadDashboard}
          className="w-11 h-11 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] flex items-center justify-center text-[#6B7280] dark:text-[#9CA8A0] hover:text-[#3FA34D] dark:hover:text-[#43B75A] hover:border-[#3FA34D]/30 dark:hover:border-[#43B75A]/40 transition-colors"
          title="Refresh"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
        </button>

        <Link to="/expenses/add" className={ui.btnPrimary}>
          <FiPlus /> Add Expense
        </Link>
      </div>

      {error && <div className="mb-6"><ErrorBanner>{error}</ErrorBanner></div>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[#F3F5EE] dark:bg-[#1E241C] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <DashboardCards dashboard={dashboard} />

          <div className={`${ui.card} mt-8 p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 flex items-center justify-center text-[#3FA34D] dark:text-[#43B75A]">
                <FiPieChart />
              </div>
              <h2 className={`text-lg font-bold ${ui.heading}`}>Where the money is going</h2>
            </div>

            {dashboard.categoryWise.length === 0 ? (
              <div className="py-10 text-center">
                <FiInbox className={`mx-auto text-3xl ${ui.faint} mb-3`} />
                <p className={`text-sm ${ui.muted}`}>No expenses yet — add your first one to see the breakdown here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboard.categoryWise
                  .slice()
                  .sort((a, b) => (b.total || 0) - (a.total || 0))
                  .map((cat, i) => (
                    <div key={cat.category}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className={`font-medium ${ui.heading}`}>{cat.category}</span>
                        <span className={ui.muted}>{formatMoney(cat.total)}</span>
                      </div>
                      <div className="h-3 bg-[#F3F5EE] dark:bg-[#1E241C] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                          style={{ width: `${((cat.total || 0) / maxTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
