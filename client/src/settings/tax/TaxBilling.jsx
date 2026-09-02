// ==============================================
// src/settings/tax/TaxBilling.jsx
// Updated with dark/light mode support, matching SettingsDashboard
// ==============================================

import React, { useState } from "react";
import { FiPercent, FiSave, FiRefreshCw } from "react-icons/fi";

const inputClass =
  "w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA] transition-colors";

const Card = ({ title, children }) => (
  <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
    <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">
      {title}
    </h2>
    {children}
  </div>
);

const ToggleRow = ({ title, description, checked, onChange, name, defaultChecked }) => (
  <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
    <div>
      <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{title}</h3>
      <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">{description}</p>
    </div>
    <input
      type="checkbox"
      name={name}
      checked={checked}
      defaultChecked={defaultChecked}
      onChange={onChange}
      className="w-5 h-5 accent-[#3FA34D] dark:accent-[#43B75A]"
    />
  </label>
);

const StatBox = ({ label, value, valueClass = "" }) => (
  <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
    <h3 className="text-[#6B7280] dark:text-[#9CA8A0]">{label}</h3>
    <p className={`text-3xl font-bold mt-3 text-[#1F2937] dark:text-[#E4E9E2] ${valueClass}`}>
      {value}
    </p>
  </div>
);

const TaxBilling = () => {
  const [settings, setSettings] = useState({
    gstEnabled: true,
    gstNumber: "",
    cgst: 9,
    sgst: 9,
    igst: 18,
    taxType: "Inclusive",
  });

  // ==========================================

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ==========================================

  const handleSave = () => {
    console.log(settings);

    // Backend API Later
  };

  return (
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#DC2626] dark:bg-[#EF4444] text-white flex items-center justify-center">
              <FiPercent size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                Tax & Billing
              </h1>

              <p className="mt-2 text-[#6B7280] dark:text-[#9CA8A0]">
                Configure GST, taxes, invoices and billing preferences.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="h-12 px-6 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#1F2937] dark:text-[#E4E9E2] hover:bg-[#F3F5EE] dark:hover:bg-white/5 flex items-center gap-2 transition-colors">
              <FiRefreshCw />
              Reset
            </button>

            <button
              onClick={handleSave}
              className="h-12 px-8 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white flex items-center gap-2 shadow-lg transition-all"
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
            GST SETTINGS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">
            GST Settings
          </h2>

          <div className="space-y-6">
            <ToggleRow
              title="Enable GST"
              description="Apply GST to invoices and receipts."
              name="gstEnabled"
              checked={settings.gstEnabled}
              onChange={handleChange}
            />

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                GST Number
              </label>

              <input
                type="text"
                name="gstNumber"
                value={settings.gstNumber}
                onChange={handleChange}
                placeholder="Enter GST Number"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* ======================================
            TAX RATES
        ====================================== */}

        <Card title="Tax Rates">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                CGST (%)
              </label>

              <input
                type="number"
                name="cgst"
                value={settings.cgst}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                SGST (%)
              </label>

              <input
                type="number"
                name="sgst"
                value={settings.sgst}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                IGST (%)
              </label>

              <input
                type="number"
                name="igst"
                value={settings.igst}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Tax Calculation
              </label>

              <select
                name="taxType"
                value={settings.taxType}
                onChange={handleChange}
                className={inputClass}
              >
                <option>Inclusive</option>

                <option>Exclusive</option>
              </select>
            </div>
          </div>
        </Card>

        {/* ======================================
            SERVICE CHARGE
        ====================================== */}

        <Card title="Service Charge">
          <div className="grid md:grid-cols-2 gap-6">
            <ToggleRow
              title="Enable Service Charge"
              description="Apply service charge to customer bills."
              defaultChecked
            />

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Service Charge (%)
              </label>

              <input
                type="number"
                defaultValue="5"
                min="0"
                max="100"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Apply On
              </label>

              <select className={inputClass}>
                <option>All Orders</option>

                <option>Dine-In Only</option>

                <option>Takeaway Only</option>
              </select>
            </div>
          </div>
        </Card>

        {/* ======================================
            DISCOUNT SETTINGS
        ====================================== */}

        <Card title="Discount Settings">
          <div className="grid md:grid-cols-2 gap-6">
            <ToggleRow
              title="Enable Discounts"
              description="Allow staff to apply discounts."
              defaultChecked
            />

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Maximum Discount (%)
              </label>

              <input
                type="number"
                defaultValue="20"
                min="0"
                max="100"
                className={inputClass}
              />
            </div>

            <ToggleRow
              title="Manager Approval Required"
              description="Require manager approval for discounts."
            />
          </div>
        </Card>

        {/* ======================================
            BILLING SETTINGS
        ====================================== */}

        <Card title="Billing Settings">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Invoice Prefix
              </label>

              <input
                type="text"
                defaultValue="INV"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Receipt Prefix
              </label>

              <input
                type="text"
                defaultValue="REC"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Starting Invoice Number
              </label>

              <input
                type="number"
                defaultValue="1001"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Decimal Places
              </label>

              <select className={inputClass}>
                <option>0</option>

                <option>2</option>

                <option>3</option>
              </select>
            </div>

            <ToggleRow
              title="Round Off Final Bill"
              description="Automatically round invoice totals."
              defaultChecked
            />

            <ToggleRow
              title="Show GST Breakdown"
              description="Display CGST / SGST / IGST separately."
              defaultChecked
            />
          </div>
        </Card>

        {/* ======================================
            RECEIPT SETTINGS
        ====================================== */}

        <Card title="Receipt Settings">
          <div className="grid md:grid-cols-2 gap-6">
            <ToggleRow
              title="Print Restaurant Logo"
              description="Display your restaurant logo on printed bills."
              defaultChecked
            />

            <ToggleRow
              title="Print QR Code"
              description="Show payment or feedback QR code."
              defaultChecked
            />

            <div className="md:col-span-2">
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Invoice Footer Message
              </label>

              <textarea
                rows={4}
                className="w-full border border-[#E7EAE1] dark:border-[#262B24] rounded-lg p-4 resize-none bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA] transition-colors"
                placeholder="Thank you for visiting. Please visit us again."
              />
            </div>
          </div>
        </Card>

        {/* ======================================
            BILL PREVIEW
        ====================================== */}

        <Card title="Bill Preview">
          <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-[#F9FAFB] dark:bg-[#12160F] p-8 max-w-md">
            <div className="text-center">
              <h3 className="text-xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                Restaurant Name
              </h3>

              <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                GSTIN : 29ABCDE1234F1Z5
              </p>
            </div>

            <hr className="my-5 border-[#E7EAE1] dark:border-[#262B24]" />

            <div className="space-y-2 text-sm text-[#1F2937] dark:text-[#E4E9E2]">
              <div className="flex justify-between">
                <span>Veg Burger</span>

                <span>₹200.00</span>
              </div>

              <div className="flex justify-between">
                <span>French Fries</span>

                <span>₹120.00</span>
              </div>

              <div className="flex justify-between">
                <span>Cold Drink</span>

                <span>₹60.00</span>
              </div>
            </div>

            <hr className="my-5 border-[#E7EAE1] dark:border-[#262B24]" />

            <div className="space-y-2 text-sm text-[#1F2937] dark:text-[#E4E9E2]">
              <div className="flex justify-between">
                <span>Subtotal</span>

                <span>₹380.00</span>
              </div>

              <div className="flex justify-between">
                <span>GST</span>

                <span>₹68.40</span>
              </div>

              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>

                <span>₹448.40</span>
              </div>
            </div>
          </div>
        </Card>

        {/* ======================================
            TAX SUMMARY
        ====================================== */}

        <Card title="Tax Summary">
          <div className="grid md:grid-cols-4 gap-6">
            <StatBox label="CGST" value={`${settings.cgst}%`} />
            <StatBox label="SGST" value={`${settings.sgst}%`} />
            <StatBox label="IGST" value={`${settings.igst}%`} />
            <StatBox label="Tax Type" value={settings.taxType} valueClass="text-xl mt-4" />
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
            Reset Settings
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
            Save Tax Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaxBilling;