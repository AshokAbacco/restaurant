// ==============================================
// src/settings/subscription/Subscription.jsx
// ==============================================

import React, { useState } from "react";
import { FiCreditCard, FiSave, FiRefreshCw } from "react-icons/fi";

const Subscription = () => {
  const [subscription] = useState({
    plan: "Professional",
    status: "Active",
    billing: "Monthly",
    nextBilling: "15 Aug 2026",
    amount: "₹1,999",
    expiry: "15 Aug 2026",
  });

  const handleSave = () => {
    console.log("Subscription Updated");
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
              <FiCreditCard size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold">Subscription</h1>

              <p className="mt-2 text-gray-500">
                Manage your restaurant ERP subscription.
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
                hover:bg-gray-100
                flex
                items-center
                gap-2
              "
            >
              <FiRefreshCw />
              Refresh
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
            CURRENT PLAN
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold">{subscription.plan}</h2>

              <p className="mt-2 text-gray-500">
                Your current active subscription plan.
              </p>
            </div>

            <span className="px-5 py-2 rounded-full bg-green-100 text-green-700 font-semibold">
              {subscription.status}
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-10">
            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Billing Cycle</h3>

              <p className="text-2xl font-bold mt-3">{subscription.billing}</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Next Billing</h3>

              <p className="text-2xl font-bold mt-3">
                {subscription.nextBilling}
              </p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Amount</h3>

              <p className="text-2xl font-bold mt-3">{subscription.amount}</p>
            </div>
          </div>
        </div>

        {/* ======================================
            PLAN LIMITS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Plan Limits</h2>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Users</h3>

              <p className="text-3xl font-bold mt-3">10</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">POS Devices</h3>

              <p className="text-3xl font-bold mt-3">3</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Tables</h3>

              <p className="text-3xl font-bold mt-3">Unlimited</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">QR Ordering</h3>

              <p className="text-xl font-bold mt-4 text-green-600">Enabled</p>
            </div>
          </div>
        </div>
        {/* ======================================
            PLAN FEATURES
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Included Features</h2>

            <button
              className="
                h-11
                px-5
                rounded-lg
                bg-blue-600
                hover:bg-blue-700
                text-white
              "
            >
              Upgrade Plan
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="border rounded-xl p-5">✅ Unlimited Orders</div>

            <div className="border rounded-xl p-5">✅ POS Billing</div>

            <div className="border rounded-xl p-5">
              ✅ Kitchen Display System
            </div>

            <div className="border rounded-xl p-5">✅ QR Ordering</div>

            <div className="border rounded-xl p-5">✅ Online Payments</div>

            <div className="border rounded-xl p-5">✅ Inventory Management</div>

            <div className="border rounded-xl p-5">✅ Customer Management</div>

            <div className="border rounded-xl p-5">✅ Sales Reports</div>
          </div>
        </div>

        {/* ======================================
            PAYMENT SETTINGS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Payment Settings</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">Payment Method</label>

              <select className="w-full h-12 border rounded-lg px-4">
                <option>Credit Card</option>

                <option>Debit Card</option>

                <option>UPI</option>

                <option>Net Banking</option>
              </select>
            </div>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Auto Renewal</h3>

                <p className="text-sm text-gray-500">
                  Automatically renew your subscription.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>
          </div>
        </div>

        {/* ======================================
            PAYMENT HISTORY
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Payment History</h2>

            <button
              className="
                h-11
                px-5
                rounded-lg
                border
                hover:bg-gray-100
              "
            >
              Download All Invoices
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-left">Invoice</th>

                  <th className="px-5 py-4 text-left">Date</th>

                  <th className="px-5 py-4 text-left">Amount</th>

                  <th className="px-5 py-4 text-left">Status</th>

                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-t">
                  <td className="px-5 py-4">INV-10025</td>

                  <td className="px-5 py-4">15 Jul 2026</td>

                  <td className="px-5 py-4">₹1,999</td>

                  <td className="px-5 py-4 text-green-600 font-semibold">
                    Paid
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button className="text-blue-600 hover:underline">
                      Download
                    </button>
                  </td>
                </tr>

                <tr className="border-t">
                  <td className="px-5 py-4">INV-10024</td>

                  <td className="px-5 py-4">15 Jun 2026</td>

                  <td className="px-5 py-4">₹1,999</td>

                  <td className="px-5 py-4 text-green-600 font-semibold">
                    Paid
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button className="text-blue-600 hover:underline">
                      Download
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {/* ======================================
            SUBSCRIPTION USAGE
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Subscription Usage</h2>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Active Users</h3>

              <p className="text-3xl font-bold mt-3">6 / 10</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">POS Devices</h3>

              <p className="text-3xl font-bold mt-3">2 / 3</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">QR Tables</h3>

              <p className="text-3xl font-bold mt-3">20</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Storage Used</h3>

              <p className="text-3xl font-bold mt-3">1.2 GB</p>
            </div>
          </div>
        </div>

        {/* ======================================
            RENEWAL INFORMATION
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Renewal Information</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Expiry Date</h3>

              <p className="text-xl font-bold mt-3">{subscription.expiry}</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Next Renewal</h3>

              <p className="text-xl font-bold mt-3">
                {subscription.nextBilling}
              </p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Renewal Amount</h3>

              <p className="text-xl font-bold mt-3">{subscription.amount}</p>
            </div>
          </div>
        </div>

        {/* ======================================
            SUPPORT
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Subscription Support</h2>

          <div className="flex flex-wrap gap-4">
            <button
              className="
                h-12
                px-6
                rounded-xl
                bg-blue-600
                hover:bg-blue-700
                text-white
              "
            >
              Contact Support
            </button>

            <button
              className="
                h-12
                px-6
                rounded-xl
                border
                hover:bg-gray-100
              "
            >
              View Plans
            </button>

            <button
              className="
                h-12
                px-6
                rounded-xl
                border
                border-red-300
                text-red-600
                hover:bg-red-50
              "
            >
              Cancel Subscription
            </button>
          </div>
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
            Refresh
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
            Save Subscription Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
