// src/pos/components/BillingPaymentModal.jsx
//
// Opens when staff click "Complete Service" on an occupied table. Shows the
// bill, collects a payment method (or a split across several), and only on
// a fully-paid order does it complete the order / generate the invoice /
// free the table — all handled server-side in POST .../billing/complete so
// the table is never freed before payment actually succeeds.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import InvoiceView from "../../billing/InvoiceView";
import { getBillingSummary, completeBilling } from "../api/posApi";

const PAYMENT_METHODS = [
  { key: "CASH", label: "Cash" },
  { key: "CARD", label: "Card" },
  { key: "UPI", label: "UPI" },
];

function makeSplitLineId() {
  return `split_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function BillingPaymentModal({
  orderId,
  isOpen,
  onClose,
  onCompleted,
}) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [mode, setMode] = useState("CASH"); // CASH | CARD | UPI | SPLIT
  const [splitLines, setSplitLines] = useState([]);
  const [processing, setProcessing] = useState(false);

  const [result, setResult] = useState(null); // { order, invoice, payments } once paid

  useEffect(() => {
    if (!isOpen || !orderId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setMode("CASH");
    getBillingSummary(orderId)
      .then((data) => {
        if (!data || !Array.isArray(data.items)) {
          throw new Error("Billing summary came back in an unexpected shape.");
        }
        setSummary(data);
        setSplitLines([
          {
            id: makeSplitLineId(),
            method: "CASH",
            amount: data.balanceDue || data.grandTotal,
          },
        ]);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  function updateSplitLine(id, patch) {
    setSplitLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  }

  function addSplitLine() {
    setSplitLines((prev) => [
      ...prev,
      { id: makeSplitLineId(), method: "CASH", amount: "" },
    ]);
  }

  function removeSplitLine(id) {
    setSplitLines((prev) =>
      prev.length > 1 ? prev.filter((l) => l.id !== id) : prev,
    );
  }

  const splitTotal = splitLines.reduce(
    (sum, l) => sum + (Number(l.amount) || 0),
    0,
  );
  const splitMismatch = summary
    ? Math.abs(splitTotal - summary.balanceDue) > 0.01
    : true;

  async function handleCompletePayment() {
    if (!summary) return;
    setError(null);
    setProcessing(true);

    const payments =
      mode === "SPLIT"
        ? splitLines
            .filter((l) => Number(l.amount) > 0)
            .map((l) => ({ method: l.method, amount: Number(l.amount) }))
        : [{ method: mode, amount: summary.balanceDue }];

    try {
      const data = await completeBilling(orderId, { payments });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  function handleDone() {
    onCompleted?.(result);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2937]/40 dark:bg-black/60 p-4 print:bg-transparent print:p-0">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#171C17] shadow-xl print:max-h-none print:w-full print:max-w-none print:shadow-none">
        {!result && (
          <div className="flex items-center justify-between border-b border-[#E7EAE1] dark:border-[#262B24] px-5 py-4 print:hidden">
            <h2 className="text-lg font-bold text-[#1F2937] dark:text-white">
              Billing &amp; Payment
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#F3F5EE] dark:hover:bg-white/10 hover:text-[#6B7280] dark:hover:text-[#9CA8A0]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}

        {result ? (
          <InvoiceView
            invoice={result.invoice}
            summary={summary}
            payments={result.payments}
            onDone={handleDone}
          />
        ) : loading ? (
          <div className="flex flex-1 items-center justify-center p-10 text-sm text-[#9CA3AF] dark:text-[#6B7280]">
            Loading bill…
          </div>
        ) : error && !summary ? (
          <div className="p-5 text-sm text-[#EF5350] dark:text-red-400">
            {error}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-[#F3F5EE] dark:bg-white/5 p-3 text-sm">
                <div>
                  <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                    Table
                  </p>
                  <p className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                    {summary.table?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                    Customer
                  </p>
                  <p className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                    {summary.customer?.name || "Walk-in"}
                  </p>
                </div>
              </div>

              <ul className="mb-4 space-y-2">
                {summary.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between border-b border-[#E7EAE1] dark:border-[#262B24] pb-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                        {item.name}{" "}
                        <span className="text-[#9CA3AF] dark:text-[#6B7280]">
                          × {item.quantity}
                        </span>
                      </p>
                      {item.addOns.map((a, idx) => (
                        <p
                          key={idx}
                          className="text-xs text-[#9CA3AF] dark:text-[#6B7280]"
                        >
                          + {a.name} × {a.quantity}
                        </p>
                      ))}
                    </div>
                    <span className="font-mono font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                      ₹
                      {(
                        item.totalPrice +
                        item.addOns.reduce((s, a) => s + a.totalPrice, 0)
                      ).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="space-y-1 border-t border-dashed border-[#D5DAD0] dark:border-[#2E342C] pt-3 font-mono text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{summary.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST</span>
                  <span>₹{summary.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST</span>
                  <span>₹{summary.sgst.toFixed(2)}</span>
                </div>
                {summary.discountAmount > 0 && (
                  <div className="flex justify-between text-[#3FA34D] dark:text-[#43B75A]">
                    <span>Discount</span>
                    <span>−₹{summary.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[#E7EAE1] dark:border-[#262B24] pt-1.5 text-base font-bold text-[#1F2937] dark:text-white">
                  <span>Grand Total</span>
                  <span>₹{summary.grandTotal.toFixed(2)}</span>
                </div>
                {summary.totalPaid > 0 && (
                  <div className="flex justify-between text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                    <span>Already paid</span>
                    <span>₹{summary.totalPaid.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
                  Payment Method
                </p>
                <div className="flex gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setMode(m.key)}
                      className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                        mode === m.key
                          ? "border-[#3FA34D] bg-[#3FA34D] text-white dark:border-[#43B75A] dark:bg-[#43B75A]"
                          : "border-[#E7EAE1] dark:border-[#262B24] text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setMode("SPLIT")}
                    className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                      mode === "SPLIT"
                        ? "border-[#3FA34D] bg-[#3FA34D] text-white dark:border-[#43B75A] dark:bg-[#43B75A]"
                        : "border-[#E7EAE1] dark:border-[#262B24] text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
                    }`}
                  >
                    Split
                  </button>
                </div>

                {mode === "SPLIT" && (
                  <div className="mt-3 space-y-2">
                    {splitLines.map((line) => (
                      <div key={line.id} className="flex items-center gap-2">
                        <select
                          value={line.method}
                          onChange={(e) =>
                            updateSplitLine(line.id, { method: e.target.value })
                          }
                          className="rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] px-2 py-1.5 text-sm text-[#1F2937] dark:text-[#E4E9E2] outline-none focus:border-[#3FA34D] dark:focus:border-[#43B75A]"
                        >
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m.key} value={m.key}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.amount}
                          onChange={(e) =>
                            updateSplitLine(line.id, { amount: e.target.value })
                          }
                          placeholder="Amount"
                          className="flex-1 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] px-2 py-1.5 text-sm text-[#1F2937] dark:text-[#E4E9E2] placeholder:text-[#9CA3AF] dark:placeholder:text-[#6B7280] outline-none focus:border-[#3FA34D] dark:focus:border-[#43B75A]"
                        />
                        <button
                          onClick={() => removeSplitLine(line.id)}
                          disabled={splitLines.length === 1}
                          className="rounded-lg px-2 py-1.5 text-xs text-[#EF5350] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-30"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addSplitLine}
                      className="text-xs font-semibold text-[#3FA34D] dark:text-[#43B75A] hover:underline"
                    >
                      + Add another payment
                    </button>
                    <p
                      className={`text-xs font-medium ${splitMismatch ? "text-[#EF5350] dark:text-red-400" : "text-[#3FA34D] dark:text-[#43B75A]"}`}
                    >
                      Split total: ₹{splitTotal.toFixed(2)} of ₹
                      {summary.balanceDue.toFixed(2)} due
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <p className="mt-3 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs font-medium text-[#EF5350] dark:text-red-400">
                  {error}
                </p>
              )}
            </div>

            <div className="border-t border-[#E7EAE1] dark:border-[#262B24] px-5 py-4">
              <button
                onClick={handleCompletePayment}
                disabled={processing || (mode === "SPLIT" && splitMismatch)}
                className="w-full rounded-lg bg-[#3FA34D] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] disabled:cursor-not-allowed disabled:bg-[#D5DAD0] dark:disabled:bg-white/10 dark:disabled:text-[#6B7280]"
              >
                {processing
                  ? "Processing payment…"
                  : `Complete Payment · ₹${summary.balanceDue.toFixed(2)}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}