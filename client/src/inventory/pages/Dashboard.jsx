// client/src/inventory/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as inv from "../api/inventoryApi";
import { PageHeader, Card, StatCard, TicketPill, EmptyState, Button, ErrorBanner } from "../components/ui";

const ALERT_TONE = {
  OUT_OF_STOCK: "bad",
  EXPIRED: "bad",
  LOW_STOCK: "warn",
  EXPIRING_SOON: "warn",
};

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryData, alertsData] = await Promise.all([
        inv.getDashboardSummary(),
        inv.getAlerts({ resolved: "false" }),
      ]);
      setSummary(summaryData);
      setAlerts(alertsData);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerateAlerts = async () => {
    try {
      await inv.generateAlerts();
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to generate alerts");
    }
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Live snapshot of stock health across the kitchen."
        action={
          <Button variant="secondary" onClick={handleGenerateAlerts}>
            Refresh alerts
          </Button>
        }
      />
      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-sm text-[var(--inv-steel)]">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Inventory Value"
              value={`₹${Number(summary?.totalInventoryValue ?? 0).toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}`}
            />
            <StatCard label="Total Ingredients" value={summary?.totalIngredients ?? 0} />
            <StatCard
              label="Low Stock"
              value={summary?.lowStockCount ?? 0}
              tone={summary?.lowStockCount ? "warn" : "neutral"}
            />
            <StatCard
              label="Out of Stock"
              value={summary?.outOfStockCount ?? 0}
              tone={summary?.outOfStockCount ? "bad" : "neutral"}
            />
          </div>

          <Card>
            <div className="px-5 py-4 border-b border-[var(--inv-line)] flex items-center justify-between">
              <h2 className="font-semibold">Active alerts</h2>
              <Link to="/inventory/alerts" className="text-sm text-[var(--inv-pine)] hover:underline">
                View all
              </Link>
            </div>
            {alerts.length === 0 ? (
              <EmptyState
                title="Nothing needs attention right now"
                hint='Click "Refresh alerts" to re-scan stock and expiry batches.'
              />
            ) : (
              <ul className="divide-y divide-[var(--inv-line)]">
                {alerts.slice(0, 8).map((a) => (
                  <li key={a.id} className="px-5 py-3 flex items-center gap-3">
                    <TicketPill tone={ALERT_TONE[a.type] || "neutral"}>
                      {a.type.replace(/_/g, " ")}
                    </TicketPill>
                    <span className="text-sm">{a.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;