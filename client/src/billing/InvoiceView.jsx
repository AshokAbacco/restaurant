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
    .map((p) => `${PAYMENT_METHOD_LABEL[p.method] || p.method} ₹${Number(p.amount).toFixed(2)}`)
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
        await navigator.share({ title: `Invoice ${invoice.invoiceNumber}`, text });
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
            <h3 className="text-xl font-bold text-[#1C3044]">Invoice</h3>
            <p className="font-mono text-sm font-semibold text-blue-600">{invoice.invoiceNumber}</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>{formatDateTime(invoice.createdAt || Date.now())}</p>
            <p className="mt-0.5 font-medium text-emerald-600">PAID</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <div>
            <p className="text-xs text-slate-400">Table</p>
            <p className="font-semibold text-slate-800">{order.table?.name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Customer</p>
            <p className="font-semibold text-slate-800">{order.customer?.name || "Walk-in"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Order No.</p>
            <p className="font-mono text-xs font-semibold text-slate-700">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Order Type</p>
            <p className="font-semibold text-slate-800">{order.orderType?.replace("_", " ")}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
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
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-1.5 pr-2">
                    <p className="font-medium text-slate-800">{item.menuItem?.name || item.name}</p>
                    {(item.addOns || []).map((a, idx) => (
                      <p key={idx} className="text-xs text-slate-400">
                        + {a.addOn?.name || a.name} × {a.quantity}
                      </p>
                    ))}
                  </td>
                  <td className="py-1.5 text-center font-mono text-slate-600">{item.quantity}</td>
                  <td className="py-1.5 text-right font-mono text-slate-600">
                    ₹{Number(item.unitPrice).toFixed(2)}
                  </td>
                  <td className="py-1.5 text-right font-mono font-semibold text-slate-800">
                    ₹{(Number(item.totalPrice) + addOnTotal).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-4 space-y-1 border-t border-dashed border-slate-300 pt-3 font-mono text-sm text-slate-600">
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
            <div className="flex justify-between text-emerald-600">
              <span>Discount</span>
              <span>−₹{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold text-slate-900">
            <span>Grand Total</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
          Payment received: {paymentSummary || "—"}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-6 py-4 print:hidden">
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Print Invoice
          </button>
          <button
            onClick={handlePrint}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Download PDF
          </button>
          <button
            onClick={handleShare}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
        <button
          onClick={onDone}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
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
        }
      `}</style>
    </div>
  );
}