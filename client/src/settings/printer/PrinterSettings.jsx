// ==============================================
// src/settings/printer/PrinterSettings.jsx
// ==============================================

import React, { useState } from "react";
import { FiPrinter, FiSave, FiRefreshCw } from "react-icons/fi";

const PrinterSettings = () => {
  const [settings, setSettings] = useState({
    enablePrinting: true,
    defaultPrinter: "POS Receipt Printer",
    paperSize: "80 mm",
    printerType: "Network",
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
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
              <FiPrinter size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold">Printer Settings</h1>

              <p className="mt-2 text-gray-500">
                Configure receipt, kitchen and invoice printers.
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
            GENERAL
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8">
          <h2 className="text-2xl font-bold mb-8">General Printer Settings</h2>

          <div className="space-y-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Enable Printing</h3>

                <p className="text-sm text-gray-500">
                  Enable printing throughout the restaurant.
                </p>
              </div>

              <input
                type="checkbox"
                name="enablePrinting"
                checked={settings.enablePrinting}
                onChange={handleChange}
                className="w-5 h-5"
              />
            </label>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 font-medium">
                  Default Printer
                </label>

                <select
                  name="defaultPrinter"
                  value={settings.defaultPrinter}
                  onChange={handleChange}
                  className="w-full h-12 border rounded-lg px-4"
                >
                  <option>POS Receipt Printer</option>

                  <option>Kitchen Printer</option>

                  <option>Invoice Printer</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 font-medium">
                  Printer Connection
                </label>

                <select
                  name="printerType"
                  value={settings.printerType}
                  onChange={handleChange}
                  className="w-full h-12 border rounded-lg px-4"
                >
                  <option>USB</option>

                  <option>Network</option>

                  <option>Bluetooth</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 font-medium">Paper Size</label>

                <select
                  name="paperSize"
                  value={settings.paperSize}
                  onChange={handleChange}
                  className="w-full h-12 border rounded-lg px-4"
                >
                  <option>58 mm</option>

                  <option>80 mm</option>

                  <option>A4</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        {/* ======================================
            PRINTER CONFIGURATION
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Printer Configuration</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* POS Printer */}

            <div className="border rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">POS Receipt Printer</h3>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Printer Name"
                  className="w-full h-11 border rounded-lg px-4"
                />

                <input
                  type="text"
                  placeholder="IP Address"
                  className="w-full h-11 border rounded-lg px-4"
                />

                <button
                  className="
                    w-full
                    h-11
                    rounded-lg
                    bg-green-600
                    hover:bg-green-700
                    text-white
                  "
                >
                  Test Print
                </button>
              </div>
            </div>

            {/* Kitchen Printer */}

            <div className="border rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Kitchen Printer</h3>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Printer Name"
                  className="w-full h-11 border rounded-lg px-4"
                />

                <input
                  type="text"
                  placeholder="IP Address"
                  className="w-full h-11 border rounded-lg px-4"
                />

                <button
                  className="
                    w-full
                    h-11
                    rounded-lg
                    bg-green-600
                    hover:bg-green-700
                    text-white
                  "
                >
                  Test Print
                </button>
              </div>
            </div>

            {/* Invoice Printer */}

            <div className="border rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Invoice Printer</h3>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Printer Name"
                  className="w-full h-11 border rounded-lg px-4"
                />

                <input
                  type="text"
                  placeholder="IP Address"
                  className="w-full h-11 border rounded-lg px-4"
                />

                <button
                  className="
                    w-full
                    h-11
                    rounded-lg
                    bg-green-600
                    hover:bg-green-700
                    text-white
                  "
                >
                  Test Print
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================
            AUTO PRINT SETTINGS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Auto Print Settings</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Auto Print Receipt</h3>

                <p className="text-sm text-gray-500">
                  Print receipt immediately after payment.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Auto Print Kitchen Ticket</h3>

                <p className="text-sm text-gray-500">
                  Print KOT automatically for every order.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Auto Print Invoice</h3>

                <p className="text-sm text-gray-500">
                  Print invoice after order completion.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Reprint on Demand</h3>

                <p className="text-sm text-gray-500">
                  Allow staff to reprint previous bills.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>
          </div>
        </div>

        {/* ======================================
            RECEIPT OPTIONS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Receipt Options</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">Number of Copies</label>

              <select className="w-full h-12 border rounded-lg px-4">
                <option>1 Copy</option>

                <option>2 Copies</option>

                <option>3 Copies</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium">Receipt Width</label>

              <select className="w-full h-12 border rounded-lg px-4">
                <option>58 mm</option>

                <option>80 mm</option>
              </select>
            </div>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Print Restaurant Logo</h3>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Print GST Details</h3>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>
          </div>
        </div>
        {/* ======================================
            KITCHEN ORDER TICKET (KOT)
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">
            Kitchen Order Ticket (KOT)
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Auto Print KOT</h3>

                <p className="text-sm text-gray-500">
                  Automatically print kitchen tickets.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Print Item Notes</h3>

                <p className="text-sm text-gray-500">
                  Include customer notes in kitchen ticket.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Print Table Number</h3>

                <p className="text-sm text-gray-500">
                  Display table number on kitchen ticket.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Print Order Time</h3>

                <p className="text-sm text-gray-500">
                  Include order time on kitchen ticket.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>
          </div>
        </div>

        {/* ======================================
            CASH DRAWER & BARCODE
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Cash Drawer & Barcode</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">
                  Open Cash Drawer After Payment
                </h3>

                <p className="text-sm text-gray-500">
                  Automatically trigger cash drawer.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Print QR Code</h3>

                <p className="text-sm text-gray-500">
                  Print QR code on receipt.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Print Barcode</h3>

                <p className="text-sm text-gray-500">
                  Print barcode for invoice tracking.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5" />
            </label>
          </div>
        </div>

        {/* ======================================
            CONNECTED PRINTERS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Connected Printers</h2>

            <button
              className="
                h-11
                px-5
                rounded-lg
                bg-green-600
                hover:bg-green-700
                text-white
              "
            >
              Scan Printers
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-left">Printer</th>

                  <th className="px-5 py-4 text-left">Type</th>

                  <th className="px-5 py-4 text-left">Connection</th>

                  <th className="px-5 py-4 text-left">Status</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-t">
                  <td className="px-5 py-4">Epson TM-T82</td>

                  <td className="px-5 py-4">Receipt Printer</td>

                  <td className="px-5 py-4">Network</td>

                  <td className="px-5 py-4 text-green-600 font-semibold">
                    Connected
                  </td>
                </tr>

                <tr className="border-t">
                  <td className="px-5 py-4">Epson Kitchen</td>

                  <td className="px-5 py-4">Kitchen Printer</td>

                  <td className="px-5 py-4">USB</td>

                  <td className="px-5 py-4 text-green-600 font-semibold">
                    Connected
                  </td>
                </tr>
              </tbody>
            </table>
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
            Save Printer Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrinterSettings;
