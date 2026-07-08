// client/src/menu/MenuTabs.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { FiCoffee, FiGrid, FiLayers, FiTag, FiPackage, FiBarChart2 } from "react-icons/fi";

const tabs = [
  { label: "Menu Items", to: "/menu", icon: <FiCoffee />, end: true },
  { label: "Categories", to: "/menu/categories", icon: <FiGrid />, end: false },
  { label: "Sub Categories", to: "/menu/subcategories", icon: <FiLayers />, end: false },
  { label: "Kitchen Sections", to: "/menu/kitchen-sections", icon: <FiTag />, end: false },
  { label: "Add-ons", to: "/menu/addons", icon: <FiTag />, end: false },
  { label: "Combo Meals", to: "/menu/combos", icon: <FiPackage />, end: false },
  { label: "Reports", to: "/menu/reports", icon: <FiBarChart2 />, end: false },
];

const MenuTabs = () => {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              isActive
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`
          }
        >
          {tab.icon}
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
};

export default MenuTabs;