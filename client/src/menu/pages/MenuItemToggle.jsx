// client/src/menu/pages/MenuItemToggle.jsx
//
// Phase 1.5 — Menu Item On/Off. Bulk-toggle screen: every item, one switch
// each, filterable by category — for end-of-day/start-of-day sweeps
// ("mark everything using the walk-in fridge as off") rather than the
// one-at-a-time quick toggle already added to the POS order screen
// (see pos/components/MenuBrowser.jsx) for mid-service "we just ran out."
import React, { useEffect, useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { fetchMenuItems, fetchCategories, updateMenuItem } from "../menuApi";
import { ui } from "../menuTheme";
import { Spinner, ErrorBanner, EmptyState, Toggle } from "../MenuUI";

const MenuItemToggle = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    const [itemsResult, catResult] = await Promise.allSettled([
      fetchMenuItems(),
      fetchCategories(),
    ]);

    if (itemsResult.status === "fulfilled" && itemsResult.value.ok) {
      setItems(itemsResult.value.data.data || []);
    } else {
      setError("Failed to load menu items.");
    }
    if (catResult.status === "fulfilled" && catResult.value.ok) {
      setCategories(catResult.value.data.data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const visibleItems = useMemo(() => {
    let list = items;
    if (categoryId) list = list.filter((i) => i.categoryId === categoryId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (i) => i.name.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, categoryId, search]);

  const onCount = items.filter((i) => i.isAvailable).length;

  async function handleToggle(item) {
    const nextValue = !item.isAvailable;
    setTogglingId(item.id);
    // Optimistic update — this screen exists specifically for fast,
    // repeated toggling across many items, so waiting on a round-trip per
    // click would defeat the point.
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isAvailable: nextValue } : i)),
    );

    try {
      const result = await updateMenuItem(item.id, { isAvailable: nextValue });
      if (!result.ok) throw new Error(result.data?.message || "Failed to update");
    } catch (err) {
      // Revert just this row on failure.
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i)),
      );
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleBulkSet(categoryScopeId, value) {
    const targets = items.filter(
      (i) => (!categoryScopeId || i.categoryId === categoryScopeId) && i.isAvailable !== value,
    );
    if (targets.length === 0) return;

    setItems((prev) =>
      prev.map((i) => (targets.some((t) => t.id === i.id) ? { ...i, isAvailable: value } : i)),
    );

    const results = await Promise.allSettled(
      targets.map((t) => updateMenuItem(t.id, { isAvailable: value })),
    );
    const failedIds = targets
      .filter((_, idx) => results[idx].status !== "fulfilled" || !results[idx].value.ok)
      .map((t) => t.id);

    if (failedIds.length > 0) {
      setItems((prev) =>
        prev.map((i) =>
          failedIds.includes(i.id) ? { ...i, isAvailable: !value } : i,
        ),
      );
      setError(`${failedIds.length} item(s) couldn't be updated.`);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className={`text-lg font-semibold ${ui.heading}`}>Menu Item On/Off</h2>
          <p className={`text-sm ${ui.muted}`}>
            {onCount} of {items.length} items currently available
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={ui.btnSecondary}
            onClick={() => handleBulkSet(categoryId || null, true)}
          >
            Turn all {categoryId ? "in category " : ""}on
          </button>
          <button
            className={ui.btnSecondary}
            onClick={() => handleBulkSet(categoryId || null, false)}
          >
            Turn all {categoryId ? "in category " : ""}off
          </button>
        </div>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            className={`${ui.input} pl-9`}
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={`${ui.input} sm:w-56`}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : visibleItems.length === 0 ? (
        <EmptyState
          icon="🔌"
          title="No items match"
          subtitle="Try a different search or category filter."
        />
      ) : (
        <div className={`${ui.card} divide-y divide-[#E7EAE1] dark:divide-[#262B24]`}>
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className={`font-medium truncate ${ui.heading}`}>{item.name}</p>
                <p className={`text-xs ${ui.faint}`}>
                  {item.sku} · {item.category?.name || "Uncategorized"}
                </p>
              </div>
              <div className="w-40 shrink-0">
                <Toggle
                  label={item.isAvailable ? "Available" : "Unavailable"}
                  value={item.isAvailable}
                  onChange={() => handleToggle(item)}
                  tone={item.isAvailable ? "green" : "red"}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuItemToggle;
