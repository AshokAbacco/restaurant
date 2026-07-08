// client/src/inventory/pages/AlertsPage.jsx
import { useEffect, useState } from "react";
import * as inv from "../api/inventoryApi";
import { PageHeader, Card, Table, EmptyState, Button, Select, TicketPill, ErrorBanner } from "../components/ui";

const ALERT_TONE = { OUT_OF_STOCK: "bad", EXPIRED: "bad", LOW_STOCK: "warn", EXPIRING_SOON: "warn" };
const TYPES = ["LOW_STOCK", "OUT_OF_STOCK", "EXPIRING_SOON", "EXPIRED"];

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [resolved, setResolved] = useState("false");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (resolved !== "") params.resolved = resolved;
      if (type) params.type = type;
      setAlerts(await inv.getAlerts(params));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [resolved, type]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      await inv.generateAlerts();
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to generate alerts");
    } finally {
      setGenerating(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await inv.resolveAlert(id);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to resolve alert");
    }
  };

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle="Low stock, out of stock, and expiry warnings — scanned on demand."
        action={
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? "Scanning…" : "Scan Now"}
          </Button>
        }
      />
      <ErrorBanner message={error} />

      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={resolved} onChange={(e) => setResolved(e.target.value)}>
          <option value="false">Active only</option>
          <option value="true">Resolved only</option>
          <option value="">All</option>
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-[var(--inv-steel)] p-5">Loading…</p>
        ) : alerts.length === 0 ? (
          <EmptyState
            title="Nothing here"
            hint='Click "Scan Now" to check current stock and expiry batches for issues.'
          />
        ) : (
          <Table columns={["Type", "Ingredient", "Message", "Raised", ""]}>
            {alerts.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2.5">
                  <TicketPill tone={ALERT_TONE[a.type] || "neutral"}>{a.type.replace(/_/g, " ")}</TicketPill>
                </td>
                <td className="px-4 py-2.5">{a.ingredient?.name}</td>
                <td className="px-4 py-2.5">{a.message}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {new Date(a.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {!a.isResolved && (
                    <button
                      onClick={() => handleResolve(a.id)}
                      className="text-sm text-[var(--inv-pine)] hover:underline"
                    >
                      Mark resolved
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
};

export default AlertsPage;