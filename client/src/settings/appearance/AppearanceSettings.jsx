// ==============================================
// src/settings/appearance/AppearanceSettings.jsx
// Updated with dark/light mode support, matching SettingsDashboard
// ==============================================

import React, { useState } from "react";
import { FiMonitor, FiSave, FiRefreshCw } from "react-icons/fi";

const inputClass =
  "w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] dark:[color-scheme:dark] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA] transition-colors";

const fileInputClass =
  "w-full border border-[#E7EAE1] dark:border-[#262B24] rounded-lg p-3 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#F3F5EE] dark:file:bg-white/5 file:text-[#1F2937] dark:file:text-[#E4E9E2] transition-colors";

const Card = ({ title, children, className = "" }) => (
  <div
    className={`bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8 ${className}`}
  >
    <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">
      {title}
    </h2>
    {children}
  </div>
);

const ToggleRow = ({ title, description, checked, onChange, name }) => (
  <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
    <div>
      <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{title}</h3>
      <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">{description}</p>
    </div>
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onChange}
      className="w-5 h-5 accent-[#3FA34D] dark:accent-[#43B75A]"
    />
  </label>
);

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
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#0891B2] dark:bg-[#06B6D4] text-white flex items-center justify-center">
              <FiMonitor size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                Appearance Settings
              </h1>

              <p className="mt-2 text-[#6B7280] dark:text-[#9CA8A0]">
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
              Reset
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
            GENERAL APPEARANCE
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">
            General Appearance
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Theme */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Theme
              </label>

              <select
                name="theme"
                value={settings.theme}
                onChange={handleChange}
                className={inputClass}
              >
                <option>Light</option>

                <option>Dark</option>

                <option>Auto</option>
              </select>
            </div>

            {/* Language */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Language
              </label>

              <select
                name="language"
                value={settings.language}
                onChange={handleChange}
                className={inputClass}
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
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Font Size
              </label>

              <select
                name="fontSize"
                value={settings.fontSize}
                onChange={handleChange}
                className={inputClass}
              >
                <option>Small</option>

                <option>Medium</option>

                <option>Large</option>
              </select>
            </div>

            {/* Compact */}

            <ToggleRow
              title="Compact Mode"
              description="Reduce spacing to display more content."
              name="compactMode"
              checked={settings.compactMode}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* ======================================
            COLORS
        ====================================== */}

        <Card title="Brand Colors">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Primary Color
              </label>

              <input
                type="color"
                name="primaryColor"
                value={settings.primaryColor}
                onChange={handleChange}
                className="w-20 h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg bg-white dark:bg-[#1D231C]"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Secondary Color
              </label>

              <input
                type="color"
                name="secondaryColor"
                value={settings.secondaryColor}
                onChange={handleChange}
                className="w-20 h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg bg-white dark:bg-[#1D231C]"
              />
            </div>
          </div>
        </Card>

        {/* ======================================
            BRANDING
        ====================================== */}

        <Card title="Branding">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Restaurant Logo */}

            <div>
              <label className="block mb-3 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Restaurant Logo
              </label>

              <input type="file" accept="image/*" className={fileInputClass} />

              <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] mt-2">
                Used in POS, invoices and customer receipts.
              </p>
            </div>

            {/* Login Background */}

            <div>
              <label className="block mb-3 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Login Background
              </label>

              <input type="file" accept="image/*" className={fileInputClass} />

              <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] mt-2">
                Displayed on the login screen.
              </p>
            </div>
          </div>
        </Card>

        {/* ======================================
            MODULE THEMES
        ====================================== */}

        <Card title="Module Themes">
          <div className="grid md:grid-cols-2 gap-6">
            {/* POS */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                POS Theme
              </label>

              <select className={inputClass}>
                <option>Default</option>

                <option>Dark</option>

                <option>Restaurant Blue</option>

                <option>Orange</option>
              </select>
            </div>

            {/* Kiosk */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Kiosk Theme
              </label>

              <select className={inputClass}>
                <option>Restaurant</option>

                <option>Modern</option>

                <option>Dark</option>

                <option>Minimal</option>
              </select>
            </div>

            {/* QR */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                QR Menu Theme
              </label>

              <select className={inputClass}>
                <option>Default</option>

                <option>Modern</option>

                <option>Classic</option>
              </select>
            </div>

            {/* Receipt */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Receipt Theme
              </label>

              <select className={inputClass}>
                <option>Standard</option>

                <option>Compact</option>

                <option>Minimal</option>
              </select>
            </div>
          </div>
        </Card>

        {/* ======================================
            UI CUSTOMIZATION
        ====================================== */}

        <Card title="UI Customization">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Button */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Button Style
              </label>

              <select className={inputClass}>
                <option>Rounded</option>

                <option>Square</option>

                <option>Pill</option>
              </select>
            </div>

            {/* Radius */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Border Radius
              </label>

              <select className={inputClass}>
                <option>Small</option>

                <option>Medium</option>

                <option>Large</option>
              </select>
            </div>

            {/* Cards */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Card Style
              </label>

              <select className={inputClass}>
                <option>Flat</option>

                <option>Shadow</option>

                <option>Outlined</option>
              </select>
            </div>

            {/* Animations */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                  Enable Animations
                </h3>

                <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                  Enable smooth UI animations and transitions.
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
            INVOICE & RECEIPT BRANDING
        ====================================== */}

        <Card title="Invoice & Receipt Branding">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Show Logo */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                  Show Restaurant Logo
                </h3>

                <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                  Display logo on invoices and receipts.
                </p>
              </div>

              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 accent-[#3FA34D] dark:accent-[#43B75A]"
              />
            </label>

            {/* QR */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                  Show QR Code
                </h3>

                <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                  Print QR code on customer receipts.
                </p>
              </div>

              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 accent-[#3FA34D] dark:accent-[#43B75A]"
              />
            </label>

            {/* Footer */}

            <div className="md:col-span-2">
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Receipt Footer Message
              </label>

              <textarea
                rows={4}
                className="w-full border border-[#E7EAE1] dark:border-[#262B24] rounded-lg p-4 resize-none bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA] transition-colors"
                placeholder="Thank you for visiting. We look forward to serving you again."
              />
            </div>
          </div>
        </Card>

        {/* ======================================
            DASHBOARD LAYOUT
        ====================================== */}

        <Card title="Dashboard Layout">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Sidebar Style
              </label>

              <select className={inputClass}>
                <option>Expanded</option>

                <option>Collapsed</option>

                <option>Auto Collapse</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Dashboard Layout
              </label>

              <select className={inputClass}>
                <option>Comfortable</option>

                <option>Compact</option>

                <option>Wide</option>
              </select>
            </div>
          </div>
        </Card>

        {/* ======================================
            LIVE PREVIEW
        ====================================== */}

        <Card title="Theme Preview">
          <div className="rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] overflow-hidden">
            <div
              className="h-16 flex items-center px-6 text-white font-bold"
              style={{
                background: settings.primaryColor,
              }}
            >
              Restaurant ERP
            </div>

            <div className="p-8 bg-[#F3F5EE] dark:bg-[#12160F]">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#171C17] rounded-xl shadow p-5 border border-transparent dark:border-[#262B24]">
                  <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                    Orders
                  </h3>

                  <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-2">
                    125 Today
                  </p>
                </div>

                <div className="bg-white dark:bg-[#171C17] rounded-xl shadow p-5 border border-transparent dark:border-[#262B24]">
                  <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                    Revenue
                  </h3>

                  <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-2">
                    ₹24,500
                  </p>
                </div>

                <div className="bg-white dark:bg-[#171C17] rounded-xl shadow p-5 border border-transparent dark:border-[#262B24]">
                  <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                    Customers
                  </h3>

                  <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-2">
                    42 New
                  </p>
                </div>
              </div>
            </div>
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
            Restore Defaults
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
            Save Appearance
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;