// src/payment/components/OrderDetailModal.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Receipt, CreditCard, Trash2 } from "lucide-react";
import { getOrder } from "../../pos/api/posApi";
import { fetchWithOfflineFallback } from "../../offline/offlineCache";

const ORDER_TYPE_META = {
  DINE_IN: {
    label: "Dine In",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  TAKEAWAY: {
    label: "Takeaway",
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
  DELIVERY: {
    label: "Delivery",
    className: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
};

const PAYMENT_STATUS_META = {
  PAID: "text-emerald-600",
  UNPAID: "text-red-500",
  PARTIAL: "text-amber-600",
  OVERDUE: "text-red-600",
};

// View-only detail popup for a single order, opened from the Payments
// table's "View" action. Fetches full detail (items, add-ons, payments) via
// the same GET /pos/orders/:id the POS screen already uses for "add items
// to an existing order" — no new backend endpoint needed for viewing.
//
// `canDelete` + `onDelete` are optional: pass them (Payment.jsx does, for
// OWNER only) to also show a Delete button in the footer with its own
// confirm step, so deleting works from inside the detail view too.
export default function OrderDetailModal({
  orderId,
  onClose,
  canDelete = false,
  onDelete,
  deleting = false,
}) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    fetchWithOfflineFallback(`payments:order:${orderId}`, () =>
      getOrder(orderId),
    )
      .then(({ data, fromCache }) => {
        setOrder(data);
        setIsOffline(fromCache);
      })
      .catch((err) => setError(err.message || "Couldn't load order."))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (!orderId) return null;

  const typeBadge = order?.orderType ? ORDER_TYPE_META[order.orderType] : null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#1C3044]">
              <Receipt className="h-5 w-5" />
              {order?.orderNumber || "Order"}
            </h2>
            {typeBadge && (
              <span
                className={`mt-1 inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${typeBadge.className}`}
              >
                {typeBadge.label}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading order…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <div className="space-y-5">
              {isOffline && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                  Offline — showing last-synced order detail.
                </div>
              )}
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow
                  label="Table"
                  value={
                    order.table?.name || order.orderType?.replace("_", " ")
                  }
                />
                <InfoRow label="Status" value={order.status} />
                <InfoRow
                  label="Customer"
                  value={order.customer?.name || "Walk-in"}
                />
                <InfoRow
                  label="Guests"
                  value={order.numberOfGuests ? `${order.numberOfGuests}` : "—"}
                />
                <InfoRow
                  label="Placed"
                  value={new Date(order.createdAt).toLocaleString()}
                />
                <InfoRow
                  label="Order Type"
                  value={typeBadge?.label || order.orderType}
                />
              </div>

              {/* Items */}
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Items
                </h3>
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {(order.items || []).map((item) => (
                    <li key={item.id} className="px-3 py-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">
                          {item.menuItem?.name || "Item"} × {item.quantity}
                        </span>
                        <span className="font-mono text-slate-700">
                          ₹{Number(item.totalPrice).toFixed(2)}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          Note: {item.notes}
                        </p>
                      )}
                    </li>
                  ))}
                  {(order.items || []).length === 0 && (
                    <li className="px-3 py-2 text-sm text-slate-400">
                      No items on this order.
                    </li>
                  )}
                </ul>
              </div>

              {/* Payments */}
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <CreditCard className="h-3.5 w-3.5" />
                  Payments
                </h3>
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {(order.payments || []).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className="text-slate-600">
                        {p.method}
                        {p.paidAt
                          ? ` · ${new Date(p.paidAt).toLocaleDateString()}`
                          : ""}
                      </span>
                      <span
                        className={`font-mono font-semibold ${PAYMENT_STATUS_META[p.status] || "text-slate-700"}`}
                      >
                        ₹{Number(p.amount).toFixed(2)} · {p.status}
                      </span>
                    </li>
                  ))}
                  {(order.payments || []).length === 0 && (
                    <li className="px-3 py-2 text-sm text-slate-400">
                      No payments recorded yet.
                    </li>
                  )}
                </ul>
              </div>

              {/* Totals */}
              <div className="space-y-1 rounded-xl bg-slate-50 px-4 py-3 font-mono text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{Number(order.subtotal).toFixed(2)}</span>
                </div>
                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>−₹{Number(order.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>GST</span>
                  <span>₹{Number(order.gstAmount).toFixed(2)}</span>
                </div>
                {Number(order.serviceChargeAmount) > 0 && (
                  <div className="flex justify-between">
                    <span>Service Charge</span>
                    <span>₹{Number(order.serviceChargeAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold text-slate-900">
                  <span>Grand Total</span>
                  <span>₹{Number(order.grandTotal).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          {canDelete &&
            !isOffline &&
            order &&
            (confirmingDelete ? (
              <div className="mr-auto flex items-center gap-3 rounded-lg bg-red-50 px-3 py-2">
                <span className="text-xs font-medium text-red-600">
                  Permanently delete this order and its payments?
                </span>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onDelete(order.id)}
                  disabled={deleting}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Confirm Delete"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="mr-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Order
              </button>
            ))}
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{value ?? "—"}</p>
    </div>
  );
}
