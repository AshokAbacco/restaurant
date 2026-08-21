// client/src/offline/kdsQueue.js
import { getDb } from "./db";
import { cacheReferenceData, getCachedReferenceData } from "./offlineCache";
import { updateKotStatus } from "../pos/api/posApi";
import { broadcastChange, subscribeToBroadcast } from "./broadcast";

const KDS_CACHE_KEY = "kds:display";

const listeners = new Set();
function notify() {
  listeners.forEach((fn) => fn());
  broadcastChange("kds");
}
export function subscribeToKdsQueue(fn) {
  listeners.add(fn);
  const unsubBroadcast = subscribeToBroadcast("kds", fn);
  return () => {
    listeners.delete(fn);
    unsubBroadcast();
  };
}

// Same distinction as offlineQueue.js's isNetworkError: only a genuine
// connectivity failure should queue for retry. A real error from the
// server (e.g. the kitchen order genuinely doesn't exist) should surface
// immediately instead of silently queuing to fail again later.
function isNetworkError(err) {
  return (
    err instanceof TypeError ||
    /failed to fetch|networkerror|load failed|offline/i.test(err?.message || "")
  );
}

// Patches the cached KDS ticket list's matching entry so a reload while
// still offline keeps showing the just-tapped status instead of reverting
// to the stale server copy. This is the "optimistic update, persisted"
// half of offline support — without it, the UI would flicker back to the
// old status the moment the component re-reads the cache.
async function patchCachedKotStatus(kotId, status) {
  const cached = await getCachedReferenceData(KDS_CACHE_KEY);
  if (!cached) return;
  const updated = cached.data.map((k) =>
    k.id === kotId ? { ...k, status } : k,
  );
  await cacheReferenceData(KDS_CACHE_KEY, updated);
}

// Tries the network immediately. On a genuine connectivity failure,
// optimistically patches the local cache AND queues the write for later —
// the Kitchen Display Screen shows the tapped status right away either
// way, this only affects whether the server has actually been told yet.
export async function updateKotStatusOffline(kotId, status) {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const result = await updateKotStatus(kotId, status);
      // Succeeded straight to the server — still notify so any OTHER tab
      // (e.g. this same restaurant's Orders/Tables board open elsewhere)
      // doesn't have to wait for its own next poll to see it.
      notify();
      return result;
    } catch (err) {
      if (!isNetworkError(err)) throw err; // a real error — surface it now, don't queue it
    }
  }

  await patchCachedKotStatus(kotId, status);
  await enqueue(kotId, status);
  notify();

  return { id: kotId, status, queuedOffline: true };
}

async function enqueue(kotId, status) {
  const db = await getDb();
  await db.add("kdsOutbox", {
    kotId,
    status,
    queueStatus: "pending",
    attempts: 0,
    createdAt: new Date().toISOString(),
    lastError: null,
  });
}

// Flushes every pending KOT status update, oldest first. Safe to call
// repeatedly/concurrently — each item is removed the moment it syncs.
// Because updateKotStatus is idempotent server-side (KOT_STAGE_RANK
// no-ops a stale/backward replay instead of erroring), replaying an
// already-superseded update here is always safe, never a hard failure.
export async function flushKdsQueue() {
  const db = await getDb();
  const pending = await db.getAllFromIndex("kdsOutbox", "status", "pending");
  pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const results = { synced: 0, stillPending: 0, failed: 0 };

  for (const item of pending) {
    try {
      await updateKotStatus(item.kotId, item.status);
      await db.delete("kdsOutbox", item.id);
      results.synced += 1;
    } catch (err) {
      if (!isNetworkError(err)) {
        await db.put("kdsOutbox", {
          ...item,
          status: "failed",
          attempts: item.attempts + 1,
          lastError: err.message,
        });
        results.failed += 1;
      } else {
        results.stillPending += 1;
      }
    }
  }

  notify();
  return results;
}

export async function getKdsQueueSnapshot() {
  const db = await getDb();
  const all = await db.getAll("kdsOutbox");
  return {
    pendingCount: all.filter((i) => i.status === "pending").length,
    failedCount: all.filter((i) => i.status === "failed").length,
    items: all.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

// Set of kotIds that currently have a queued (not-yet-synced) status
// update — used by KitchenDisplayScreen to show a small "pending sync"
// marker on the affected ticket cards.
export async function getPendingKotIds() {
  const db = await getDb();
  const pending = await db.getAllFromIndex("kdsOutbox", "status", "pending");
  return new Set(pending.map((i) => i.kotId));
}

export async function retryFailedKdsItem(id) {
  const db = await getDb();
  const item = await db.get("kdsOutbox", id);
  if (!item) return;
  await db.put("kdsOutbox", { ...item, status: "pending" });
  notify();
  await flushKdsQueue();
}

export async function discardFailedKdsItem(id) {
  const db = await getDb();
  await db.delete("kdsOutbox", id);
  notify();
}
