// client/src/offline/offlineCache.js
import { getDb } from "./db";

// Call this right after any successful GET of reference data (menu items,
// categories, floors, tables, add-ons) so there's always a last-known-good
// copy available if the next fetch fails because the connection dropped.
export async function cacheReferenceData(key, data) {
  const db = await getDb();
  await db.put("referenceCache", {
    key,
    data,
    cachedAt: new Date().toISOString(),
  });
}

// Returns { data, cachedAt } or null if nothing's been cached yet for this
// key (e.g. very first launch, never been online).
export async function getCachedReferenceData(key) {
  const db = await getDb();
  const row = await db.get("referenceCache", key);
  return row ? { data: row.data, cachedAt: row.cachedAt } : null;
}

// Wraps a normal API call: try the network first, fall back to the cached
// copy on failure, and cache a fresh copy whenever the network succeeds.
// This is the one function most components should actually call — see
// MenuBrowser.jsx / TableStrip.jsx for usage.
export async function fetchWithOfflineFallback(key, fetchFn) {
  try {
    const data = await fetchFn();
    await cacheReferenceData(key, data);
    return { data, fromCache: false, cachedAt: null };
  } catch (err) {
    const cached = await getCachedReferenceData(key);
    if (cached) {
      return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt };
    }
    // Never been online for this key at all — nothing to fall back to.
    throw err;
  }
}

// FEATURE: keep the cached TABLE BOARD in sync with orders placed while
// offline. Without this, a dine-in order queued in offlineQueue.js still
// left the table showing FREE in every cached board (TableStrip.jsx's
// `tables:<floorId>` cache AND OrdersPage.jsx's `orders:tables-board`
// cache) until the order actually synced — so staff could tap the same
// "FREE" table again and accidentally queue a second, duplicate order,
// and the Orders/Tables page wouldn't show the table as occupied at all.
//
// getTablesBoard's response shape doesn't include which floor each table
// belongs to (see tables.service.js), so rather than guess the one
// `tables:<floorId>` key that has this table, this patches EVERY cached
// key that looks like a table board and happens to contain this table id
// — a no-op for any key that doesn't.
export async function patchCachedTableAfterOfflineOrder(tableId, orderPreview) {
  const db = await getDb();
  const allKeys = await db.getAllKeys("referenceCache");
  const boardKeys = allKeys.filter(
    (key) => key === "orders:tables-board" || key.startsWith("tables:"),
  );

  for (const key of boardKeys) {
    const row = await db.get("referenceCache", key);
    if (!row || !Array.isArray(row.data)) continue;
    const idx = row.data.findIndex((t) => t.id === tableId);
    if (idx === -1) continue; // this cached board doesn't include this table — skip

    const updated = row.data.slice();
    updated[idx] = {
      ...updated[idx],
      status: "OCCUPIED",
      order: orderPreview,
    };
    await db.put("referenceCache", { ...row, data: updated });
  }
}

// Companion to patchCachedTableAfterOfflineOrder above — used when a
// queued order's local KOT status advances (Ready/Served tapped on an
// "Awaiting sync" ticket, see advanceQueuedKotStatus in offlineQueue.js)
// so the Orders/Tables board's Pending/Serving badge updates too, not
// just the Kitchen Display. Only touches `order.kitchenStatus`, leaving
// everything else (status, itemCount, etc.) exactly as it was.
export async function patchCachedTableKitchenStatus(tableId, kitchenStatus) {
  const db = await getDb();
  const allKeys = await db.getAllKeys("referenceCache");
  const boardKeys = allKeys.filter(
    (key) => key === "orders:tables-board" || key.startsWith("tables:"),
  );

  for (const key of boardKeys) {
    const row = await db.get("referenceCache", key);
    if (!row || !Array.isArray(row.data)) continue;
    const idx = row.data.findIndex((t) => t.id === tableId);
    if (idx === -1 || !row.data[idx].order) continue;

    const updated = row.data.slice();
    updated[idx] = {
      ...updated[idx],
      order: { ...updated[idx].order, kitchenStatus },
    };
    await db.put("referenceCache", { ...row, data: updated });
  }
}

// FEATURE: offline read-only browsing for the Menu admin pages
// (Categories/SubCategories/AddOns/Combos/KitchenSections/MenuList).
// Those pages use menuApi.js, which returns { ok, data } and never
// throws — a different convention from posApi.js's request(), which
// fetchWithOfflineFallback above expects (throw on failure). This adapts
// the former into the latter so the same caching logic can be reused
// without duplicating it. Returns result.data as-is; callers unwrap it
// exactly the same way they already do for the live (non-cached) call.
export async function fetchWithOfflineFallbackResult(key, resultFn) {
  return fetchWithOfflineFallback(key, async () => {
    const result = await resultFn();
    if (!result.ok) {
      throw new Error(result.data?.message || "Request failed");
    }
    return result.data;
  });
}
