// client/src/menu/pages/Reports.jsx
import React, { useEffect, useState } from "react";
import { FiTrendingUp } from "react-icons/fi";
import MenuTabs from "../MenuTabs";
import { fetchMenuReport } from "../menuApi";

const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const StatCard = ({ label, value, color = "text-gray-900" }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
    <p className="text-sm text-gray-500">{label}</p>
    <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
  </div>
);

const Reports = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await fetchMenuReport();
      if (result.ok) {
        setReport(result.data.data);
      } else {
        setError(result.data?.message || "Failed to load report");
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <MenuTabs />

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      {loading ? (
        <Spinner />
      ) : !report ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-500">
          <FiTrendingUp className="mx-auto text-4xl text-gray-300 mb-3" />
          No report data available.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Items" value={report.totalItems} />
            <StatCard label="Active" value={report.activeItems} color="text-green-600" />
            <StatCard label="Out of Stock" value={report.outOfStock} color="text-amber-600" />
            <StatCard label="Inactive" value={report.inactiveItems} color="text-gray-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Items by Category</h3>
              {Object.keys(report.itemsByCategory || {}).length === 0 ? (
                <p className="text-sm text-gray-400">No data</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(report.itemsByCategory).map(([cat, count]) => {
                    const max = Math.max(...Object.values(report.itemsByCategory));
                    const pct = max > 0 ? (count / max) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{cat}</span>
                          <span className="text-gray-500">{count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Pricing Overview</h3>
              <p className="text-sm text-gray-500">Average Selling Price</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                ₹{Number(report.averageSellingPrice).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-4">
                Note: sales, revenue, and profit reports require order data from
                the POS/Orders module, which isn't available to Menu Management yet.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;