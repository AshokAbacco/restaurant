// src/pos/PosOrderScreen.jsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TableStrip from "./components/TableStrip";
import MenuBrowser from "./components/MenuBrowser";
import OrderTicket from "./components/OrderTicket";
import SuccessToast from "./components/SuccessToast";
import { createOrder, sendToKitchen } from "./api/posApi";

export default function PosOrderScreen() {
  const navigate = useNavigate();
  const [orderType, setOrderType] = useState("DINE_IN");
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
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function addItem(menuItem) {
    setCart((prev) => {
      // Only merge into an existing plain line (no add-ons yet) — once a
      // line has add-ons it's no longer interchangeable with a fresh tap.
      const existing = prev.find((i) => i.menuItemId === menuItem.id && (i.addOns || []).length === 0);
      if (existing) {
        return prev.map((i) =>
          i.cartLineId === existing.cartLineId ? { ...i, quantity: i.quantity + 1 } : i
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
          quantity: 1,
          notes: "",
          addOns: [],
        },
      ];
    });
  }

  function increment(cartLineId) {
    setCart((prev) => prev.map((i) => (i.cartLineId === cartLineId ? { ...i, quantity: i.quantity + 1 } : i)));
  }

  function decrement(cartLineId) {
    setCart((prev) =>
      prev
        .map((i) => (i.cartLineId === cartLineId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function remove(cartLineId) {
    setCart((prev) => prev.filter((i) => i.cartLineId !== cartLineId));
  }

  function setNote(cartLineId, notes) {
    setCart((prev) => prev.map((i) => (i.cartLineId === cartLineId ? { ...i, notes } : i)));
  }

  function editAddOns(cartLineId, addOns) {
    setCart((prev) => prev.map((i) => (i.cartLineId === cartLineId ? { ...i, addOns } : i)));
  }

  async function placeOrder() {
    if (submittingRef.current) return; // already in flight — ignore the extra click
    submittingRef.current = true;
    setError(null);
    setPlacing(true);
    try {
      const order = await createOrder({
        orderType,
        tableId: orderType === "DINE_IN" ? tableId : undefined,
        store: "Main Store",
        items: cart.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          notes: i.notes || undefined,
          ...(i.addOns && i.addOns.length
            ? { addOns: i.addOns.map((a) => ({ addOnId: a.addOnId, quantity: a.quantity })) }
            : {}),
        })),
      });

      if (orderType === "TAKEAWAY") {
        // Takeaway orders bill before they cook: hand off to the Billing
        // page now, and the order only gets fired to the kitchen there,
        // once payment has actually gone through.
        setCart([]);
        navigate(`/billing?orderId=${order.id}`);
        return;
      }

      // Dine-in: fire every item straight to the kitchen on placement, as before.
      const orderItemIds = order.items.map((i) => i.id);
      if (orderItemIds.length) {
        await sendToKitchen(order.id, orderItemIds);
      }

      setLastOrder(order);
      setShowSuccessToast(true);
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
    <div className="flex h-screen flex-col bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-3">
        <h1 className="font-mono text-lg font-bold text-stone-900">POS · New Order</h1>
      </header>

      <SuccessToast
        show={showSuccessToast}
        message={lastOrder ? `Order ${lastOrder.orderNumber}` : undefined}
        onClose={() => setShowSuccessToast(false)}
      />

      {orderType === "DINE_IN" && (
        <div className="border-b border-stone-200 bg-white px-6 py-3">
          <TableStrip selectedTableId={tableId} onSelect={setSelectedTable} />
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 md:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white p-4">
          <MenuBrowser onAddItem={addItem} />
        </div>

        <OrderTicket
          orderType={orderType}
          onChangeOrderType={setOrderType}
          tableSelected={!!tableId}
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