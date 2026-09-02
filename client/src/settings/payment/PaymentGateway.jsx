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
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] border-b border-gray-200 dark:border-[#262B24]">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 dark:bg-[#60A5FA] text-white flex items-center justify-center">
              <FiCreditCard size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-gray-800 dark:text-[#E4E9E2]">
                Payment Gateway
              </h1>

              <p className="mt-2 text-gray-500 dark:text-[#9CA8A0]">
                Configure online payment providers and payment settings.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              className="h-12 px-6 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] border-gray-300 hover:bg-gray-100 dark:hover:bg-[#1D231C] flex items-center gap-2"
            >
              <FiRefreshCw />
              Reset
            </button>

            <button
              onClick={handleSave}
              className="h-12 px-8 rounded-xl bg-blue-600 dark:bg-[#60A5FA] hover:bg-blue-700 dark:hover:bg-[#3B82F6] text-white flex items-center gap-2"
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

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">General Settings</h2>

          <div className="space-y-6">
            {/* Enable Online Payment */}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Enable Online Payment</h3>

                <p className="text-gray-500 dark:text-[#9CA8A0] text-sm">
                  Allow customers to pay using online payment gateways.
                </p>
              </div>

              <input
                type="checkbox"
                name="paymentEnabled"
                checked={settings.paymentEnabled}
                onChange={handleChange}
                className="w-6 h-6 accent-[#2563EB] dark:accent-[#60A5FA]"
              />
            </div>

            {/* Mode */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">Gateway Mode</label>

              <select
                name="mode"
                value={settings.mode}
                onChange={handleChange}
                className="w-full md:w-72 h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
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

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">Payment Provider</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Gateway */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">Active Gateway</label>

              <select
                name="gateway"
                value={settings.gateway}
                onChange={handleChange}
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
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
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Default Payment Method
              </label>

              <select
                name="defaultPayment"
                value={settings.defaultPayment}
                onChange={handleChange}
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              >
                <option>UPI</option>

                <option>Cash</option>

                <option>Card</option>

                <option>Wallet</option>
              </select>
            </div>
          </div>

          {/* Connection Status */}

          <div className="mt-8 rounded-xl border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-5 flex items-center gap-4">
            <FiCheckCircle size={26} className="text-green-600 dark:text-green-300" />

            <div>
              <h3 className="font-semibold text-green-700 dark:text-green-400">Gateway Status</h3>

              <p className="text-green-600 dark:text-green-300 text-sm">Ready for configuration.</p>
            </div>
          </div>
        </div>
        {/* ======================================
            GATEWAY CREDENTIALS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">Gateway Credentials</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Public Key */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">Public / Key ID</label>

              <input
                type="text"
                placeholder="Enter Public Key / Razorpay Key ID"
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />
            </div>

            {/* Secret Key */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">Secret Key</label>

              <input
                type="password"
                placeholder="Enter Secret Key"
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />
            </div>

            {/* Webhook */}

            <div className="md:col-span-2">
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">Webhook Secret</label>

              <input
                type="password"
                placeholder="Enter Webhook Secret"
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />
            </div>
          </div>
        </div>

        {/* ======================================
            ACCEPTED PAYMENT METHODS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">Accepted Payment Methods</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Cash</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">Accept cash payments.</p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">UPI</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Google Pay, PhonePe, BHIM, Paytm.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Debit / Credit Card</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Card payments through payment gateway.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Wallet</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Digital wallet payments.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Net Banking</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Internet banking payments.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Pay Later</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Collect payment at the counter.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>
          </div>
        </div>

        {/* ======================================
            POS & RECEIPT SETTINGS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">POS & Receipt Settings</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Auto Generate Invoice</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Generate invoice immediately after payment.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Print Receipt Automatically</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Auto print receipt after successful payment.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Allow Split Payment</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Split bill into multiple payment methods.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Allow Partial Payment</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Accept advance or partial payments.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>
          </div>
        </div>
        {/* ======================================
            TAX & BILLING SETTINGS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">Tax & Billing Settings</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* GST Included */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Prices Include GST</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Item prices already include GST.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            {/* Round Off */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Round Off Invoice</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Automatically round final bill amount.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            {/* Service Charge */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Service Charge (%)
              </label>

              <input
                type="number"
                min="0"
                max="100"
                defaultValue="0"
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />
            </div>

            {/* Convenience Fee */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Convenience Fee (₹)
              </label>

              <input
                type="number"
                min="0"
                defaultValue="0"
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />
            </div>
          </div>
        </div>

        {/* ======================================
            UPI QR SETTINGS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">UPI QR Configuration</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">UPI ID</label>

              <input
                type="text"
                placeholder="restaurant@upi"
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">Upload Static QR</label>

              <input
                type="file"
                accept="image/*"
                className="w-full border border-[#E7EAE1] dark:border-[#262B24] rounded-lg p-3 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />
            </div>
          </div>
        </div>

        {/* ======================================
            CONNECTION STATUS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">Gateway Connection</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-6">
              <h3 className="font-semibold text-green-700 dark:text-green-400">
                Connection Status
              </h3>

              <p className="mt-2 text-green-600 dark:text-green-300">Ready for testing</p>
            </div>

            <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
              <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Last Verification</h3>

              <p className="mt-2 text-gray-500 dark:text-[#9CA8A0]">Never Verified</p>
            </div>
          </div>

          <button
            className="mt-8 h-12 px-8 rounded-xl bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white"
          >
            Verify Gateway Connection
          </button>
        </div>

        {/* ======================================
            FOOTER
        ====================================== */}

        <div className="flex justify-end gap-4 mt-8 pb-10">
          <button
            className="h-12 px-6 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] border-gray-300 hover:bg-gray-100 dark:hover:bg-[#1D231C]"
          >
            Reset Settings
          </button>

          <button
            onClick={handleSave}
            className="h-12 px-8 rounded-xl bg-blue-600 dark:bg-[#60A5FA] hover:bg-blue-700 dark:hover:bg-[#3B82F6] text-white flex items-center gap-2"
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