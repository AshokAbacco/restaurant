// client/src/offline/broadcast.js
//
// Every offline queue (orders, KDS status, order status, billing) already
// notifies its own in-page listeners via a plain Set (see each file's
// notify()). That's enough when POS and Kitchen Display are the same tab,
// but on a real restaurant floor they're usually two different tabs (or
// two windows) on the SAME tablet/browser — e.g. POS on one screen, KDS on
// another, both on the one device at the counter. Plain in-memory
// listeners don't cross a tab boundary; BroadcastChannel does.
//
// This is intentionally NOT a replacement for the outbox pattern — it's
// same-device, same-browser only (BroadcastChannel does not cross
// devices). Two separate tablets on the same WiFi still won't see each
// other's queued orders until one of them reaches the real server. See
// the note in offlineQueue.js / KitchenDisplayScreen.jsx for that
// limitation and what it would take to close it.
const CHANNEL_NAME = "restaurant-erp-offline-sync";

let channel = null;
function getChannel() {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

// Tell other tabs on this device "something changed in <topic>" (e.g.
// "orders", "kds", "orderStatus", "billing"). Payload is optional and
// small — this is just a wake-up ping, listeners re-read IndexedDB
// themselves rather than trusting whatever's in the message.
export function broadcastChange(topic) {
  const ch = getChannel();
  if (!ch) return; // Safari-with-no-BroadcastChannel-support etc — silently no-op, same-tab listeners still work
  try {
    ch.postMessage({ topic, at: Date.now() });
  } catch {
    // Channel closed or unavailable — never let this break the caller.
  }
}

// Subscribe to changes broadcast by OTHER tabs (this tab's own dispatch
// doesn't loop back through BroadcastChannel, only real cross-tab
// messages do). Returns an unsubscribe function.
export function subscribeToBroadcast(topic, fn) {
  const ch = getChannel();
  if (!ch) return () => {};
  function handler(event) {
    if (event.data?.topic === topic) fn();
  }
  ch.addEventListener("message", handler);
  return () => ch.removeEventListener("message", handler);
}
