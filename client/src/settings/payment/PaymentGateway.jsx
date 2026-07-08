// ==============================================
// src/settings/payment/PaymentGateway.jsx
// ==============================================

import React, { useState } from "react";
import {
  FiCreditCard,
  FiSave,
  FiRefreshCw,
  FiCheckCircle,
} from "react-icons/fi";

const GATEWAYS = ["Razorpay", "Stripe", "Cashfree", "PhonePe", "Paytm"];

const PaymentGateway = () => {
  const [settings, setSettings] = useState({
    paymentEnabled: true,
    mode: "Test",
    gateway: "Razorpay",
    defaultPayment: "UPI",
  });

  // ==========================================
  // HANDLE CHANGE
  // ==========================================

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ==========================================
  // SAVE
  // ==========================================

  const handleSave = () => {
    console.log(settings);

    // Backend Integration Later
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
              <FiCreditCard size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                Payment Gateway
              </h1>

              <p className="mt-2 text-gray-500">
                Configure online payment providers and payment settings.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              className="
                h-12
                px-6
                rounded-xl
                border
                border-gray-300
                hover:bg-gray-100
                flex
                items-center
                gap-2
              "
            >
              <FiRefreshCw />
              Reset
            </button>

            <button
              onClick={handleSave}
              className="
                h-12
                px-8
                rounded-xl
                bg-blue-600
                hover:bg-blue-700
                text-white
                flex
                items-center
                gap-2
              "
            >
              <FiSave />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* ======================================
          CONTENT
      ====================================== */}

      <div className="max-w-6xl mx-auto p-8">
        {/* ======================================
            GENERAL SETTINGS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8">
          <h2 className="text-2xl font-bold mb-8">General Settings</h2>

          <div className="space-y-6">
            {/* Enable Online Payment */}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Enable Online Payment</h3>

                <p className="text-gray-500 text-sm">
                  Allow customers to pay using online payment gateways.
                </p>
              </div>

              <input
                type="checkbox"
                name="paymentEnabled"
                checked={settings.paymentEnabled}
                onChange={handleChange}
                className="w-6 h-6"
              />
            </div>

            {/* Mode */}

            <div>
              <label className="block mb-2 font-medium">Gateway Mode</label>

              <select
                name="mode"
                value={settings.mode}
                onChange={handleChange}
                className="w-full md:w-72 h-12 border rounded-lg px-4"
              >
                <option value="Test">Test Mode</option>

                <option value="Live">Live Mode</option>
              </select>
            </div>
          </div>
        </div>

        {/* ======================================
            PAYMENT PROVIDER
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Payment Provider</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Gateway */}

            <div>
              <label className="block mb-2 font-medium">Active Gateway</label>

              <select
                name="gateway"
                value={settings.gateway}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              >
                {GATEWAYS.map((gateway) => (
                  <option key={gateway} value={gateway}>
                    {gateway}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Payment */}

            <div>
              <label className="block mb-2 font-medium">
                Default Payment Method
              </label>

              <select
                name="defaultPayment"
                value={settings.defaultPayment}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              >
                <option>UPI</option>

                <option>Cash</option>

                <option>Card</option>

                <option>Wallet</option>
              </select>
            </div>
          </div>

          {/* Connection Status */}

          <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-5 flex items-center gap-4">
            <FiCheckCircle size={26} className="text-green-600" />

            <div>
              <h3 className="font-semibold text-green-700">Gateway Status</h3>

              <p className="text-green-600 text-sm">Ready for configuration.</p>
            </div>
          </div>
        </div>
        {/* ======================================
            GATEWAY CREDENTIALS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Gateway Credentials</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Public Key */}

            <div>
              <label className="block mb-2 font-medium">Public / Key ID</label>

              <input
                type="text"
                placeholder="Enter Public Key / Razorpay Key ID"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            {/* Secret Key */}

            <div>
              <label className="block mb-2 font-medium">Secret Key</label>

              <input
                type="password"
                placeholder="Enter Secret Key"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            {/* Webhook */}

            <div className="md:col-span-2">
              <label className="block mb-2 font-medium">Webhook Secret</label>

              <input
                type="password"
                placeholder="Enter Webhook Secret"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>
          </div>
        </div>

        {/* ======================================
            ACCEPTED PAYMENT METHODS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Accepted Payment Methods</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Cash</h3>

                <p className="text-sm text-gray-500">Accept cash payments.</p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">UPI</h3>

                <p className="text-sm text-gray-500">
                  Google Pay, PhonePe, BHIM, Paytm.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Debit / Credit Card</h3>

                <p className="text-sm text-gray-500">
                  Card payments through payment gateway.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Wallet</h3>

                <p className="text-sm text-gray-500">
                  Digital wallet payments.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Net Banking</h3>

                <p className="text-sm text-gray-500">
                  Internet banking payments.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Pay Later</h3>

                <p className="text-sm text-gray-500">
                  Collect payment at the counter.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5" />
            </label>
          </div>
        </div>

        {/* ======================================
            POS & RECEIPT SETTINGS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">POS & Receipt Settings</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Auto Generate Invoice</h3>

                <p className="text-sm text-gray-500">
                  Generate invoice immediately after payment.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Print Receipt Automatically</h3>

                <p className="text-sm text-gray-500">
                  Auto print receipt after successful payment.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Allow Split Payment</h3>

                <p className="text-sm text-gray-500">
                  Split bill into multiple payment methods.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Allow Partial Payment</h3>

                <p className="text-sm text-gray-500">
                  Accept advance or partial payments.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5" />
            </label>
          </div>
        </div>
        {/* ======================================
            TAX & BILLING SETTINGS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Tax & Billing Settings</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* GST Included */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Prices Include GST</h3>

                <p className="text-sm text-gray-500">
                  Item prices already include GST.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            {/* Round Off */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Round Off Invoice</h3>

                <p className="text-sm text-gray-500">
                  Automatically round final bill amount.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            {/* Service Charge */}

            <div>
              <label className="block mb-2 font-medium">
                Service Charge (%)
              </label>

              <input
                type="number"
                min="0"
                max="100"
                defaultValue="0"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            {/* Convenience Fee */}

            <div>
              <label className="block mb-2 font-medium">
                Convenience Fee (₹)
              </label>

              <input
                type="number"
                min="0"
                defaultValue="0"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>
          </div>
        </div>

        {/* ======================================
            UPI QR SETTINGS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">UPI QR Configuration</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">UPI ID</label>

              <input
                type="text"
                placeholder="restaurant@upi"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Upload Static QR</label>

              <input
                type="file"
                accept="image/*"
                className="w-full border rounded-lg p-3"
              />
            </div>
          </div>
        </div>

        {/* ======================================
            CONNECTION STATUS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Gateway Connection</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-green-200 bg-green-50 p-6">
              <h3 className="font-semibold text-green-700">
                Connection Status
              </h3>

              <p className="mt-2 text-green-600">Ready for testing</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="font-semibold">Last Verification</h3>

              <p className="mt-2 text-gray-500">Never Verified</p>
            </div>
          </div>

          <button
            className="
              mt-8
              h-12
              px-8
              rounded-xl
              bg-green-600
              hover:bg-green-700
              text-white
            "
          >
            Verify Gateway Connection
          </button>
        </div>

        {/* ======================================
            FOOTER
        ====================================== */}

        <div className="flex justify-end gap-4 mt-8 pb-10">
          <button
            className="
              h-12
              px-6
              rounded-xl
              border
              border-gray-300
              hover:bg-gray-100
            "
          >
            Reset Settings
          </button>

          <button
            onClick={handleSave}
            className="
              h-12
              px-8
              rounded-xl
              bg-blue-600
              hover:bg-blue-700
              text-white
              flex
              items-center
              gap-2
            "
          >
            <FiSave />
            Save Payment Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentGateway;
