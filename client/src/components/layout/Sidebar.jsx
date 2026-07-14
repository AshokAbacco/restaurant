import React, { useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";

import {
  FiMenu,
  FiX,
  FiHome,
  FiShoppingCart,
  FiClipboard,
  FiGrid,
  FiBox,
  FiUsers,
  FiFileText,
  FiCreditCard,
  FiDollarSign,
  FiBarChart2,
  FiTrendingUp,
  FiSettings,
  FiLogOut,
  FiCoffee,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiMonitor,
  FiExternalLink,
} from "react-icons/fi";

import { useAuth } from "../../auth/AuthContext";

// =====================================================
// SIDEBAR
// =====================================================

const Sidebar = ({ mobileOpen, onClose, collapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();

  const location = useLocation();

  // =====================================================
  // MOBILE DRAWER: lock body scroll + close on Escape
  // =====================================================

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, onClose]);

  // =====================================================
  // OWNER MENU
  // =====================================================

  const ownerMenu = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <FiHome />,
    },

    {
      name: "POS",
      path: "/pos",
      icon: <FiShoppingCart />,
    },

    {
      name: "Kitchen Orders",
      path: "/kitchen",
      icon: <FiCoffee />,
    },
  //   {
  //   name: "Kitchen Notes",
  //   path: "/kitchen/notes",
  //   icon: <FiFileText />,
  // },

    {
      name: "Orders",
      path: "/pos/orders",
      icon: <FiClipboard />,
    },

    // {
    //   name: "Tables",
    //   path: "/tables",
    //   icon: <FiGrid />,
    // },

    {
      name: "Menu",
      path: "/menu",
      icon: <FiCoffee />,
    },

    {
      name: "Inventory",
      path: "/inventory",
      icon: <FiBox />,
    },

    // {
    //   name: "Customers",
    //   path: "/customers",
    //   icon: <FiUsers />,
    // },

    {
      name: "Billing & Payments",
      path: "/billing",
      icon: <FiFileText />,
    },

    {
      name: "Payments",
      path: "/payments",
      icon: <FiCreditCard />,
    },

    {
      name: "Expenses",
      path: "/expenses",
      icon: <FiDollarSign />,
    },

    {
      name: "Employees",
      path: "/employees",
      icon: <FiUsers />,
    },

    {
      name: "Reports",
      path: "/reports",
      icon: <FiBarChart2 />,
    },

    {
      name: "Profit & Loss",
      path: "/profit-loss",
      icon: <FiTrendingUp />,
    },

    // Opens the self-ordering kiosk screen in a new tab/window. It's a
    // fullscreen customer-facing app (attract screen -> order -> payment
    // -> success loop) with no admin chrome, so it deliberately does NOT
    // navigate away inside this SPA — see the `external` flag below.
    {
      name: "Open Kiosk",
      path: "/kiosk",
      icon: <FiMonitor />,
      external: true,
    },

    // {
    //   name: "Settings",
    //   path: "/settings",
    //   icon: <FiSettings />,
    // },
  ];

  // =====================================================
  // MANAGER MENU
  // =====================================================

  const managerMenu = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <FiHome />,
    },

    {
      name: "POS",
      path: "/pos",
      icon: <FiShoppingCart />,
    },

    {
      name: "Orders",
      path: "/pos/orders",
      icon: <FiClipboard />,
    },

    // {
    //   name: "Tables",
    //   path: "/tables",
    //   icon: <FiGrid />,
    // },

    {
      name: "Menu",
      path: "/menu",
      icon: <FiCoffee />,
    },

    {
      name: "Inventory",
      path: "/inventory",
      icon: <FiBox />,
    },

    {
      name: "Customers",
      path: "/customers",
      icon: <FiUsers />,
    },

    {
      name: "Billing",
      path: "/billing",
      icon: <FiFileText />,
    },

    {
      name: "Kitchen",
      path: "/kitchen",
      icon: <FiCoffee />,
    },

    {
      name: "Expenses",
      path: "/expenses",
      icon: <FiDollarSign />,
    },

    {
      name: "Reports",
      path: "/reports",
      icon: <FiBarChart2 />,
    },
  ];

  // =====================================================
  // CASHIER MENU
  // =====================================================

  const cashierMenu = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <FiHome />,
    },

    {
      name: "POS",
      path: "/pos",
      icon: <FiShoppingCart />,
    },

    {
      name: "Orders",
      path: "/pos/orders",
      icon: <FiClipboard />,
    },

    {
      name: "Menu",
      path: "/menu",
      icon: <FiCoffee />,
    },

    {
      name: "Customers",
      path: "/customers",
      icon: <FiUsers />,
    },

    {
      name: "Billing",
      path: "/billing",
      icon: <FiFileText />,
    },

    {
      name: "Payments",
      path: "/payments",
      icon: <FiCreditCard />,
    },
  ];

  // =====================================================
// WAITER MENU
// =====================================================

const waiterMenu = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: <FiHome />,
  },
  {
    name: "POS",
    path: "/pos",
    icon: <FiShoppingCart />,
  },
  {
    name: "Orders",
    path: "/pos/orders",
    icon: <FiClipboard />,
  },
  {
    name: "Menu",
    path: "/menu",
    icon: <FiCoffee />,
  },
  {
    name: "Billing",
    path: "/billing",
    icon: <FiFileText />,
  },
  {
    name: "Payments",
    path: "/payments",
    icon: <FiCreditCard />,
  },
];

  // =====================================================
  // KITCHEN MENU
  // =====================================================

  const kitchenMenu = [
    {
      name: "Kitchen Orders",
      path: "/kitchen",
      icon: <FiCoffee />,
    },

    // {
    //   name: "Kitchen Notes",
    //   path: "/kitchen/notes",
    //   icon: <FiFileText />,
    // },

    {
      name: "Menu",
      path: "/menu",
      icon: <FiGrid />,
    },
  ];
  // =====================================================
  // MENU BY ROLE
  // =====================================================

  const menus = useMemo(() => {
    switch (user?.role) {
      case "OWNER":
        return ownerMenu;

      case "MANAGER":
        return managerMenu;

      case "CASHIER":
        return cashierMenu;

      case "WAITER":
        return waiterMenu;

      case "KITCHEN":
        return kitchenMenu;

      default:
        return [];
    }
  }, [user]);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    logout();
  };

  // =====================================================
  // SIDEBAR CONTENT
  // =====================================================

  const SidebarContent = () => (
    <>
      {/* ===================== LOGO ===================== */}

      <div
        className={`h-20 border-b border-[#E7EAE1] dark:border-[#262B24] flex items-center ${
          collapsed ? "justify-center" : "justify-between px-6"
        }`}
      >
        {!collapsed && (
          <div>
            <h1 className="text-2xl font-bold text-[#3FA34D] dark:text-[#43B75A]">
              Restaurant ERP
            </h1>

            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-1">
              Management System
            </p>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center w-10 h-10 rounded-xl hover:bg-[#3FA34D]/10 dark:hover:bg-[#43B75A]/10 transition text-[#1F2937] dark:text-white"
        >
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
      </div>

      {/* ===================== USER ===================== */}

      <div
        className={`border-b border-[#E7EAE1] dark:border-[#262B24] ${collapsed ? "p-3" : "p-5"}`}
      >
        <div
          className={`flex items-center ${
            collapsed ? "justify-center" : "gap-4"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-[#3FA34D] dark:bg-[#43B75A] flex items-center justify-center text-white text-lg font-bold">
            {user?.name?.charAt(0) || "R"}
          </div>

          {!collapsed && (
            <div className="overflow-hidden">
              <h3 className="font-semibold text-[#1F2937] dark:text-white truncate">
                {user?.name}
              </h3>

              <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] capitalize">
                {user?.role?.toLowerCase()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===================== MENU ===================== */}

      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-1">
          {menus.map((item) => {
            const active = location.pathname === item.path;

            // External items (currently just "Open Kiosk") open in a new
            // tab instead of navigating the admin SPA away from itself —
            // the kiosk is a separate fullscreen customer-facing app.
            if (item.external) {
              return (
                <a
                  key={item.path}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`relative flex items-center rounded-xl transition-all duration-200 text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-[#1E241E] hover:text-[#1F2937] dark:hover:text-white ${
                    collapsed ? "justify-center h-12" : "gap-4 px-4 py-3"
                  }`}
                  title="Opens in a new tab"
                >
                  <span className="text-xl">{item.icon}</span>

                  {!collapsed && (
                    <span className="font-medium flex items-center gap-2 flex-1">
                      {item.name}
                      <FiExternalLink className="text-sm opacity-60" />
                    </span>
                  )}
                </a>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`relative flex items-center rounded-xl transition-all duration-200 ${
                  collapsed ? "justify-center h-12" : "gap-4 px-4 py-3"
                } ${
                  active
                    ? "bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 text-[#3FA34D] dark:text-[#43B75A] font-semibold"
                    : "text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-[#1E241E] hover:text-[#1F2937] dark:hover:text-white"
                }`}
              >
                {active && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[#3FA34D] dark:bg-[#43B75A]" />
                )}

                <span className="text-xl">{item.icon}</span>

                {!collapsed && <span className="font-medium">{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* ===================== LOGOUT ===================== */}

      <div className="border-t border-[#E7EAE1] dark:border-[#262B24] p-3">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center rounded-xl text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#EF5350]/10 hover:text-[#EF5350] transition ${
            collapsed ? "justify-center h-12" : "gap-4 px-4 py-3"
          }`}
        >
          <FiLogOut className="text-xl" />

          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </>
  );

  // =====================================================
  // RETURN
  // =====================================================

  return (
    <>
      {/* ================= MOBILE OVERLAY ================= */}

      {mobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 lg:hidden"
        />
      )}

      {/* ================= MOBILE SIDEBAR ================= */}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-[#10140F] shadow-2xl z-50 transform transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute top-5 right-5">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-[#3FA34D]/10 dark:hover:bg-[#43B75A]/10 flex items-center justify-center text-[#1F2937] dark:text-white"
          >
            <FiX />
          </button>
        </div>

        <SidebarContent />
      </aside>
      {/* ================= DESKTOP SIDEBAR ================= */}

      <aside
        className={`hidden lg:flex fixed top-0 left-0 h-screen bg-white dark:bg-[#10140F] border-r border-[#E7EAE1] dark:border-[#262B24] flex-col transition-all duration-300 z-30 ${
          collapsed ? "w-24" : "w-72"
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;