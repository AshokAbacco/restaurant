// ==============================================
// src/settings/qr/QRSettings.jsx
// ==============================================

import React, { useState } from "react";
import { FiSave, FiRefreshCw, FiDownload } from "react-icons/fi";
import { FaQrcode } from "react-icons/fa";
const QRSettings = () => {
  const [settings, setSettings] = useState({
    qrOrdering: true,
    qrType: "Table QR",
    domain: "https://restaurant.com/menu",
    tablePrefix: "TBL",
    totalTables: 20,
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

    // API Later
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-green-600 text-white flex items-center justify-center">
              <FaQrcode size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold">QR Ordering Settings</h1>

              <p className="mt-2 text-gray-500">
                Configure QR menu ordering for your restaurant.
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
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Enable QR Ordering</h3>

                <p className="text-sm text-gray-500">
                  Allow customers to scan QR codes and order.
                </p>
              </div>

              <input
                type="checkbox"
                name="qrOrdering"
                checked={settings.qrOrdering}
                onChange={handleChange}
                className="w-5 h-5"
              />
            </label>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 font-medium">QR Type</label>

                <select
                  name="qrType"
                  value={settings.qrType}
                  onChange={handleChange}
                  className="w-full h-12 border rounded-lg px-4"
                >
                  <option>Table QR</option>

                  <option>Restaurant QR</option>

                  <option>Takeaway QR</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 font-medium">Menu URL</label>

                <input
                  type="text"
                  name="domain"
                  value={settings.domain}
                  onChange={handleChange}
                  className="w-full h-12 border rounded-lg px-4"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================
            TABLE QR SETTINGS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Table QR Configuration</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">Table Prefix</label>

              <input
                name="tablePrefix"
                value={settings.tablePrefix}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Total Tables</label>

              <input
                type="number"
                name="totalTables"
                value={settings.totalTables}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>
          </div>
        </div>
        {/* ======================================
            QR DESIGN
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">QR Design</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* QR Color */}

            <div>
              <label className="block mb-2 font-medium">QR Color</label>

              <input
                type="color"
                defaultValue="#000000"
                className="w-20 h-12 border rounded-lg"
              />
            </div>

            {/* Background */}

            <div>
              <label className="block mb-2 font-medium">Background Color</label>

              <input
                type="color"
                defaultValue="#FFFFFF"
                className="w-20 h-12 border rounded-lg"
              />
            </div>

            {/* Logo */}

            <div className="md:col-span-2">
              <label className="block mb-2 font-medium">
                Restaurant Logo (Center of QR)
              </label>

              <input
                type="file"
                accept="image/*"
                className="w-full border rounded-lg p-3"
              />

              <p className="text-sm text-gray-500 mt-2">
                Optional logo displayed in the center of generated QR codes.
              </p>
            </div>
          </div>
        </div>

        {/* ======================================
            CUSTOMER ORDER OPTIONS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Customer Order Options</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Customer Name Required</h3>

                <p className="text-sm text-gray-500">
                  Ask customer name before placing order.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Mobile Number Required</h3>

                <p className="text-sm text-gray-500">
                  Ask customer mobile number.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Allow Special Instructions</h3>

                <p className="text-sm text-gray-500">
                  Customers can add cooking instructions.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Allow Online Payment</h3>

                <p className="text-sm text-gray-500">
                  Enable payment directly from QR ordering.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>
          </div>
        </div>

        {/* ======================================
            QR ACTIONS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">QR Code Actions</h2>

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
              Generate QR Codes
            </button>

            <button
              className="
                h-12
                px-6
                rounded-xl
                bg-green-600
                hover:bg-green-700
                text-white
                flex
                items-center
                gap-2
              "
            >
              <FiDownload />
              Download All QR Codes
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
              Print QR Codes
            </button>
          </div>
        </div>
        {/* ======================================
            QR STATISTICS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">QR Statistics</h2>

            <span className="text-sm text-gray-500">Live Overview</span>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="rounded-xl border p-6">
              <h3 className="text-sm text-gray-500">Total QR Codes</h3>

              <p className="text-3xl font-bold mt-3">{settings.totalTables}</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-sm text-gray-500">Total Scans</h3>

              <p className="text-3xl font-bold mt-3">2,458</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-sm text-gray-500">Orders via QR</h3>

              <p className="text-3xl font-bold mt-3">812</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-sm text-gray-500">Active Tables</h3>

              <p className="text-3xl font-bold mt-3">18</p>
            </div>
          </div>
        </div>

        {/* ======================================
            QR PREVIEW
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">QR Preview</h2>

          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="w-52 h-52 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
              <FaQrcode size={120} className="text-gray-400" />
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-bold">Preview Information</h3>

              <p className="text-gray-600">
                Type :
                <span className="font-semibold ml-2">{settings.qrType}</span>
              </p>

              <p className="text-gray-600">
                URL :
                <span className="font-semibold ml-2 break-all">
                  {settings.domain}
                </span>
              </p>

              <p className="text-gray-600">
                Table Prefix :
                <span className="font-semibold ml-2">
                  {settings.tablePrefix}
                </span>
              </p>
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
            Save QR Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRSettings;
