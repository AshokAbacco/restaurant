// ==============================================
// src/components/layout/Breadcrumb.jsx
// ==============================================

import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiChevronRight, FiHome } from "react-icons/fi";

const routeNames = {
  dashboard: "Dashboard",
  pos: "POS",
  orders: "Orders",
  tables: "Table Management",
  menu: "Menu Management",
  inventory: "Inventory",
  customers: "Customers",
  billing: "Billing",
  payments: "Payments",
  employees: "Employees",
  expenses: "Expense Management",
  reports: "Reports",
  "profit-loss": "Profit & Loss",
  kitchen: "Kitchen",
  settings: "Settings",
  profile: "My Profile",
  "change-password": "Change Password",
  notifications: "Notifications",
};

const Breadcrumb = () => {
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const paths = location.pathname.split("/").filter(Boolean);

    return paths.map((segment, index) => ({
      name:
        routeNames[segment] ||
        segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      path: "/" + paths.slice(0, index + 1).join("/"),
      last: index === paths.length - 1,
    }));
  }, [location.pathname]);

  return (
    <nav
      className="flex items-center flex-wrap gap-2 text-sm"
      aria-label="Breadcrumb"
    >
      <Link
        to="/dashboard"
        className="flex items-center gap-2 text-[#6B7280] dark:text-[#9CA8A0] hover:text-[#3FA34D] dark:hover:text-[#43B75A] transition-colors"
      >
        <FiHome size={16} />
        <span>Home</span>
      </Link>

      {breadcrumbs.map((item) => (
        <React.Fragment key={item.path}>
          <FiChevronRight size={15} className="text-[#3FA34D] dark:text-[#43B75A]" />

          {item.last ? (
            <span className="font-semibold text-[#1F2937] dark:text-white">{item.name}</span>
          ) : (
            <Link
              to={item.path}
              className="text-[#6B7280] dark:text-[#9CA8A0] hover:text-[#3FA34D] dark:hover:text-[#43B75A] transition-colors"
            >
              {item.name}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;