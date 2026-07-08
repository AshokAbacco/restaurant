// client/src/inventory/pages/ExpiryBatchesPage.jsx
import { useEffect, useState } from "react";
import * as inv from "../api/inventoryApi";
import { PageHeader, Card, Table, EmptyState, Button, TicketPill, ErrorBanner } from "../components/ui";

const daysUntil = (dateStr) => Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));

const badgeFor = (days) => {
  if (days < 0) return { tone: "bad", label: `Expired ${Math.abs(days)}d ago` };
  if (days <= 7) return { tone: "bad", label: `${days}d left` };
  if (days <= 15) return { tone: "warn", label: `${days}d left` };
  if (days <= 30) return { tone: "warn", label: `${days}d left` };
  return { tone: "good", label: `${days}d left` };
};

const WINDOWS = [
  { label: "All batches", value: "" },
  { label: "Expiring in 7 days", value: "7" },
  { label: "Expiring in 15 days", value: "15" },
  { label: "Expiring in 30 days", value: "30" },
];

const ExpiryBatchesPage = () => {
  const [batches, setBatches] = useState([]);
  const [window, setWindow] = useState("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (window) params.expiringWithinDays = window;
      setBatches(await inv.getExpiryBatches(params));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load expiry batches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [window]);

  return (
    <div>
      <PageHeader
        title="Expiry Batches"
        subtitle="Batch-tracked stock, oldest-expiring first (used for FEFO consumption)."
      />
      <ErrorBanner message={error} />

      <div className="flex gap-2 mb-4">
        {WINDOWS.map((w) => (
          <Button
            key={w.value}
            variant={window === w.value ? "primary" : "secondary"}
            onClick={() => setWindow(w.value)}
          >
            {w.label}
          </Button>
        ))}
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-[var(--inv-steel)] p-5">Loading…</p>
        ) : batches.length === 0 ? (
          <EmptyState
            title="No batches in this window"
            hint="Batches are created automatically when a purchase entry includes an expiry date."
          />
        ) : (
          <Table columns={["Ingredient", "Batch #", "Qty Remaining", "Expiry Date", "Status"]}>
            {batches.map((b) => {
              const badge = badgeFor(daysUntil(b.expiryDate));
              return (
                <tr key={b.id}>
                  <td className="px-4 py-2.5">{b.ingredient?.name}</td>
                  <td className="px-4 py-2.5 inv-mono text-xs">{b.batchNumber}</td>
                  <td className="px-4 py-2.5 inv-mono">
                    {b.quantityRemaining} {b.ingredient?.consumptionUnit?.abbreviation}
                  </td>
                  <td className="px-4 py-2.5">{new Date(b.expiryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">
                    <TicketPill tone={badge.tone}>{badge.label}</TicketPill>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
};

export default ExpiryBatchesPage;