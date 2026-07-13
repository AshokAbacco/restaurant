// ==============================================
// src/kiosk/KioskQrScan.jsx
// ==============================================
// "Read your Qr code, please." Renders the real QR from
// kiosk.service.getUpiQr. Since there's no physical phone in a demo to
// actually scan it, an explicit confirm button below stands in for the
// payment gateway's webhook — swap that call for a real gateway
// callback/poll in production without touching this screen's layout.

import React, { useEffect, useState } from "react";
import { FiAlertCircle } from "react-icons/fi";
import { fetchUpiQr, payOrder, KioskApiError } from "./services/kioskApi";

const KioskQrScan = ({ order, onBack, onPaid }) => {
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!order?.id) return;
    setLoading(true);
    fetchUpiQr(order.id)
      .then(setQr)
      .catch(() => setErrorMsg("Could not generate a QR code. Please go back and try Cash or Card."))
      .finally(() => setLoading(false));
  }, [order?.id]);

  const handleConfirm = async () => {
    setConfirming(true);
    setErrorMsg("");
    try {
      const updated = await payOrder(order.id, {
        method: "UPI",
        transactionReference: qr?.transactionReference,
      });
      onPaid(updated);
    } catch (err) {
      setErrorMsg(err instanceof KioskApiError ? err.message : "Payment could not be confirmed.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="h-full w-full bg-white flex flex-col px-8 pt-8 pb-10">
      <button onClick={onBack} className="text-[#EE6C2E] font-semibold self-start">
        ← Back
      </button>

      <h1 className="text-center text-xl font-bold text-[#241F19] mt-8">
        Read your Qr code, please.
      </h1>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-64 h-64 rounded-3xl border-4 border-dashed border-[#F0E9DC] flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="w-10 h-10 border-4 border-[#EE6C2E] border-t-transparent rounded-full animate-spin" />
          ) : qr?.qrDataUrl ? (
            <img src={qr.qrDataUrl} alt="Scan to pay" className="w-full h-full object-contain p-4" />
          ) : (
            <p className="text-[#8A8378] text-sm text-center px-4">QR unavailable</p>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <FiAlertCircle className="text-red-600 mt-0.5" size={18} />
          <p className="text-red-700 text-sm">{errorMsg}</p>
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={confirming || loading}
        className="w-full h-14 rounded-2xl bg-[#EE6C2E] text-white font-bold text-lg disabled:opacity-50"
      >
        {confirming ? "Confirming..." : "I've Completed Payment"}
      </button>
    </div>
  );
};

export default KioskQrScan;
