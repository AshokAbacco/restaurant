// ==============================================
// src/components/layout/Header.jsx
// ==============================================

import React, { useEffect, useMemo, useState } from "react";

import { Link, useLocation } from "react-router-dom";

import {
  FiMenu,
  FiSearch,
  FiCalendar,
  FiClock,
  FiChevronRight,
  FiSun,
  FiMoon,
} from "react-icons/fi";

import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../context/ThemeContext";

import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";
import OfflineIndicator from "./OfflineIndicator";
import OutletSwitcher from "./OutletSwitcher";

const Header = ({ onMenuClick }) => {
  const { user } = useAuth();

  const { theme, toggleTheme } = useTheme();

  const location = useLocation();

  const [currentTime, setCurrentTime] = useState(new Date());

  // ==========================================
  // LIVE CLOCK
  // ==========================================

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ==========================================
  // PAGE TITLE
  // ==========================================

  const pageTitle = useMemo(() => {
    const path = location.pathname;

    const titles = {
      "/dashboard": "Dashboard",

      "/pos": "Point Of Sale",

      "/pos/orders": "Orders",

      "/tables": "Table Management",

      "/menu": "Menu Management",

      "/menu/categories": "Menu Categories",

      "/menu/subcategories": "Sub Categories",

      "/menu/kitchen-sections": "Kitchen Sections",

      "/menu/addons": "Add-ons",

      "/menu/combos": "Combo Meals",

      "/menu/reports": "Menu Reports",

      "/inventory": "Inventory",

      "/customers": "Customers",

      "/billing": "Billing",

      "/payments": "Payments",

      "/employees": "Employees",

      "/expenses": "Expenses",

      "/reports": "Reports",

      "/profit-loss": "Profit & Loss",

      "/settings": "Settings",

      "/kitchen": "Kitchen Dashboard",
    };

    return titles[path] || "Dashboard";
  }, [location.pathname]);

  // ==========================================
  // BREADCRUMB
  // ==========================================

  const breadcrumb = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);

    return parts;
  }, [location.pathname]);

  // ==========================================
  // FORMATTERS
  // ==========================================

  const formattedDate = currentTime.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedDateShort = currentTime.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  const formattedTime = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-[#10140F] border-b border-[#E7EAE1] dark:border-[#262B24] transition-colors">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4">

        {/* ================= LEFT ================= */}

        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile / tablet menu toggle (sidebar) */}

          <button
            onClick={onMenuClick}
            aria-label="Open menu"
            className="lg:hidden w-10 h-10 flex-shrink-0 rounded-full border border-[#E7EAE1] dark:border-[#262B24] bg-[#F3F5EE] dark:bg-[#171C17] flex items-center justify-center hover:border-[#3FA34D]/40 dark:hover:border-[#43B75A]/40 transition-colors"
          >
            <FiMenu size={18} className="text-[#1F2937] dark:text-white" />
          </button>

          {/* Page title (hidden on mobile, shown from md up, replaces the search bar's job of anchoring the header) */}



           
        </div>

        {/* ================= RIGHT ================= */}

        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-shrink-0">
          {/* Date & Time (full, desktop only) */}

          <div className="hidden xl:flex items-center gap-6 bg-[#F3F5EE] dark:bg-[#171C17] rounded-xl px-5 py-3 border border-[#E7EAE1] dark:border-[#262B24]">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-[#3FA34D] dark:text-[#43B75A]" />

              <span className="text-sm font-medium text-[#1F2937] dark:text-white whitespace-nowrap">
                {formattedDate}
              </span>
            </div>

            <div className="w-px h-5 bg-[#E7EAE1] dark:bg-[#262B24]" />

            <div className="flex items-center gap-2">
              <FiClock className="text-[#1F2937] dark:text-white" />

              <span className="text-sm font-semibold text-[#1F2937] dark:text-white whitespace-nowrap">
                {formattedTime}
              </span>
            </div>
          </div>

          {/* Date & Time (compact, tablet only) */}

          <div className="hidden md:flex xl:hidden items-center gap-2 bg-[#F3F5EE] dark:bg-[#171C17] rounded-full px-3 py-2 border border-[#E7EAE1] dark:border-[#262B24]">
            <FiClock className="text-[#1F2937] dark:text-white flex-shrink-0" size={14} />

            <span className="text-xs font-semibold text-[#1F2937] dark:text-white whitespace-nowrap">
              {formattedTime}
            </span>
          </div>

          {/* ============ THEME TOGGLE ============ */}

          <button
            onClick={toggleTheme}
            aria-label="Toggle light / dark theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="w-9 h-9 sm:w-11 sm:h-11 flex-shrink-0 rounded-full border border-[#E7EAE1] dark:border-[#262B24] bg-[#F3F5EE] dark:bg-[#171C17] flex items-center justify-center hover:border-[#3FA34D]/40 dark:hover:border-[#43B75A]/40 transition-colors"
          >
            {theme === "dark" ? (
              <FiSun size={16} className="text-[#FFA94D] sm:hidden" />
            ) : (
              <FiMoon size={16} className="text-[#3FA34D] sm:hidden" />
            )}
            {theme === "dark" ? (
              <FiSun size={18} className="hidden sm:block text-[#FFA94D]" />
            ) : (
              <FiMoon size={18} className="hidden sm:block text-[#3FA34D]" />
            )}
          </button>

          {/* Notifications */}

          <OutletSwitcher />

          <OfflineIndicator />

          {/* <NotificationBell /> */}

          {/* Profile */}

          <ProfileMenu user={user} />
        </div>
      </div>

      {/* ================= MOBILE PAGE TITLE + BREADCRUMB ================= */}

      <div className="px-4 sm:px-6 pb-3 md:hidden">
        <h1 className="text-lg font-bold text-[#1F2937] dark:text-white truncate">{pageTitle}</h1>

        <div className="flex items-center gap-2 mt-1 text-sm text-[#6B7280] dark:text-[#9CA8A0] overflow-x-auto no-scrollbar">
          <Link to="/dashboard" className="hover:text-[#3FA34D] dark:hover:text-[#43B75A] flex-shrink-0 transition-colors">
            Home
          </Link>

          {breadcrumb.map((item, index) => (
            <React.Fragment key={index}>
              <FiChevronRight
                size={14}
                className="flex-shrink-0 text-[#3FA34D] dark:text-[#43B75A]"
              />

              <span className="capitalize whitespace-nowrap">
                {item.replace("-", " ")}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ================= MOBILE SEARCH ================= */}

      <div className="px-4 sm:px-6 pb-3 lg:hidden">
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#6B7280]" />

          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-full border border-[#E7EAE1] dark:border-[#262B24] bg-[#F3F5EE] dark:bg-[#171C17] text-[#1F2937] dark:text-white placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:bg-white dark:focus:bg-[#1E241E] focus:border-[#3FA34D] dark:focus:border-[#43B75A] focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* ================= MOBILE / SMALL-TABLET DATE ROW ================= */}
      {/* Only needed below md, since md+ has the compact/full date-time in the top row */}

      <div className="md:hidden border-t border-[#E7EAE1] dark:border-[#262B24] px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-4 sm:gap-6 bg-[#F3F5EE] dark:bg-[#171C17]">
        <div className="flex items-center gap-2 min-w-0">
          <FiCalendar className="text-[#3FA34D] dark:text-[#43B75A] flex-shrink-0" size={15} />

          <span className="text-xs sm:text-sm text-[#1F2937] dark:text-white truncate">
            <span className="hidden xs:inline">{formattedDate}</span>
            <span className="xs:hidden">{formattedDateShort}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <FiClock className="text-[#1F2937] dark:text-white" size={15} />

          <span className="text-xs sm:text-sm font-medium text-[#1F2937] dark:text-white">
            {formattedTime}
          </span>
        </div>
      </div>

      {/* ================= FUTURE GLOBAL SEARCH ================= */}

      {/*
        Future Enhancement:
        -------------------
        Replace the search input with a global search component.

        It can search:
        - Customers
        - Orders
        - Menu Items
        - Tables
        - Employees
        - Inventory
        - Reports

        Example:
        <GlobalSearch />
      */}
    </header>
  );
};

export default Header;