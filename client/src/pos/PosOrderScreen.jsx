// src/pos/PosOrderScreen.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TableStrip from "./components/TableStrip";
import MenuBrowser from "./components/MenuBrowser";
import OrderTicket from "./components/OrderTicket";
import KotPrintModal from "./components/KotPrintModal";
import SuccessToast from "./components/SuccessToast";
import CounterPicker from "./components/CounterPicker";
import {
  createOrder,
  placeOrderAndSendToKitchen,
  getOnlinePlatforms,
  createOnlinePlatform,
  getKitchenBranches,
  getTablesBoard,
  getOrder,
  addItemsToOrder,
  sendToKitchen,
} from "./api/posApi";
import { placeDineInOrder } from "../offline/offlineQueue";
import { getSelectedCounterId } from "./api/counterContext";
import { fetchWithOfflineFallback } from "../offline/offlineCache";

export default function PosOrderScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Deep links from the Table View. `tableId` opens straight onto a table
  // (its View button, and tapping a blank card); `orderType` opens the
  // Delivery / Pick Up tabs. Read once on mount rather than tracked — this
  // is an entry point, not a controlled prop, and re-reading it would fight
  // the person the moment they picked a different table by hand.
  // "DELIVERY" is mapped to "ONLINE" because that's this screen's internal
  // name for the delivery tab — the server stores these as DELIVERY orders
  // tagged with a platform, but the tab, the platform picker and the
  // placement branch all key off "ONLINE". Without the mapping, a
  // ?orderType=DELIVERY link set a value no tab matched, and placeOrder
  // fell through to the dine-in path and asked for a table.
  const initialOrderType = searchParams.get("orderType");
  const [orderType, setOrderType] = useState(() => {
    if (initialOrderType === "DELIVERY" || initialOrderType === "ONLINE")
      return "ONLINE";
    if (initialOrderType === "TAKEAWAY") return "TAKEAWAY";
    return "DINE_IN";
  });

  // Online Orders (Swiggy, Zomato, etc.) — the platform list is fetched
  // once on mount (not just when the ONLINE tab is active) so switching
  // to that tab doesn't show an empty dropdown for a beat while it loads.
  const [onlinePlatforms, setOnlinePlatforms] = useState([]);
  // ?platformId= comes from the Table View's per-platform "New Swiggy" /
  // "New Zomato" tiles, so the picker is already filled in on arrival.
  const [selectedPlatformId, setSelectedPlatformId] = useState(
    () => searchParams.get("platformId") || "",
  );

  // Kitchen Branches — the physical kitchens this outlet has configured.
  // Order whose kitchen ticket should be printed. Dine-in and online set
  // this the instant the order reaches the kitchen; takeaway doesn't, since
  // its ticket is printed from Billing after payment.
  const [printKotOrderId, setPrintKotOrderId] = useState(null);

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

  // Which floor tab TableStrip should open on, so a deep-linked table is
  // visible in the strip rather than selected-but-offscreen under another
  // floor. Null until the board resolves the table.
  const [deepLinkFloorId, setDeepLinkFloorId] = useState(null);

  // Resolve ?tableId= into the full table object TableStrip's onSelect would
  // otherwise have handed over. The board is the same call TableStrip makes,
  // so this costs one extra request on a deep link and nothing at all
  // otherwise.
  useEffect(() => {
    const deepLinkTableId = searchParams.get("tableId");
    if (!deepLinkTableId) return;

    let cancelled = false;

    // Reads the board TableStrip is already fetching for this floor rather
    // than issuing a second full-board request. It's the same cache key, so
    // on a warm cache this costs nothing; previously this was a duplicate
    // fetch of every table in the building to identify one of them, racing
    // TableStrip's own fetch on page load.
    fetchWithOfflineFallback("pos:tables-board", getTablesBoard)
      .then(({ data }) => {
        if (cancelled) return;
        const table = (data || []).find((t) => t.id === deepLinkTableId);
        if (!table) return;
        setSelectedTable(table);
        setDeepLinkFloorId(table.floorId || null);
      })
      // A stale link (table since deleted) or a failed board just means the
      // screen opens with nothing selected, which is the normal POS state.
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // Mount-only: see the note on initialOrderType above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ==========================================
  // THE ORDER ALREADY OPEN ON THIS TABLE
  // ==========================================
  //
  // Selecting an occupied table used to start a blank ticket, so a second
  // round became a second order on the same table and the guests got two
  // bills. Now the open order is fetched and shown, and anything added
  // joins it.
  //
  // The board's `table.order` is a summary (id, totals, kitchen status) with
  // no line items, so it tells us WHICH order to load but not what's on it —
  // hence the getOrder call rather than reading the board object directly.

  const [existingOrder, setExistingOrder] = useState(null);
  const [loadingExistingOrder, setLoadingExistingOrder] = useState(false);

  // Bumped by placeOrder to re-pull the order after items are added, so the
  // "Already ordered" list includes the round that was just sent without a
  // manual refresh.
  const [orderReloadKey, setOrderReloadKey] = useState(0);

  // Set by ?orderId= — the Table View's Takeaway and Delivery cards link
  // straight to an order rather than to a table.
  const deepLinkOrderId = searchParams.get("orderId");

  const existingOrderId = deepLinkOrderId || selectedTable?.order?.id || null;

  useEffect(() => {
    if (!existingOrderId) {
      setExistingOrder(null);
      return;
    }

    let cancelled = false;
    setLoadingExistingOrder(true);

    getOrder(existingOrderId)
      .then((order) => {
        if (cancelled) return;
        setExistingOrder(order);

        // A deep-linked takeaway or delivery order has to bring its own
        // context with it — nothing else on this screen knows the order
        // type, and the tab would otherwise sit on Dine In.
        if (deepLinkOrderId && order) {
          if (order.orderType === "TAKEAWAY") setOrderType("TAKEAWAY");
          else if (order.orderType === "DELIVERY") {
            setOrderType("ONLINE");
            if (order.onlinePlatformId)
              setSelectedPlatformId(order.onlinePlatformId);
          }
          if (order.kitchenBranchId)
            setSelectedKitchenBranchId(order.kitchenBranchId);
        }
      })
      // A closed or deleted order just means a blank ticket, which is the
      // normal state of this screen.
      .catch(() => {
        if (!cancelled) setExistingOrder(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingExistingOrder(false);
      });

    return () => {
      cancelled = true;
    };
  }, [existingOrderId, deepLinkOrderId, orderReloadKey]);

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
      // ==========================================
      // ADDING TO AN ORDER THAT'S ALREADY OPEN
      // ==========================================
      //
      // Checked before any of the order-type branches below, because it
      // applies to all of them — a second round on a table, an item added
      // to a takeaway before it's paid, a substitution on a delivery order.
      // None of those should mint a new order.
      //
      // Two calls rather than one: addItemsToOrder returns the new
      // OrderItem ids, and sendToKitchen needs exactly those ids so the
      // KOT covers the new round only and not everything on the table
      // again.
      if (existingOrder) {
        const { newItems } = await addItemsToOrder(existingOrder.id, items);
        const newItemIds = (newItems || []).map((i) => i.id);

        // An unpaid takeaway follows the same rule as a new one: the
        // kitchen doesn't start on food nobody has paid for yet. Adding to
        // it re-prices the order and hands back to Billing, which sends
        // everything to the kitchen once payment clears.
        const isUnpaidTakeaway =
          existingOrder.orderType === "TAKEAWAY" &&
          existingOrder.status !== "COMPLETED";

        if (isUnpaidTakeaway) {
          setCart([]);
          navigate(`/billing?orderId=${existingOrder.id}`);
          return;
        }

        if (newItemIds.length > 0) {
          await sendToKitchen(existingOrder.id, newItemIds);
          setPrintKotOrderId(existingOrder.id);
        }

        setLastOrder(existingOrder);
        setShowSuccessToast(true);
        setCart([]);
        // Re-pull the order so "Already ordered" includes this round.
        setOrderReloadKey((n) => n + 1);
        return;
      }

      if (orderType === "TAKEAWAY") {
        // Takeaway is NOT offline-capable (see offlineQueue.js's file
        // header) — billing needs live payment-gateway state, so this
        // always goes straight to the network and hands off to Billing
        // immediately.
        //
        // Deliberately createOrder, NOT placeOrderAndSendToKitchen:
        // takeaway is paid up front, and the kitchen shouldn't start
        // cooking food that hasn't been paid for and might be abandoned at
        // the counter. The send-to-kitchen and the KOT print both happen in
        // Billings.jsx the moment payment clears.
        //
        // (This deliberately reverses an earlier change that sent takeaway
        // at placement time. That was made so takeaway would appear on the
        // Kitchen Display at all — it still does, just from payment onward
        // rather than from order entry.)
        const order = await createOrder({
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
        // Online orders go straight to the kitchen, so the ticket prints now.
        setPrintKotOrderId(order.id);
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
        // Placed offline: there's no server order id yet, so there are no
        // KitchenOrder rows to fetch and print. The ticket prints from the
        // Kitchen Display once the order syncs.
        setError(null); // not an error state — informational, shown via the toast
      } else {
        // Dine-in went to the kitchen atomically with the order, so print now.
        setPrintKotOrderId(order.id);
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
          <TableStrip
            selectedTableId={tableId}
            initialFloorId={deepLinkFloorId}
            onSelect={setSelectedTable}
          />
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 md:grid-cols-[1fr_360px]">
        {/* No padding: the category rail runs the full height of this
            panel, flush to its left edge. MenuBrowser pads its own item
            grid instead. */}
        <div className="min-h-0 overflow-hidden rounded-2xl border border-[#E7EAE1] bg-white dark:border-[#262B24] dark:bg-[#171C17]">
          <MenuBrowser onAddItem={addItem} />
        </div>

        {printKotOrderId && (
          <KotPrintModal
            key={printKotOrderId}  // ← Add this
            orderId={printKotOrderId}
            onClose={() => setPrintKotOrderId(null)}
          />
        )}

        <OrderTicket
          orderType={orderType}
          onChangeOrderType={setOrderType}
          tableSelected={!!tableId}
          kitchenBranches={kitchenBranches}
          selectedKitchenBranchId={selectedKitchenBranchId}
          onChangeKitchenBranch={setSelectedKitchenBranchId}
          existingOrder={existingOrder}
          loadingExistingOrder={loadingExistingOrder}
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