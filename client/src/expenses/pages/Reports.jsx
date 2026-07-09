// ==============================================
// src/expenses/pages/Reports.jsx
// ==============================================

import { useEffect, useState } from "react";
import expenseService from "../services/expenseService";
import { FiBarChart2, FiInbox } from "react-icons/fi";

const formatMoney = (value = 0) =>
  `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-600"
            >
              <option value="category">Category</option>
              <option value="">All Expenses</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadReports}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 font-semibold"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-600 px-5 py-4 text-sm">
          {error}
        </div>
      )}

      {/* Total summary */}
      {!loading && reports.length > 0 && (
        <div className="mb-6 bg-blue-600 rounded-2xl p-6 flex items-center justify-between text-white">
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="p-16 text-center">
            <FiInbox className="mx-auto text-4xl text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No data for this period</p>
            <p className="text-gray-400 text-sm mt-1">Try a wider date range.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b border-gray-100">
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
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-4 font-medium text-gray-800">{row.category}</td>
                      <td className="px-6 py-4 text-center text-gray-500">{row.count}</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatMoney(row.total)}</td>
                    </tr>
                  ))
                : reports.map((expense) => (
                    <tr key={expense.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-4 font-medium text-gray-800">{expense.title}</td>
                      <td className="px-6 py-4 text-gray-500">{expense.category?.name}</td>
                      <td className="px-6 py-4 text-right font-semibold">
                        {formatMoney(expense.totalPaid)}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500">{expense.status}</td>
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