// client/src/inventory/pages/StockMovementsPage.jsx
import { useEffect, useState } from "react";
import * as inv from "../api/inventoryApi";
import { PageHeader, Card, Table, EmptyState, Select, TicketPill, ErrorBanner } from "../components/ui";

const TYPE_TONE = {
  PURCHASE: "good",
  SALE_CONSUMPTION: "neutral",
  WASTAGE: "bad",
  ADJUSTMENT: "warn",
  RETURN: "neutral",
  TRANSFER: "neutral",
};

const StockMovementsPage = () => {
  const [movements, setMovements] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [ingredientId, setIngredientId] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (ingredientId) params.ingredientId = ingredientId;
      if (type) params.type = type;
      setMovements(await inv.getMovements(params));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load stock movements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    inv.getIngredients().then(setIngredients);
  }, []);

  useEffect(() => {
    load();
  }, [ingredientId, type]);

  return (
    <div>
      <PageHeader
        title="Stock Ledger"
        subtitle="Every stock change, in order — the permanent audit trail."
      />
      <ErrorBanner message={error} />

      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={ingredientId} onChange={(e) => setIngredientId(e.target.value)}>
          <option value="">All ingredients</option>
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {Object.keys(TYPE_TONE).map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-[var(--inv-steel)] p-5">Loading…</p>
        ) : movements.length === 0 ? (
          <EmptyState title="No movements match" hint="Stock movements appear here as they happen." />
        ) : (
          <Table columns={["Date", "Ingredient", "Type", "Qty", "Previous", "New", "Reason"]}>
            {movements.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {new Date(m.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2.5">{m.ingredient?.name}</td>
                <td className="px-4 py-2.5">
                  <TicketPill tone={TYPE_TONE[m.type] || "neutral"}>{m.type.replace(/_/g, " ")}</TicketPill>
                </td>
                <td
                  className={`px-4 py-2.5 inv-mono font-medium ${
                    Number(m.quantity) < 0 ? "text-[var(--inv-rust)]" : "text-[var(--inv-pine-dark)]"
                  }`}
                >
                  {Number(m.quantity) > 0 ? "+" : ""}
                  {m.quantity}
                </td>
                <td className="px-4 py-2.5 inv-mono">{m.previousStock}</td>
                <td className="px-4 py-2.5 inv-mono">{m.newStock}</td>
                <td className="px-4 py-2.5 text-[var(--inv-steel)]">{m.reason || "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
};

export default StockMovementsPage;