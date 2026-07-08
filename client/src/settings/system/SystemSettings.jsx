// ==============================================
// src/settings/system/SystemSettings.jsx
// ==============================================

import React, { useState } from "react";
import { FiSettings, FiSave, FiRefreshCw } from "react-icons/fi";

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
    <div className="min-h-screen bg-slate-100">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-slate-700 text-white flex items-center justify-center">
              <FiSettings size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold">System Settings</h1>

              <p className="mt-2 text-gray-500">
                Configure global system preferences and security.
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
            GENERAL
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8">
          <h2 className="text-2xl font-bold mb-8">General Settings</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">Time Zone</label>

              <select
                name="timezone"
                value={settings.timezone}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              >
                <option>Asia/Kolkata</option>

                <option>UTC</option>

                <option>America/New_York</option>

                <option>Europe/London</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium">Date Format</label>

              <select
                name="dateFormat"
                value={settings.dateFormat}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              >
                <option>DD/MM/YYYY</option>

                <option>MM/DD/YYYY</option>

                <option>YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium">Currency</label>

              <select
                name="currency"
                value={settings.currency}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              >
                <option>INR (₹)</option>

                <option>USD ($)</option>

                <option>EUR (€)</option>
              </select>
            </div>

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
              </select>
            </div>
          </div>
        </div>

        {/* ======================================
            SECURITY
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Security</h2>

          <div className="space-y-6">
            <div>
              <label className="block mb-2 font-medium">
                Session Timeout (Minutes)
              </label>

              <input
                type="number"
                name="sessionTimeout"
                value={settings.sessionTimeout}
                onChange={handleChange}
                className="w-full md:w-60 h-12 border rounded-lg px-4"
              />
            </div>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Maintenance Mode</h3>

                <p className="text-sm text-gray-500">
                  Prevent users from accessing the system during maintenance.
                </p>
              </div>

              <input
                type="checkbox"
                name="maintenanceMode"
                checked={settings.maintenanceMode}
                onChange={handleChange}
                className="w-5 h-5"
              />
            </label>
          </div>
        </div>
        {/* ======================================
            LOGIN & SECURITY
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Login & Security</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Strong Password */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Strong Password Policy</h3>

                <p className="text-sm text-gray-500">
                  Require uppercase, lowercase, numbers and symbols.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            {/* Two Factor */}

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Two-Factor Authentication</h3>

                <p className="text-sm text-gray-500">
                  Enable OTP verification for administrators.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5" />
            </label>

            {/* Login Attempts */}

            <div>
              <label className="block mb-2 font-medium">
                Maximum Login Attempts
              </label>

              <input
                type="number"
                defaultValue="5"
                min="1"
                max="20"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            {/* Lockout */}

            <div>
              <label className="block mb-2 font-medium">
                Account Lock Duration (Minutes)
              </label>

              <input
                type="number"
                defaultValue="30"
                min="1"
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>
          </div>
        </div>

        {/* ======================================
            SYSTEM STATUS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">System Status</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Database</h3>

              <p className="mt-3 text-green-600 font-bold">Connected</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">API Server</h3>

              <p className="mt-3 text-green-600 font-bold">Online</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Storage</h3>

              <p className="mt-3 text-green-600 font-bold">Healthy</p>
            </div>
          </div>
        </div>

        {/* ======================================
            EMAIL & API
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Integrations</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border p-6">
              <h3 className="font-semibold">Email Service</h3>

              <p className="text-sm text-gray-500 mt-2">SMTP Server Status</p>

              <span className="inline-block mt-4 px-4 py-2 rounded-full bg-green-100 text-green-700">
                Connected
              </span>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="font-semibold">Payment Gateway</h3>

              <p className="text-sm text-gray-500 mt-2">
                Gateway Connection Status
              </p>

              <span className="inline-block mt-4 px-4 py-2 rounded-full bg-green-100 text-green-700">
                Connected
              </span>
            </div>
          </div>
        </div>
        {/* ======================================
            SYSTEM TOOLS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">System Tools</h2>

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
              Clear Cache
            </button>

            <button
              className="
                h-12
                px-6
                rounded-xl
                bg-green-600
                hover:bg-green-700
                text-white
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
                hover:bg-orange-700
                text-white
              "
            >
              Logout All Users
            </button>
          </div>
        </div>

        {/* ======================================
            SYSTEM INFORMATION
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">System Information</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Application Version</h3>

              <p className="text-xl font-bold mt-3">v1.0.0</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Node.js Version</h3>

              <p className="text-xl font-bold mt-3">v22.x</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Database</h3>

              <p className="text-xl font-bold mt-3">PostgreSQL</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-gray-500">Server Uptime</h3>

              <p className="text-xl font-bold mt-3">12 Days</p>
            </div>
          </div>
        </div>

        {/* ======================================
            DANGER ZONE
        ====================================== */}

        <div className="bg-white rounded-2xl border border-red-200 p-8 mt-8">
          <h2 className="text-2xl font-bold text-red-600 mb-8">Danger Zone</h2>

          <div className="space-y-6">
            <div className="flex items-center justify-between border border-red-200 rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-red-600">
                  Enable Maintenance Mode
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  Only administrators will be able to access the application.
                </p>
              </div>

              <button
                className="
                  px-5
                  py-2
                  rounded-lg
                  bg-red-600
                  hover:bg-red-700
                  text-white
                "
              >
                Enable
              </button>
            </div>

            <div className="flex items-center justify-between border border-red-200 rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-red-600">
                  Reset System Settings
                </h3>

                <p className="text-sm text-gray-500 mt-1">
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
                  text-red-600
                  hover:bg-red-50
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
            Save System Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
