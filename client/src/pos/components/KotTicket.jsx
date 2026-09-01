// src/pos/components/KotTicket.jsx
//
// ONE kitchen ticket per order, listing every item together.
//
// The database still creates one KitchenOrder per kitchen section (that's
// what drives station routing and the Kitchen Display's station tabs), but
// the printed slip merges them: a Beverage ticket and a Grill ticket for the
// same order used to print as two separate slips, which doubled the paper and
// made one order look like two jobs.
//
// DELIBERATELY CARRIES NO MONEY. No unit price, line total, subtotal, tax,
// discount or payment. A kitchen slip showing prices invites being handed to
// a customer as a bill. listKotsForOrder enforces this at the data layer too,
// selecting order fields explicitly rather than `order: true`.
import { ensurePrintStyles } from "../../print/printing";
import { useEffect } from "react";

const ORDER_TYPE_LABEL = {
  DINE_IN: "DINE IN",
  TAKEAWAY: "TAKEAWAY",
  DELIVERY: "DELIVERY",
};

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(value) {
  return new Date(value)
    .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    .toUpperCase();
}

const Line = () => <div className="my-1.5 border-t border-dashed border-black" />;

// `active` marks this as THE element to print (see print/printing.js). Only
// one printable component may be active at a time, which is what stops the
// bill and the ticket ending up on the same job.
export default function KotTicket({ kots = [], active = true }) {
  useEffect(() => {
    ensurePrintStyles();
  }, []);

  if (kots.length === 0) return null;

  // Merge every station's ticket into one slip. Items keep the order they
  // were sent in; the KOT number shown is the first (lowest), which is the
  // reference staff quote.
  const primary = kots[0];
  const order = primary.order || {};
  const lines = kots.flatMap((k) => k.items || []);
  const totalItems = lines.reduce((sum, l) => sum + (l.quantity || 0), 0);
  const stampedAt = primary.printedAt || primary.createdAt;

  const meta = [
    ["KOT No", primary.kotNumber],
    ["Order No", order.orderNumber],
    ["Order Type", ORDER_TYPE_LABEL[order.orderType] || order.orderType],
    order.table?.name ? ["Table", order.table.name] : null,
    order.onlinePlatform?.name ? ["Platform", order.onlinePlatform.name] : null,
    order.numberOfGuests ? ["Covers", `${order.numberOfGuests} Pax`] : null,
    ["Date", formatDate(stampedAt)],
    ["Time", formatTime(stampedAt)],
  ].filter(Boolean);

  return (
    <div
      data-print-active={active ? "true" : undefined}
      className="kot-print-area mx-auto w-full max-w-[320px] bg-white p-4 font-mono text-[12px] leading-snug text-black"
    >
      <div className="text-center">
        <p className="text-[15px] font-bold uppercase tracking-wide">
          {primary.outlet?.name || order.outletName || "KITCHEN ORDER"}
        </p>
        <p className="text-[11px] font-bold uppercase">Kitchen Order Ticket</p>
        {/* Which physical kitchen this belongs to, when more than one is
            configured. Station names are deliberately NOT shown — the slip
            is one ticket for the whole order now. */}
        {primary.kitchenBranch?.name && (
          <p className="mt-0.5 text-[11px]">{primary.kitchenBranch.name}</p>
        )}
      </div>

      <Line />

      <div className="space-y-0.5">
        {meta.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <span>{label}:</span>
            <span className="font-bold">{value}</span>
          </div>
        ))}
      </div>

      <div className="my-1.5 border-t border-black" />

      <div className="flex justify-between text-[11px] font-bold uppercase">
        <span>Item</span>
        <span>Qty</span>
      </div>

      <div className="my-1.5 border-t border-black" />

      <ul className="space-y-1.5">
        {lines.map((line) => (
          <li key={line.id}>
            <div className="flex items-start justify-between gap-2">
              <span className="flex-1 font-bold">
                {line.orderItem?.menuItem?.name || "Item"}
              </span>
              {/* Boxed and enlarged — quantity is the single most misread
                  field on a kitchen slip. */}
              <span className="min-w-[28px] border border-black px-1 text-center text-[14px] font-bold">
                {line.quantity}
              </span>
            </div>
            {line.orderItem?.notes && (
              <p className="mt-0.5 pl-2 text-[11px] font-bold uppercase">
                ** {line.orderItem.notes}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="my-1.5 border-t border-black" />

      <p className="font-bold">Total Items: {totalItems}</p>

      {order.notes && (
        <>
          <Line />
          <p className="text-[11px] font-bold uppercase">
            ORDER NOTE: {order.notes}
          </p>
        </>
      )}
    </div>
  );
}