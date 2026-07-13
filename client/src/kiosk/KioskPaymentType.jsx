// ==============================================
// src/kiosk/KioskPaymentType.jsx
// ==============================================

import React, { useState } from "react";
import {
  FiChevronLeft,
  FiGlobe,
  FiGrid,
  FiCreditCard,
  FiDollarSign,
  FiAlertCircle,
} from "react-icons/fi";
import { payOrder, KioskApiError } from "./services/kioskApi";
import { LiaRupeeSignSolid } from "react-icons/lia";
const METHODS = [
  {
    id: "UPI",
    label: "QR Pay",
    subLabel: "Scan & pay instantly",
    icon: FiGrid,
  },
  {
    id: "CARD",
    label: "Credit Card",
    subLabel: "Insert or tap terminal",
    icon: FiCreditCard,
  },
  {
    id: "CASH",
    label: "Pay at Counter",
    subLabel: "Cashier checkout tier",
    icon: LiaRupeeSignSolid,
  },
];

const KioskPaymentType = ({ order, onBack, onChooseQr, onPaid }) => {
  const [selected, setSelected] = useState("UPI");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleCheckout = async () => {
    if (selected === "UPI") {
      onChooseQr();
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const updated = await payOrder(order.id, { method: selected });
      onPaid(updated);
    } catch (err) {
      setErrorMsg(
        err instanceof KioskApiError
          ? err.message
          : "Payment could not be confirmed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen max-h-screen bg-[#FAFAFX] flex flex-col overflow-hidden relative font-sans antialiased text-[#1C1C1E]">
      {/* Background Soft Ambient Glow */}
      <div className="absolute top-0 left-1/4 w-[50vw] h-[50vw] bg-gradient-to-br from-orange-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Layout */}
      <div className="w-full max-w-3xl mx-auto flex flex-col h-full overflow-hidden px-6 sm:px-10">
        {/* Header Strip Section */}
        <div className="flex items-center justify-between pt-6 pb-4 shrink-0 z-10">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-bold text-[#48484A] bg-white backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-black/[0.03] active:scale-95 transition-all"
          >
            <FiChevronLeft strokeWidth={2.5} className="text-[#EE6C2E]" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#EE6C2E] to-[#F4894A] flex items-center justify-center shadow-md shadow-orange-500/10">
              <span className="text-white text-xs font-black">R</span>
            </div>
            <span className="text-[10px] font-black tracking-widest text-[#1C1C1E]/30 uppercase">
              CHECKOUT
            </span>
          </div>

          <button className="flex items-center gap-1.5 text-sm font-semibold text-[#48484A] bg-white/60 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-black/[0.03]">
            <FiGlobe size={14} className="text-[#8E8E93]" />
            <span>EN</span>
          </button>
        </div>

        {/* Informative Title */}
        <div className="text-center mt-6 shrink-0 z-10">
          <h1 className="text-3xl font-black tracking-tight text-[#1C1C1E]">
            Select Payment Method
          </h1>
          <p className="text-xs text-[#8E8E93] font-medium mt-1">
            Choose a settlement method to dispatch your order
          </p>
        </div>

        {/* High-Fidelity Choice Layout Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 shrink-0 z-10">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const active = selected === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={`group relative rounded-3xl p-5 flex flex-col items-start gap-4 text-left border-2 transition-all duration-300 active:scale-[0.98] ${
                  active
                    ? "bg-white border-[#EE6C2E] shadow-[0_15px_35px_rgba(238,108,74,0.08)] text-[#1C1C1E]"
                    : "bg-white/60 backdrop-blur-md border-black/[0.02] text-[#48484A] hover:bg-white"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
                    active
                      ? "bg-orange-50 text-[#EE6C2E]"
                      : "bg-black/[0.03] text-[#8E8E93]"
                  }`}
                >
                  <Icon size={22} strokeWidth={2.3} />
                </div>

                <div>
                  <span className="block font-black text-sm tracking-tight">
                    {m.label}
                  </span>
                  <span
                    className={`block text-[11px] font-medium mt-0.5 ${active ? "text-[#EE6C2E]/80" : "text-[#8E8E93]"}`}
                  >
                    {m.subLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Order Details & Calculation Panels Container */}
        <div className="flex-1 overflow-y-auto mt-8 bg-white border border-black/[0.02] rounded-[32px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] scrollbar-none mb-32">
          {/* Target Method Callout */}
          <div className="flex justify-between items-center text-xs pb-4 border-b border-black/[0.03]">
            <span className="text-[#8E8E93] font-bold uppercase tracking-wider">
              Gateway Configuration
            </span>
            <span className="font-extrabold text-[#EE6C2E] bg-orange-50 px-2.5 py-1 rounded-lg">
              {METHODS.find((m) => m.id === selected)?.label} Mode Active
            </span>
          </div>

          {/* Dynamic Item Lines Summary */}
          <div className="mt-5">
            <p className="text-[#8E8E93] font-bold text-xs uppercase tracking-wider mb-3">
              Order Details
            </p>
            <div className="space-y-3">
              {order?.items?.map((it) => (
                <div
                  key={it.id}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-[#48484A] font-medium">
                    <span className="font-black text-[#1C1C1E] mr-1.5">
                      {it.quantity}x
                    </span>
                    {it.name}
                  </span>
                  <span className="font-bold text-[#1C1C1E]">
                    ₹{it.totalPrice ? it.totalPrice.toFixed(2) : "0.00"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Error Message Diagnostics View */}
          {errorMsg && (
            <div className="mt-6 rounded-2xl bg-red-50 border border-red-200/60 p-4 flex items-start gap-3 text-red-700 animate-fade-in">
              <FiAlertCircle
                className="text-red-500 mt-0.5 shrink-0"
                size={16}
                strokeWidth={2.5}
              />
              <p className="text-xs font-bold leading-relaxed">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Sticky Global Action Controls Footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-black/[0.03] px-6 sm:px-10 py-5 z-20 flex items-center justify-between max-w-3xl mx-auto rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
          <div>
            <p className="text-[#8E8E93] text-xs font-bold uppercase tracking-wider">
              Payable Balance
            </p>
            <p className="text-3xl font-black tracking-tight text-[#1C1C1E] mt-0.5">
              ₹{(order?.grandTotal || 0).toFixed(2)}
            </p>
          </div>

          <button
            onClick={handleCheckout}
            disabled={submitting}
            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-[#EE6C2E] to-[#F4894A] text-white font-black text-base shadow-lg shadow-orange-500/20 hover:opacity-95 active:scale-95 disabled:opacity-50 transition-all tracking-wide uppercase"
          >
            {submitting ? "Processing..." : "Confirm & Pay"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KioskPaymentType;
