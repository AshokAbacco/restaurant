// src/pos/components/AddOnPickerModal.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { WifiOff } from "lucide-react";
import { getAddOns } from "../api/posApi";
// FIX: this modal called getAddOns() directly with no offline fallback —
// on a genuine connectivity failure it just sat on "Loading add-ons…"
// then showed a raw network error, blocking add-ons entirely while
// offline. fetchWithOfflineFallback serves the last-synced catalog
// instead, same pattern as MenuBrowser.jsx's menu items/categories.
import { fetchWithOfflineFallback } from "../../offline/offlineCache";

const ADD_ONS_CACHE_KEY = "addOns";

// menuItem: the item being added/edited
// initialSelection: [{ addOnId, quantity }] — used when editing a cart line
// onConfirm(addOnsArray) / onClose()
export default function AddOnPickerModal({
  menuItem,
  initialSelection = [],
  onConfirm,
  onClose,
}) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantities, setQuantities] = useState({}); // addOnId -> qty
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    fetchWithOfflineFallback(ADD_ONS_CACHE_KEY, getAddOns)
      .then(({ data, fromCache }) => {
        setCatalog(data);
        setIsOffline(fromCache);
        const initial = {};
        for (const sel of initialSelection) initial[sel.addOnId] = sel.quantity;
        setQuantities(initial);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setQty(addOnId, qty) {
    setQuantities((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[addOnId];
      else next[addOnId] = qty;
      return next;
    });
  }

  function handleConfirm() {
    const selected = catalog
      .filter((a) => quantities[a.id] > 0)
      .map((a) => ({
        addOnId: a.id,
        name: a.name,
        price: Number(a.price),
        quantity: quantities[a.id],
      }));
    onConfirm(selected);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#1D231D] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E7EAE1] dark:border-[#262B24] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#1F2937] dark:text-white">Add-ons</h2>
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">{menuItem.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#F3F5EE] dark:hover:bg-white/5 hover:text-[#6B7280] dark:hover:text-[#9CA8A0]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isOffline && !loading && catalog.length > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
              <WifiOff className="h-3.5 w-3.5" />
              Offline — showing last-synced add-ons.
            </div>
          )}
          {loading ? (
            <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">Loading add-ons…</p>
          ) : error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : catalog.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">No add-ons available.</p>
          ) : (
            <ul className="space-y-3">
              {catalog.map((addOn) => {
                const qty = quantities[addOn.id] || 0;
                return (
                  <li
                    key={addOn.id}
                    className="flex items-center justify-between rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1F2937] dark:text-white">
                        {addOn.name}
                      </p>
                      <p className="font-mono text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                        ₹{Number(addOn.price).toFixed(0)}
                      </p>
                    </div>
                    <div className="flex items-center rounded-lg border border-[#E7EAE1] dark:border-[#262B24]">
                      <button
                        onClick={() => setQty(addOn.id, qty - 1)}
                        disabled={qty === 0}
                        className="px-2.5 py-1 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#F3F5EE] dark:hover:bg-white/5 disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-mono text-sm text-[#1F2937] dark:text-white">
                        {qty}
                      </span>
                      <button
                        onClick={() => setQty(addOn.id, qty + 1)}
                        className="px-2.5 py-1 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E7EAE1] dark:border-[#262B24] px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-lg bg-[#3FA34D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
          >
            Add to Ticket
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}