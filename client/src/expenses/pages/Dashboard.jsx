// ==============================================
// src/expenses/pages/Dashboard.jsx
// ==============================================

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import expenseService from "../services/expenseService";
import DashboardCards from "../components/DashboardCards";
import { FiPlus, FiPieChart, FiRefreshCw, FiInbox } from "react-icons/fi";

const formatMoney = (value = 0) =>
  `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const BAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-cyan-500",
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header actions */}
      <div className="flex items-center justify-end gap-3 mb-6">
        <button
          onClick={loadDashboard}
          className="w-11 h-11 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-200"
          title="Refresh"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
        </button>

        <Link
          to="/expenses/add"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-blue-600/20"
        >
          <FiPlus /> Add Expense
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-600 px-5 py-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <DashboardCards dashboard={dashboard} />

          <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <FiPieChart />
              </div>
              <h2 className="text-lg font-bold text-gray-800">
                Where the money is going
              </h2>
            </div>

            {dashboard.categoryWise.length === 0 ? (
              <div className="py-10 text-center">
                <FiInbox className="mx-auto text-3xl text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">
                  No expenses yet — add your first one to see the breakdown here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboard.categoryWise
                  .slice()
                  .sort((a, b) => (b.total || 0) - (a.total || 0))
                  .map((cat, i) => (
                    <div key={cat.category}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-gray-700">{cat.category}</span>
                        <span className="text-gray-500">{formatMoney(cat.total)}</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
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