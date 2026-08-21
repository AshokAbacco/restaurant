// client/src/offline/ordersQueue.js
import { getDb } from "./db";
import { updateOrderStatus } from "../pos/api/posApi";
import { broadcastChange, subscribeToBroadcast } from "./broadcast";

// Same pattern as kdsQueue.js — patching an EXISTING order's status is
// naturally idempotent (server-side: pos.service.js's updateOrderStatus
// now no-ops a replay that's already at the target status), so no
// create-time idempotency key is needed here, unlike order CREATION in
// offlineQueue.js.
const listeners = new Set();
function notify() {
  listeners.forEach((fn) => fn());
  broadcastChange("orderStatus");
}
export function subscribeToOrdersQueue(fn) {
  listeners.add(fn);
  const unsubBroadcast = subscribeToBroadcast("orderStatus", fn);
  return () => {
    listeners.delete(fn);
    unsubBroadcast();
  };
}

function isNetworkError(err) {
  return (
    err instanceof TypeError ||
    /failed to fetch|networkerror|load failed|offline/i.test(err?.message || "")
  );
}

// Patches the cached takeaway-orders list so a reload while still offline
// keeps showing "delivered" instead of reverting to the stale server copy.
async function patchCachedOrderStatus(orderId, status) {
  const db = await getDb();
  const cached = await db.get("referenceCache", "orders:takeaway");
  if (!cached) return;
  const updated = cached.data.filter(
    (o) => o.id !== orderId || status !== "COMPLETED",
  );
  // Delivered orders drop off the ACTIVE takeaway list entirely (mirrors
  // OrdersPage.jsx's own ACTIVE_TAKEAWAY_STATUSES filtering) — so marking
  // one delivered while offline removes it from the cached list, same as
  // what a real server response would do once synced.
  await db.put("referenceCache", {
    key: "orders:takeaway",
    data: updated,
    cachedAt: cached.cachedAt,
  });
}

// Takeaway "Order Delivered" only — dine-in's "Complete Service" always
// navigates to Billing first (which needs live payment-gateway state
// regardless), so it was never offline-capable to begin with and isn't
// affected by this queue.
export async function markOrderDeliveredOffline(orderId) {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      return await updateOrderStatus(orderId, "COMPLETED");
    } catch (err) {
      if (!isNetworkError(err)) throw err; // a real error — surface it now
    }
  }

  await patchCachedOrderStatus(orderId, "COMPLETED");
  await enqueue(orderId, "COMPLETED");
  notify();

  return { id: orderId, status: "COMPLETED", queuedOffline: true };
}

async function enqueue(orderId, status) {
  const db = await getDb();
  await db.add("ordersOutbox", {
    orderId,
    status,
    queueStatus: "pending",
    attempts: 0,
    createdAt: new Date().toISOString(),
    lastError: null,
  });
}

export async function flushOrdersQueue() {
  const db = await getDb();
  const pending = await db.getAllFromIndex("ordersOutbox", "status", "pending");
  pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const results = { synced: 0, stillPending: 0, failed: 0 };

  for (const item of pending) {
    try {
      await updateOrderStatus(item.orderId, item.status);
      await db.delete("ordersOutbox", item.id);
      results.synced += 1;
    } catch (err) {
      if (!isNetworkError(err)) {
        await db.put("ordersOutbox", {
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

export async function getOrdersQueueSnapshot() {
  const db = await getDb();
  const all = await db.getAll("ordersOutbox");
  return {
    pendingCount: all.filter((i) => i.status === "pending").length,
    failedCount: all.filter((i) => i.status === "failed").length,
    items: all.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

export async function getPendingOrderIds() {
  const db = await getDb();
  const pending = await db.getAllFromIndex("ordersOutbox", "status", "pending");
  return new Set(pending.map((i) => i.orderId));
}

export async function retryFailedOrdersItem(id) {
  const db = await getDb();
  const item = await db.get("ordersOutbox", id);
  if (!item) return;
  await db.put("ordersOutbox", { ...item, status: "pending" });
  notify();
  await flushOrdersQueue();
}

export async function discardFailedOrdersItem(id) {
  const db = await getDb();
  await db.delete("ordersOutbox", id);
  notify();
}
