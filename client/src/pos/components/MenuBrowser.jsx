// ==============================================
// src/pos/components/MenuBrowser.jsx
// ==============================================
//
// Category rail on the left, item grid in the middle. This replaced a row
// of category pills that scrolled horizontally — with 20+ categories
// (MANDI[MUTTON], MANDI[CHICKEN], BIRYANI, DRY[TANDOORI]…) the pills meant
// hunting sideways through a strip that showed six at a time. A vertical
// rail shows fifteen at once and each one keeps a fixed position, which is
// what makes it learnable: staff stop reading it and start reaching for it.
//
// Two search fields rather than one, matching how the counter actually
// works: a name search for "what does the customer want", and a short-code
// field for staff who know the codes and want to type three characters and
// go. One combined box makes the code path slower for the people who are
// fastest without it.
//
// FEATURE: offline mode, phase 1 step 7. Every fetch here goes through
// fetchWithOfflineFallback — tries the network, and on failure serves the
// last successful response for that exact query instead of an empty
// screen. This means a waiter can only browse categories/items they (or
// someone) already viewed once while online; there's no way to pre-warm
// every possible category combination, so it's an honest "works for what's
// been seen before" cache, not a full offline menu sync.

import { useEffect, useMemo, useState } from "react";
import { WifiOff, Power, Search, Hash } from "lucide-react";

import {
  getCategories,
  getMenuItems,
  updateMenuItemAvailability,
} from "../api/posApi";
import { fetchWithOfflineFallback } from "../../offline/offlineCache";

// The coloured strip down the left edge of each tile — the standard Indian
// veg/non-veg mark. Read at a glance from across the counter, which a text
// label isn't.
const FOOD_TYPE_BAR = {
  VEG: "bg-green-600",
  NON_VEG: "bg-red-600",
  EGG: "bg-amber-500",
};

const ALL_CATEGORY_ID = null;

export default function MenuBrowser({ onAddItem }) {
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CATEGORY_ID);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offlineNotice, setOfflineNotice] = useState(false);

  const [search, setSearch] = useState("");
  const [shortCode, setShortCode] = useState("");

  // ==========================================
  // DATA
  // ==========================================

  useEffect(() => {
    fetchWithOfflineFallback("categories", getCategories)
      .then(({ data, fromCache }) => {
        setCategories(Array.isArray(data) ? data : []);
        if (fromCache) setOfflineNotice(true);
      })
      .catch(() => setCategories([]));
  }, []);

  // Refetches whenever the category changes — the server does the filtering,
  // so a 2,000-item menu never has to come down the wire at once.
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
        setItems(Array.isArray(data) ? data : []);
        if (fromCache) setOfflineNotice(true);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activeCategoryId]);

  // ==========================================
  // FILTERING
  // ==========================================

  const visibleItems = useMemo(() => {
    const name = search.trim().toLowerCase();
    const code = shortCode.trim().toLowerCase();
    if (!name && !code) return items;

    return items.filter((item) => {
      const matchesName = !name || item.name.toLowerCase().includes(name);
      // startsWith, not includes: a short code is typed from the front, and
      // substring matching on a 3-character code matches half the menu.
      const matchesCode =
        !code || (item.sku || "").toLowerCase().startsWith(code);
      return matchesName && matchesCode;
    });
  }, [items, search, shortCode]);

  // ==========================================
  // QUICK ON/OFF
  // ==========================================
  //
  // FEATURE (Phase 1.5 — Menu Item quick On/Off): flips isAvailable on the
  // spot, no full item-edit screen. Optimistic — updates local state
  // immediately since this is meant to be fast under service pressure
  // ("we just ran out of this") — and reverts only if the request fails.

  const [togglingId, setTogglingId] = useState(null);

  async function handleToggleAvailability(item, e) {
    e.stopPropagation(); // don't also add the item to the cart
    const nextValue = !item.isAvailable;
    setTogglingId(item.id);

    setItems((list) =>
      list.map((i) => (i.id === item.id ? { ...i, isAvailable: nextValue } : i)),
    );

    try {
      await updateMenuItemAvailability(item.id, nextValue);
    } catch (err) {
      // Revert — e.g. a WAITER role the backend won't let edit menu items,
      // or a genuine network error.
      setItems((list) =>
        list.map((i) =>
          i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i,
        ),
      );
      console.error("Failed to toggle item availability:", err.message);
    } finally {
      setTogglingId(null);
    }
  }

  // ==========================================
  // RENDER
  // ==========================================

  const categoryRow = (id, label) => {
    const active = activeCategoryId === id;
    return (
      <button
        key={id ?? "all"}
        onClick={() => setActiveCategoryId(id)}
        className={`w-full border-l-2 px-3 py-2.5 text-left text-[12px] transition-colors ${
          active
            ? "border-[#3FA34D] bg-[#EAF6EC] font-semibold text-[#3FA34D] dark:border-[#43B75A] dark:bg-[#43B75A]/10 dark:text-[#43B75A]"
            : "border-transparent text-[#6B7280] hover:bg-[#F3F5EE] hover:text-[#1F2937] dark:text-[#9CA8A0] dark:hover:bg-white/5 dark:hover:text-white"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0">
      {/* ============ CATEGORY RAIL ============ */}

      <div className="flex w-[132px] shrink-0 flex-col border-r border-[#E7EAE1] sm:w-[150px] lg:w-[170px] dark:border-[#262B24]">
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {categoryRow(ALL_CATEGORY_ID, "All Items")}
          {categories.map((c) => categoryRow(c.id, c.name))}
        </div>
      </div>

      {/* ============ ITEMS ============ */}

      <div className="flex min-w-0 flex-1 flex-col">
        {offlineNotice && (
          <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            <WifiOff className="h-3.5 w-3.5" />
            Showing last-synced menu — you're offline right now.
          </div>
        )}

        {/* ============ SEARCH ============ */}

        <div className="flex gap-2 px-3 py-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF] dark:text-[#6B7280]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item"
              aria-label="Search items by name"
              className="w-full rounded-lg border border-[#E7EAE1] bg-white py-2 pl-9 pr-3 text-[12px] text-[#1F2937] placeholder:text-[#9CA3AF] focus:border-[#3FA34D] focus:outline-none dark:border-[#262B24] dark:bg-[#1D231D] dark:text-white dark:placeholder:text-[#6B7280] dark:focus:border-[#43B75A]"
            />
          </div>

          <div className="relative w-[110px] shrink-0 sm:w-[140px]">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF] dark:text-[#6B7280]" />
            <input
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value)}
              placeholder="Short Code"
              aria-label="Search items by short code"
              autoComplete="off"
              className="w-full rounded-lg border border-[#E7EAE1] bg-white py-2 pl-9 pr-3 font-mono text-[12px] uppercase text-[#1F2937] placeholder:font-sans placeholder:normal-case placeholder:text-[#9CA3AF] focus:border-[#3FA34D] focus:outline-none dark:border-[#262B24] dark:bg-[#1D231D] dark:text-white dark:placeholder:text-[#6B7280] dark:focus:border-[#43B75A]"
            />
          </div>
        </div>

        {/* ============ GRID ============ */}

        {loading ? (
          <div className="grid grid-cols-2 gap-2 px-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-[74px] animate-pulse rounded-lg bg-[#F3F5EE] dark:bg-white/5"
              />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <p className="px-3 text-[12px] text-[#9CA3AF] dark:text-[#6B7280]">
            {search || shortCode
              ? "Nothing matches that search."
              : "No items in this category yet."}
          </p>
        ) : (
          <div className="grid min-h-0 flex-1 auto-rows-min content-start gap-2 overflow-y-auto px-3 pb-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                onClick={() => item.isAvailable && onAddItem(item)}
                disabled={!item.isAvailable}
                // Short and wide, not tall: the reference fits ~18 tiles on
                // screen where the old 140px cards fit 8. Fewer scrolls per
                // order is the whole point of this layout.
                className={`group relative flex min-h-[74px] flex-col justify-between overflow-hidden rounded-lg border border-[#E7EAE1] bg-white py-2 pl-3 pr-2 text-left transition-all dark:border-[#262B24] dark:bg-[#1D231D] ${
                  item.isAvailable
                    ? "hover:border-[#3FA34D] hover:shadow-sm dark:hover:border-[#43B75A]"
                    : "cursor-not-allowed opacity-40"
                }`}
              >
                <span
                  className={`absolute inset-y-0 left-0 w-1 ${
                    FOOD_TYPE_BAR[item.foodType] || "bg-[#D8DED2]"
                  }`}
                />

                <span className="line-clamp-2 text-[12px] font-semibold leading-snug text-[#1F2937] dark:text-white">
                  {item.name}
                </span>

                <span className="mt-1 flex items-baseline justify-between gap-1">
                  <span className="font-mono text-[12px] font-semibold text-[#3FA34D] dark:text-[#43B75A]">
                    ₹{Number(item.sellingPrice).toFixed(0)}
                  </span>
                  <span className="truncate font-mono text-[10px] text-[#9CA3AF] dark:text-[#6B7280]">
                    {item.sku}
                  </span>
                </span>

                {/* Quick on/off — appears on hover, and stays visible when
                    the item is already off so it's easy to find and flip
                    back on. */}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleToggleAvailability(item, e)}
                  title={item.isAvailable ? "Mark unavailable" : "Mark available"}
                  className={`absolute right-1.5 top-1.5 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-opacity ${
                    item.isAvailable
                      ? "bg-[#F3F5EE] text-[#9CA3AF] opacity-0 hover:bg-[#E7EAE1] group-hover:opacity-100 dark:bg-white/5 dark:text-[#6B7280] dark:hover:bg-white/10"
                      : "bg-red-100 text-red-500 opacity-100 hover:bg-red-200 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/25"
                  } ${togglingId === item.id ? "animate-pulse" : ""}`}
                >
                  <Power className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}