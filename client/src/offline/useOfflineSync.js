// client/src/offline/useOfflineSync.js
import { useCallback, useEffect, useState } from "react";
import { flushQueue, getQueueSnapshot, subscribeToQueue } from "./offlineQueue";
import {
  flushKdsQueue,
  getKdsQueueSnapshot,
  subscribeToKdsQueue,
} from "./kdsQueue";
import {
  flushOrdersQueue,
  getOrdersQueueSnapshot,
  subscribeToOrdersQueue,
} from "./ordersQueue";
import {
  flushBillingQueue,
  getBillingQueueSnapshot,
  subscribeToBillingQueue,
} from "./billingQueue";

// Not using the Background Sync API here on purpose — it has poor/no
// support in Safari (all iOS browsers, since they all use WebKit), and a
// restaurant can't assume every tablet in the building is Chrome. Plain
// 'online' event + a periodic interval while the tab is open is less
// elegant but works everywhere, and "sync while the app is actually open"
// is the realistic case anyway — nobody expects an order, a kitchen
// ticket, or a bill to sync itself while the tablet is asleep with the
// app closed.
const RETRY_INTERVAL_MS = 30_000;

// Combines all FOUR offline queues (order creation, KOT status updates,
// order status updates, cash billing completions) into one status the
// app-wide header indicator shows — a single "3 pending" badge covers all
// of them, since to a user they're all the same underlying concept:
// "stuff hasn't reached the server yet."
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshSnapshot = useCallback(async () => {
    const [orders, kds, orderStatus, billing] = await Promise.all([
      getQueueSnapshot(),
      getKdsQueueSnapshot(),
      getOrdersQueueSnapshot(),
      getBillingQueueSnapshot(),
    ]);
    setPendingCount(
      orders.pendingCount +
        kds.pendingCount +
        orderStatus.pendingCount +
        billing.pendingCount,
    );
    setFailedCount(
      orders.failedCount +
        kds.failedCount +
        orderStatus.failedCount +
        billing.failedCount,
    );
  }, []);

  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await Promise.all([
        flushQueue(),
        flushKdsQueue(),
        flushOrdersQueue(),
        flushBillingQueue(),
      ]);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  useEffect(() => {
    refreshSnapshot();
    const unsubOrders = subscribeToQueue(refreshSnapshot);
    const unsubKds = subscribeToKdsQueue(refreshSnapshot);
    const unsubOrderStatus = subscribeToOrdersQueue(refreshSnapshot);
    const unsubBilling = subscribeToBillingQueue(refreshSnapshot);
    return () => {
      unsubOrders();
      unsubKds();
      unsubOrderStatus();
      unsubBilling();
    };
  }, [refreshSnapshot]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      syncNow();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) syncNow();
    }, RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isOnline, pendingCount, failedCount, syncing, syncNow };
}
