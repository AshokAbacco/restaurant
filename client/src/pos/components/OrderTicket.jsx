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

  const canPlace = cart.length > 0 && (orderType !== "DINE_IN" || tableSelected) && !placing;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231D] shadow-sm">
      <div className="relative border-b border-dashed border-[#E7EAE1] dark:border-[#262B24] px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#9CA8A0]">
            Order Ticket
          </h2>
          <span className="rounded-lg bg-[#EAF6EC] dark:bg-[#43B75A]/10 px-2 py-0.5 font-mono text-xs font-semibold text-[#3FA34D] dark:text-[#43B75A]">
            NEW
          </span>
        </div>

        <div className="mt-3 flex gap-1.5">
          {["DINE_IN", "TAKEAWAY"].map((type) => (
            <button
              key={type}
              onClick={() => onChangeOrderType(type)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                orderType === type
                  ? "bg-[#3FA34D] text-white dark:bg-[#43B75A]"
                  : "bg-[#F3F5EE] dark:bg-white/5 text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#E7EAE1] dark:hover:bg-white/10"
              }`}
            >
              {type.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {cart.length === 0 ? (
          <p className="mt-8 text-center text-sm text-[#9CA3AF] dark:text-[#6B7280]">
            Tap a dish to add it to this ticket.
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
          {orderType === "TAKEAWAY"
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