// src/pos/OrdersPage.jsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TableOrderCard, { deriveTableCategory, CATEGORY_RANK } from "./components/TableOrderCard";
import { getTablesBoard } from "./api/posApi";

const POLL_INTERVAL_MS = 8000;

export default function OrdersPage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("ALL");

  const load = useCallback(async () => {
    try {
      const data = await getTablesBoard();
      setTables(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Clicking "Complete Service" now navigates to the dedicated Billing page
  // instead of opening a modal. The table is only freed once billing is
  // completed there (server-side, on full payment) — this page just polls
  // and picks up the change on its next refresh.
  function handleCompleteService(orderId) {
    navigate(`/billing?orderId=${orderId}`);
  }

  const occupiedCount = tables.filter((t) => t.order).length;

  const visibleTables = tables
    .filter((t) => {
      if (filter === "ALL") return true;
      return deriveTableCategory(t) === filter;
    })
    // Serving tables first (need immediate attention), then Pending
    // (still cooking), then Available last — matches CATEGORY_RANK.
    .slice()
    .sort((a, b) => CATEGORY_RANK[deriveTableCategory(a)] - CATEGORY_RANK[deriveTableCategory(b)]);

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-blue-600">
                <path
                  d="M4 6h16M4 12h16M4 18h7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Orders</h1>
              <p className="text-xs text-slate-400">
                {occupiedCount} active table{occupiedCount === 1 ? "" : "s"} of {tables.length}
              </p>
            </div>
          </div>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>

        <div className="mt-3 flex gap-2">
          {[
            { key: "ALL", label: "All Tables" },
            { key: "SERVING", label: "Serving" },
            { key: "PENDING", label: "Pending" },
            { key: "AVAILABLE", label: "Available" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading tables…</p>
        ) : visibleTables.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-slate-400">No tables match this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleTables.map((table) => (
              <TableOrderCard
                key={table.id}
                table={table}
                onCompleteService={handleCompleteService}
                completing={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}