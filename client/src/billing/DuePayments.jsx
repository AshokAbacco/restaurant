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
  OUTSTANDING: "bg-red-50 text-red-600 border-red-200",
  PARTIALLY_PAID: "bg-amber-50 text-amber-700 border-amber-200",
  SETTLED: "bg-emerald-50 text-emerald-700 border-emerald-200",
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
      setError(`Cannot exceed the remaining balance of ₹${remaining.toFixed(2)}.`);
      return;
    }

    setSaving(true);
    try {
      await settleDuePayment(duePayment.id, { amount: value, paymentMethod, notes });
      onSettled();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Settle Due Payment</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <FiX size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          {duePayment.customer?.name} owes{" "}
          <span className="font-semibold text-slate-800">₹{remaining.toFixed(2)}</span> on
          order {duePayment.order?.orderNumber}.
        </p>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Amount collecting
        </label>
        <input
          type="number"
          min="0"
          max={remaining}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
        />

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Method
        </label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
        >
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="UPI">UPI</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="CHEQUE">Cheque</option>
          <option value="OTHER">Other</option>
        </select>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mb-3 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
        />

        {error && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Recording…" : `Record ₹${Number(amount || 0).toFixed(2)} payment`}
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
      const data = await getDuePayments(statusFilter ? { status: statusFilter } : {});
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
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Due Payments</h1>
            <p className="text-sm text-slate-500">
              Balances customers still owe from bills marked "due" at billing time.
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-right">
            <p className="text-xs font-semibold uppercase text-amber-600">
              Total Outstanding
            </p>
            <p className="text-xl font-bold text-amber-700">
              ₹{totalOutstanding.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
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
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : duePayments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            Nothing here — every bill is settled.
          </p>
        ) : (
          <div className="space-y-3">
            {duePayments.map((d) => {
              const remaining = Number(d.originalAmount) - Number(d.amountPaid);
              return (
                <div
                  key={d.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                      <FiUser className="text-slate-500" size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {d.customer?.name || "Unknown customer"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Order {d.order?.orderNumber} · {d.customer?.mobile}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                        <FiClock size={12} />
                        {new Date(d.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        ₹{Number(d.amountPaid).toFixed(2)} of ₹
                        {Number(d.originalAmount).toFixed(2)} paid
                      </p>
                      <p className="font-bold text-slate-800">
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
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
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