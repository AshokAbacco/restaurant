// src/billing/InvoiceView.jsx
//
// Renders a printable invoice once billing has been completed successfully.
// "Download PDF" reuses the browser's native print dialog (choose "Save as
// PDF" as the destination) so no extra PDF-generation dependency is needed.
// "Share" uses the Web Share API where available and falls back to copying
// a plain-text summary to the clipboard.
import { useState } from "react";

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

function formatDateTime(value) {
  const d = new Date(value);
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function InvoiceView({ invoice, summary, payments, onDone }) {
  const [copied, setCopied] = useState(false);
  const order = invoice.order;
  const items = order.items || [];
  const subtotal = Number(order.subtotal);
  const gstAmount = Number(order.gstAmount);
  const cgst = summary?.cgst ?? gstAmount / 2;
  const sgst = summary?.sgst ?? gstAmount / 2;
  const discountAmount = Number(order.discountAmount);
  const grandTotal = Number(order.grandTotal);

  const paymentSummary = (payments || order.payments || [])
    .map(
      (p) =>
        `${PAYMENT_METHOD_LABEL[p.method] || p.method} ₹${Number(p.amount).toFixed(2)}`,
    )
    .join(", ");

  function handlePrint() {
    window.print();
  }

  async function handleShare() {
    const text = [
      `Invoice ${invoice.invoiceNumber}`,
      order.table?.name ? `Table: ${order.table.name}` : null,
      order.customer?.name ? `Customer: ${order.customer.name}` : null,
      `Grand Total: ₹${grandTotal.toFixed(2)}`,
      `Payment: ${paymentSummary || "Paid"}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text,
        });
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
    <div className="flex h-full flex-col">
      <div className="invoice-print-area flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-[#1F2937] dark:text-white">
              Invoice
            </h3>
            <p className="font-mono text-sm font-semibold text-[#3FA34D] dark:text-[#43B75A]">
              {invoice.invoiceNumber}
            </p>
          </div>
          <div className="text-right text-xs text-[#6B7280] dark:text-[#9CA8A0]">
            <p>{formatDateTime(invoice.createdAt || Date.now())}</p>
            <p className="mt-0.5 font-medium text-[#3FA34D] dark:text-[#43B75A]">
              PAID
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-[#F3F5EE] dark:bg-white/5 p-3 text-sm">
          <div>
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">Table</p>
            <p className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
              {order.table?.name || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
              Customer
            </p>
            <p className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
              {order.customer?.name || "Walk-in"}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
              Order No.
            </p>
            <p className="font-mono text-xs font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
              {order.orderNumber}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
              Order Type
            </p>
            <p className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
              {order.orderType?.replace("_", " ")}
            </p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E7EAE1] dark:border-[#262B24] text-left text-xs uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
              <th className="py-1.5">Item</th>
              <th className="py-1.5 text-center">Qty</th>
              <th className="py-1.5 text-right">Price</th>
              <th className="py-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const addOnTotal = lineAddOnTotal(item);
              return (
                <tr
                  key={item.id}
                  className="border-b border-[#E7EAE1] dark:border-[#262B24]"
                >
                  <td className="py-1.5 pr-2">
                    <p className="font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                      {item.menuItem?.name || item.name}
                    </p>
                    {(item.addOns || []).map((a, idx) => (
                      <p
                        key={idx}
                        className="text-xs text-[#9CA3AF] dark:text-[#6B7280]"
                      >
                        + {a.addOn?.name || a.name} × {a.quantity}
                      </p>
                    ))}
                  </td>
                  <td className="py-1.5 text-center font-mono text-[#6B7280] dark:text-[#9CA8A0]">
                    {item.quantity}
                  </td>
                  <td className="py-1.5 text-right font-mono text-[#6B7280] dark:text-[#9CA8A0]">
                    ₹{Number(item.unitPrice).toFixed(2)}
                  </td>
                  <td className="py-1.5 text-right font-mono font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                    ₹{(Number(item.totalPrice) + addOnTotal).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-4 space-y-1 border-t border-dashed border-[#D5DAD0] dark:border-[#2E342C] pt-3 font-mono text-sm text-[#6B7280] dark:text-[#9CA8A0]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>CGST</span>
            <span>₹{cgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>SGST</span>
            <span>₹{sgst.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-[#3FA34D] dark:text-[#43B75A]">
              <span>Discount</span>
              <span>−₹{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-[#E7EAE1] dark:border-[#262B24] pt-1.5 text-base font-bold text-[#1F2937] dark:text-white">
            <span>Grand Total</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-[#EAF6EC] dark:bg-[#43B75A]/10 px-3 py-2 text-xs font-medium text-[#2F7D3A] dark:text-[#43B75A]">
          Payment received: {paymentSummary || "—"}
        </div>
      </div>

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

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .invoice-print-area, .invoice-print-area * { visibility: visible; }
          .invoice-print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }
          /* Paper is always white — force legible ink regardless of
             whether the app is in light or dark mode on screen. */
          .invoice-print-area, .invoice-print-area * {
            background: #fff !important;
            color: #111 !important;
            border-color: #ddd !important;
          }
        }
      `}</style>
    </div>
  );
}