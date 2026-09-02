// ==============================================
// src/settings/SettingsDashboard.jsx
// Updated with dark/light mode support and improved UX
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
  FiTag,
  FiMapPin,
} from "react-icons/fi";

// ==============================================
// SETTINGS DATA
// ==============================================

const SETTINGS = [
  {
    id: 1,
    title: "Restaurant Profile",
    description:
      "Update your restaurant information, branding, GST details, business hours, and contact information.",
    icon: FiHome,
    color: "bg-[#3FA34D] dark:bg-[#43B75A]",
    path: "/settings/restaurant",
  },
  {
    id: 20,
    title: "Branches",
    description:
      "Add and manage multiple restaurant outlets. Configure which branches appear on the staff login screen.",
    icon: FiMapPin,
    color: "bg-[#2563EB] dark:bg-[#60A5FA]",
    path: "/settings/branches",
  },
  {
    id: 2,
    title: "Users & Roles",
    description:
      "Create staff accounts, assign roles, and manage user permissions across your restaurant.",
    icon: FiUsers,
    color: "bg-[#9333EA] dark:bg-[#C084FC]",
    path: "/settings/users",
  },
  {
    id: 3,
    title: "Self Order Kiosk",
    description:
      "Customize your kiosk display, welcome screen, menu options, and customer experience settings.",
    icon: FiMonitor,
    color: "bg-[#EA580C] dark:bg-[#FB923C]",
    path: "/settings/kiosk",
  },
  {
    id: 4,
    title: "QR Ordering",
    description:
      "Manage QR menu links, table QR codes, online ordering, and customer ordering preferences.",
    icon: FiSmartphone,
    color: "bg-[#0891B2] dark:bg-[#06B6D4]",
    path: "/settings/qr",
  },
  {
    id: 5,
    title: "Payment Gateway",
    description:
      "Configure payment methods including UPI, credit/debit cards, cash, and digital wallet options.",
    icon: FiCreditCard,
    color: "bg-[#E11D48] dark:bg-[#FB7185]",
    path: "/settings/payment",
  },
  {
    id: 6,
    title: "Tax & Billing",
    description:
      "Set up GST details, invoice numbering sequences, and billing configuration for your restaurant.",
    icon: FiFileText,
    color: "bg-[#DC2626] dark:bg-[#EF4444]",
    path: "/settings/tax",
  },
  {
    id: 6.5,
    title: "Order Status Labels",
    description:
      "Customize order status names and colors displayed on your POS system, kitchen displays, and reports.",
    icon: FiTag,
    color: "bg-[#1E7E34] dark:bg-[#22C55E]",
    path: "/settings/order-status",
  },
  {
    id: 6.6,
    title: "Billing Counters",
    description:
      "Manage physical POS terminals and counters for accurate counter-wise sales reporting and analysis.",
    icon: FiMapPin,
    color: "bg-[#4F46E5] dark:bg-[#818CF8]",
    path: "/settings/counters",
  },
  {
    id: 7,
    title: "Printer Setup",
    description:
      "Configure thermal printers, paper sizes, print options, and connected printer devices across your outlet.",
    icon: FiPrinter,
    color: "bg-[#D97706] dark:bg-[#FCD34D]",
    path: "/settings/printer",
  },
  {
    id: 8,
    title: "Notifications",
    description:
      "Enable SMS, WhatsApp, email alerts, and push notifications for orders and important restaurant events.",
    icon: FiBell,
    color: "bg-[#4F46E5] dark:bg-[#818CF8]",
    path: "/settings/notifications",
  },
  {
    id: 9,
    title: "Appearance",
    description:
      "Customize your dashboard theme, color scheme, logo placement, and visual branding throughout the system.",
    icon: FiImage,
    color: "bg-[#0891B2] dark:bg-[#06B6D4]",
    path: "/settings/appearance",
  },
  {
    id: 10,
    title: "Backup & Restore",
    description:
      "Create data backups, restore from previous backups, and export your restaurant's critical information.",
    icon: FiDatabase,
    color: "bg-[#0369A1] dark:bg-[#0EA5E9]",
    path: "/settings/backup",
  },
  {
    id: 11,
    title: "Subscription & System",
    description:
      "Manage your subscription plan, license details, system updates, and view system information.",
    icon: FiCpu,
    color: "bg-[#475569] dark:bg-[#94A3B8]",
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
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* ======================================
          HERO
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="max-w-7xl mx-auto px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#2563EB] dark:bg-[#60A5FA] text-white flex items-center justify-center">
                  <FiSettings size={34} />
                </div>

                <div>
                  <h1 className="text-4xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                    Settings
                  </h1>

                  <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-2">
                    Configure and manage your restaurant system. Works perfectly on PCs, laptops, and mobile devices.
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-6">
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl px-8 py-5 text-center border border-[#E7EAE1] dark:border-[#262B24]">
                <h2 className="text-3xl font-bold text-[#2563EB] dark:text-[#60A5FA]">
                  {SETTINGS.length}
                </h2>

                <p className="text-[#6B7280] dark:text-[#9CA8A0]">Modules</p>
              </div>
            </div>
          </div>

          {/* Search */}

          <div className="mt-10 relative max-w-xl">
            <FiSearch
              size={22}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#6B7280]"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search settings..."
              className="w-full h-16 rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] pl-14 pr-5 text-lg focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
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
          <div className="bg-white dark:bg-[#171C17] rounded-3xl p-6 shadow-sm border border-[#E7EAE1] dark:border-[#262B24]">
            <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm uppercase tracking-wide">
              Total Modules
            </p>

            <h2 className="mt-3 text-4xl font-bold text-[#2563EB] dark:text-[#60A5FA]">
              {SETTINGS.length}
            </h2>
          </div>

          <div className="bg-white dark:bg-[#171C17] rounded-3xl p-6 shadow-sm border border-[#E7EAE1] dark:border-[#262B24]">
            <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm uppercase tracking-wide">
              Search Results
            </p>

            <h2 className="mt-3 text-4xl font-bold text-[#3FA34D] dark:text-[#43B75A]">
              {filteredSettings.length}
            </h2>
          </div>

          <div className="bg-white dark:bg-[#171C17] rounded-3xl p-6 shadow-sm border border-[#E7EAE1] dark:border-[#262B24]">
            <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm uppercase tracking-wide">
              System Status
            </p>

            <h2 className="mt-3 text-4xl font-bold text-[#3FA34D] dark:text-[#43B75A]">
              Active
            </h2>
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
                  dark:bg-[#171C17]
                  rounded-3xl
                  border
                  border-[#E7EAE1]
                  dark:border-[#262B24]
                  p-7
                  cursor-pointer
                  transition-all
                  duration-300
                  hover:shadow-lg
                  dark:hover:shadow-2xl
                  hover:-translate-y-2
                  hover:border-[#2563EB]
                  dark:hover:border-[#60A5FA]
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

                <h2 className="mt-6 text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                  {setting.title}
                </h2>

                {/* Description */}

                <p className="mt-4 text-[#6B7280] dark:text-[#9CA8A0] leading-7 min-h-[84px]">
                  {setting.description}
                </p>

                {/* Footer */}

                <div className="mt-8 flex items-center justify-between">
                  <span className="text-[#2563EB] dark:text-[#60A5FA] font-semibold">
                    Open Settings
                  </span>

                  <div
                    className="
                      w-10
                      h-10
                      rounded-full
                      bg-blue-50
                      dark:bg-blue-500/10
                      flex
                      items-center
                      justify-center
                      text-[#2563EB]
                      dark:text-[#60A5FA]
                      transition-all
                      duration-300
                      group-hover:bg-[#2563EB]
                      dark:group-hover:bg-[#60A5FA]
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
          <div className="mt-20 bg-white dark:bg-[#171C17] rounded-3xl border border-[#E7EAE1] dark:border-[#262B24] py-20 text-center">
            <div className="w-24 h-24 rounded-full bg-[#F3F5EE] dark:bg-[#1D231C] flex items-center justify-center mx-auto">
              <FiSearch size={42} className="text-[#9CA3AF] dark:text-[#6B7280]" />
            </div>

            <h2 className="mt-8 text-3xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
              No Settings Found
            </h2>

            <p className="mt-4 text-[#6B7280] dark:text-[#9CA8A0] text-lg">
              Try searching with different keywords.
            </p>
          </div>
        )}
        {/* ======================================
            QUICK ACTIONS
        ====================================== */}

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Help */}

          <div className="bg-white dark:bg-[#171C17] rounded-3xl border border-[#E7EAE1] dark:border-[#262B24] p-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <FiAward size={28} className="text-[#2563EB] dark:text-[#60A5FA]" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                  Need Help?
                </h2>

                <p className="text-[#6B7280] dark:text-[#9CA8A0]">
                  Learn how to configure your restaurant settings and features.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <button
                className="
                  w-full
                  h-14
                  rounded-2xl
                  bg-[#2563EB]
                  dark:bg-[#60A5FA]
                  hover:bg-[#1D4ED8]
                  dark:hover:bg-[#3B82F6]
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
                  border-[#E7EAE1]
                  dark:border-[#262B24]
                  hover:bg-[#F3F5EE]
                  dark:hover:bg-[#1D231C]
                  text-[#1F2937]
                  dark:text-[#E4E9E2]
                  font-semibold
                  transition
                "
              >
                Contact Support
              </button>
            </div>
          </div>

          {/* Recent Updates */}

          <div className="bg-white dark:bg-[#171C17] rounded-3xl border border-[#E7EAE1] dark:border-[#262B24] p-8">
            <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
              Quick Setup Tips
            </h2>

            <div className="mt-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 rounded-full bg-[#3FA34D] dark:bg-[#43B75A] mt-2 flex-shrink-0" />

                <div>
                  <h4 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                    Complete Your Profile
                  </h4>

                  <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">
                    Start by setting up your restaurant profile and business details.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-3 h-3 rounded-full bg-[#2563EB] dark:bg-[#60A5FA] mt-2 flex-shrink-0" />

                <div>
                  <h4 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                    Configure Payment Methods
                  </h4>

                  <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">
                    Enable payment gateways and set up your preferred payment methods.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-3 h-3 rounded-full bg-[#D97706] dark:bg-[#FCD34D] mt-2 flex-shrink-0" />

                <div>
                  <h4 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                    Set Up Printers
                  </h4>

                  <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">
                    Connect your kitchen and billing printers for smooth operations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================
          FOOTER
      ====================================== */}

      <footer className="border-t border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] py-6 mt-12">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-[#6B7280] dark:text-[#9CA8A0]">
            Restaurant ERP • Settings Center • Optimized for all devices
          </p>

          <p className="text-[#9CA3AF] dark:text-[#6B7280] text-sm mt-3 md:mt-0">
            Access your settings anytime, anywhere on PC, laptop, or mobile.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SettingsDashboard;