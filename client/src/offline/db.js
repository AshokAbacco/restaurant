// client/src/offline/db.js
//
// The IndexedDB schema backing offline mode. Three stores:
//
//  - "outbox": pending writes made while offline (order creation — see
//    offlineQueue.js). Each row carries the clientRequestId used for
//    server-side idempotency (see schema.prisma's Order.clientRequestId).
//  - "referenceCache": last-known-good copies of read-only data (menu
//    items, categories, add-ons, floors, tables, KDS ticket list) so the
//    POS/Kitchen screens can still be BROWSED while offline, not just have
//    their write actions queue silently. Populated by offlineCache.js
//    whenever a real fetch succeeds.
//  - "kdsOutbox": pending KOT status updates made while the Kitchen
//    Display Screen was offline — see kdsQueue.js.
//
// Why IndexedDB and not just the Workbox HTTP cache already set up in
// vite.config.js: the HTTP cache can replay a GET response, but the app
// needs to actually READ that data back out as structured JS objects to
// render the menu grid / table strip / kitchen tickets while offline —
// IndexedDB gives us a normal key-value store to do that, independent of
// whatever the service worker did with the original HTTP response.
import { openDB } from "idb";

const DB_NAME = "restaurant-erp-offline";
const DB_VERSION = 4;

let dbPromise;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains("outbox")) {
          const outbox = db.createObjectStore("outbox", {
            keyPath: "clientRequestId",
          });
          outbox.createIndex("status", "status");
          outbox.createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("referenceCache")) {
          // keyPath "key" — one row per cached endpoint, e.g.
          // "menu", "categories", "floors", "tables:<floorId>"
          db.createObjectStore("referenceCache", { keyPath: "key" });
        }
        // v2: added for offline KDS (Kitchen Display Screen) status
        // updates. Separate from "outbox" on purpose — that store holds
        // CREATE-a-new-order writes (keyed by clientRequestId, needs
        // create-time idempotency); this one holds "patch an EXISTING
        // KitchenOrder's status" writes, which are naturally idempotent
        // by kotId + target status (see kot.service.js's KOT_STAGE_RANK
        // guard) and don't need a generated request id at all.
        if (oldVersion < 2 && !db.objectStoreNames.contains("kdsOutbox")) {
          const kdsOutbox = db.createObjectStore("kdsOutbox", {
            keyPath: "id",
            autoIncrement: true,
          });
          kdsOutbox.createIndex("status", "status");
          kdsOutbox.createIndex("createdAt", "createdAt");
        }
        // v3: same idea as kdsOutbox, but for Order status updates (the
        // Orders board's takeaway "Order Delivered" action) — see
        // ordersQueue.js.
        if (oldVersion < 3 && !db.objectStoreNames.contains("ordersOutbox")) {
          const ordersOutbox = db.createObjectStore("ordersOutbox", {
            keyPath: "id",
            autoIncrement: true,
          });
          ordersOutbox.createIndex("status", "status");
          ordersOutbox.createIndex("createdAt", "createdAt");
        }
        // v4: cash-only offline billing completions (Billings.jsx) — see
        // billingQueue.js. Naturally idempotent server-side
        // (billing.service.js returns the existing invoice for an
        // already-COMPLETED order rather than erroring on replay).
        if (oldVersion < 4 && !db.objectStoreNames.contains("billingOutbox")) {
          const billingOutbox = db.createObjectStore("billingOutbox", {
            keyPath: "id",
            autoIncrement: true,
          });
          billingOutbox.createIndex("status", "status");
          billingOutbox.createIndex("createdAt", "createdAt");
        }
      },
    });
  }
  return dbPromise;
}
