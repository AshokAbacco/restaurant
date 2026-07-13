// ==============================================
// src/kiosk/KioskOrderSuccess.jsx
// ==============================================

import React, { useEffect, useState } from "react";
import { FiCheck } from "react-icons/fi";

const AUTO_ADVANCE_SECONDS = 10;

const KioskOrderSuccess = ({ order, onNextOrder }) => {
  const [countdown, setCountdown] = useState(AUTO_ADVANCE_SECONDS);

  useEffect(() => {
    setCountdown(AUTO_ADVANCE_SECONDS);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onNextOrder();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-full w-full bg-white flex flex-col items-center justify-center px-10 relative overflow-hidden">
      <div className="w-20 h-20 rounded-full border-4 border-[#EE6C2E] flex items-center justify-center">
        <FiCheck size={40} className="text-[#EE6C2E]" />
      </div>

      <h1 className="text-2xl font-extrabold text-[#241F19] mt-6">Order Successful!</h1>
      <p className="text-[#8A8378] text-center mt-2">
        You can pick up your order from the cash register.
      </p>

      {/* Signature element: the order number as a stamped ticket token,
          echoed from the collapsed cart badge earlier in the flow. */}
      <div className="mt-8 rounded-2xl border-2 border-dashed border-[#F0E9DC] bg-[#FAF6EF] px-10 py-5 text-center">
        <p className="text-[#8A8378] text-sm font-medium">Your order number</p>
        <p className="text-4xl font-black text-[#EE6C2E] mt-1 tracking-wide">
          {order?.orderNumber?.split("-").pop() || "—"}
        </p>
      </div>

      <button
        onClick={onNextOrder}
        className="mt-10 px-10 py-3.5 rounded-2xl bg-[#F3ECE1] text-[#241F19] font-semibold"
      >
        Next Order ({countdown})
      </button>

      <div className="absolute -bottom-24 left-0 right-0 h-48 bg-[#EE6C2E] rounded-t-[60%]" />
    </div>
  );
};

export default KioskOrderSuccess;
