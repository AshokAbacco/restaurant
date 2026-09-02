// src/billing/InvoiceView.jsx
//
// Thermal-receipt style bill: monospace, narrow, dashed rules, right-aligned
// amounts — laid out to print correctly on an 80mm roll as well as A4.
//
// "Download PDF" reuses the browser's native print dialog (choose "Save as
// PDF" as the destination) so no extra PDF-generation dependency is needed.
// "Share" uses the Web Share API where available and falls back to copying a
// plain-text summary to the clipboard.
import { useEffect, useState } from "react";
import BillCodes from "./BillCodes";
import { ensurePrintStyles, printOnce } from "../print/printing";

const PAYMENT_METHOD_LABEL = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

function lineAddOnTotal(item) {
  return (item.addOns || []).reduce((sum, a) => sum + Number(a.totalPrice), 0);
}

const money = (n) => `₹${Number(n || 0).toFixed(2)}`;

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Derives the rate to LABEL a tax/charge row, e.g. "CGST (2.5%)". The stored
// figures are absolute amounts, not rates — the rate is only ever shown, never
// used to recompute anything, so a missing/zero subtotal just drops the label
// rather than printing a wrong percentage.
function ratePart(amount, base) {
  if (!base || !amount) return "";
  const pct = (Number(amount) / Number(base)) * 100;
  if (!Number.isFinite(pct) || pct <= 0) return "";
  // Trim 2.50 -> 2.5, 5.00 -> 5
  return ` (${pct.toFixed(2).replace(/\.?0+$/, "")}%)`;
}

// A dashed rule matching the receipt's separator lines.
const Rule = ({ solid = false }) => (
  <div
    className={`my-1.5 border-t ${
      solid
        ? "border-[#1F2937] dark:border-[#E4E9E2]"
        : "border-dashed border-[#9CA3AF] dark:border-[#4B5563]"
    }`}
  />
);

// gap-2 not gap-3, and the value never wraps: on 72mm of paper a totals row
// like "CGST (2.5%) + SGST (2.5%):" + "+ ₹46.35" only just fits, and the
// three px saved are the difference between one line and two.
const Row = ({ label, value, bold = false, muted = false }) => (
  <div
    className={`flex justify-between gap-3 print:gap-2 ${
      bold ? "font-bold" : ""
    } ${muted ? "text-[#6B7280] dark:text-[#9CA8A0]" : ""}`}
  >
    <span className="min-w-0">{label}</span>
    <span className="shrink-0 whitespace-nowrap tabular-nums">{value}</span>
  </div>
);

export default function InvoiceView({ invoice, summary, payments, onDone }) {
  const [copied, setCopied] = useState(false);

  // Print rules live in print/printing.js, not in a <style> block here. This
  // component used to ship its own `body * { visibility: hidden }` — the same
  // rule the shared sheet uses, but without !important, so once a kitchen
  // ticket had been printed in the session the global rule outranked it and
  // every subsequent bill came out blank.
  useEffect(() => {
    ensurePrintStyles();
  }, []);

  const order = invoice.order;
  const items = order.items || [];

  // The outlet is what carries the restaurant's own identity. Prefer the
  // invoice's copy (it's the record of what was actually billed); fall back to
  // the summary so the modal preview looks identical before the invoice
  // exists.
  const outlet = invoice.outlet || summary?.outlet || {};

  const subtotal = Number(order.subtotal);
  const gstAmount = Number(order.gstAmount);
  const cgst = summary?.cgst ?? gstAmount / 2;
  const sgst = summary?.sgst ?? gstAmount / 2;
  const serviceCharge = Number(
    order.serviceChargeAmount ?? summary?.serviceChargeAmount ?? 0,
  );
  const discountAmount = Number(order.discountAmount || 0);
  const grandTotal = Number(order.grandTotal);

  // Items: 5 (Qty: 10) — distinct lines vs total units, as on the reference
  // bill. These are different numbers and both matter to a cashier checking
  // a bill against a tray.
  const lineCount = items.length;
  const totalQty = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);

  // An order genuinely produces one KitchenOrder PER kitchen section, so a
  // dish-plus-drink order really does have two or three ticket numbers. The
  // bill shows only the first (lowest, since they're fetched ascending) —
  // that's the reference staff quote when pulling up an order, and printing
  // a comma-separated list of three made the line hard to read.
  //
  // The full set is still on the order if it's ever needed for a dispute.
  const kotNumbers = order.kitchenOrders?.length
    ? order.kitchenOrders.map((k) => k.kotNumber)
    : summary?.kotNumbers || [];
  const primaryKot = kotNumbers[0] || null;

  const steward = order.waiter?.fullName || summary?.waiter || null;
  // Who closed the bill. Recorded on the invoice at billing time from the
  // authenticated session (Invoice.cashierId), so it's the real person, not
  // whoever happens to be looking at the screen now. Distinct from the
  // steward above — the same order is routinely served by one person and
  // billed by another.
  // Resolved server-side from the outlet's CASHIER-role account — see
  // resolveCashierName in invoices.service.js. `cashier` is the raw employee
  // who closed the bill, kept only as a fallback for an older payload.
  const cashierName =
    invoice.cashierName || invoice.cashier?.fullName || summary?.cashier || null;
  const covers = order.numberOfGuests ?? summary?.covers ?? null;
  const tableName = order.table?.name || null;
  const tableSection = order.table?.section || null;

  const paymentList = payments || order.payments || [];
  const paymentSummary = paymentList
    .map((p) => `${PAYMENT_METHOD_LABEL[p.method] || p.method} ${money(p.amount)}`)
    .join(", ");

  function handlePrint() {
    printOnce();
  }

  async function handleShare() {
    const text = [
      outlet.name,
      `Bill ${invoice.invoiceNumber}`,
      tableName ? `Table: ${tableName}` : null,
      order.customer?.name ? `Customer: ${order.customer.name}` : null,
      `Net Payable: ${money(grandTotal)}`,
      `Payment: ${paymentSummary || "Paid"}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: `Bill ${invoice.invoiceNumber}`, text });
      } catch {
        // user cancelled the share sheet — nothing to do
      }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    // min-h-0 + flex-1 matter when this is nested inside another flex column
    // (the reprint modal in BillHistory.jsx). Without them this root keeps
    // flex's default min-height:auto, refuses to shrink below the receipt's
    // full height, and spills straight out of its container — the receipt
    // overflowed the modal, the barcode and QR were clipped, and the footer
    // buttons ended up off-screen with nothing scrollable to reach them.
    // Harmless when rendered standalone, where there's no flex parent to
    // stretch against.
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* overflow-y-auto is also what zeroes this child's automatic minimum
          size, which is what actually lets it scroll rather than grow. */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F3F5EE] dark:bg-[#12160F] px-4 py-5">
        {/* Fixed narrow column so the on-screen bill matches the proportions
            of the paper it prints on.

            The print:* classes are what put it on paper correctly. An 80mm
            roll leaves ~72mm printable; the p-5 screen padding ate 40px of
            that on top of the page margin, which squeezed the meta columns
            and the totals rows until nearly every line wrapped — "Bill: INV-"
            / "000019", "Items: 3 (Qty:" / "3)". On paper the receipt runs
            edge to edge (the @page margin IS the physical margin) one type
            size down, which is what makes each line fit whole. */}
        <div
          data-print-active="true"
          className="invoice-print-area mx-auto w-full max-w-[380px] bg-white dark:bg-[#171C17] p-5 font-mono text-[11px] leading-relaxed text-[#1F2937] dark:text-[#E4E9E2] shadow-sm print:max-w-none print:p-0 print:text-[10px] print:leading-snug print:shadow-none">
          {/* ============ HEADER ============ */}
          <div className="text-center">
            <h3 className="text-[15px] font-bold uppercase tracking-wide">
              {outlet.name || "Restaurant"}
            </h3>
            {outlet.tagline && (
              <p className="mt-0.5 text-[10px]">{outlet.tagline}</p>
            )}
            {outlet.address && (
              <p className="mt-0.5 text-[10px]">{outlet.address}</p>
            )}
            {outlet.phone && (
              <p className="mt-0.5 text-[10px]">Ph: {outlet.phone}</p>
            )}
            {(outlet.gstin || outlet.fssai) && (
              <p className="mt-0.5 text-[10px] font-semibold">
                {outlet.gstin ? `GSTIN: ${outlet.gstin}` : ""}
                {outlet.gstin && outlet.fssai ? " | " : ""}
                {outlet.fssai ? `FSSAI: ${outlet.fssai}` : ""}
              </p>
            )}
          </div>

          <Rule solid />

          {/* ============ BILL META ============ */}
          {/* Meta rows.
              Built as a flat ORDERED list and flowed into two columns rather
              than hand-placed pairs. That's what stops blank cells appearing:
              any entry that doesn't apply (no table on a delivery, no steward,
              no cashier on an older bill) is dropped from the list, and
              everything after it shifts up to fill the space. Even indices sit
              left, odd indices right. */}
          {/* On screen: two equal columns. On paper: the right column shrinks to
              whatever it actually holds ("DELIVERY", "Date: 01/09/2026") and
              gives the rest to the left, which carries the long entries
              ("Cashier: POS Cashier"). An even 50/50 split left the left
              column ~2px short and wrapped it. */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-semibold print:grid-cols-[1fr_auto] print:gap-x-2">
            {[
              `Bill: ${invoice.invoiceNumber}`,
              tableName
                ? `Table ${tableName}${tableSection ? ` (${tableSection})` : ""}`
                : order.orderType?.replace("_", " "),
              cashierName ? `Cashier: ${cashierName}` : null,
              `Time: ${formatTime(invoice.createdAt || Date.now())}`,
              `Order: ${order.orderNumber}`,
              `Date: ${formatDate(invoice.createdAt || Date.now())}`,
              steward ? `Steward: ${steward}` : null,
              covers ? `Covers: ${covers} Pax` : null,
              order.customer?.name ? `Customer: ${order.customer.name}` : null,
            ]
              .filter(Boolean)
              .map((entry, i) => (
                <span key={entry} className={i % 2 ? "text-right" : ""}>
                  {entry}
                </span>
              ))}

            {/* KOT numbers run full width — a multi-station order can carry
                several and they'd wrap badly in half a line. */}
            {primaryKot && (
              <span className="col-span-2">KOT: {primaryKot}</span>
            )}
          </div>

          <Rule solid />

          {/* ============ ITEMS ============ */}
          <div className="flex justify-between font-bold uppercase">
            <span className="flex-1">Item</span>
            <span className="w-10 shrink-0 text-center print:w-8">Qty</span>
            <span className="w-20 shrink-0 text-right print:w-[64px]">Amount</span>
          </div>

          <Rule />

          <div className="space-y-1">
            {items.map((item) => {
              const addOnTotal = lineAddOnTotal(item);
              return (
                <div key={item.id}>
                  <div className="flex justify-between gap-1">
                    <span className="flex-1 font-semibold">
                      {item.menuItem?.name || item.name}
                    </span>
                    <span className="w-10 shrink-0 text-center tabular-nums print:w-8">
                      {item.quantity}
                    </span>
                    <span className="w-20 shrink-0 text-right font-semibold tabular-nums print:w-[64px]">
                      {money(Number(item.totalPrice) + addOnTotal)}
                    </span>
                  </div>
                  {(item.addOns || []).map((a, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between gap-1 text-[10px] text-[#6B7280] dark:text-[#9CA8A0]"
                    >
                      <span className="flex-1 pl-2">
                        + {a.addOn?.name || a.name}
                      </span>
                      <span className="w-10 shrink-0 text-center tabular-nums print:w-8">
                        {a.quantity}
                      </span>
                      <span className="w-20 shrink-0 text-right tabular-nums print:w-[64px]">
                        {money(a.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <Rule solid />

          {/* ============ TOTALS ============ */}
          <div className="space-y-0.5">
            <Row
              label={`Items: ${lineCount} (Qty: ${totalQty})`}
              value={`Subtotal: ${money(subtotal)}`}
            />

            {serviceCharge > 0 && (
              <Row
                label={`Service Charge${ratePart(serviceCharge, subtotal)}:`}
                value={`+ ${money(serviceCharge)}`}
              />
            )}

            {/* Single combined row, matching the reference bill. CGST and SGST
                are always equal halves of the same GST amount here, so
                splitting them across two lines just adds noise. */}
            {gstAmount > 0 && (
              <Row
                label={`CGST${ratePart(cgst, subtotal)} + SGST${ratePart(sgst, subtotal)}:`}
                value={`+ ${money(gstAmount)}`}
              />
            )}

            {discountAmount > 0 && (
              <Row
                label="Discount:"
                value={`− ${money(discountAmount)}`}
              />
            )}
          </div>

          <Rule solid />

          <div className="flex justify-between text-[14px] font-bold uppercase">
            <span>Net Payable</span>
            <span className="tabular-nums">{money(grandTotal)}</span>
          </div>

          <Rule solid />

          {/* ============ PAYMENT ============ */}
          {paymentList.length > 0 && (
            <>
              <div className="space-y-0.5">
                {paymentList.map((p, idx) => (
                  <Row
                    key={p.id || idx}
                    label={PAYMENT_METHOD_LABEL[p.method] || p.method}
                    value={money(p.amount)}
                  />
                ))}
              </div>
              <Rule />
            </>
          )}

          <p className="text-center text-[10px] font-semibold uppercase">
            Pay
          </p>
          <p className="mt-2 text-center text-[10px]">
            Thank you for dining with us!
          </p>

          {/* Barcode (the bill reference, for staff lookup) and the UPI
              payment QR. Both are generated from this bill's own data, so
              the QR always carries the correct amount — see BillCodes.jsx. */}
          <BillCodes
            className="mt-3"
            outlet={outlet}
            reference={invoice.invoiceNumber}
            tableName={tableName}
            amount={grandTotal}
          />
          {order.kitchenBranch?.name && (
            <p className="mt-1 text-center text-[9px] text-[#9CA3AF] dark:text-[#6B7280]">
              Prepared at {order.kitchenBranch.name}
            </p>
          )}
        </div>
      </div>

      {/* ============ ACTIONS (never printed) ============ */}
      <div className="flex items-center justify-between gap-2 border-t border-[#E7EAE1] dark:border-[#262B24] px-6 py-4 print:hidden">
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="rounded-lg border border-[#E7EAE1] dark:border-[#262B24] px-4 py-2 text-sm font-semibold text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
          >
            Print Invoice
          </button>
          <button
            onClick={handlePrint}
            className="rounded-lg border border-[#E7EAE1] dark:border-[#262B24] px-4 py-2 text-sm font-semibold text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
          >
            Download PDF
          </button>
          <button
            onClick={handleShare}
            className="rounded-lg border border-[#E7EAE1] dark:border-[#262B24] px-4 py-2 text-sm font-semibold text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
          >
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
        <button
          onClick={onDone}
          className="rounded-lg bg-[#3FA34D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
        >
          Done
        </button>
      </div>

    </div>
  );
}