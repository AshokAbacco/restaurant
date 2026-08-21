// client/src/components/layout/OfflineIndicator.jsx
import { useState } from "react";
import { FiWifiOff, FiRefreshCw, FiAlertTriangle, FiX } from "react-icons/fi";
import { useOfflineSync } from "../../offline/useOfflineSync";
import {
  getQueueSnapshot,
  retryFailedItem,
  discardFailedItem,
} from "../../offline/offlineQueue";
import {
  getKdsQueueSnapshot,
  retryFailedKdsItem,
  discardFailedKdsItem,
} from "../../offline/kdsQueue";
import {
  getOrdersQueueSnapshot,
  retryFailedOrdersItem,
  discardFailedOrdersItem,
} from "../../offline/ordersQueue";
import {
  getBillingQueueSnapshot,
  retryFailedBillingItem,
  discardFailedBillingItem,
} from "../../offline/billingQueue";

const SOURCE_LABEL = {
  order: "Table order",
  kds: "Kitchen ticket update",
  orderStatus: "Order status update",
  billing: "Cash billing",
};

// Sits in the header, next to NotificationBell/ProfileMenu. Three states:
//  - online, nothing queued -> renders nothing at all
//  - offline (or online with pending items) -> a compact pill: "Offline · 3 pending"
//  - has failed items -> adds a red badge; clicking opens the failed-item list
//
// Combines failed items from all FOUR offline queues (order creation, KOT
// status updates, order status updates, cash billing) into one list — see
// useOfflineSync.js for why they're merged into a single pending/failed
// count rather than four separate indicators.
export default function OfflineIndicator() {
  const { isOnline, pendingCount, failedCount, syncing, syncNow } =
    useOfflineSync();
  const [showFailedPanel, setShowFailedPanel] = useState(false);
  const [failedItems, setFailedItems] = useState([]);

  async function openFailedPanel() {
    const [orders, kds, orderStatus, billing] = await Promise.all([
      getQueueSnapshot(),
      getKdsQueueSnapshot(),
      getOrdersQueueSnapshot(),
      getBillingQueueSnapshot(),
    ]);
    const orderItems = orders.items
      .filter((i) => i.status === "failed")
      .map((i) => ({ source: "order", key: i.clientRequestId, ...i }));
    const kdsItems = kds.items
      .filter((i) => i.status === "failed")
      .map((i) => ({ source: "kds", key: i.id, ...i }));
    const orderStatusItems = orderStatus.items
      .filter((i) => i.status === "failed")
      .map((i) => ({ source: "orderStatus", key: i.id, ...i }));
    const billingItems = billing.items
      .filter((i) => i.status === "failed")
      .map((i) => ({ source: "billing", key: i.id, ...i }));
    setFailedItems([
      ...orderItems,
      ...kdsItems,
      ...orderStatusItems,
      ...billingItems,
    ]);
    setShowFailedPanel(true);
  }

  async function handleRetry(item) {
    if (item.source === "order") await retryFailedItem(item.clientRequestId);
    else if (item.source === "kds") await retryFailedKdsItem(item.id);
    else if (item.source === "orderStatus")
      await retryFailedOrdersItem(item.id);
    else await retryFailedBillingItem(item.id);
    openFailedPanel();
  }

  async function handleDiscard(item) {
    if (item.source === "order") await discardFailedItem(item.clientRequestId);
    else if (item.source === "kds") await discardFailedKdsItem(item.id);
    else if (item.source === "orderStatus")
      await discardFailedOrdersItem(item.id);
    else await discardFailedBillingItem(item.id);
    openFailedPanel();
  }

  if (isOnline && pendingCount === 0 && failedCount === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={failedCount > 0 ? openFailedPanel : syncNow}
        className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
          !isOnline
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : failedCount > 0
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-blue-200 bg-blue-50 text-blue-600"
        }`}
        title={
          !isOnline
            ? "No internet connection — changes are being saved on this device"
            : failedCount > 0
              ? "Some items failed to sync — click to review"
              : "Items pending sync — click to sync now"
        }
      >
        {!isOnline ? (
          <FiWifiOff />
        ) : failedCount > 0 ? (
          <FiAlertTriangle />
        ) : (
          <FiRefreshCw className={syncing ? "animate-spin" : ""} />
        )}
        <span>
          {!isOnline ? "Offline" : syncing ? "Syncing…" : "Sync pending"}
          {pendingCount > 0 && ` · ${pendingCount} pending`}
          {failedCount > 0 && ` · ${failedCount} failed`}
        </span>
      </button>

      {showFailedPanel && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-800">Failed to sync</h3>
            <button
              onClick={() => setShowFailedPanel(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <FiX />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {failedItems.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">
                Nothing failed right now.
              </p>
            ) : (
              failedItems.map((item) => (
                <div
                  key={`${item.source}-${item.key}`}
                  className="border-b border-slate-50 px-4 py-3 last:border-0"
                >
                  <p className="text-xs font-medium text-slate-500">
                    {SOURCE_LABEL[item.source]} ·{" "}
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </p>
                  <p className="mt-1 text-xs text-red-600">
                    {item.lastError || "Unknown error"}
                  </p>
                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={() => handleRetry(item)}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => handleDiscard(item)}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
