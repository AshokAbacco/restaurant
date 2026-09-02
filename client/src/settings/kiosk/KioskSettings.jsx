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
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] border-b border-gray-200 dark:border-[#262B24]">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 dark:bg-[#60A5FA] text-white flex items-center justify-center">
              <FiMonitor size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-gray-800 dark:text-[#E4E9E2]">
                Kiosk Settings
              </h1>

              <p className="mt-2 text-gray-500 dark:text-[#9CA8A0]">
                Configure your self-order kiosk experience.
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
            {/* Enable */}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Enable Self-Order Kiosk</h3>

                <p className="text-gray-500 dark:text-[#9CA8A0] text-sm">
                  Allow customers to place orders using the kiosk.
                </p>
              </div>

              <input
                type="checkbox"
                name="kioskEnabled"
                checked={settings.kioskEnabled}
                onChange={handleChange}
                className="w-6 h-6 accent-[#2563EB] dark:accent-[#60A5FA]"
              />
            </div>

            {/* Restaurant Name */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">Restaurant Name</label>

              <input
                type="text"
                name="restaurantName"
                value={settings.restaurantName}
                onChange={handleChange}
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />
            </div>

            {/* Welcome Title */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">Welcome Title</label>

              <input
                type="text"
                name="welcomeTitle"
                value={settings.welcomeTitle}
                onChange={handleChange}
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />
            </div>

            {/* Welcome Subtitle */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">Welcome Subtitle</label>

              <textarea
                rows={3}
                name="welcomeSubtitle"
                value={settings.welcomeSubtitle}
                onChange={handleChange}
                className="w-full border border-[#E7EAE1] dark:border-[#262B24] rounded-lg p-4 resize-none bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />
            </div>
          </div>
        </div>
        {/* ======================================
            ORDER SETTINGS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">Order Settings</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Auto Reset */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Auto Reset Timer (Seconds)
              </label>

              <input
                type="number"
                min="10"
                max="300"
                name="autoResetTime"
                value={settings.autoResetTime}
                onChange={handleChange}
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />

              <p className="text-sm text-gray-500 dark:text-[#9CA8A0] mt-2">
                Kiosk automatically returns to the home screen after inactivity.
              </p>
            </div>

            {/* Theme */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">Theme</label>

              <select
                name="theme"
                value={settings.theme}
                onChange={handleChange}
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
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

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">Customer Order Options</h2>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Dine In */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Enable Dine-In</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Customers can place dine-in orders.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            {/* Take Away */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Enable Take Away</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Customers can place takeaway orders.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            {/* Search */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Show Search Bar</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Allow customers to search menu items.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            {/* Prices */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Show Prices</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Display item prices on the menu.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            {/* Ratings */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Show Ratings</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Display customer ratings for menu items.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            {/* Item Images */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Show Food Images</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Display food images in the menu.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            {/* Customer Name */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Ask Customer Name</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Require customer name before payment.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            {/* Mobile Number */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Ask Mobile Number</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Collect customer mobile number.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>
          </div>
        </div>
        {/* ======================================
            PAYMENT OPTIONS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">Payment Options</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Cash Payment</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Accept cash payments at the counter.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">UPI Payment</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">Enable UPI QR payments.</p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Card Payment</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Accept Debit/Credit Cards.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Pay Later</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Allow payment at the billing counter.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>
          </div>
        </div>

        {/* ======================================
            DISPLAY SETTINGS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">Display Settings</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Success Screen Duration (Seconds)
              </label>

              <input
                type="number"
                min="3"
                max="30"
                defaultValue="8"
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Idle Screen Duration (Seconds)
              </label>

              <input
                type="number"
                min="10"
                max="300"
                defaultValue="60"
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />
            </div>
          </div>
        </div>

        {/* ======================================
            BRANDING
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">Kiosk Branding</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block mb-3 font-medium text-[#1F2937] dark:text-[#E4E9E2]">Kiosk Logo</label>

              <input
                type="file"
                accept="image/*"
                className="w-full border border-[#E7EAE1] dark:border-[#262B24] rounded-lg p-3 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />
            </div>

            <div>
              <label className="block mb-3 font-medium text-[#1F2937] dark:text-[#E4E9E2]">Background Image</label>

              <input
                type="file"
                accept="image/*"
                className="w-full border border-[#E7EAE1] dark:border-[#262B24] rounded-lg p-3 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />
            </div>
          </div>
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
            Save Kiosk Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default KioskSettings;