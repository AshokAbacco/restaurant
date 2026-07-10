// ==============================================
// src/components/layout/Header.jsx
// ==============================================

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

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

  const formattedTime = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-[#10140F] border-b border-[#E7EAE1] dark:border-[#262B24] transition-colors">
      <div className="flex items-center justify-between px-6 py-4">
        {/* LEFT */}

        <div className="flex items-center gap-5 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden w-11 h-11 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] flex items-center justify-center hover:bg-[#3FA34D]/10 dark:hover:bg-[#43B75A]/10 hover:border-[#3FA34D]/30 dark:hover:border-[#43B75A]/40 transition flex-shrink-0"
          >
            <FiMenu size={20} className="text-[#1F2937] dark:text-white" />
          </button>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white truncate">{pageTitle}</h1>

            <div className="flex items-center gap-2 mt-1 text-sm text-[#6B7280] dark:text-[#9CA8A0] overflow-x-auto">
              <Link to="/dashboard" className="hover:text-[#3FA34D] dark:hover:text-[#43B75A] flex-shrink-0 transition-colors">
                Home
              </Link>

              {breadcrumb.map((item, index) => (
                <React.Fragment key={index}>
                  <FiChevronRight size={14} className="flex-shrink-0 text-[#3FA34D] dark:text-[#43B75A]" />

                  <span className="capitalize whitespace-nowrap">{item.replace("-", " ")}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        {/* ================= RIGHT ================= */}

        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Search */}

          <div className="hidden md:flex items-center relative">
            <FiSearch className="absolute left-4 text-[#9CA3AF] dark:text-[#6B7280]" />

            <input
              type="text"
              placeholder="Search anything..."
              className="w-80 pl-11 pr-4 py-3 rounded-full border border-[#E7EAE1] dark:border-[#262B24] bg-[#F3F5EE] dark:bg-[#171C17] text-[#1F2937] dark:text-white placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:bg-white dark:focus:bg-[#1E241E] focus:border-[#3FA34D] dark:focus:border-[#43B75A] focus:outline-none transition-all"
            />
          </div>

          {/* Date & Time */}

          <div className="hidden xl:flex items-center gap-6 bg-[#F3F5EE] dark:bg-[#171C17] rounded-xl px-5 py-3 border border-[#E7EAE1] dark:border-[#262B24]">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-[#3FA34D] dark:text-[#43B75A]" />

              <span className="text-sm font-medium text-[#1F2937] dark:text-white">
                {formattedDate}
              </span>
            </div>

            <div className="w-px h-5 bg-[#E7EAE1] dark:bg-[#262B24]" />

            <div className="flex items-center gap-2">
              <FiClock className="text-[#1F2937] dark:text-white" />

              <span className="text-sm font-semibold text-[#1F2937] dark:text-white">
                {formattedTime}
              </span>
            </div>
          </div>

          {/* ============ THEME TOGGLE ============ */}

          <button
            onClick={toggleTheme}
            aria-label="Toggle light / dark theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="w-11 h-11 rounded-full border border-[#E7EAE1] dark:border-[#262B24] bg-[#F3F5EE] dark:bg-[#171C17] flex items-center justify-center hover:border-[#3FA34D]/40 dark:hover:border-[#43B75A]/40 transition-colors"
          >
            {theme === "dark" ? (
              <FiSun size={18} className="text-[#FFA94D]" />
            ) : (
              <FiMoon size={18} className="text-[#3FA34D]" />
            )}
          </button>

          {/* Notifications */}

          <NotificationBell />

          {/* Profile */}

          <ProfileMenu user={user} />
        </div>
      </div>

      {/* ================= MOBILE SEARCH ================= */}

      <div className="px-6 pb-4 md:hidden">
        <div className="relative">
          <FiSearch className="absolute left-4 top-4 text-[#9CA3AF] dark:text-[#6B7280]" />

          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-11 pr-4 py-3 rounded-full border border-[#E7EAE1] dark:border-[#262B24] bg-[#F3F5EE] dark:bg-[#171C17] text-[#1F2937] dark:text-white placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:bg-white dark:focus:bg-[#1E241E] focus:border-[#3FA34D] dark:focus:border-[#43B75A] focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* ================= MOBILE DATE ================= */}

      <div className="xl:hidden border-t border-[#E7EAE1] dark:border-[#262B24] px-6 py-3 flex flex-wrap items-center gap-6 bg-[#F3F5EE] dark:bg-[#171C17]">
        <div className="flex items-center gap-2">
          <FiCalendar className="text-[#3FA34D] dark:text-[#43B75A]" />

          <span className="text-sm text-[#1F2937] dark:text-white">{formattedDate}</span>
        </div>

        <div className="flex items-center gap-2">
          <FiClock className="text-[#1F2937] dark:text-white" />

          <span className="text-sm font-medium text-[#1F2937] dark:text-white">
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