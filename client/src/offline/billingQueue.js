// client/src/offline/billingQueue.js
import { getDb } from "./db";
import { completeBilling } from "../pos/api/posApi";
import { broadcastChange, subscribeToBroadcast } from "./broadcast";

const listeners = new Set();
function notify() {
  listeners.forEach((fn) => fn());
  broadcastChange("billing");
}
export function subscribeToBillingQueue(fn) {
  listeners.add(fn);
  const unsubBroadcast = subscribeToBroadcast("billing", fn);
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

// CASH-ONLY. Card/UPI need a live payment gateway/terminal to actually
// authorize the charge — that requirement exists independent of whether
// OUR app has connectivity, so there is nothing to safely queue for those
// methods (or for a SPLIT payment that might include one of them). Only a
// pure, single-line CASH payment is ever queued here; everything else
// always requires a real connection, online or off.
//
// IMPORTANT: a queued billing does NOT include a real invoice. Invoice
// numbering has to happen server-side to stay sequential (see
// invoices.service.js's generateInvoiceNumber and the earlier scoping
// discussion this was built from) — the actual invoice document only
// exists once this syncs. Callers must handle `invoice: null` /
// `queuedOffline: true` in the result.
export async function completeBillingOffline(orderId, payload, { cashOnly }) {
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (online) {
    try {
      return await completeBilling(orderId, payload);
    } catch (err) {
      if (!cashOnly || !isNetworkError(err)) throw err; // real error, or a method that can't be queued — surface now
      // else: genuine connectivity failure on a cash payment -> fall through to queue
    }
  } else if (!cashOnly) {
    throw new Error(
      "Card, UPI, and split payments need an internet connection. Only Cash can be completed offline.",
    );
  }

  await enqueue(orderId, payload);
  notify();

  return {
    order: { id: orderId, status: "COMPLETED" },
    payments: payload.payments,
    invoice: null,
    queuedOffline: true,
  };
}

async function enqueue(orderId, payload) {
  const db = await getDb();
  await db.add("billingOutbox", {
    orderId,
    payload,
    status: "pending",
    attempts: 0,
    createdAt: new Date().toISOString(),
    lastError: null,
  });
}

// Flushes every pending cash billing, oldest first. Safe to call
// repeatedly/concurrently — completeBilling is idempotent server-side
// (billing.service.js returns the existing invoice for an
// already-COMPLETED order rather than erroring), so replaying an
// already-synced item here is always safe, never a duplicate charge.
export async function flushBillingQueue() {
  const db = await getDb();
  const pending = await db.getAllFromIndex(
    "billingOutbox",
    "status",
    "pending",
  );
  pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const results = { synced: 0, stillPending: 0, failed: 0 };

  for (const item of pending) {
    try {
      await completeBilling(item.orderId, item.payload);
      await db.delete("billingOutbox", item.id);
      results.synced += 1;
    } catch (err) {
      if (!isNetworkError(err)) {
        await db.put("billingOutbox", {
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

export async function getBillingQueueSnapshot() {
  const db = await getDb();
  const all = await db.getAll("billingOutbox");
  return {
    pendingCount: all.filter((i) => i.status === "pending").length,
    failedCount: all.filter((i) => i.status === "failed").length,
    items: all.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

export async function getPendingBillingOrderIds() {
  const db = await getDb();
  const pending = await db.getAllFromIndex(
    "billingOutbox",
    "status",
    "pending",
  );
  return new Set(pending.map((i) => i.orderId));
}

export async function retryFailedBillingItem(id) {
  const db = await getDb();
  const item = await db.get("billingOutbox", id);
  if (!item) return;
  await db.put("billingOutbox", { ...item, status: "pending" });
  notify();
  await flushBillingQueue();
}

export async function discardFailedBillingItem(id) {
  const db = await getDb();
  await db.delete("billingOutbox", id);
  notify();
}
