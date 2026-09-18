import React, { useState } from "react";
import {
  Receipt,
  IndianRupee,
  Percent,
  Wallet,
  CreditCard,
  Smartphone,
  CheckCircle2,
  Printer,
  Sparkles,
  ArrowRight
} from "lucide-react";

const STATS = [
  { label: "Orders completed", value: "1,420+", accent: "text-emerald-600" },
  { label: "Payments collected", value: "₹18,42,738", accent: "text-slate-900" },
  { label: "Pending settlement", value: "₹14,684", accent: "text-amber-600" },
];

const FEATURES = [
  {
    title: "One tap to pay",
    description: "Cash, card or UPI — pick a method, hit complete, and the balance clears instantly.",
  },
  {
    title: "Discounts, done right",
    description: "Apply a flat amount or a percentage before tax is calculated, never after.",
  },
  {
    title: "Every bill, reprintable",
    description: "Pull up any past invoice by number and reprint or re-share it in a click.",
  },
];

const INITIAL_BILL_ITEMS = [
  { id: 1, name: "Kunafa", qty: 1, price: 199.0 },
  { id: 2, name: "Mixed Grill Platter", qty: 1, price: 649.0 },
  { id: 3, name: "Fresh Mint Mojito", qty: 2, price: 149.0 },
];

export default function BillingPayments() {
  const [billItems, setBillItems] = useState(INITIAL_BILL_ITEMS);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [isPaid, setIsPaid] = useState(true);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Live calculations
  const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const tax = taxableAmount * 0.05; // 5% GST
  const total = taxableAmount + tax;

  const handleAddItem = (name, price) => {
    setBillItems(prev => {
      const existing = prev.find(i => i.name === name);
      if (existing) {
        return prev.map(i => i.name === name ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { id: Date.now(), name, qty: 1, price }];
    });
  };

  const handleRemoveItem = (id) => {
    setBillItems(prev => prev.filter(i => i.id !== id));
  };

  const triggerCopy = () => {
    try {
      const receiptText = `INV-000024 | Total: ₹${total.toFixed(2)} | Paid via ${paymentMethod}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(receiptText);
      }
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section className="bg-white px-6 py-20 sm:px-10 lg:px-16 font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">
        
        {/* Left: Interactive receipt mockup */}
        <div className="flex justify-center lg:justify-start">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-[#FAF9F5] p-6 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.12)] relative overflow-hidden transition-all duration-300 hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)]">
            
            {/* Top Badge */}
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
              Interactive Preview
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <Receipt className="h-4 w-4 text-emerald-600" />
                INV-000024
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                isPaid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
              }`}>
                <CheckCircle2 className="h-3 w-3" />
                {isPaid ? "Paid" : "Pending"}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              Table T-1 · KOT-000053 · {billItems.reduce((acc, i) => acc + i.qty, 0)} items
            </div>

            {/* Bill Items Box */}
            <div className="mt-4 max-h-44 overflow-y-auto divide-y divide-dashed divide-slate-300 border-y border-dashed border-slate-300 pr-1">
              {billItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">No items in bill. Click buttons below to add.</div>
              ) : (
                billItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 text-sm text-slate-700">
                    <div>
                      <span className="font-medium text-slate-900">{item.name}</span>
                      <span className="text-slate-400 text-xs ml-1.5">× {item.qty}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                        ₹{(item.price * item.qty).toFixed(2)}
                      </span>
                      <button 
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-[10px] text-red-500 hover:text-red-700 font-bold px-1.5 py-0.5 rounded bg-red-50 transition-colors"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Bar */}
            <div className="mt-3.5 pt-2 border-t border-slate-200/60">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Quick Add Items:</div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => handleAddItem("Kunafa", 199)} className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 transition-colors shadow-2xs">
                  + Kunafa
                </button>
                <button onClick={() => handleAddItem("Mixed Grill", 649)} className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 transition-colors shadow-2xs">
                  + Grill
                </button>
                <button onClick={() => handleAddItem("Mojito", 149)} className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 transition-colors shadow-2xs">
                  + Mojito
                </button>
              </div>
            </div>

            {/* Discount selector */}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-600 bg-white/70 border border-slate-200 p-2 rounded-xl">
              <span className="font-medium">Discount:</span>
              <div className="flex gap-1">
                {[0, 5, 10, 20].map(pct => (
                  <button 
                    key={pct}
                    onClick={() => setDiscountPercent(pct)}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                      discountPercent === pct ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Breakdown */}
            <div className="mt-3.5 space-y-1 text-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex items-center justify-between text-emerald-600 text-xs font-medium">
                  <span>Discount ({discountPercent}%)</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>CGST + SGST (5%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-300 text-base font-bold text-slate-900">
                <span>Net payable</span>
                <span className="text-emerald-700">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="mt-3.5">
              <div className="grid grid-cols-3 gap-1.5">
                {["Cash", "Card", "UPI"].map(mode => (
                  <button
                    key={mode}
                    onClick={() => { setPaymentMethod(mode); setIsPaid(true); }}
                    className={`flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                      paymentMethod === mode 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs' 
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {mode === 'Cash' && <Wallet className="h-3 w-3" />}
                    {mode === 'Card' && <CreditCard className="h-3 w-3" />}
                    {mode === 'UPI' && <Smartphone className="h-3 w-3" />}
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <button 
                onClick={triggerCopy}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-md"
              >
                <Printer className="h-3.5 w-3.5" />
                {copiedNotification ? "Copied!" : "Reprint Invoice"}
              </button>
              <button 
                onClick={() => setIsPaid(!isPaid)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  isPaid ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {isPaid ? "Mark Unpaid" : "Mark Paid"}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Copy & Features */}
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            Billing &amp; payments module
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl leading-[1.15]">
            Close out a table
            <br />
            <span className="text-emerald-600">without reaching for a calculator.</span>
          </h2>

          <p className="mt-5 text-base leading-relaxed text-slate-600">
            Tax, discounts and split totals are worked out automatically — take the payment, print the invoice, move on to the next table instantly.
          </p>

          {/* Stat strip */}
          <div className="mt-8 grid grid-cols-3 gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 shadow-2xs">
            {STATS.map((s) => (
              <div key={s.label} className="text-center sm:text-left">
                <div className={`text-lg font-black ${s.accent}`}>{s.value}</div>
                <div className="mt-0.5 text-xs font-medium text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Feature rows */}
          <div className="mt-8 divide-y divide-slate-200 border-t border-slate-200">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[180px_1fr] sm:gap-6 items-center"
              >
                <div className="font-bold text-sm text-slate-900">{f.title}</div>
                <div className="text-sm leading-relaxed text-slate-500">
                  {f.description}
                </div>
              </div>
            ))}
          </div>

          {/* Payment method badges */}
          <div className="mt-6 flex flex-wrap gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
              <IndianRupee className="h-3.5 w-3.5 text-emerald-600" /> Cash
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
              <CreditCard className="h-3.5 w-3.5 text-blue-600" /> Cards
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
              <Smartphone className="h-3.5 w-3.5 text-purple-600" /> UPI
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
              <Percent className="h-3.5 w-3.5 text-amber-600" /> Discounts
            </span>
          </div>

        </div>

      </div>
    </section>
  );
}