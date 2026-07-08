// ==============================================
// src/settings/appearance/AppearanceSettings.jsx
// ==============================================

import React, { useState } from "react";
import { FiMonitor, FiSave, FiRefreshCw } from "react-icons/fi";

const AppearanceSettings = () => {
  const [settings, setSettings] = useState({
    theme: "Light",
    primaryColor: "#2563EB",
    secondaryColor: "#F97316",
    language: "English",
    fontSize: "Medium",
    compactMode: false,
  });

  // ==========================================
  // CHANGE
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

    // API Later
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-purple-600 text-white flex items-center justify-center">
              <FiMonitor size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                Appearance Settings
              </h1>

              <p className="mt-2 text-gray-500">
                Customize the appearance of your restaurant ERP.
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
            GENERAL APPEARANCE
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8">
          <h2 className="text-2xl font-bold mb-8">General Appearance</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Theme */}

            <div>
              <label className="block mb-2 font-medium">Theme</label>

              <select
                name="theme"
                value={settings.theme}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              >
                <option>Light</option>

                <option>Dark</option>

                <option>Auto</option>
              </select>
            </div>

            {/* Language */}

            <div>
              <label className="block mb-2 font-medium">Language</label>

              <select
                name="language"
                value={settings.language}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              >
                <option>English</option>

                <option>Hindi</option>

                <option>Kannada</option>

                <option>Telugu</option>

                <option>Tamil</option>
              </select>
            </div>

            {/* Font */}

            <div>
              <label className="block mb-2 font-medium">Font Size</label>

              <select
                name="fontSize"
                value={settings.fontSize}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              >
                <option>Small</option>

                <option>Medium</option>

                <option>Large</option>
              </select>
            </div>

            {/* Compact */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Compact Mode</h3>

                <p className="text-sm text-gray-500">
                  Reduce spacing to display more content.
                </p>
              </div>

              <input
                type="checkbox"
                name="compactMode"
                checked={settings.compactMode}
                onChange={handleChange}
                className="w-5 h-5"
              />
            </label>
          </div>
        </div>

        {/* ======================================
            COLORS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Brand Colors</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">Primary Color</label>

              <input
                type="color"
                name="primaryColor"
                value={settings.primaryColor}
                onChange={handleChange}
                className="w-20 h-12 border rounded-lg"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Secondary Color</label>

              <input
                type="color"
                name="secondaryColor"
                value={settings.secondaryColor}
                onChange={handleChange}
                className="w-20 h-12 border rounded-lg"
              />
            </div>
          </div>
        </div>
        {/* ======================================
            BRANDING
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Branding</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Restaurant Logo */}

            <div>
              <label className="block mb-3 font-medium">Restaurant Logo</label>

              <input
                type="file"
                accept="image/*"
                className="w-full border rounded-lg p-3"
              />

              <p className="text-sm text-gray-500 mt-2">
                Used in POS, invoices and customer receipts.
              </p>
            </div>

            {/* Login Background */}

            <div>
              <label className="block mb-3 font-medium">Login Background</label>

              <input
                type="file"
                accept="image/*"
                className="w-full border rounded-lg p-3"
              />

              <p className="text-sm text-gray-500 mt-2">
                Displayed on the login screen.
              </p>
            </div>
          </div>
        </div>

        {/* ======================================
            MODULE THEMES
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Module Themes</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* POS */}

            <div>
              <label className="block mb-2 font-medium">POS Theme</label>

              <select className="w-full h-12 border rounded-lg px-4">
                <option>Default</option>

                <option>Dark</option>

                <option>Restaurant Blue</option>

                <option>Orange</option>
              </select>
            </div>

            {/* Kiosk */}

            <div>
              <label className="block mb-2 font-medium">Kiosk Theme</label>

              <select className="w-full h-12 border rounded-lg px-4">
                <option>Restaurant</option>

                <option>Modern</option>

                <option>Dark</option>

                <option>Minimal</option>
              </select>
            </div>

            {/* QR */}

            <div>
              <label className="block mb-2 font-medium">QR Menu Theme</label>

              <select className="w-full h-12 border rounded-lg px-4">
                <option>Default</option>

                <option>Modern</option>

                <option>Classic</option>
              </select>
            </div>

            {/* Receipt */}

            <div>
              <label className="block mb-2 font-medium">Receipt Theme</label>

              <select className="w-full h-12 border rounded-lg px-4">
                <option>Standard</option>

                <option>Compact</option>

                <option>Minimal</option>
              </select>
            </div>
          </div>
        </div>

        {/* ======================================
            UI CUSTOMIZATION
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">UI Customization</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Button */}

            <div>
              <label className="block mb-2 font-medium">Button Style</label>

              <select className="w-full h-12 border rounded-lg px-4">
                <option>Rounded</option>

                <option>Square</option>

                <option>Pill</option>
              </select>
            </div>

            {/* Radius */}

            <div>
              <label className="block mb-2 font-medium">Border Radius</label>

              <select className="w-full h-12 border rounded-lg px-4">
                <option>Small</option>

                <option>Medium</option>

                <option>Large</option>
              </select>
            </div>

            {/* Cards */}

            <div>
              <label className="block mb-2 font-medium">Card Style</label>

              <select className="w-full h-12 border rounded-lg px-4">
                <option>Flat</option>

                <option>Shadow</option>

                <option>Outlined</option>
              </select>
            </div>

            {/* Animations */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Enable Animations</h3>

                <p className="text-sm text-gray-500">
                  Enable smooth UI animations and transitions.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>
          </div>
        </div>
        {/* ======================================
            INVOICE & RECEIPT BRANDING
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">
            Invoice & Receipt Branding
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Show Logo */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Show Restaurant Logo</h3>

                <p className="text-sm text-gray-500">
                  Display logo on invoices and receipts.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            {/* QR */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Show QR Code</h3>

                <p className="text-sm text-gray-500">
                  Print QR code on customer receipts.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            {/* Footer */}

            <div className="md:col-span-2">
              <label className="block mb-2 font-medium">
                Receipt Footer Message
              </label>

              <textarea
                rows={4}
                className="w-full border rounded-lg p-4 resize-none"
                placeholder="Thank you for visiting. We look forward to serving you again."
              />
            </div>
          </div>
        </div>

        {/* ======================================
            DASHBOARD LAYOUT
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Dashboard Layout</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">Sidebar Style</label>

              <select className="w-full h-12 border rounded-lg px-4">
                <option>Expanded</option>

                <option>Collapsed</option>

                <option>Auto Collapse</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium">Dashboard Layout</label>

              <select className="w-full h-12 border rounded-lg px-4">
                <option>Comfortable</option>

                <option>Compact</option>

                <option>Wide</option>
              </select>
            </div>
          </div>
        </div>

        {/* ======================================
            LIVE PREVIEW
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Theme Preview</h2>

          <div className="rounded-2xl border overflow-hidden">
            <div
              className="h-16 flex items-center px-6 text-white font-bold"
              style={{
                background: settings.primaryColor,
              }}
            >
              Restaurant ERP
            </div>

            <div className="p-8 bg-gray-50">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow p-5">
                  <h3 className="font-semibold">Orders</h3>

                  <p className="text-gray-500 mt-2">125 Today</p>
                </div>

                <div className="bg-white rounded-xl shadow p-5">
                  <h3 className="font-semibold">Revenue</h3>

                  <p className="text-gray-500 mt-2">₹24,500</p>
                </div>

                <div className="bg-white rounded-xl shadow p-5">
                  <h3 className="font-semibold">Customers</h3>

                  <p className="text-gray-500 mt-2">42 New</p>
                </div>
              </div>
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
            Restore Defaults
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
            Save Appearance
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;
