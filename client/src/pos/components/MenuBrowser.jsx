// src/pos/components/MenuBrowser.jsx
import { useEffect, useMemo, useState } from "react";
import { WifiOff, Power } from "lucide-react";
import { getCategories, getMenuItems, updateMenuItemAvailability } from "../api/posApi";
import { fetchWithOfflineFallback } from "../../offline/offlineCache";

const FOOD_TYPE_DOT = {
  VEG: "bg-green-600",
  NON_VEG: "bg-red-600",
  EGG: "bg-amber-500",
};

const ALL_CATEGORY_ID = null;

// FEATURE: offline mode, phase 1 step 7. Every fetch here goes through
// fetchWithOfflineFallback — tries the network, and on failure serves the
// last successful response for that exact query instead of an empty
// screen. This means a waiter can only browse categories/items they (or
// someone) already viewed once while online; there's no way to
// pre-warm every possible category combination, so it's an honest
// "works for what's been seen before" cache, not a full offline menu sync.
export default function MenuBrowser({ onAddItem }) {
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CATEGORY_ID);
  const [allItems, setAllItems] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [offlineNotice, setOfflineNotice] = useState(false);

  useEffect(() => {
    fetchWithOfflineFallback("categories", getCategories)
      .then(({ data, fromCache }) => {
        setCategories(data);
        if (fromCache) setOfflineNotice(true);
      })
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const cacheKey = `menu:${activeCategoryId || "all"}`;
    fetchWithOfflineFallback(cacheKey, () =>
      getMenuItems({
        status: "ACTIVE",
        ...(activeCategoryId ? { categoryId: activeCategoryId } : {}),
      }),
    )
      .then(({ data, fromCache }) => {
        setItems(data);
        if (!activeCategoryId) setAllItems(data);
        if (fromCache) setOfflineNotice(true);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activeCategoryId]);

  const visibleItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q),
    );
  }, [items, search]);

  // FEATURE (Phase 1.5 — Menu Item quick On/Off): flips isAvailable on the
  // spot, no full item-edit screen. Optimistic — updates local state
  // immediately since this is meant to be fast under service pressure
  // (e.g. "we just ran out of this"), and reverts only if the request
  // actually fails. Updates both `items` (what's rendered) and `allItems`
  // (the "All Items" cache) so the change is visible everywhere in this
  // component without a full re-fetch.
  const [togglingId, setTogglingId] = useState(null);

  async function handleToggleAvailability(item, e) {
    e.stopPropagation(); // don't also trigger onAddItem on the parent tile
    const nextValue = !item.isAvailable;
    setTogglingId(item.id);

    const patch = (list) =>
      list.map((i) => (i.id === item.id ? { ...i, isAvailable: nextValue } : i));
    setItems(patch);
    setAllItems(patch);

    try {
      await updateMenuItemAvailability(item.id, nextValue);
    } catch (err) {
      // Revert on failure — e.g. a WAITER role the backend doesn't permit
      // to edit menu items, or a genuine network error.
      setItems((list) =>
        list.map((i) => (i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i)),
      );
      setAllItems((list) =>
        list.map((i) => (i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i)),
      );
      console.error("Failed to toggle item availability:", err.message);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {offlineNotice && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          <WifiOff className="h-3.5 w-3.5" />
          Showing last-synced menu — you're offline right now.
        </div>
      )}

      <div className="mb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search dish or SKU…"
          className="w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231D] px-3 py-2 text-sm text-[#1F2937] dark:text-white focus:border-[#3FA34D] focus:outline-none focus:ring-1 focus:ring-[#3FA34D] dark:focus:border-[#43B75A] dark:focus:ring-[#43B75A]"
        />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveCategoryId(ALL_CATEGORY_ID)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeCategoryId === ALL_CATEGORY_ID
              ? "bg-[#3FA34D] text-white dark:bg-[#43B75A]"
              : "bg-[#F3F5EE] dark:bg-white/5 text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#E7EAE1] dark:hover:bg-white/10"
          }`}
        >
          All Items
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategoryId(c.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategoryId === c.id
                ? "bg-[#3FA34D] text-white dark:bg-[#43B75A]"
                : "bg-[#F3F5EE] dark:bg-white/5 text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#E7EAE1] dark:hover:bg-white/10"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">Loading menu…</div>
      ) : visibleItems.length === 0 ? (
        <div className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">
          No items in this category yet.
        </div>
      ) : (
        <div className="grid flex-1 auto-rows-min content-start grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.isAvailable && onAddItem(item)}
              className={`group relative flex h-[140px] flex-col rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231D] p-3 text-left transition-all ${
                item.isAvailable
                  ? "hover:-translate-y-0.5 hover:border-[#3FA34D] dark:hover:border-[#43B75A] hover:shadow-md"
                  : "cursor-not-allowed opacity-40"
              }`}
            >
              <span
                className={`absolute right-3 top-3 h-2 w-2 shrink-0 rounded-full ${
                  FOOD_TYPE_DOT[item.foodType] || "bg-[#9CA3AF]"
                }`}
              />
              {/* FEATURE (Phase 1.5): quick on/off — shows on hover (and
                  always when the item is already off, so it's easy to find
                  and flip back on). Stops propagation so tapping it doesn't
                  also add the item to the cart via the parent button. */}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => handleToggleAvailability(item, e)}
                title={item.isAvailable ? "Mark unavailable" : "Mark available"}
                className={`absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full transition-opacity ${
                  item.isAvailable
                    ? "cursor-pointer bg-[#F3F5EE] dark:bg-white/5 text-[#9CA3AF] dark:text-[#6B7280] opacity-0 hover:bg-[#E7EAE1] dark:hover:bg-white/10 group-hover:opacity-100"
                    : "cursor-pointer bg-red-100 dark:bg-red-500/15 text-red-500 dark:text-red-400 opacity-100 hover:bg-red-200 dark:hover:bg-red-500/25"
                } ${togglingId === item.id ? "animate-pulse" : ""}`}
              >
                <Power className="h-3.5 w-3.5" />
              </span>
              <span className="line-clamp-2 pr-4 text-sm font-semibold text-[#1F2937] dark:text-white">
                {item.name}
              </span>
              <span className="mt-1 font-mono text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                {item.sku}
              </span>
              <div className="mt-auto flex items-end justify-between pt-2">
                <span className="font-mono text-base font-semibold text-[#3FA34D] dark:text-[#43B75A]">
                  ₹{Number(item.sellingPrice).toFixed(0)}
                </span>
                {!item.isAvailable && (
                  <span className="text-xs font-medium text-red-500 dark:text-red-400">
                    Unavailable
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}