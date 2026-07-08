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
} from "react-icons/fi";

import { useAuth } from "../../auth/AuthContext";

import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";

const Header = ({ onMenuClick }) => {
  const { user } = useAuth();

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

      "/orders": "Orders",

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
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        {/* LEFT */}

        <div className="flex items-center gap-5 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition flex-shrink-0"
          >
            <FiMenu size={20} />
          </button>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-800 truncate">{pageTitle}</h1>

            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 overflow-x-auto">
              <Link to="/dashboard" className="hover:text-blue-600 flex-shrink-0">
                Home
              </Link>

              {breadcrumb.map((item, index) => (
                <React.Fragment key={index}>
                  <FiChevronRight size={14} className="flex-shrink-0" />

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
            <FiSearch className="absolute left-4 text-gray-400" />

            <input
              type="text"
              placeholder="Search anything..."
              className="w-80 pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>

          {/* Date & Time */}

          <div className="hidden xl:flex items-center gap-6 bg-gray-50 rounded-xl px-5 py-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-blue-600" />

              <span className="text-sm font-medium text-gray-700">
                {formattedDate}
              </span>
            </div>

            <div className="w-px h-5 bg-gray-300" />

            <div className="flex items-center gap-2">
              <FiClock className="text-green-600" />

              <span className="text-sm font-semibold text-gray-700">
                {formattedTime}
              </span>
            </div>
          </div>

          {/* Notifications */}

          <NotificationBell />

          {/* Profile */}

          <ProfileMenu user={user} />
        </div>
      </div>

      {/* ================= MOBILE SEARCH ================= */}

      <div className="px-6 pb-4 md:hidden">
        <div className="relative">
          <FiSearch className="absolute left-4 top-4 text-gray-400" />

          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* ================= MOBILE DATE ================= */}

      <div className="xl:hidden border-t border-gray-100 px-6 py-3 flex flex-wrap items-center gap-6 bg-gray-50">
        <div className="flex items-center gap-2">
          <FiCalendar className="text-blue-600" />

          <span className="text-sm text-gray-700">{formattedDate}</span>
        </div>

        <div className="flex items-center gap-2">
          <FiClock className="text-green-600" />

          <span className="text-sm font-medium text-gray-700">
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