// ==============================================
// src/settings/subscription/Subscription.jsx
// Updated with dark/light mode support, matching SettingsDashboard
// ==============================================

import React, { useState } from "react";
import { FiCreditCard, FiSave, FiRefreshCw } from "react-icons/fi";

const Card = ({ title, right, children }) => (
  <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
    <div className="flex items-center justify-between mb-8">
      <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">{title}</h2>
      {right}
    </div>
    {children}
  </div>
);

const StatBox = ({ label, value, valueClass = "" }) => (
  <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
    <h3 className="text-[#6B7280] dark:text-[#9CA8A0]">{label}</h3>
    <p className={`text-2xl font-bold mt-3 text-[#1F2937] dark:text-[#E4E9E2] ${valueClass}`}>
      {value}
    </p>
  </div>
);

const inputClass =
  "w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] dark:[color-scheme:dark] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA] transition-colors";

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
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 dark:bg-indigo-400 text-white flex items-center justify-center">
              <FiCreditCard size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                Subscription
              </h1>

              <p className="mt-2 text-[#6B7280] dark:text-[#9CA8A0]">
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
                border-[#E7EAE1]
                dark:border-[#262B24]
                text-[#1F2937]
                dark:text-[#E4E9E2]
                hover:bg-[#F3F5EE]
                dark:hover:bg-white/5
                flex
                items-center
                gap-2
                transition-colors
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
                bg-[#3FA34D]
                dark:bg-[#43B75A]
                hover:bg-[#358F42]
                dark:hover:bg-[#3AA34E]
                text-white
                flex
                items-center
                gap-2
                shadow-lg
                transition-all
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

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                {subscription.plan}
              </h2>

              <p className="mt-2 text-[#6B7280] dark:text-[#9CA8A0]">
                Your current active subscription plan.
              </p>
            </div>

            <span className="px-5 py-2 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-300 font-semibold">
              {subscription.status}
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-10">
            <StatBox label="Billing Cycle" value={subscription.billing} />
            <StatBox label="Next Billing" value={subscription.nextBilling} />
            <StatBox label="Amount" value={subscription.amount} />
          </div>
        </div>

        {/* ======================================
            PLAN LIMITS
        ====================================== */}

        <Card title="Plan Limits">
          <div className="grid md:grid-cols-4 gap-6">
            <StatBox label="Users" value="10" valueClass="text-3xl" />
            <StatBox label="POS Devices" value="3" valueClass="text-3xl" />
            <StatBox label="Tables" value="Unlimited" valueClass="text-3xl" />
            <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
              <h3 className="text-[#6B7280] dark:text-[#9CA8A0]">QR Ordering</h3>
              <p className="text-xl font-bold mt-4 text-green-600 dark:text-green-400">
                Enabled
              </p>
            </div>
          </div>
        </Card>

        {/* ======================================
            PLAN FEATURES
        ====================================== */}

        <Card
          title="Included Features"
          right={
            <button
              className="
                h-11
                px-5
                rounded-lg
                bg-[#3FA34D]
                dark:bg-[#43B75A]
                hover:bg-[#358F42]
                dark:hover:bg-[#3AA34E]
                text-white
                transition-colors
              "
            >
              Upgrade Plan
            </button>
          }
        >
          <div className="grid md:grid-cols-2 gap-5">
            {[
              "Unlimited Orders",
              "POS Billing",
              "Kitchen Display System",
              "QR Ordering",
              "Online Payments",
              "Inventory Management",
              "Customer Management",
              "Sales Reports",
            ].map((feature) => (
              <div
                key={feature}
                className="border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5 text-[#1F2937] dark:text-[#E4E9E2]"
              >
                ✅ {feature}
              </div>
            ))}
          </div>
        </Card>

        {/* ======================================
            PAYMENT SETTINGS
        ====================================== */}

        <Card title="Payment Settings">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Payment Method
              </label>

              <select className={inputClass}>
                <option>Credit Card</option>

                <option>Debit Card</option>

                <option>UPI</option>

                <option>Net Banking</option>
              </select>
            </div>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                  Auto Renewal
                </h3>

                <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                  Automatically renew your subscription.
                </p>
              </div>

              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 accent-[#3FA34D] dark:accent-[#43B75A]"
              />
            </label>
          </div>
        </Card>

        {/* ======================================
            PAYMENT HISTORY
        ====================================== */}

        <Card
          title="Payment History"
          right={
            <button
              className="
                h-11
                px-5
                rounded-lg
                border
                border-[#E7EAE1]
                dark:border-[#262B24]
                text-[#1F2937]
                dark:text-[#E4E9E2]
                hover:bg-[#F3F5EE]
                dark:hover:bg-white/5
                transition-colors
              "
            >
              Download All Invoices
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F3F5EE] dark:bg-white/5">
                <tr>
                  <th className="px-5 py-4 text-left text-[#1F2937] dark:text-[#E4E9E2]">
                    Invoice
                  </th>

                  <th className="px-5 py-4 text-left text-[#1F2937] dark:text-[#E4E9E2]">
                    Date
                  </th>

                  <th className="px-5 py-4 text-left text-[#1F2937] dark:text-[#E4E9E2]">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-left text-[#1F2937] dark:text-[#E4E9E2]">
                    Status
                  </th>

                  <th className="px-5 py-4 text-center text-[#1F2937] dark:text-[#E4E9E2]">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
                <tr className="border-t border-[#E7EAE1] dark:border-[#262B24]">
                  <td className="px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    INV-10025
                  </td>

                  <td className="px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    15 Jul 2026
                  </td>

                  <td className="px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    ₹1,999
                  </td>

                  <td className="px-5 py-4 text-green-600 dark:text-green-400 font-semibold">
                    Paid
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button className="text-[#2563EB] dark:text-[#60A5FA] hover:underline">
                      Download
                    </button>
                  </td>
                </tr>

                <tr className="border-t border-[#E7EAE1] dark:border-[#262B24]">
                  <td className="px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    INV-10024
                  </td>

                  <td className="px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    15 Jun 2026
                  </td>

                  <td className="px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    ₹1,999
                  </td>

                  <td className="px-5 py-4 text-green-600 dark:text-green-400 font-semibold">
                    Paid
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button className="text-[#2563EB] dark:text-[#60A5FA] hover:underline">
                      Download
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* ======================================
            SUBSCRIPTION USAGE
        ====================================== */}

        <Card title="Subscription Usage">
          <div className="grid md:grid-cols-4 gap-6">
            <StatBox label="Active Users" value="6 / 10" valueClass="text-3xl" />
            <StatBox label="POS Devices" value="2 / 3" valueClass="text-3xl" />
            <StatBox label="QR Tables" value="20" valueClass="text-3xl" />
            <StatBox label="Storage Used" value="1.2 GB" valueClass="text-3xl" />
          </div>
        </Card>

        {/* ======================================
            RENEWAL INFORMATION
        ====================================== */}

        <Card title="Renewal Information">
          <div className="grid md:grid-cols-3 gap-6">
            <StatBox label="Expiry Date" value={subscription.expiry} valueClass="text-xl" />
            <StatBox label="Next Renewal" value={subscription.nextBilling} valueClass="text-xl" />
            <StatBox label="Renewal Amount" value={subscription.amount} valueClass="text-xl" />
          </div>
        </Card>

        {/* ======================================
            SUPPORT
        ====================================== */}

        <Card title="Subscription Support">
          <div className="flex flex-wrap gap-4">
            <button
              className="
                h-12
                px-6
                rounded-xl
                bg-[#3FA34D]
                dark:bg-[#43B75A]
                hover:bg-[#358F42]
                dark:hover:bg-[#3AA34E]
                text-white
                transition-colors
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
                border-[#E7EAE1]
                dark:border-[#262B24]
                text-[#1F2937]
                dark:text-[#E4E9E2]
                hover:bg-[#F3F5EE]
                dark:hover:bg-white/5
                transition-colors
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
                dark:border-red-500/30
                text-red-600
                dark:text-red-400
                hover:bg-red-50
                dark:hover:bg-red-500/10
                transition-colors
              "
            >
              Cancel Subscription
            </button>
          </div>
        </Card>

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
              border-[#E7EAE1]
              dark:border-[#262B24]
              text-[#1F2937]
              dark:text-[#E4E9E2]
              hover:bg-[#F3F5EE]
              dark:hover:bg-white/5
              transition-colors
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
              bg-[#3FA34D]
              dark:bg-[#43B75A]
              hover:bg-[#358F42]
              dark:hover:bg-[#3AA34E]
              text-white
              flex
              items-center
              gap-2
              shadow-lg
              transition-all
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