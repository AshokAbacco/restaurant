// ==============================================
// src/settings/SettingsDashboard.jsx
// ==============================================

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FiSettings,
  FiSearch,
  FiChevronRight,
  FiHome,
  FiUsers,
  FiMonitor,
  FiSmartphone,
  FiCreditCard,
  FiFileText,
  FiPrinter,
  FiBell,
  FiImage,
  FiDatabase,
  FiAward,
  FiCpu,
} from "react-icons/fi";

// ==============================================
// SETTINGS DATA
// ==============================================

const SETTINGS = [
  {
    id: 1,
    title: "Restaurant Profile",
    description:
      "Manage restaurant information, logo, GST, timings and contact details.",
    icon: FiHome,
    color: "bg-blue-500",
    path: "/settings/restaurant",
  },
  {
    id: 2,
    title: "Users & Roles",
    description: "Manage users, staff accounts and permissions.",
    icon: FiUsers,
    color: "bg-purple-500",
    path: "/settings/users",
  },
  {
    id: 3,
    title: "Self Order Kiosk",
    description:
      "Configure kiosk display, welcome screen and customer experience.",
    icon: FiMonitor,
    color: "bg-orange-500",
    path: "/settings/kiosk",
  },
  {
    id: 4,
    title: "QR Ordering",
    description: "Manage QR menu, table QR codes and online ordering.",
    icon: FiSmartphone,
    color: "bg-green-500",
    path: "/settings/qr",
  },
  {
    id: 5,
    title: "Payment Gateway",
    description: "Configure UPI, Card, Cash and payment gateways.",
    icon: FiCreditCard,
    color: "bg-pink-500",
    path: "/settings/payment",
  },
  {
    id: 6,
    title: "Tax & Billing",
    description: "GST, invoice numbering and billing configuration.",
    icon: FiFileText,
    color: "bg-red-500",
    path: "/settings/tax",
  },
  {
    id: 7,
    title: "Printer Setup",
    description: "Kitchen printer, receipt printer and print preferences.",
    icon: FiPrinter,
    color: "bg-yellow-500",
    path: "/settings/printer",
  },
  {
    id: 8,
    title: "Notifications",
    description: "SMS, WhatsApp, Email and alert settings.",
    icon: FiBell,
    color: "bg-indigo-500",
    path: "/settings/notifications",
  },
  {
    id: 9,
    title: "Appearance",
    description: "Customize themes, branding and dashboard appearance.",
    icon: FiImage,
    color: "bg-teal-500",
    path: "/settings/appearance",
  },
  {
    id: 10,
    title: "Backup & Restore",
    description: "Create backups, restore data and export information.",
    icon: FiDatabase,
    color: "bg-cyan-500",
    path: "/settings/backup",
  },
  {
    id: 11,
    title: "Subscription & System",
    description: "License, subscription, updates and system information.",
    icon: FiCpu,
    color: "bg-slate-600",
    path: "/settings/system",
  },
];

// ==============================================
// COMPONENT
// ==============================================

const SettingsDashboard = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  // ==========================================
  // FILTER
  // ==========================================

  const filteredSettings = useMemo(() => {
    return SETTINGS.filter((item) => {
      const value = `${item.title} ${item.description}`.toLowerCase();

      return value.includes(search.toLowerCase());
    });
  }, [search]);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ======================================
          HERO
      ====================================== */}

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                  <FiSettings size={34} />
                </div>

                <div>
                  <h1 className="text-4xl font-bold text-gray-800">Settings</h1>

                  <p className="text-gray-500 mt-2">
                    Configure and manage your restaurant system.
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-6">
              <div className="bg-blue-50 rounded-2xl px-8 py-5 text-center">
                <h2 className="text-3xl font-bold text-blue-600">
                  {SETTINGS.length}
                </h2>

                <p className="text-gray-600">Modules</p>
              </div>
            </div>
          </div>

          {/* Search */}

          <div className="mt-10 relative max-w-xl">
            <FiSearch
              size={22}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search settings..."
              className="w-full h-16 rounded-2xl border border-gray-300 bg-white pl-14 pr-5 text-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      {/* ======================================
          CONTENT
      ====================================== */}

      <div className="max-w-7xl mx-auto px-8 py-10">
        {/* Quick Stats */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm uppercase tracking-wide">
              Total Modules
            </p>

            <h2 className="mt-3 text-4xl font-bold text-blue-600">
              {SETTINGS.length}
            </h2>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm uppercase tracking-wide">
              Search Results
            </p>

            <h2 className="mt-3 text-4xl font-bold text-green-600">
              {filteredSettings.length}
            </h2>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm uppercase tracking-wide">
              System Status
            </p>

            <h2 className="mt-3 text-4xl font-bold text-orange-500">Active</h2>
          </div>
        </div>

        {/* Settings Cards */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredSettings.map((setting) => {
            const Icon = setting.icon;

            return (
              <div
                key={setting.id}
                onClick={() => navigate(setting.path)}
                className="
                  group
                  bg-white
                  rounded-3xl
                  border
                  border-gray-200
                  p-7
                  cursor-pointer
                  transition-all
                  duration-300
                  hover:shadow-xl
                  hover:-translate-y-2
                  hover:border-blue-300
                "
              >
                {/* Icon */}

                <div
                  className={`
                    w-16
                    h-16
                    rounded-2xl
                    ${setting.color}
                    text-white
                    flex
                    items-center
                    justify-center
                    transition-transform
                    duration-300
                    group-hover:scale-110
                  `}
                >
                  <Icon size={30} />
                </div>

                {/* Title */}

                <h2 className="mt-6 text-2xl font-bold text-gray-800">
                  {setting.title}
                </h2>

                {/* Description */}

                <p className="mt-4 text-gray-500 leading-7 min-h-[84px]">
                  {setting.description}
                </p>

                {/* Footer */}

                <div className="mt-8 flex items-center justify-between">
                  <span className="text-blue-600 font-semibold">
                    Open Settings
                  </span>

                  <div
                    className="
                      w-10
                      h-10
                      rounded-full
                      bg-blue-50
                      flex
                      items-center
                      justify-center
                      text-blue-600
                      transition-all
                      duration-300
                      group-hover:bg-blue-600
                      group-hover:text-white
                    "
                  >
                    <FiChevronRight size={20} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}

        {filteredSettings.length === 0 && (
          <div className="mt-20 bg-white rounded-3xl border border-gray-200 py-20 text-center">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <FiSearch size={42} className="text-gray-400" />
            </div>

            <h2 className="mt-8 text-3xl font-bold text-gray-700">
              No Settings Found
            </h2>

            <p className="mt-4 text-gray-500 text-lg">
              Try searching with another keyword.
            </p>
          </div>
        )}
        {/* ======================================
            QUICK ACTIONS
        ====================================== */}

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Help */}

          <div className="bg-white rounded-3xl border border-gray-200 p-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                <FiAward size={28} className="text-blue-600" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-800">Need Help?</h2>

                <p className="text-gray-500">
                  Learn how to configure your restaurant.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <button
                className="
                  w-full
                  h-14
                  rounded-2xl
                  bg-blue-600
                  hover:bg-blue-700
                  text-white
                  font-semibold
                  transition
                "
              >
                View Documentation
              </button>

              <button
                className="
                  w-full
                  h-14
                  rounded-2xl
                  border
                  border-gray-300
                  hover:bg-gray-100
                  font-semibold
                  transition
                "
              >
                Contact Support
              </button>
            </div>
          </div>

          {/* Recent Updates */}

          <div className="bg-white rounded-3xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-800">
              Recent Configuration
            </h2>

            <div className="mt-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-2" />

                <div>
                  <h4 className="font-semibold">Restaurant Profile</h4>

                  <p className="text-gray-500 text-sm">Last updated recently</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-3 h-3 rounded-full bg-blue-500 mt-2" />

                <div>
                  <h4 className="font-semibold">Payment Gateway</h4>

                  <p className="text-gray-500 text-sm">
                    Configuration available
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-3 h-3 rounded-full bg-orange-500 mt-2" />

                <div>
                  <h4 className="font-semibold">Kiosk Settings</h4>

                  <p className="text-gray-500 text-sm">Ready to configure</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================
          FOOTER
      ====================================== */}

      <footer className="border-t border-gray-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-gray-500">Restaurant ERP • Settings Center</p>

          <p className="text-gray-400 text-sm mt-3 md:mt-0">
            Manage your restaurant configuration from one place.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SettingsDashboard;
