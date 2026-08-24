// src/pos/components/MoveKotItemsModal.jsx
//
// Phase 1.4 — "Move KOT/Items" (Table View screen). Three tabs, increasing
// in granularity:
//   Table Wise — move a table's entire active order to another table.
//   KOT Wise   — move one whole kitchen ticket to another table.
//   Item Wise  — move a hand-picked subset of items to another table.
// All three end up hitting server/src/pos/kot/kotMove.service.js — see
// that file for what actually happens to KitchenOrder/OrderItem rows.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight } from "lucide-react";
import {
  getOrder,
  getKotsForOrder,
  moveTableWise,
  moveKotWise,
  moveItemsWise,
} from "../api/posApi";

const TABS = [
  { key: "TABLE", label: "Table Wise" },
  { key: "KOT", label: "KOT Wise" },
  { key: "ITEM", label: "Item Wise" },
];

// `tables` = the current tables board (same shape OrdersPage already
// fetches via getTablesBoard) — used to populate every "source"/
// "destination" table picker, and to know which table has an active order
// at all (only occupied tables make sense as a move source).
export default function MoveKotItemsModal({ open, onClose, tables = [], onMoved }) {
  const [tab, setTab] = useState("TABLE");
  const [sourceTableId, setSourceTableId] = useState("");
  const [destinationTableId, setDestinationTableId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // KOT-wise / Item-wise specific: the source table's active order + its
  // KOTs/items, fetched once a source table is picked.
  const [sourceOrder, setSourceOrder] = useState(null);
  const [sourceKots, setSourceKots] = useState([]);
  const [loadingSource, setLoadingSource] = useState(false);
  const [selectedKotId, setSelectedKotId] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  const occupiedTables = tables.filter((t) => t.order);

  useEffect(() => {
    if (!open) return;
    setTab("TABLE");
    setSourceTableId("");
    setDestinationTableId("");
    setSourceOrder(null);
    setSourceKots([]);
    setSelectedKotId("");
    setSelectedItemIds([]);
    setError("");
  }, [open]);

  // Load the source table's order + KOTs whenever it changes, but only for
  // the two tabs that actually need item/KOT-level detail.
  useEffect(() => {
    if (!sourceTableId || tab === "TABLE") return;
    const table = tables.find((t) => t.id === sourceTableId);
    if (!table?.order) return;

    setLoadingSource(true);
    setError("");
    Promise.all([getOrder(table.order.id), getKotsForOrder(table.order.id)])
      .then(([order, kots]) => {
        setSourceOrder(order);
        setSourceKots(kots);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingSource(false));
  }, [sourceTableId, tab, tables]);

  function toggleItem(id) {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  function handleClose() {
    setError("");
    onClose();
  }

  async function handleSubmit() {
    setError("");
    if (!destinationTableId) {
      setError("Choose a destination table.");
      return;
    }

    setSaving(true);
    try {
      if (tab === "TABLE") {
        if (!sourceTableId) {
          setError("Choose a source table.");
          return;
        }
        await moveTableWise({ sourceTableId, destinationTableId });
      } else if (tab === "KOT") {
        if (!selectedKotId) {
          setError("Choose a KOT to move.");
          return;
        }
        await moveKotWise({ kotId: selectedKotId, destinationTableId });
      } else {
        if (selectedItemIds.length === 0) {
          setError("Select at least one item to move.");
          return;
        }
        await moveItemsWise({ orderItemIds: selectedItemIds, destinationTableId });
      }
      onMoved?.();
      handleClose();
    } catch (err) {
      setError(err.message || "Couldn't complete the move.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-[#1C3044]">Move KOT / Items</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-200 px-5 pt-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setError("");
                setSelectedKotId("");
                setSelectedItemIds([]);
              }}
              className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "border-b-2 border-[#27435B] text-[#27435B]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {/* Source / destination pickers — shared by all three tabs */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                From table
              </label>
              <select
                value={sourceTableId}
                onChange={(e) => {
                  setSourceTableId(e.target.value);
                  setSelectedKotId("");
                  setSelectedItemIds([]);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
              >
                <option value="" disabled>
                  Choose a table
                </option>
                {occupiedTables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.order.orderNumber}
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="mt-5 h-4 w-4 shrink-0 text-slate-300" />

            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                To table
              </label>
              <select
                value={destinationTableId}
                onChange={(e) => setDestinationTableId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
              >
                <option value="" disabled>
                  Choose a table
                </option>
                {tables
                  .filter((t) => t.id !== sourceTableId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.order ? "(has an order)" : ""}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Table Wise — nothing further to pick, the whole order moves */}
          {tab === "TABLE" && sourceTableId && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Every item and ticket on this table moves to the destination
              table's order — if the destination already has an active
              order, everything is merged into it.
            </p>
          )}

          {/* KOT Wise — pick one ticket */}
          {tab === "KOT" && sourceTableId && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Select a KOT
              </p>
              {loadingSource ? (
                <p className="text-sm text-slate-400">Loading…</p>
              ) : sourceKots.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No kitchen tickets on this table's order yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {sourceKots.map((kot) => (
                    <label
                      key={kot.id}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                        selectedKotId === kot.id
                          ? "border-blue-400 bg-blue-50"
                          : "border-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="kot"
                          checked={selectedKotId === kot.id}
                          onChange={() => setSelectedKotId(kot.id)}
                        />
                        <span className="font-mono font-medium">{kot.kotNumber}</span>
                        <span className="text-slate-400">
                          {kot.kitchenSection?.name} · {kot.items.length} item
                          {kot.items.length === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                        {kot.status}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Item Wise — pick individual items, possibly across KOTs */}
          {tab === "ITEM" && sourceTableId && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Select items to move
              </p>
              {loadingSource ? (
                <p className="text-sm text-slate-400">Loading…</p>
              ) : !sourceOrder || sourceOrder.items.length === 0 ? (
                <p className="text-sm text-slate-400">No items on this order.</p>
              ) : (
                <div className="space-y-2">
                  {sourceOrder.items.map((item) => (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                        selectedItemIds.includes(item.id)
                          ? "border-blue-400 bg-blue-50"
                          : "border-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedItemIds.includes(item.id)}
                          onChange={() => toggleItem(item.id)}
                        />
                        <span className="font-medium">{item.menuItem?.name}</span>
                        <span className="text-slate-400">× {item.quantity}</span>
                      </span>
                      <span className="font-mono text-slate-600">
                        ₹{Number(item.totalPrice).toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-[#1C3044] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#27435B] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Moving…" : "Move"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}