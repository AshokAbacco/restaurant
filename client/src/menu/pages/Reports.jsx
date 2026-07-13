// client/src/menu/pages/Reports.jsx
import React, { useEffect, useState } from "react";
import { ui } from "../menuTheme";
import { Spinner, ErrorBanner, EmptyState } from "../MenuUI";
import { fetchMenuReport } from "../menuApi";

const MiniStat = ({ label, value, tone = "" }) => (
  <div className={`${ui.card} p-5`}>
    <p className={`text-sm ${ui.muted}`}>{label}</p>
    <p className={`text-2xl font-bold mt-1 ${tone || ui.heading}`}>{value}</p>
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
    <div className="space-y-6">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <div className={ui.card}><Spinner /></div>
      ) : !report ? (
        <div className={ui.card}>
          <EmptyState icon="📈" title="No report data available." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <MiniStat label="Total Items" value={report.totalItems} />
            <MiniStat label="Active" value={report.activeItems} tone="text-[#3FA34D] dark:text-[#43B75A]" />
            <MiniStat label="Out of Stock" value={report.outOfStock} tone="text-[#E8873A] dark:text-[#FFA94D]" />
            <MiniStat label="Inactive" value={report.inactiveItems} tone={ui.muted} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className={`${ui.card} p-5`}>
              <h3 className={`font-semibold ${ui.heading} mb-4`}>Items by Category</h3>
              {Object.keys(report.itemsByCategory || {}).length === 0 ? (
                <p className={`text-sm ${ui.faint}`}>No data</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(report.itemsByCategory).map(([cat, count]) => {
                    const max = Math.max(...Object.values(report.itemsByCategory));
                    const pct = max > 0 ? (count / max) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className={ui.heading}>{cat}</span>
                          <span className={ui.muted}>{count}</span>
                        </div>
                        <div className="h-2 bg-[#F3F5EE] dark:bg-[#1E241C] rounded-full overflow-hidden">
                          <div className="h-full bg-[#3FA34D] dark:bg-[#43B75A] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={`${ui.card} p-5`}>
              <h3 className={`font-semibold ${ui.heading} mb-4`}>Pricing Overview</h3>
              <p className={`text-sm ${ui.muted}`}>Average Selling Price</p>
              <p className="text-3xl font-bold text-[#3FA34D] dark:text-[#43B75A] mt-1">
                ₹{Number(report.averageSellingPrice).toFixed(2)}
              </p>
              <p className={`text-xs ${ui.faint} mt-4`}>
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
