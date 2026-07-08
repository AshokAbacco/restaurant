// ==============================================
// src/settings/kiosk/KioskSettings.jsx
// ==============================================

import React, { useState } from "react";
import { FiMonitor, FiSave, FiRefreshCw } from "react-icons/fi";

const KioskSettings = () => {
  const [settings, setSettings] = useState({
    kioskEnabled: true,
    restaurantName: "My Restaurant",
    welcomeTitle: "Welcome!",
    welcomeSubtitle: "Tap anywhere to begin your order",
    autoResetTime: 60,
    theme: "Light",
  });

  // ==========================================
  // CHANGE HANDLER
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
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
              <FiMonitor size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                Kiosk Settings
              </h1>

              <p className="mt-2 text-gray-500">
                Configure your self-order kiosk experience.
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
            {/* Enable */}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Enable Self-Order Kiosk</h3>

                <p className="text-gray-500 text-sm">
                  Allow customers to place orders using the kiosk.
                </p>
              </div>

              <input
                type="checkbox"
                name="kioskEnabled"
                checked={settings.kioskEnabled}
                onChange={handleChange}
                className="w-6 h-6"
              />
            </div>

            {/* Restaurant Name */}

            <div>
              <label className="block mb-2 font-medium">Restaurant Name</label>

              <input
                type="text"
                name="restaurantName"
                value={settings.restaurantName}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            {/* Welcome Title */}

            <div>
              <label className="block mb-2 font-medium">Welcome Title</label>

              <input
                type="text"
                name="welcomeTitle"
                value={settings.welcomeTitle}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            {/* Welcome Subtitle */}

            <div>
              <label className="block mb-2 font-medium">Welcome Subtitle</label>

              <textarea
                rows={3}
                name="welcomeSubtitle"
                value={settings.welcomeSubtitle}
                onChange={handleChange}
                className="w-full border rounded-lg p-4 resize-none"
              />
            </div>
          </div>
        </div>
        {/* ======================================
            ORDER SETTINGS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Order Settings</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Auto Reset */}

            <div>
              <label className="block mb-2 font-medium">
                Auto Reset Timer (Seconds)
              </label>

              <input
                type="number"
                min="10"
                max="300"
                name="autoResetTime"
                value={settings.autoResetTime}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              />

              <p className="text-sm text-gray-500 mt-2">
                Kiosk automatically returns to the home screen after inactivity.
              </p>
            </div>

            {/* Theme */}

            <div>
              <label className="block mb-2 font-medium">Theme</label>

              <select
                name="theme"
                value={settings.theme}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              >
                <option value="Light">Light</option>

                <option value="Dark">Dark</option>

                <option value="Restaurant">Restaurant Theme</option>
              </select>
            </div>
          </div>
        </div>

        {/* ======================================
            CUSTOMER ORDER OPTIONS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Customer Order Options</h2>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Dine In */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Enable Dine-In</h3>

                <p className="text-sm text-gray-500">
                  Customers can place dine-in orders.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            {/* Take Away */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Enable Take Away</h3>

                <p className="text-sm text-gray-500">
                  Customers can place takeaway orders.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            {/* Search */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Show Search Bar</h3>

                <p className="text-sm text-gray-500">
                  Allow customers to search menu items.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            {/* Prices */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Show Prices</h3>

                <p className="text-sm text-gray-500">
                  Display item prices on the menu.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            {/* Ratings */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Show Ratings</h3>

                <p className="text-sm text-gray-500">
                  Display customer ratings for menu items.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            {/* Item Images */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Show Food Images</h3>

                <p className="text-sm text-gray-500">
                  Display food images in the menu.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            {/* Customer Name */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Ask Customer Name</h3>

                <p className="text-sm text-gray-500">
                  Require customer name before payment.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            {/* Mobile Number */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Ask Mobile Number</h3>

                <p className="text-sm text-gray-500">
                  Collect customer mobile number.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5" />
            </label>
          </div>
        </div>
        {/* ======================================
            PAYMENT OPTIONS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Payment Options</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Cash Payment</h3>

                <p className="text-sm text-gray-500">
                  Accept cash payments at the counter.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">UPI Payment</h3>

                <p className="text-sm text-gray-500">Enable UPI QR payments.</p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Card Payment</h3>

                <p className="text-sm text-gray-500">
                  Accept Debit/Credit Cards.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Pay Later</h3>

                <p className="text-sm text-gray-500">
                  Allow payment at the billing counter.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5" />
            </label>
          </div>
        </div>

        {/* ======================================
            DISPLAY SETTINGS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Display Settings</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">
                Success Screen Duration (Seconds)
              </label>

              <input
                type="number"
                min="3"
                max="30"
                defaultValue="8"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">
                Idle Screen Duration (Seconds)
              </label>

              <input
                type="number"
                min="10"
                max="300"
                defaultValue="60"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>
          </div>
        </div>

        {/* ======================================
            BRANDING
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Kiosk Branding</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block mb-3 font-medium">Kiosk Logo</label>

              <input
                type="file"
                accept="image/*"
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="block mb-3 font-medium">Background Image</label>

              <input
                type="file"
                accept="image/*"
                className="w-full border rounded-lg p-3"
              />
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
            Save Kiosk Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default KioskSettings;
