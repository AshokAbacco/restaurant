// client/src/offline/offlineQueue.js
import { getDb } from "./db";
import { placeOrderAndSendToKitchen, updateKotStatus } from "../pos/api/posApi";
import { broadcastChange, subscribeToBroadcast } from "./broadcast";
import {
  patchCachedTableAfterOfflineOrder,
  patchCachedTableKitchenStatus,
} from "./offlineCache";

const listeners = new Set();
function notify() {
  listeners.forEach((fn) => fn());
  broadcastChange("orders"); // wake up KDS/other tabs on this same device
}
// Components (see useOfflineSync.js, KitchenDisplayScreen.jsx) subscribe
// here to re-render when the queue changes — an item enqueued, synced, or
// marked failed. Also fires when ANOTHER tab on this device changes the
// queue (e.g. POS in one tab enqueues an order, KDS in another tab needs
// to know right away instead of waiting for its next poll).
export function subscribeToQueue(fn) {
  listeners.add(fn);
  const unsubBroadcast = subscribeToBroadcast("orders", fn);
  return () => {
    listeners.delete(fn);
    unsubBroadcast();
  };
}

function makeClientRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// A genuine connectivity failure (offline, DNS, server unreachable) is
// what should get queued for later retry. A real 4xx from the server
// (missing items, invalid table, etc.) must NOT be queued — retrying a
// request the server already correctly rejected just fails again later
// instead of letting the waiter fix it now. apiClient.js's rawRequest()
// only throws directly (rather than resolving {ok:false}) when fetch()
// itself fails — that's the TypeError/"Failed to fetch" signature checked
// for here.
function isNetworkError(err) {
  return (
    err instanceof TypeError ||
    /failed to fetch|networkerror|load failed|offline/i.test(err?.message || "")
  );
}

// Dine-in only — see the phase-1 scoping note in the conversation this was
// built from: takeaway/delivery billing needs live payment-gateway state
// and aggregator orders need connectivity by definition, so queuing those
// offline would just defer a failure, not prevent one.
//
// `ticketMeta` is display-only data the KDS (and now the Tables/Orders
// board) needs to render "this order exists, it just hasn't reached the
// server yet" while offline:
// { tableName, orderType, items: [{ name, quantity, notes, sellingPrice,
//   kitchenSectionId, kitchenSectionName }] }.
// It is NEVER sent to the server — only `payload` (menuItemId/quantity/
// notes/addOns, exactly as before) goes over the network. See
// getQueuedKots() below for the Kitchen Display side, and the
// patchCachedTableAfterOfflineOrder() call below for the Tables/Orders
// board side.
export async function placeDineInOrder(payload, ticketMeta = null) {
  const clientRequestId = makeClientRequestId();
  const fullPayload = { ...payload, clientRequestId };

  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const order = await placeOrderAndSendToKitchen(fullPayload);
      // Order went straight to the server successfully — nothing queued,
      // but the Kitchen Display (possibly a different tab on this same
      // device) still needs to know a new ticket just appeared. Without
      // this, it only would have picked it up on its next scheduled poll
      // (up to POLL_INTERVAL_MS later), which is what made a fresh order
      // look like it "wasn't showing up" until the screen refreshed.
      notify();
      return { order, queuedOffline: false };
    } catch (err) {
      if (!isNetworkError(err)) throw err; // a real validation error — surface it now
    }
  }

  await enqueue(fullPayload, ticketMeta);

  // Mirror what the real server response would do to the table's status —
  // otherwise the table keeps showing FREE in every cached board until
  // this order actually syncs, letting staff accidentally start a SECOND
  // order on the same table while offline.
  if (payload.tableId && ticketMeta) {
    const itemCount = (ticketMeta.items || []).reduce(
      (sum, i) => sum + (i.quantity || 0),
      0,
    );
    const estimatedTotal = (ticketMeta.items || []).reduce(
      (sum, i) => sum + (i.sellingPrice || 0) * (i.quantity || 0),
      0,
    );
    await patchCachedTableAfterOfflineOrder(payload.tableId, {
      id: `local-${clientRequestId}`,
      orderNumber: "Pending sync",
      orderType: payload.orderType,
      status: "NEW",
      kitchenStatus: "NEW",
      customerName: null,
      itemCount,
      // Estimated only — excludes GST/add-ons/discounts, which the real
      // server total (shown once synced) accounts for properly.
      grandTotal: estimatedTotal,
      createdAt: new Date().toISOString(),
      awaitingCreate: true,
    });
  }

  notify();

  return {
    order: {
      id: `local-${clientRequestId}`,
      clientRequestId,
      orderNumber: "Pending sync",
      status: "QUEUED_OFFLINE",
      items: [],
    },
    queuedOffline: true,
  };
}

async function enqueue(payload, ticketMeta) {
  const db = await getDb();
  await db.put("outbox", {
    clientRequestId: payload.clientRequestId,
    payload,
    ticketMeta,
    status: "pending",
    attempts: 0,
    createdAt: new Date().toISOString(),
    lastError: null,
  });
}

// Client-side mirror of kot.service.js's KOT_STAGE_RANK — just enough of
// the ladder to know which of a queued order's per-section statuses is
// "least advanced" (see computeOrderKitchenStatus below), matching how
// tables.service.js's deriveKitchenStatus picks the table board's status
// once the order is real.
const STAGE_RANK = { NEW: 0, READY: 1, SERVED: 2 };

// A dine-in order queued offline may become MULTIPLE kitchen tickets (one
// per section — see getQueuedKots below). The table board only has one
// "kitchenStatus" slot for the whole order, so — same rule the server
// uses — it should reflect the LEAST advanced section, not just whichever
// one was tapped last.
function computeOrderKitchenStatus(entry) {
  const items = entry.ticketMeta?.items || [];
  const sectionIds = new Set(
    items.map((i) => i.kitchenSectionId || "UNASSIGNED"),
  );
  if (sectionIds.size === 0) return null;

  let least = null;
  for (const sectionId of sectionIds) {
    const status = entry.sectionStatus?.[sectionId] || "NEW";
    if (least === null || STAGE_RANK[status] < STAGE_RANK[least])
      least = status;
  }
  return least;
}

// Turns every currently-pending outbox order into synthetic Kitchen
// Display tickets, grouped by kitchen section exactly like the real
// server does in kot.service.js's sendToKitchen (one physical ticket per
// section per order) — so a dine-in order with both a grill item and a
// dessert produces two cards here too, matching what will actually show
// up once it syncs.
//
// Falls back to a single "Unassigned" section bucket for any item whose
// ticketMeta didn't carry a kitchenSectionId (e.g. very old queued items
// from before this field existed, or a menu item with no section set) —
// so nothing silently disappears from the board.
//
// Returns [] instead of throwing if an item has no ticketMeta at all
// (shouldn't happen for orders queued through placeDineInOrder above, but
// keeps this resilient rather than crashing the Kitchen Display).
//
// Each ticket's `status` reflects entry.sectionStatus (see
// advanceQueuedKotStatus below) instead of always "NEW" — so tapping
// Ready/Served on an "Awaiting sync" ticket actually sticks, fully
// offline, exactly like a real ticket. `clientRequestId` + `kitchenSectionId`
// are carried on the ticket itself so KitchenDisplayScreen can call
// advanceQueuedKotStatus without having to parse them back out of `id`.
export async function getQueuedKots() {
  const db = await getDb();
  const pending = await db.getAllFromIndex("outbox", "status", "pending");

  const tickets = [];
  for (const entry of pending) {
    const meta = entry.ticketMeta;
    if (!meta || !Array.isArray(meta.items) || meta.items.length === 0)
      continue;

    const bySection = new Map();
    for (const item of meta.items) {
      const sectionId = item.kitchenSectionId || "UNASSIGNED";
      const sectionName = item.kitchenSectionName || "Unassigned";
      if (!bySection.has(sectionId))
        bySection.set(sectionId, { sectionName, items: [] });
      bySection.get(sectionId).items.push(item);
    }

    for (const [sectionId, group] of bySection) {
      const status = entry.sectionStatus?.[sectionId] || "NEW";
      tickets.push({
        id: `offline-${entry.clientRequestId}-${sectionId}`,
        clientRequestId: entry.clientRequestId,
        kotNumber: "Awaiting sync",
        status,
        priority: "NORMAL",
        createdAt: entry.createdAt,
        completedAt:
          status === "SERVED" ? entry.updatedAt || entry.createdAt : null,
        kitchenSectionId: sectionId,
        kitchenSection: { id: sectionId, name: group.sectionName },
        awaitingCreate: true, // this order doesn't exist on the server yet — see KotCard.jsx
        order: {
          orderNumber: "Pending sync",
          orderType: meta.orderType,
          table: meta.tableName ? { name: meta.tableName } : null,
        },
        items: group.items.map((item, idx) => ({
          id: `${entry.clientRequestId}-${sectionId}-${idx}`,
          quantity: item.quantity,
          orderItem: { notes: item.notes, menuItem: { name: item.name } },
        })),
        notes: [],
      });
    }
  }

  return tickets;
}

// Advances a still-queued (not-yet-synced) ticket's status LOCALLY —
// fully offline, no network call, since there's no real kotId to PATCH
// yet. This is what makes Ready/Served actually usable on an "Awaiting
// sync" ticket instead of just a disabled placeholder: the progress is
// remembered in the outbox entry itself and replayed onto the real KOT
// the moment this order syncs (see flushQueue below).
export async function advanceQueuedKotStatus(
  clientRequestId,
  sectionId,
  nextStatus,
) {
  const db = await getDb();
  const entry = await db.get("outbox", clientRequestId);
  if (!entry) return;

  const sectionStatus = {
    ...(entry.sectionStatus || {}),
    [sectionId]: nextStatus,
  };
  const updatedEntry = {
    ...entry,
    sectionStatus,
    updatedAt: new Date().toISOString(),
  };
  await db.put("outbox", updatedEntry);

  if (entry.payload?.tableId) {
    await patchCachedTableKitchenStatus(
      entry.payload.tableId,
      computeOrderKitchenStatus(updatedEntry),
    );
  }

  notify();
}

// Flushes every pending item in the outbox, oldest first — so orders sync
// in the order they were actually placed, not queue insertion order (same
// thing here, but keeping the sort explicit in case items are ever
// re-queued out of order). Safe to call repeatedly/concurrently: each item
// is removed from the store the moment it syncs successfully, so calling
// this from both the 'online' event AND a periodic interval (see
// useOfflineSync.js) can't double-submit anything already gone.
export async function flushQueue() {
  const db = await getDb();
  const pending = await db.getAllFromIndex("outbox", "status", "pending");
  pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const results = { synced: 0, stillPending: 0, failed: 0 };

  for (const item of pending) {
    try {
      const order = await placeOrderAndSendToKitchen(item.payload);

      // Replay any Ready/Served taps made while this ticket was still
      // "Awaiting sync" (see advanceQueuedKotStatus above) onto the real
      // KitchenOrder rows the server just created — matched by
      // kitchenSectionId, since the local ticket never had a real kotId
      // to act on directly. Best-effort: a hiccup here shouldn't fail the
      // sync of the order itself, which is the part that actually matters.
      if (item.sectionStatus && Array.isArray(order?.kitchenOrders)) {
        for (const ko of order.kitchenOrders) {
          const targetStatus = item.sectionStatus[ko.kitchenSectionId];
          if (!targetStatus || targetStatus === "NEW") continue;
          try {
            // kot.service.js only cascades the Order's own status forward
            // on READY (from ACCEPTED/PREPARING) and SERVED (from READY) —
            // jumping straight NEW -> SERVED would update the KOT itself
            // fine but leave the Order stuck, so step through READY first
            // whenever the real target is SERVED.
            if (targetStatus === "SERVED") {
              await updateKotStatus(ko.id, "READY");
              await updateKotStatus(ko.id, "SERVED");
            } else {
              await updateKotStatus(ko.id, targetStatus);
            }
          } catch {
            // Non-fatal — the order/ticket still synced; the status just
            // stays wherever the server left it instead of matching what
            // was tapped locally.
          }
        }
      }

      await db.delete("outbox", item.clientRequestId);
      results.synced += 1;
    } catch (err) {
      if (!isNetworkError(err)) {
        // Server rejected it outright — mark it failed instead of
        // retrying forever, so it surfaces to staff instead of silently
        // vanishing or looping every sync attempt.
        await db.put("outbox", {
          ...item,
          status: "failed",
          attempts: item.attempts + 1,
          lastError: err.message,
        });
        results.failed += 1;
      } else {
        // Still offline / server unreachable — leave it pending, try again next time.
        results.stillPending += 1;
      }
    }
  }

  notify();
  return results;
}

export async function getQueueSnapshot() {
  const db = await getDb();
  const all = await db.getAll("outbox");
  return {
    pendingCount: all.filter((i) => i.status === "pending").length,
    failedCount: all.filter((i) => i.status === "failed").length,
    items: all.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

// Puts a failed item back to "pending" and immediately retries it — for a
// manual "Retry" button once whatever the server rejected has been fixed
// (or staff just want to try again).
export async function retryFailedItem(clientRequestId) {
  const db = await getDb();
  const item = await db.get("outbox", clientRequestId);
  if (!item) return;
  await db.put("outbox", { ...item, status: "pending" });
  notify();
  await flushQueue();
}

export async function discardFailedItem(clientRequestId) {
  const db = await getDb();
  await db.delete("outbox", clientRequestId);
  notify();
}
