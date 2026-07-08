import React, { useMemo } from "react";
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
} from "react-icons/fi";

import { useAuth } from "../../auth/AuthContext";

// =====================================================
// SIDEBAR
// =====================================================

const Sidebar = ({ mobileOpen, onClose, collapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();

  const location = useLocation();

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

    {
      name: "Settings",
      path: "/settings",
      icon: <FiSettings />,
    },
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
      path: "/orders",
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
      path: "/orders",
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
  // KITCHEN MENU
  // =====================================================

  const kitchenMenu = [
    {
      name: "Kitchen Dashboard",
      path: "/kitchen",
      icon: <FiCoffee />,
    },

    {
      name: "Preparing",
      path: "/kitchen/preparing",
      icon: <FiClipboard />,
    },

    {
      name: "Ready Orders",
      path: "/kitchen/ready",
      icon: <FiShoppingCart />,
    },

    {
      name: "Completed",
      path: "/kitchen/completed",
      icon: <FiCheckCircle />,
    },

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
        className={`h-20 border-b border-gray-200 flex items-center ${
          collapsed ? "justify-center" : "justify-between px-6"
        }`}
      >
        {!collapsed && (
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Restaurant ERP</h1>

            <p className="text-xs text-gray-500 mt-1">Management System</p>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 transition"
        >
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
      </div>

      {/* ===================== USER ===================== */}

      <div className={`border-b border-gray-200 ${collapsed ? "p-3" : "p-5"}`}>
        <div
          className={`flex items-center ${
            collapsed ? "justify-center" : "gap-4"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
            {user?.name?.charAt(0) || "R"}
          </div>

          {!collapsed && (
            <div className="overflow-hidden">
              <h3 className="font-semibold text-gray-800 truncate">
                {user?.name}
              </h3>

              <p className="text-sm text-gray-500 capitalize">
                {user?.role?.toLowerCase()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===================== MENU ===================== */}

      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-2">
          {menus.map((item) => {
            const active = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center rounded-xl transition-all duration-200 ${
                  collapsed ? "justify-center h-12" : "gap-4 px-4 py-3"
                } ${
                  active
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                }`}
              >
                <span className="text-xl">{item.icon}</span>

                {!collapsed && <span className="font-medium">{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* ===================== LOGOUT ===================== */}

      <div className="border-t border-gray-200 p-3">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center rounded-xl text-red-600 hover:bg-red-50 transition ${
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
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />
      )}

      {/* ================= MOBILE SIDEBAR ================= */}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute top-5 right-5">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center"
          >
            <FiX />
          </button>
        </div>

        <SidebarContent />
      </aside>
      {/* ================= DESKTOP SIDEBAR ================= */}

      <aside
        className={`hidden lg:flex fixed top-0 left-0 h-screen bg-white border-r border-gray-200 shadow-sm flex-col transition-all duration-300 z-30 ${
          collapsed ? "w-24" : "w-72"
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;