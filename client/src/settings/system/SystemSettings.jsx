// ==============================================
// src/settings/system/SystemSettings.jsx
// Updated with dark/light mode support, matching SettingsDashboard
// ==============================================

import React, { useState } from "react";
import { FiSettings, FiSave, FiRefreshCw } from "react-icons/fi";

const inputClass =
  "w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] dark:[color-scheme:dark] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA] transition-colors";

const Card = ({ title, children, className = "", titleClass = "" }) => (
  <div
    className={`bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8 ${className}`}
  >
    <h2 className={`text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2] ${titleClass}`}>
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

const StatBox = ({ label, value, valueClass = "text-green-600 dark:text-green-400" }) => (
  <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
    <h3 className="text-[#6B7280] dark:text-[#9CA8A0]">{label}</h3>
    <p className={`mt-3 font-bold ${valueClass}`}>{value}</p>
  </div>
);

const SystemSettings = () => {
  const [settings, setSettings] = useState({
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    currency: "INR (₹)",
    language: "English",
    sessionTimeout: 30,
    maintenanceMode: false,
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
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#475569] dark:bg-[#94A3B8] text-white flex items-center justify-center">
              <FiSettings size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                System Settings
              </h1>

              <p className="mt-2 text-[#6B7280] dark:text-[#9CA8A0]">
                Configure global system preferences and security.
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
            GENERAL
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">
            General Settings
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Time Zone
              </label>

              <select
                name="timezone"
                value={settings.timezone}
                onChange={handleChange}
                className={inputClass}
              >
                <option>Asia/Kolkata</option>

                <option>UTC</option>

                <option>America/New_York</option>

                <option>Europe/London</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Date Format
              </label>

              <select
                name="dateFormat"
                value={settings.dateFormat}
                onChange={handleChange}
                className={inputClass}
              >
                <option>DD/MM/YYYY</option>

                <option>MM/DD/YYYY</option>

                <option>YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Currency
              </label>

              <select
                name="currency"
                value={settings.currency}
                onChange={handleChange}
                className={inputClass}
              >
                <option>INR (₹)</option>

                <option>USD ($)</option>

                <option>EUR (€)</option>
              </select>
            </div>

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
              </select>
            </div>
          </div>
        </div>

        {/* ======================================
            SECURITY
        ====================================== */}

        <Card title="Security">
          <div className="space-y-6">
            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Session Timeout (Minutes)
              </label>

              <input
                type="number"
                name="sessionTimeout"
                value={settings.sessionTimeout}
                onChange={handleChange}
                className={`md:w-60 ${inputClass}`}
              />
            </div>

            <ToggleRow
              title="Maintenance Mode"
              description="Prevent users from accessing the system during maintenance."
              name="maintenanceMode"
              checked={settings.maintenanceMode}
              onChange={handleChange}
            />
          </div>
        </Card>

        {/* ======================================
            LOGIN & SECURITY
        ====================================== */}

        <Card title="Login & Security">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Strong Password */}

            <ToggleRow
              title="Strong Password Policy"
              description="Require uppercase, lowercase, numbers and symbols."
              defaultChecked
            />

            {/* Two Factor */}

            <ToggleRow
              title="Two-Factor Authentication"
              description="Enable OTP verification for administrators."
            />

            {/* Login Attempts */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Maximum Login Attempts
              </label>

              <input
                type="number"
                defaultValue="5"
                min="1"
                max="20"
                className={inputClass}
              />
            </div>

            {/* Lockout */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Account Lock Duration (Minutes)
              </label>

              <input
                type="number"
                defaultValue="30"
                min="1"
                className={inputClass}
              />
            </div>
          </div>
        </Card>

        {/* ======================================
            SYSTEM STATUS
        ====================================== */}

        <Card title="System Status">
          <div className="grid md:grid-cols-3 gap-6">
            <StatBox label="Database" value="Connected" />
            <StatBox label="API Server" value="Online" />
            <StatBox label="Storage" value="Healthy" />
          </div>
        </Card>

        {/* ======================================
            EMAIL & API
        ====================================== */}

        <Card title="Integrations">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
              <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Email Service
              </h3>

              <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] mt-2">
                SMTP Server Status
              </p>

              <span className="inline-block mt-4 px-4 py-2 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-300">
                Connected
              </span>
            </div>

            <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
              <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Payment Gateway
              </h3>

              <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] mt-2">
                Gateway Connection Status
              </p>

              <span className="inline-block mt-4 px-4 py-2 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-300">
                Connected
              </span>
            </div>
          </div>
        </Card>

        {/* ======================================
            SYSTEM TOOLS
        ====================================== */}

        <Card title="System Tools">
          <div className="flex flex-wrap gap-4">
            <button
              className="
                h-12
                px-6
                rounded-xl
                bg-[#2563EB]
                dark:bg-[#60A5FA]
                hover:bg-[#1D4ED8]
                dark:hover:bg-[#3B82F6]
                text-white
                transition-colors
              "
            >
              Clear Cache
            </button>

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
              Restart Services
            </button>

            <button
              className="
                h-12
                px-6
                rounded-xl
                bg-orange-600
                dark:bg-orange-500
                hover:bg-orange-700
                dark:hover:bg-orange-400
                text-white
                transition-colors
              "
            >
              Logout All Users
            </button>
          </div>
        </Card>

        {/* ======================================
            SYSTEM INFORMATION
        ====================================== */}

        <Card title="System Information">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatBox label="Application Version" value="v1.0.0" valueClass="text-xl text-[#1F2937] dark:text-[#E4E9E2]" />
            <StatBox label="Node.js Version" value="v22.x" valueClass="text-xl text-[#1F2937] dark:text-[#E4E9E2]" />
            <StatBox label="Database" value="PostgreSQL" valueClass="text-xl text-[#1F2937] dark:text-[#E4E9E2]" />
            <StatBox label="Server Uptime" value="12 Days" valueClass="text-xl text-[#1F2937] dark:text-[#E4E9E2]" />
          </div>
        </Card>

        {/* ======================================
            DANGER ZONE
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-red-200 dark:border-red-500/30 p-8 mt-8">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-8">
            Danger Zone
          </h2>

          <div className="space-y-6">
            <div className="flex items-center justify-between border border-red-200 dark:border-red-500/30 rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-red-600 dark:text-red-400">
                  Enable Maintenance Mode
                </h3>

                <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] mt-1">
                  Only administrators will be able to access the application.
                </p>
              </div>

              <button
                className="
                  px-5
                  py-2
                  rounded-lg
                  bg-red-600
                  dark:bg-red-500
                  hover:bg-red-700
                  dark:hover:bg-red-400
                  text-white
                  transition-colors
                "
              >
                Enable
              </button>
            </div>

            <div className="flex items-center justify-between border border-red-200 dark:border-red-500/30 rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-red-600 dark:text-red-400">
                  Reset System Settings
                </h3>

                <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] mt-1">
                  Restore all system settings to their default values.
                </p>
              </div>

              <button
                className="
                  px-5
                  py-2
                  rounded-lg
                  border
                  border-red-500
                  dark:border-red-400
                  text-red-600
                  dark:text-red-400
                  hover:bg-red-50
                  dark:hover:bg-red-500/10
                  transition-colors
                "
              >
                Reset
              </button>
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
            Save System Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;