// ==============================================
// src/settings/tax/TaxBilling.jsx
// ==============================================

import React, { useState } from "react";
import { FiPercent, FiSave, FiRefreshCw } from "react-icons/fi";

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
    <div className="min-h-screen bg-slate-100">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-orange-600 text-white flex items-center justify-center">
              <FiPercent size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold">Tax & Billing</h1>

              <p className="mt-2 text-gray-500">
                Configure GST, taxes, invoices and billing preferences.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="h-12 px-6 rounded-xl border hover:bg-gray-100 flex items-center gap-2">
              <FiRefreshCw />
              Reset
            </button>

            <button
              onClick={handleSave}
              className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
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

        <div className="bg-white rounded-2xl border p-8">
          <h2 className="text-2xl font-bold mb-8">GST Settings</h2>

          <div className="space-y-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Enable GST</h3>

                <p className="text-sm text-gray-500">
                  Apply GST to invoices and receipts.
                </p>
              </div>

              <input
                type="checkbox"
                name="gstEnabled"
                checked={settings.gstEnabled}
                onChange={handleChange}
                className="w-5 h-5"
              />
            </label>

            <div>
              <label className="block mb-2 font-medium">GST Number</label>

              <input
                type="text"
                name="gstNumber"
                value={settings.gstNumber}
                onChange={handleChange}
                placeholder="Enter GST Number"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>
          </div>
        </div>

        {/* ======================================
            TAX RATES
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Tax Rates</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">CGST (%)</label>

              <input
                type="number"
                name="cgst"
                value={settings.cgst}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">SGST (%)</label>

              <input
                type="number"
                name="sgst"
                value={settings.sgst}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">IGST (%)</label>

              <input
                type="number"
                name="igst"
                value={settings.igst}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Tax Calculation</label>

              <select
                name="taxType"
                value={settings.taxType}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              >
                <option>Inclusive</option>

                <option>Exclusive</option>
              </select>
            </div>
          </div>
        </div>
        {/* ======================================
            SERVICE CHARGE
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Service Charge</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Enable Service Charge</h3>

                <p className="text-sm text-gray-500">
                  Apply service charge to customer bills.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <div>
              <label className="block mb-2 font-medium">
                Service Charge (%)
              </label>

              <input
                type="number"
                defaultValue="5"
                min="0"
                max="100"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Apply On</label>

              <select className="w-full h-12 border rounded-lg px-4">
                <option>All Orders</option>

                <option>Dine-In Only</option>

                <option>Takeaway Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* ======================================
            DISCOUNT SETTINGS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Discount Settings</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Enable Discounts</h3>

                <p className="text-sm text-gray-500">
                  Allow staff to apply discounts.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <div>
              <label className="block mb-2 font-medium">
                Maximum Discount (%)
              </label>

              <input
                type="number"
                defaultValue="20"
                min="0"
                max="100"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Manager Approval Required</h3>

                <p className="text-sm text-gray-500">
                  Require manager approval for discounts.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5" />
            </label>
          </div>
        </div>

        {/* ======================================
            BILLING SETTINGS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Billing Settings</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">Invoice Prefix</label>

              <input
                type="text"
                defaultValue="INV"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Receipt Prefix</label>

              <input
                type="text"
                defaultValue="REC"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">
                Starting Invoice Number
              </label>

              <input
                type="number"
                defaultValue="1001"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Decimal Places</label>

              <select className="w-full h-12 border rounded-lg px-4">
                <option>0</option>

                <option>2</option>

                <option>3</option>
              </select>
            </div>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Round Off Final Bill</h3>

                <p className="text-sm text-gray-500">
                  Automatically round invoice totals.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Show GST Breakdown</h3>

                <p className="text-sm text-gray-500">
                  Display CGST / SGST / IGST separately.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>
          </div>
        </div>
        {/* ======================================
            RECEIPT SETTINGS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Receipt Settings</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Print Restaurant Logo</h3>

                <p className="text-sm text-gray-500">
                  Display your restaurant logo on printed bills.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Print QR Code</h3>

                <p className="text-sm text-gray-500">
                  Show payment or feedback QR code.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <div className="md:col-span-2">
              <label className="block mb-2 font-medium">
                Invoice Footer Message
              </label>

              <textarea
                rows={4}
                className="w-full border rounded-lg p-4 resize-none"
                placeholder="Thank you for visiting. Please visit us again."
              />
            </div>
          </div>
        </div>

        {/* ======================================
            BILL PREVIEW
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Bill Preview</h2>

          <div className="rounded-xl border bg-gray-50 p-8 max-w-md">
            <div className="text-center">
              <h3 className="text-xl font-bold">Restaurant Name</h3>

              <p className="text-sm text-gray-500">GSTIN : 29ABCDE1234F1Z5</p>
            </div>

            <hr className="my-5" />

            <div className="space-y-2 text-sm">
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

            <hr className="my-5" />

            <div className="space-y-2 text-sm">
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
        </div>

        {/* ======================================
            TAX SUMMARY
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Tax Summary</h2>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">CGST</h3>

              <p className="text-3xl font-bold mt-3">{settings.cgst}%</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">SGST</h3>

              <p className="text-3xl font-bold mt-3">{settings.sgst}%</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">IGST</h3>

              <p className="text-3xl font-bold mt-3">{settings.igst}%</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Tax Type</h3>

              <p className="text-xl font-bold mt-4">{settings.taxType}</p>
            </div>
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
            Save Tax Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaxBilling;
