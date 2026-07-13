// ==============================================
// src/kiosk/KioskPayment.jsx
// ==============================================

import React, { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiSmartphone,
  FiCreditCard,
  FiDollarSign,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import { fetchUpiQr, payOrder, KioskApiError } from "./services/kioskApi";

const PAYMENT_METHODS = [
  {
    id: "UPI",
    title: "UPI",
    description: "Google Pay, PhonePe, Paytm",
    icon: <FiSmartphone size={42} />,
    color: "bg-blue-500",
  },
  {
    id: "CARD",
    title: "Card",
    description: "Debit / Credit Card",
    icon: <FiCreditCard size={42} />,
    color: "bg-purple-500",
  },
  {
    id: "CASH",
    title: "Cash",
    description: "Pay at Counter",
    icon: <FiDollarSign size={42} />,
    color: "bg-green-500",
  },
];

const KioskPayment = ({ open = false, order = {}, onBack, onSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState("UPI");
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [qr, setQr] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedMethod("UPI");
      setProcessing(false);
      setErrorMsg("");
      setQr(null);
    }
  }, [open]);

  // Fetch the real UPI QR whenever UPI is selected on an active order.
  useEffect(() => {
    if (open && selectedMethod === "UPI" && order?.id) {
      setQrLoading(true);
      fetchUpiQr(order.id)
        .then(setQr)
        .catch(() => setQr(null))
        .finally(() => setQrLoading(false));
    }
  }, [open, selectedMethod, order?.id]);

  const total = useMemo(() => order?.grandTotal || 0, [order]);

  const handlePayment = async () => {
    if (!order?.id) return;

    setErrorMsg("");
    setProcessing(true);

    try {
      const updatedOrder = await payOrder(order.id, {
        method: selectedMethod,
        transactionReference: qr?.transactionReference,
      });
      onSuccess?.(updatedOrder);
    } catch (err) {
      setErrorMsg(
        err instanceof KioskApiError
          ? err.message
          : "Payment could not be confirmed. Please try again.",
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-8">
      <div className="bg-white w-full max-w-7xl h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* ======================================
            HEADER
        ====================================== */}

        <div className="h-24 border-b border-gray-200 px-10 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button
              onClick={onBack}
              className="w-14 h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            >
              <FiArrowLeft size={26} />
            </button>

            <div>
              <h1 className="text-3xl font-bold">Payment</h1>
              <p className="text-gray-500 mt-1">
                Order #{order?.orderNumber} · Select your payment method
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-gray-500">Total Amount</p>

            <h2 className="text-4xl font-bold text-orange-600">
              ₹{total.toLocaleString("en-IN")}
            </h2>
          </div>
        </div>

        {/* ======================================
            BODY
        ====================================== */}

        <div className="flex-1 grid grid-cols-3">
          {/* LEFT */}

          <div className="col-span-2 p-10 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-8">Payment Method</h2>

            <div className="grid grid-cols-3 gap-6">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`rounded-3xl border-2 p-8 transition-all ${
                    selectedMethod === method.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-orange-300"
                  }`}
                >
                  <div
                    className={`w-20 h-20 rounded-2xl ${method.color} text-white flex items-center justify-center mx-auto`}
                  >
                    {method.icon}
                  </div>

                  <h3 className="mt-6 text-2xl font-bold">{method.title}</h3>

                  <p className="text-gray-500 mt-2">{method.description}</p>
                </button>
              ))}
            </div>
            {/* ======================================
                PAYMENT CONTENT
            ====================================== */}

            <div className="mt-10">
              {/* ==============================
                  UPI
              ============================== */}

              {selectedMethod === "UPI" && (
                <div className="bg-gray-50 rounded-3xl p-8 border">
                  <h2 className="text-3xl font-bold">Scan & Pay</h2>

                  <p className="text-gray-500 mt-2">
                    Scan the QR code using any UPI application.
                  </p>

                  <div className="mt-10 flex justify-center">
                    <div className="w-80 h-80 rounded-3xl bg-white border-4 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden">
                      {qrLoading ? (
                        <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      ) : qr?.qrDataUrl ? (
                        <img
                          src={qr.qrDataUrl}
                          alt="UPI QR Code"
                          className="w-full h-full object-contain p-4"
                        />
                      ) : (
                        <>
                          <FiSmartphone size={80} className="text-blue-500" />
                          <p className="mt-6 text-gray-600 text-lg">
                            QR unavailable
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-5">
                    <p className="text-blue-700">Supported Apps</p>

                    <div className="flex gap-4 mt-3">
                      <span className="px-4 py-2 rounded-full bg-white shadow">
                        Google Pay
                      </span>

                      <span className="px-4 py-2 rounded-full bg-white shadow">
                        PhonePe
                      </span>

                      <span className="px-4 py-2 rounded-full bg-white shadow">
                        Paytm
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ==============================
                  CARD
              ============================== */}

              {selectedMethod === "CARD" && (
                <div className="bg-gray-50 rounded-3xl p-8 border">
                  <div className="flex justify-center">
                    <div className="w-80 h-80 rounded-3xl bg-white border flex flex-col items-center justify-center">
                      <FiCreditCard size={90} className="text-purple-600" />

                      <h3 className="text-3xl font-bold mt-8">Card Payment</h3>

                      <p className="text-gray-500 mt-3 text-center">
                        Tap, Insert or Swipe your card on the payment terminal.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ==============================
                  CASH
              ============================== */}

              {selectedMethod === "CASH" && (
                <div className="bg-gray-50 rounded-3xl p-8 border">
                  <div className="flex justify-center">
                    <div className="w-80 h-80 rounded-3xl bg-white border flex flex-col items-center justify-center">
                      <FiDollarSign size={90} className="text-green-600" />

                      <h3 className="text-3xl font-bold mt-8">Cash Payment</h3>

                      <p className="text-gray-500 mt-3 text-center px-8">
                        Complete your order now and pay cash at the billing
                        counter.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ======================================
              RIGHT PANEL
          ====================================== */}

          <div className="border-l border-gray-200 bg-gray-50 flex flex-col">
            <div className="p-8 border-b">
              <h2 className="text-2xl font-bold">Order Summary</h2>

              <p className="text-gray-500 mt-2">Payment Details</p>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="space-y-5">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Type</span>

                  <span className="font-semibold">
                    {order?.orderType === "TAKEAWAY" ? "Take Away" : "Dine In"}
                  </span>
                </div>

                {order?.table && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Table</span>

                    <span className="font-semibold">{order.table.name}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Payment</span>

                  <span className="font-semibold">{selectedMethod}</span>
                </div>

                <div className="border-t pt-5 mt-5">
                  <div className="flex justify-between text-lg">
                    <span>Subtotal</span>

                    <span>₹{order?.subtotal ?? 0}</span>
                  </div>

                  <div className="flex justify-between text-lg mt-3">
                    <span>GST</span>

                    <span>₹{order?.gstAmount ?? 0}</span>
                  </div>

                  <div className="flex justify-between text-2xl font-bold mt-6">
                    <span>Total</span>

                    <span className="text-orange-600">₹{total}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================
              FOOTER
          ====================================== */}

          <div className="border-t border-gray-200 bg-white p-8 col-span-3">
            {/* Error */}

            {errorMsg && (
              <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5 flex items-center gap-4">
                <FiAlertCircle size={28} className="text-red-600" />
                <p className="text-red-700">{errorMsg}</p>
              </div>
            )}

            {/* Processing */}

            {processing && (
              <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />

                  <div>
                    <h3 className="text-xl font-bold text-blue-700">
                      Processing Payment...
                    </h3>

                    <p className="text-blue-600 mt-2">
                      Please wait while we verify your payment.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Note */}

            {!processing && selectedMethod === "UPI" && (
              <div className="mb-8 rounded-2xl bg-green-50 border border-green-200 p-5 flex items-center gap-4">
                <FiCheckCircle size={32} className="text-green-600" />

                <div>
                  <h3 className="font-bold text-green-700">Fast & Secure</h3>

                  <p className="text-green-600 mt-1">
                    After scanning the QR, tap
                    <strong> Pay Now </strong>
                    once payment is completed.
                  </p>
                </div>
              </div>
            )}

            {/* Buttons */}

            <div className="grid grid-cols-2 gap-5">
              <button
                onClick={onBack}
                disabled={processing}
                className="h-16 rounded-2xl border-2 border-gray-300 hover:bg-gray-100 font-bold text-lg transition disabled:opacity-50"
              >
                Back
              </button>

              <button
                onClick={handlePayment}
                disabled={processing || !order?.id}
                className="h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing
                  ? "Processing..."
                  : selectedMethod === "CASH"
                    ? "Confirm Order"
                    : "Pay Now"}
              </button>
            </div>

            <p className="mt-6 text-center text-gray-500 text-sm">
              Your payment is secured using encrypted transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KioskPayment;
