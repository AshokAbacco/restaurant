// src/pos/components/OrderTicket.jsx
import { useState } from "react";
import AddOnPickerModal from "./AddOnPickerModal";

function lineAddOnTotal(item) {
  return (item.addOns || []).reduce((sum, a) => sum + Number(a.price) * a.quantity, 0);
}

export default function OrderTicket({
  orderType,
  onChangeOrderType,
  tableSelected,
  // Online Orders (Swiggy, Zomato, etc.) — all optional; the ticket works
  // exactly as before when a parent doesn't pass these.
  onlinePlatforms = [],
  selectedPlatformId,
  onChangePlatform,
  onAddPlatform,
  addingPlatform = false,
  // Kitchen Branches — the PHYSICAL kitchen this order goes to ("Ground
  // Floor Kitchen"). Applies to every order type, not just dine-in.
  // Optional: an outlet that hasn't created any kitchens passes an empty
  // list and the picker doesn't render at all.
  kitchenBranches = [],
  selectedKitchenBranchId,
  onChangeKitchenBranch,
  // The order already open on this table / counter, if any. When set, this
  // ticket is adding to it rather than starting a new one: its already-sent
  // items render above the cart as a read-only block, and the button changes
  // from "Send to Kitchen" to "Add to Order".
  existingOrder = null,
  loadingExistingOrder = false,
  cart,
  onIncrement,
  onDecrement,
  onRemove,
  onNoteChange,
  onEditAddOns,
  onPlaceOrder,
  placing,
  error,
}) {
  const [editingLine, setEditingLine] = useState(null);

  const subtotal = cart.reduce(
    (sum, i) => sum + (Number(i.sellingPrice) + lineAddOnTotal(i)) * i.quantity,
    0
  );
  const gst = cart.reduce(
    (sum, i) => sum + (Number(i.sellingPrice) * i.quantity * (i.gstPercent || 0)) / 100,
    0
  );
  const total = subtotal + gst;

  // Only force a kitchen choice when there's actually a choice to make. With
  // zero kitchens configured the feature is dormant; with exactly one the
  // parent preselects it, so this never blocks a single-kitchen restaurant.
  const kitchenRequired = kitchenBranches.length > 1;

  const canPlace =
    cart.length > 0 &&
    (orderType !== "DINE_IN" || tableSelected) &&
    (orderType !== "ONLINE" || !!selectedPlatformId) &&
    (!kitchenRequired || !!selectedKitchenBranchId) &&
    !placing;

  const [newPlatformName, setNewPlatformName] = useState("");
  const [showAddPlatform, setShowAddPlatform] = useState(false);

  async function handleAddPlatform() {
    const name = newPlatformName.trim();
    if (!name || !onAddPlatform) return;
    await onAddPlatform(name);
    setNewPlatformName("");
    setShowAddPlatform(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231D] shadow-sm">
      <div className="relative border-b border-dashed border-[#E7EAE1] dark:border-[#262B24] px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#9CA8A0]">
            Order Ticket
          </h2>
          {/* Which order you're about to affect is the single most
              important thing on this panel — adding a round to table 12's
              open bill and starting a fresh one look identical otherwise. */}
          <span
            className={`rounded-lg px-2 py-0.5 font-mono text-xs font-semibold ${
              existingOrder
                ? "bg-[#E8F4FB] text-[#1B6E9C] dark:bg-[#4AA8E0]/10 dark:text-[#6FC0EA]"
                : "bg-[#EAF6EC] text-[#3FA34D] dark:bg-[#43B75A]/10 dark:text-[#43B75A]"
            }`}
          >
            {existingOrder ? existingOrder.orderNumber : "NEW"}
          </span>
        </div>

        <div className="mt-3 flex gap-1.5">
          {["DINE_IN", "TAKEAWAY", "ONLINE"].map((type) => (
            <button
              key={type}
              onClick={() => onChangeOrderType(type)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                orderType === type
                  ? "bg-[#3FA34D] text-white dark:bg-[#43B75A]"
                  : "bg-[#F3F5EE] dark:bg-white/5 text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#E7EAE1] dark:hover:bg-white/10"
              }`}
            >
              {/* "ONLINE" is kept as the internal tab value because the
                  server records these as DELIVERY orders tagged with a
                  platform, and several call sites branch on it. Only the
                  label changes. */}
              {{ DINE_IN: "DINE IN", TAKEAWAY: "TAKEAWAY", ONLINE: "DELIVERY" }[type]}
            </button>
          ))}
        </div>

        {/* Kitchen picker — shown for EVERY order type (dine-in, takeaway,
            delivery, online), since all of them get cooked somewhere. Hidden
            entirely when the outlet has no kitchens configured, so nothing
            changes for restaurants that don't use this. */}
        {kitchenBranches.length > 0 && (
          <div className="mt-2.5">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
              Send to kitchen
            </label>
            <select
              value={selectedKitchenBranchId || ""}
              onChange={(e) => onChangeKitchenBranch?.(e.target.value)}
              className="w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#262B24] px-2 py-1.5 text-xs text-[#1F2937] dark:text-white focus:border-[#3FA34D] focus:outline-none dark:focus:border-[#43B75A]"
            >
              <option value="" disabled>
                Select kitchen…
              </option>
              {kitchenBranches.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                  {k.floor?.name ? ` · ${k.floor.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Delivery — which platform the order came from. Only on that tab. */}
        {orderType === "ONLINE" && (
          <div className="mt-2.5">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
              Delivery platform
            </label>
            <div className="flex gap-1.5">
              <select
                value={selectedPlatformId || ""}
                onChange={(e) => onChangePlatform?.(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#262B24] px-2 py-1.5 text-xs text-[#1F2937] dark:text-white focus:border-[#3FA34D] focus:outline-none dark:focus:border-[#43B75A]"
              >
                <option value="" disabled>
                  Select platform…
                </option>
                {onlinePlatforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddPlatform((v) => !v)}
                className="shrink-0 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] px-2.5 py-1.5 text-xs font-semibold text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
              >
                + New
              </button>
            </div>

            {showAddPlatform && (
              <div className="mt-1.5 flex gap-1.5">
                <input
                  value={newPlatformName}
                  onChange={(e) => setNewPlatformName(e.target.value)}
                  placeholder="e.g. Swiggy, Zomato"
                  className="min-w-0 flex-1 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#262B24] px-2 py-1.5 text-xs text-[#1F2937] dark:text-white placeholder:text-[#9CA3AF] focus:border-[#3FA34D] focus:outline-none dark:focus:border-[#43B75A]"
                />
                <button
                  type="button"
                  onClick={handleAddPlatform}
                  disabled={addingPlatform || !newPlatformName.trim()}
                  className="shrink-0 rounded-lg bg-[#3FA34D] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#358F42] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#43B75A]"
                >
                  {addingPlatform ? "Adding…" : "Add"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {/* ============ ALREADY ON THIS ORDER ============ */}

        {/* Read-only on purpose. These items are already cooking or eaten —
            a stray tap on a quantity stepper here would silently disagree
            with a KOT the kitchen already has on the rail. Changing them is
            a void, which belongs in Billing where it's recorded. */}
        {loadingExistingOrder && (
          <p className="mb-3 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
            Loading what's already on this table…
          </p>
        )}

        {existingOrder?.items?.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
                Already ordered
              </h3>
              <span className="font-mono text-[10px] text-[#9CA3AF] dark:text-[#6B7280]">
                ₹{Number(existingOrder.grandTotal || 0).toFixed(2)}
              </span>
            </div>

            <ul className="space-y-1.5 rounded-lg bg-[#F3F5EE] px-3 py-2 dark:bg-white/5">
              {existingOrder.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-2 text-xs text-[#6B7280] dark:text-[#9CA8A0]"
                >
                  <span className="min-w-0">
                    <span className="font-mono">{item.quantity}×</span>{" "}
                    {item.menuItem?.name || item.name}
                    {item.notes && (
                      <span className="block italic text-[#9CA3AF] dark:text-[#6B7280]">
                        {item.notes}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono">
                    ₹{Number(item.totalPrice || 0).toFixed(0)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ============ NEW ITEMS ============ */}

        {cart.length === 0 ? (
          <p className="mt-8 text-center text-sm text-[#9CA3AF] dark:text-[#6B7280]">
            {existingOrder
              ? "Tap a dish to add another round to this order."
              : "Tap a dish to add it to this ticket."}
          </p>
        ) : (
          <ul className="space-y-3">
            {cart.map((item) => {
              const addOns = item.addOns || []; // ✅ never trust it's defined
              const addOnTotal = lineAddOnTotal(item);
              const lineTotal = (Number(item.sellingPrice) + addOnTotal) * item.quantity;
              const hasAddOns = addOns.length > 0;

              return (
                <li key={item.cartLineId} className="border-b border-[#E7EAE1] dark:border-[#262B24] pb-3 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-[#1F2937] dark:text-white">{item.name}</span>
                    <span className="font-mono text-sm font-semibold text-[#1F2937] dark:text-white">
                      ₹{Number(item.sellingPrice).toFixed(0)}
                    </span>
                  </div>

                  {hasAddOns && (
                    <ul className="mt-1 space-y-0.5">
                      {addOns.map((a) => (
                        <li key={a.addOnId} className="flex justify-between text-xs text-[#6B7280] dark:text-[#9CA8A0]">
                          <span>
                            + {a.name} × {a.quantity}
                          </span>
                          <span className="font-mono">₹{(Number(a.price) * a.quantity).toFixed(0)}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {hasAddOns && (
                    <div className="mt-1 flex justify-between border-t border-dotted border-[#E7EAE1] dark:border-[#262B24] pt-1 text-xs font-semibold text-[#6B7280] dark:text-[#9CA8A0]">
                      <span>Line total</span>
                      <span className="font-mono">₹{lineTotal.toFixed(0)}</span>
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-[#E7EAE1] dark:border-[#262B24]">
                      <button
                        onClick={() => onDecrement(item.cartLineId)}
                        className="px-2 py-0.5 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
                      >
                        −
                      </button>
                      <span className="px-2 font-mono text-sm text-[#1F2937] dark:text-white">{item.quantity}</span>
                      <button
                        onClick={() => onIncrement(item.cartLineId)}
                        className="px-2 py-0.5 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => setEditingLine(item)}
                      className="text-xs text-[#3FA34D] dark:text-[#43B75A] hover:underline"
                    >
                      Add-ons
                    </button>
                    <button
                      onClick={() => onRemove(item.cartLineId)}
                      className="text-xs text-red-500 dark:text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    value={item.notes}
                    onChange={(e) => onNoteChange(item.cartLineId, e.target.value)}
                    placeholder="Add a note (e.g. less spicy)"
                    className="mt-1.5 w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#262B24] px-2 py-1 text-xs text-[#6B7280] dark:text-[#9CA8A0] focus:border-[#3FA34D] focus:outline-none dark:focus:border-[#43B75A]"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-dashed border-[#E7EAE1] dark:border-[#262B24] px-4 py-3">
        <div className="space-y-1 font-mono text-sm text-[#6B7280] dark:text-[#9CA8A0]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>GST</span>
            <span>₹{gst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-[#1F2937] dark:text-white">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>

        {error && (
          <p className="mt-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          onClick={onPlaceOrder}
          disabled={!canPlace}
          className="mt-3 w-full rounded-lg bg-[#3FA34D] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#358F42] disabled:cursor-not-allowed disabled:bg-[#9CA3AF] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] dark:disabled:bg-[#6B7280]"
        >
          {existingOrder
            ? placing
              ? "Adding to order…"
              : "Add to Order"
            : orderType === "TAKEAWAY" || orderType === "ONLINE"
              ? placing
                ? "Proceeding to billing…"
                : "Proceed to Billing"
              : placing
                ? "Placing order…"
                : "Send to Kitchen"}
        </button>
      </div>

      {editingLine && (
        <AddOnPickerModal
          menuItem={{ name: editingLine.name }}
          // ✅ guarded — this was the likely crash point
          initialSelection={(editingLine.addOns || []).map((a) => ({
            addOnId: a.addOnId,
            quantity: a.quantity,
          }))}
          onConfirm={(addOns) => {
            onEditAddOns(editingLine.cartLineId, addOns);
            setEditingLine(null);
          }}
          onClose={() => setEditingLine(null)}
        />
      )}
    </div>
  );
}