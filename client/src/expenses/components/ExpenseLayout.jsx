// ==============================================
// src/expenses/components/ExpenseLayout.jsx
// ==============================================

import { NavLink, Outlet } from "react-router-dom";
import { FiGrid, FiList, FiTag, FiBarChart2, FiHome } from "react-icons/fi";

const tabs = [
  { name: "Dashboard", path: "/expenses", end: true, icon: <FiGrid /> },
  { name: "Expenses", path: "/expenses/list", icon: <FiList /> },
  { name: "Categories", path: "/expenses/categories", icon: <FiTag /> },
  { name: "Stores", path: "/expenses/stores", icon: <FiHome /> },
  { name: "Reports", path: "/expenses/reports", icon: <FiBarChart2 /> },
];

const ExpenseLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 pt-6">
        <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Track what the restaurant is spending, all in one place.
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mt-6 overflow-x-auto">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`
              }
            >
              {tab.icon}
              {tab.name}
            </NavLink>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  );
};

export default ExpenseLayout;