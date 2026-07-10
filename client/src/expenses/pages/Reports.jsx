// client/src/expenses/pages/Reports.jsx
import { useEffect, useState } from "react";
import expenseService from "../services/expenseService";
import { FiBarChart2, FiInbox } from "react-icons/fi";
import { ui, formatMoney } from "../expenseTheme";
import { ErrorBanner } from "../ExpenseUI";

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("category");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      let query = `?groupBy=${groupBy}`;
      if (from) query += `&from=${from}`;
      if (to) query += `&to=${to}`;

      const data = await expenseService.getReports(query);
      setReports(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const total = reports.reduce(
    (sum, row) => sum + Number(groupBy === "category" ? row.total : row.totalPaid || 0),
    0,
  );

  return (
    <div>
      {/* Filters */}
      <div className={`${ui.card} p-6 mb-6`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={ui.labelSm}>From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={ui.input}
            />
          </div>

          <div>
            <label className={ui.labelSm}>To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={ui.input}
            />
          </div>

          <div>
            <label className={ui.labelSm}>Group By</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className={ui.input}>
              <option value="category">Category</option>
              <option value="">All Expenses</option>
            </select>
          </div>

          <div className="flex items-end">
            <button onClick={loadReports} className={`${ui.btnPrimary} w-full py-2.5`}>
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {error && <div className="mb-6"><ErrorBanner>{error}</ErrorBanner></div>}

      {/* Total summary */}
      {!loading && reports.length > 0 && (
        <div className="mb-6 bg-[#3FA34D] dark:bg-[#43B75A] rounded-2xl p-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
              <FiBarChart2 />
            </div>
            <span className="font-medium">
              Total for this period
              {from || to ? ` (${from || "…"} → ${to || "…"})` : ""}
            </span>
          </div>
          <span className="text-2xl font-bold">{formatMoney(total)}</span>
        </div>
      )}

      {/* Table */}
      <div className={`${ui.card} overflow-hidden`}>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-[#F3F5EE] dark:bg-[#1E241C] animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="p-16 text-center">
            <FiInbox className={`mx-auto text-4xl ${ui.faint} mb-4`} />
            <p className={`font-medium ${ui.heading}`}>No data for this period</p>
            <p className={`text-sm mt-1 ${ui.faint}`}>Try a wider date range.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className={`text-left text-xs font-semibold uppercase border-b border-[#E7EAE1] dark:border-[#262B24] ${ui.faint}`}>
                {groupBy === "category" ? (
                  <>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-center">Expenses</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4">Expense</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {groupBy === "category"
                ? reports.map((row, i) => (
                    <tr key={i} className="border-b border-[#E7EAE1] dark:border-[#262B24] last:border-0">
                      <td className={`px-6 py-4 font-medium ${ui.heading}`}>{row.category}</td>
                      <td className={`px-6 py-4 text-center ${ui.muted}`}>{row.count}</td>
                      <td className={`px-6 py-4 text-right font-semibold ${ui.heading}`}>{formatMoney(row.total)}</td>
                    </tr>
                  ))
                : reports.map((expense) => (
                    <tr key={expense.id} className="border-b border-[#E7EAE1] dark:border-[#262B24] last:border-0">
                      <td className={`px-6 py-4 font-medium ${ui.heading}`}>{expense.title}</td>
                      <td className={`px-6 py-4 ${ui.muted}`}>{expense.category?.name}</td>
                      <td className={`px-6 py-4 text-right font-semibold ${ui.heading}`}>
                        {formatMoney(expense.totalPaid)}
                      </td>
                      <td className={`px-6 py-4 text-center ${ui.muted}`}>{expense.status}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Reports;
