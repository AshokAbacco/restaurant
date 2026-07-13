// ==============================================
// src/kiosk/KioskSuccess.jsx
// ==============================================

import React, { useEffect, useState } from "react";
import {
  FiCheckCircle,
  FiClock,
  FiHome,
  FiShoppingBag,
  FiHash,
} from "react-icons/fi";

const KioskSuccess = ({ open = false, order = {}, onFinish }) => {
  // ==========================================
  // COUNTDOWN
  // ==========================================

  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (!open) return;

    setCountdown(10);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);

          onFinish?.();

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, onFinish]);

  if (!open) return null;

  const isTakeaway =
    order?.orderType === "TAKEAWAY" || order?.orderType === "TAKE_AWAY";

  return (
    <div className="fixed inset-0 z-[120] bg-gradient-to-br from-green-500 via-emerald-500 to-green-700 flex items-center justify-center overflow-hidden">
      {/* Decorative Circles */}

      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-white/10 blur-3xl" />

      <div className="absolute -bottom-52 -right-52 w-[500px] h-[500px] rounded-full bg-white/10 blur-3xl" />

      {/* Main Card */}

      <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-5xl overflow-hidden">
        {/* ======================================
            SUCCESS HEADER
        ====================================== */}

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-12 py-14 text-center text-white">
          <div className="w-36 h-36 rounded-full bg-white mx-auto flex items-center justify-center shadow-2xl">
            <FiCheckCircle size={90} className="text-green-600" />
          </div>

          <h1 className="text-5xl font-extrabold mt-8">Order Confirmed</h1>

          <p className="text-2xl mt-4 opacity-90">
            Thank you for ordering with us!
          </p>
        </div>

        {/* ======================================
            ORDER INFO
        ====================================== */}

        <div className="grid grid-cols-3 gap-8 p-10">
          {/* Order Number */}

          <div className="rounded-3xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 mx-auto flex items-center justify-center">
              <FiHash className="text-orange-600" size={32} />
            </div>

            <p className="mt-6 text-gray-500">Order Number</p>

            <h2 className="mt-3 text-3xl font-bold text-orange-600 break-all">
              {order?.orderNumber || "—"}
            </h2>
          </div>

          {/* Estimated Time */}

          <div className="rounded-3xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 mx-auto flex items-center justify-center">
              <FiClock className="text-blue-600" size={32} />
            </div>

            <p className="mt-6 text-gray-500">Preparation Time</p>

            <h2 className="mt-3 text-4xl font-bold text-blue-600">
              {order?.estimatedTimeMinutes || 15} Min
            </h2>
          </div>

          {/* Order Type */}

          <div className="rounded-3xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 mx-auto flex items-center justify-center">
              {isTakeaway ? (
                <FiShoppingBag className="text-purple-600" size={32} />
              ) : (
                <FiHome className="text-purple-600" size={32} />
              )}
            </div>

            <p className="mt-6 text-gray-500">Order Type</p>

            <h2 className="mt-3 text-3xl font-bold text-purple-600">
              {isTakeaway ? "Take Away" : "Dine In"}
            </h2>
          </div>
        </div>

        {/* ======================================
            CUSTOMER & ORDER DETAILS
        ====================================== */}

        <div className="px-10 pb-10">
          <div className="grid grid-cols-2 gap-8">
            {/* Left */}

            <div className="bg-gray-50 rounded-3xl border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-8">
                Order Details
              </h2>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Customer</span>

                  <span className="font-semibold text-lg">
                    {order?.customer?.name || "Guest"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Payment</span>

                  <span className="font-semibold text-lg">
                    {order?.payment?.method || "—"}
                    {order?.payment?.status === "UNPAID" && (
                      <span className="ml-2 text-sm text-orange-600 font-normal">
                        (Pay at counter)
                      </span>
                    )}
                  </span>
                </div>

                {order?.table && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Table</span>

                    <span className="font-bold text-xl text-orange-600">
                      {order.table.name}
                    </span>
                  </div>
                )}

                <div className="border-t pt-6 flex justify-between items-center">
                  <span className="text-xl font-bold">Grand Total</span>

                  <span className="text-3xl font-bold text-green-600">
                    ₹{(order?.grandTotal || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Right */}

            <div className="bg-gray-50 rounded-3xl border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-8">
                Order Status
              </h2>

              <div className="space-y-8">
                {/* Step 1 */}

                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                    ✓
                  </div>

                  <div>
                    <h3 className="font-bold text-xl">Order Received</h3>

                    <p className="text-gray-500 mt-2">
                      Your order has been received successfully.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}

                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold animate-pulse">
                    2
                  </div>

                  <div>
                    <h3 className="font-bold text-xl">Kitchen Preparing</h3>

                    <p className="text-gray-500 mt-2">
                      Our chefs are preparing your delicious meal.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}

                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-full bg-gray-300 text-white flex items-center justify-center font-bold">
                    3
                  </div>

                  <div>
                    <h3 className="font-bold text-xl">Ready for Pickup</h3>

                    <p className="text-gray-500 mt-2">
                      We'll notify you once your order is ready.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================
            FOOTER
        ====================================== */}

        <div className="border-t border-gray-200 px-10 py-8 bg-white">
          {/* Countdown */}

          <div className="text-center">
            <p className="text-gray-500 text-lg">Returning to Home Screen in</p>

            <h2 className="mt-3 text-6xl font-extrabold text-green-600">
              {countdown}
            </h2>

            <p className="mt-4 text-gray-500">
              This kiosk will automatically reset for the next customer.
            </p>
          </div>

          {/* Progress */}

          <div className="mt-8">
            <div className="w-full h-4 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-1000"
                style={{
                  width: `${((10 - countdown) / 10) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Thank You */}

          <div className="mt-10 rounded-3xl bg-green-50 border border-green-200 p-8 text-center">
            <h3 className="text-3xl font-bold text-green-700">
              Thank You for Visiting ❤️
            </h3>

            <p className="mt-4 text-lg text-green-600 leading-8">
              We appreciate your order.
              <br />
              Our team is preparing your food with care.
              <br />
              Have a wonderful meal!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KioskSuccess;
