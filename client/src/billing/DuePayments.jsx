// src/billing/DuePayments.jsx
//
// Phase 1.2 — Due Payment Settlement. Lists every outstanding (or
// partially paid) balance across customers, and lets staff record a
// settlement — full or partial — against any of them. This is the
// counterpart to BillingPaymentModal's "mark remaining balance as due"
// checkbox: that's where a due payment gets CREATED, this is where it
// gets PAID OFF, later, possibly in a different visit entirely.
import { useEffect, useState } from "react";
import { FiDollarSign, FiUser, FiClock, FiX } from "react-icons/fi";
import { getDuePayments, settleDuePayment } from "../pos/api/posApi";

const STATUS_STYLES = {
  OUTSTANDING:
    "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
  PARTIALLY_PAID:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
  SETTLED:
    "bg-[#EAF6EC] text-[#2F7D3A] border-[#C9E7CF] dark:bg-[#43B75A]/10 dark:text-[#43B75A] dark:border-[#43B75A]/30",
};

function SettleModal({ duePayment, onClose, onSettled }) {
  const remaining =
    Number(duePayment.originalAmount) - Number(duePayment.amountPaid);

  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError("");
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (value > remaining + 0.01) {
      setError(
        `Cannot exceed the remaining balance of ₹${remaining.toFixed(2)}.`,
      );
      return;
    }

    setSaving(true);
    try {
      await settleDuePayment(duePayment.id, {
        amount: value,
        paymentMethod,
        notes,
      });
      onSettled();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2937]/40 dark:bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#1F2937] dark:text-white">
            Settle Due Payment
          </h3>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] dark:text-[#6B7280] hover:text-[#6B7280] dark:hover:text-[#9CA8A0]"
          >
            <FiX size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
          {duePayment.customer?.name} owes{" "}
          <span className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
            ₹{remaining.toFixed(2)}
          </span>{" "}
          on order {duePayment.order?.orderNumber}.
        </p>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
          Amount collecting
        </label>
        <input
          type="number"
          min="0"
          max={remaining}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mb-3 w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] px-3 py-2 text-sm text-[#1F2937] dark:text-[#E4E9E2] outline-none focus:border-[#3FA34D] dark:focus:border-[#43B75A]"
        />

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
          Method
        </label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="mb-3 w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] px-3 py-2 text-sm text-[#1F2937] dark:text-[#E4E9E2] outline-none focus:border-[#3FA34D] dark:focus:border-[#43B75A]"
        >
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="UPI">UPI</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="CHEQUE">Cheque</option>
          <option value="OTHER">Other</option>
        </select>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mb-3 w-full resize-none rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] px-3 py-2 text-sm text-[#1F2937] dark:text-[#E4E9E2] outline-none focus:border-[#3FA34D] dark:focus:border-[#43B75A]"
        />

        {error && (
          <p className="mb-3 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs font-medium text-[#EF5350] dark:text-red-400">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full rounded-lg bg-[#3FA34D] py-2.5 text-sm font-semibold text-white hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] disabled:opacity-60"
        >
          {saving
            ? "Recording…"
            : `Record ₹${Number(amount || 0).toFixed(2)} payment`}
        </button>
      </div>
    </div>
  );
}

export default function DuePayments() {
  const [duePayments, setDuePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" = outstanding + partial (backend default)
  const [settling, setSettling] = useState(null); // the duePayment being settled, or null

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getDuePayments(
        statusFilter ? { status: statusFilter } : {},
      );
      setDuePayments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const totalOutstanding = duePayments.reduce(
    (sum, d) => sum + (Number(d.originalAmount) - Number(d.amountPaid)),
    0,
  );

  return (
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#12160F] p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white">
              Due Payments
            </h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
              Balances customers still owe from bills marked "due" at billing
              time.
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-5 py-3 text-right">
            <p className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">
              Total Outstanding
            </p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
              ₹{totalOutstanding.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: "", label: "Outstanding + Partial" },
            { key: "OUTSTANDING", label: "Outstanding" },
            { key: "PARTIALLY_PAID", label: "Partially Paid" },
            { key: "SETTLED", label: "Settled" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === f.key
                  ? "border-[#3FA34D] bg-[#3FA34D] text-white dark:border-[#43B75A] dark:bg-[#43B75A]"
                  : "border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-[#EF5350] dark:text-red-400">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">Loading…</p>
        ) : duePayments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#D5DAD0] dark:border-[#2E342C] bg-white dark:bg-[#171C17] p-8 text-center text-sm text-[#9CA3AF] dark:text-[#6B7280]">
            Nothing here — every bill is settled.
          </p>
        ) : (
          <div className="space-y-3">
            {duePayments.map((d) => {
              const remaining = Number(d.originalAmount) - Number(d.amountPaid);
              return (
                <div
                  key={d.id}
                  className="flex flex-col gap-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F5EE] dark:bg-white/5">
                      <FiUser
                        className="text-[#6B7280] dark:text-[#9CA8A0]"
                        size={16}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                        {d.customer?.name || "Unknown customer"}
                      </p>
                      <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                        Order {d.order?.orderNumber} · {d.customer?.mobile}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                        <FiClock size={12} />
                        {new Date(d.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4">
                    <div className="text-right">
                      <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                        ₹{Number(d.amountPaid).toFixed(2)} of ₹
                        {Number(d.originalAmount).toFixed(2)} paid
                      </p>
                      <p className="font-bold text-[#1F2937] dark:text-white">
                        ₹{remaining.toFixed(2)} remaining
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[d.status]}`}
                    >
                      {d.status.replace("_", " ")}
                    </span>

                    {d.status !== "SETTLED" && (
                      <button
                        onClick={() => setSettling(d)}
                        className="flex items-center gap-1.5 rounded-lg bg-[#3FA34D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
                      >
                        <FiDollarSign size={14} />
                        Settle
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {settling && (
        <SettleModal
          duePayment={settling}
          onClose={() => setSettling(null)}
          onSettled={() => {
            setSettling(null);
            load();
          }}
        />
      )}
    </div>
  );
}