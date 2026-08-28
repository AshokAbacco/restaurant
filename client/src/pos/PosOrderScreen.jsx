// src/pos/PosOrderScreen.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TableStrip from "./components/TableStrip";
import MenuBrowser from "./components/MenuBrowser";
import OrderTicket from "./components/OrderTicket";
import SuccessToast from "./components/SuccessToast";
import CounterPicker from "./components/CounterPicker";
import {
  createOrder,
  placeOrderAndSendToKitchen,
  getOnlinePlatforms,
  createOnlinePlatform,
  getKitchenBranches,
} from "./api/posApi";
import { placeDineInOrder } from "../offline/offlineQueue";
import { getSelectedCounterId } from "./api/counterContext";

export default function PosOrderScreen() {
  const navigate = useNavigate();
  const [orderType, setOrderType] = useState("DINE_IN");

  // Online Orders (Swiggy, Zomato, etc.) — the platform list is fetched
  // once on mount (not just when the ONLINE tab is active) so switching
  // to that tab doesn't show an empty dropdown for a beat while it loads.
  const [onlinePlatforms, setOnlinePlatforms] = useState([]);
  const [selectedPlatformId, setSelectedPlatformId] = useState("");

  // Kitchen Branches — the physical kitchens this outlet has configured.
  const [kitchenBranches, setKitchenBranches] = useState([]);
  const [selectedKitchenBranchId, setSelectedKitchenBranchId] = useState("");

  useEffect(() => {
    getKitchenBranches()
      .then((branches) => {
        const list = Array.isArray(branches) ? branches : [];
        setKitchenBranches(list);
        // With exactly one kitchen there's no decision to make, so preselect
        // it. That's what keeps this feature invisible to single-kitchen
        // restaurants — OrderTicket only *requires* a choice when
        // kitchenBranches.length > 1.
        if (list.length === 1) setSelectedKitchenBranchId(list[0].id);
      })
      .catch(() => setKitchenBranches([]));
  }, []);
  const [addingPlatform, setAddingPlatform] = useState(false);

  useEffect(() => {
    getOnlinePlatforms({ activeOnly: true })
      .then(setOnlinePlatforms)
      .catch(() => setOnlinePlatforms([]));
  }, []);

  async function handleAddPlatform(name) {
    setAddingPlatform(true);
    try {
      const platform = await createOnlinePlatform({ name });
      setOnlinePlatforms((prev) => [...prev, platform].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedPlatformId(platform.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingPlatform(false);
    }
  }
  // TableStrip's onSelect now hands back the FULL table object (id, status,
  // and its active order if occupied) — not just an id string. Keep the
  // whole object here since we'll need table.order shortly to support
  // "add items to an existing order"; derive a plain id below for anything
  // that only needs the id (the API payload, and the selectedTableId prop
  // TableStrip uses to highlight the active selection).
  const [selectedTable, setSelectedTable] = useState(null);
  const tableId = selectedTable?.id ?? null;
  const [cart, setCart] = useState([]);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  // A ref (not state) because state updates are async and a fast double-click
  // can fire both handlers before a re-render disables the button. The ref
  // updates immediately, so the second click bails out synchronously.
  const submittingRef = useRef(false);

  // OrderTicket identifies every cart row by `cartLineId` (not menuItemId —
  // two lines can share a menuItemId once add-ons make them distinct). Use
  // crypto.randomUUID when it's available and fall back to a manual id.
  function makeCartLineId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID)
      return crypto.randomUUID();
    return `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function addItem(menuItem) {
    setCart((prev) => {
      // Only merge into an existing plain line (no add-ons yet) — once a
      // line has add-ons it's no longer interchangeable with a fresh tap.
      const existing = prev.find(
        (i) => i.menuItemId === menuItem.id && (i.addOns || []).length === 0,
      );
      if (existing) {
        return prev.map((i) =>
          i.cartLineId === existing.cartLineId
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [
        ...prev,
        {
          cartLineId: makeCartLineId(),
          menuItemId: menuItem.id,
          name: menuItem.name,
          sellingPrice: Number(menuItem.sellingPrice),
          gstPercent: Number(menuItem.gstPercent || 0),
          // Kept only for the offline Kitchen Display preview ticket (see
          // getQueuedKots() in offline/offlineQueue.js) — never sent to
          // the server, which derives the section itself from the
          // MenuItem record. menuItem.kitchenSection comes from the
          // backend's `include: { kitchenSection: true }` on GET /menu.
          kitchenSectionId:
            menuItem.kitchenSectionId || menuItem.kitchenSection?.id || null,
          kitchenSectionName: menuItem.kitchenSection?.name || null,
          quantity: 1,
          notes: "",
          addOns: [],
        },
      ];
    });
  }

  function increment(cartLineId) {
    setCart((prev) =>
      prev.map((i) =>
        i.cartLineId === cartLineId ? { ...i, quantity: i.quantity + 1 } : i,
      ),
    );
  }

  function decrement(cartLineId) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.cartLineId === cartLineId ? { ...i, quantity: i.quantity - 1 } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }

  function remove(cartLineId) {
    setCart((prev) => prev.filter((i) => i.cartLineId !== cartLineId));
  }

  function setNote(cartLineId, notes) {
    setCart((prev) =>
      prev.map((i) => (i.cartLineId === cartLineId ? { ...i, notes } : i)),
    );
  }

  function editAddOns(cartLineId, addOns) {
    setCart((prev) =>
      prev.map((i) => (i.cartLineId === cartLineId ? { ...i, addOns } : i)),
    );
  }

  async function placeOrder() {
    if (submittingRef.current) return; // already in flight — ignore the extra click
    submittingRef.current = true;
    setError(null);
    setPlacing(true);

    const items = cart.map((i) => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      notes: i.notes || undefined,
      ...(i.addOns && i.addOns.length
        ? {
            addOns: i.addOns.map((a) => ({
              addOnId: a.addOnId,
              quantity: a.quantity,
            })),
          }
        : {}),
    }));

    try {
      if (orderType === "TAKEAWAY") {
        // Takeaway is NOT offline-capable (see offlineQueue.js's file
        // header) — billing needs live payment-gateway state, so this
        // always goes straight to the network and hands off to Billing
        // immediately, same as before.
        //
        // FIX: was calling createOrder() alone here, which never sends
        // the order to the kitchen — Takeaway orders sat at status NEW
        // with no KitchenOrder ever created, so they never showed up on
        // the Kitchen Display at all (unlike Dine In, which already went
        // through the atomic create+send-to-kitchen call via
        // placeDineInOrder below). Switching to
        // placeOrderAndSendToKitchen gives it the same KOT — and the
        // same Ready/Served flow — as Dine In, while still handing off
        // to Billing immediately after.
        const order = await placeOrderAndSendToKitchen({
          orderType,
          counterId: getSelectedCounterId(),
          kitchenBranchId: selectedKitchenBranchId || null,
          items,
        });
        setCart([]);
        navigate(`/billing?orderId=${order.id}`);
        return;
      }

      if (orderType === "ONLINE") {
        // Online Orders: the backend's OrderType enum has no separate
        // "ONLINE" value — it's recorded as a normal DELIVERY order,
        // tagged with which platform via onlinePlatformId. "ONLINE" only
        // exists as a UI-level distinction (a third tab) on top of that.
        if (!selectedPlatformId) {
          throw new Error("Select which platform this order is from.");
        }
        // FIX: online/delivery orders should land on the Kitchen Display
        // like Dine In, NOT jump straight to Billing — payment for these
        // is collected separately (on delivery, or whenever the platform
        // settles), not at order-placement time. So this now mirrors the
        // Dine In success path below (toast + clear cart, stay on this
        // screen) instead of navigating to /billing.
        const order = await placeOrderAndSendToKitchen({
          orderType: "DELIVERY",
          counterId: getSelectedCounterId(),
          onlinePlatformId: selectedPlatformId,
          kitchenBranchId: selectedKitchenBranchId || null,
          items,
        });
        setLastOrder(order);
        setShowSuccessToast(true);
        setCart([]);
        setSelectedPlatformId("");
        return;
      }

      // Display-only metadata for the Kitchen Display Screen to render a
      // "this order exists, still syncing" ticket while offline — never
      // sent to the server (see placeDineInOrder's ticketMeta param and
      // getQueuedKots() in offline/offlineQueue.js).
      const ticketMeta = {
        orderType,
        tableName: selectedTable?.name || null,
        kitchenBranchId: selectedKitchenBranchId || null,
        kitchenBranchName:
          kitchenBranches.find((k) => k.id === selectedKitchenBranchId)?.name ||
          null,
        items: cart.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          notes: i.notes || null,
          sellingPrice: i.sellingPrice,
          kitchenSectionId: i.kitchenSectionId,
          kitchenSectionName: i.kitchenSectionName,
        })),
      };

      // Dine-in: goes through the offline queue. placeDineInOrder tries the
      // real network call first (the same atomic create+send-to-kitchen
      // endpoint as before, just as one call instead of two) and only
      // falls back to the local IndexedDB queue on a genuine connectivity
      // failure — see offlineQueue.js.
      const { order, queuedOffline } = await placeDineInOrder(
        {
          orderType,
          tableId,
          counterId: getSelectedCounterId(),
          kitchenBranchId: selectedKitchenBranchId || null,
          items,
        },
        ticketMeta,
      );

      setLastOrder(order);
      setShowSuccessToast(true);
      if (queuedOffline) {
        setError(null); // this isn't an error state — just informational, shown via the toast message
      }
      setCart([]);
      setSelectedTable(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
      submittingRef.current = false;
    }
  }

  return (
    <div className="flex h-screen flex-col bg-[#F3F5EE] dark:bg-[#12160F]">
      <header className="flex items-center justify-between border-b border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] px-6 py-3">
        <h1 className="font-mono text-lg font-bold text-[#1F2937] dark:text-white">
          POS · New Order
        </h1>
        <CounterPicker />
      </header>

      <SuccessToast
        show={showSuccessToast}
        title={
          lastOrder?.status === "QUEUED_OFFLINE"
            ? "Order saved on this device"
            : undefined
        }
        message={
          lastOrder?.status === "QUEUED_OFFLINE"
            ? "No connection — it'll sync to the kitchen automatically once you're back online."
            : lastOrder
              ? `Order ${lastOrder.orderNumber}`
              : undefined
        }
        onClose={() => setShowSuccessToast(false)}
      />

      {orderType === "DINE_IN" && (
        <div className="border-b border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] px-6 py-3">
          <TableStrip selectedTableId={tableId} onSelect={setSelectedTable} />
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 md:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] p-4">
          <MenuBrowser onAddItem={addItem} />
        </div>

        <OrderTicket
          orderType={orderType}
          onChangeOrderType={setOrderType}
          tableSelected={!!tableId}
          kitchenBranches={kitchenBranches}
          selectedKitchenBranchId={selectedKitchenBranchId}
          onChangeKitchenBranch={setSelectedKitchenBranchId}
          onlinePlatforms={onlinePlatforms}
          selectedPlatformId={selectedPlatformId}
          onChangePlatform={setSelectedPlatformId}
          onAddPlatform={handleAddPlatform}
          addingPlatform={addingPlatform}
          cart={cart}
          onIncrement={increment}
          onDecrement={decrement}
          onRemove={remove}
          onNoteChange={setNote}
          onEditAddOns={editAddOns}
          onPlaceOrder={placeOrder}
          placing={placing}
          error={error}
        />
      </div>
    </div>
  );
}