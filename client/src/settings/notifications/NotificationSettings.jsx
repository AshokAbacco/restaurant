// ==============================================
// src/settings/notifications/NotificationSettings.jsx
// ==============================================

import React, { useState } from "react";
import { FiBell, FiSave, FiRefreshCw } from "react-icons/fi";

const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    enableNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: false,
    soundAlerts: true,
    desktopNotifications: true,
  });

  // ==========================================

  const handleChange = (e) => {
    const { name, checked } = e.target;

    setSettings((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  // ==========================================

  const handleSave = () => {
    console.log(settings);

    // API Later
  };

  return (
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* ================= HEADER ================= */}

      <div className="bg-white dark:bg-[#171C17] border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 dark:bg-[#60A5FA] text-white flex items-center justify-center">
              <FiBell size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">Notification Settings</h1>

              <p className="text-gray-500 dark:text-[#9CA8A0] mt-2">
                Configure alerts, reminders and customer notifications.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="h-12 px-6 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] hover:bg-gray-100 dark:hover:bg-[#1D231C] flex items-center gap-2">
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

      {/* ================= CONTENT ================= */}

      <div className="max-w-6xl mx-auto p-8">
        {/* General */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">General Notifications</h2>

          <div className="space-y-6">
            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Enable Notifications</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Turn notification system on or off.
                </p>
              </div>

              <input
                type="checkbox"
                name="enableNotifications"
                checked={settings.enableNotifications}
                onChange={handleChange}
                className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]"
              />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Desktop Notifications</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Show browser notifications for staff.
                </p>
              </div>

              <input
                type="checkbox"
                name="desktopNotifications"
                checked={settings.desktopNotifications}
                onChange={handleChange}
                className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]"
              />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Sound Alerts</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Play notification sounds for new orders.
                </p>
              </div>

              <input
                type="checkbox"
                name="soundAlerts"
                checked={settings.soundAlerts}
                onChange={handleChange}
                className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]"
              />
            </label>
          </div>
        </div>
        {/* ======================================
            CUSTOMER NOTIFICATIONS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">Customer Notifications</h2>

          <div className="space-y-6">
            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Email Notifications</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Send invoices and order updates by email.
                </p>
              </div>

              <input
                type="checkbox"
                name="emailNotifications"
                checked={settings.emailNotifications}
                onChange={handleChange}
                className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]"
              />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">SMS Notifications</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Send order status updates through SMS.
                </p>
              </div>

              <input
                type="checkbox"
                name="smsNotifications"
                checked={settings.smsNotifications}
                onChange={handleChange}
                className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]"
              />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">WhatsApp Notifications</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Send bills and order updates via WhatsApp.
                </p>
              </div>

              <input
                type="checkbox"
                name="whatsappNotifications"
                checked={settings.whatsappNotifications}
                onChange={handleChange}
                className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]"
              />
            </label>
          </div>
        </div>

        {/* ======================================
            RESTAURANT ALERTS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">Restaurant Alerts</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">New Order Alert</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Notify staff immediately when a new order is received.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Kitchen Ready Alert</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Notify POS when kitchen marks an order as ready.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Low Stock Alert</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Notify manager when ingredients are running low.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Cancelled Order Alert</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Notify staff when an order is cancelled.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Daily Sales Report</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Send end-of-day sales summary to the owner.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Payment Failure Alert</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Notify admin if an online payment fails.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>
          </div>
        </div>
        {/* ======================================
            ADVANCED NOTIFICATIONS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">
            Advanced Notification Settings
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Printer Alerts */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Printer Error Alerts</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Notify staff when receipt or kitchen printer is offline.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            {/* Kitchen Display */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Kitchen Display Alert</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Play sound whenever a new kitchen ticket arrives.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            {/* Reminder */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Pending Order Reminder</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Remind staff when orders are pending for too long.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>

            {/* Login */}

            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Login Alerts</h3>

                <p className="text-sm text-gray-500 dark:text-[#9CA8A0]">
                  Notify the owner when a staff member logs in.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5 accent-[#2563EB] dark:accent-[#60A5FA]" />
            </label>
          </div>
        </div>

        {/* ======================================
            SOUND SETTINGS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">Sound Settings</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Notification Sound
              </label>

              <select className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]">
                <option>Default</option>

                <option>Bell</option>

                <option>Kitchen Bell</option>

                <option>Chime</option>

                <option>Soft Alert</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">Quiet Hours</label>

              <input
                type="text"
                placeholder="Example: 11:00 PM - 07:00 AM"
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2]"
              />
            </div>
          </div>
        </div>

        {/* ======================================
            TEST NOTIFICATIONS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-6 text-[#1F2937] dark:text-[#E4E9E2]">Test Notifications</h2>

          <div className="flex flex-wrap gap-4">
            <button
              className="h-12 px-6 rounded-lg bg-blue-600 dark:bg-[#60A5FA] hover:bg-blue-700 dark:hover:bg-[#3B82F6] text-white"
            >
              Test Desktop Notification
            </button>

            <button
              className="h-12 px-6 rounded-lg bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white"
            >
              Test Sound
            </button>

            <button
              className="h-12 px-6 rounded-lg bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white"
            >
              Test Email
            </button>
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
            Save Notification Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;