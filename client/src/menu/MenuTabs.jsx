// client/src/menu/MenuTabs.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { FiCoffee, FiGrid, FiLayers, FiTag, FiPackage, FiBarChart2 } from "react-icons/fi";

const tabs = [
  { label: "Menu Items", to: "/menu", icon: <FiCoffee size={15} />, end: true },
  { label: "Categories", to: "/menu/categories", icon: <FiGrid size={15} />, end: false },
  { label: "Sub Categories", to: "/menu/subcategories", icon: <FiLayers size={15} />, end: false },
  { label: "Kitchen Sections", to: "/menu/kitchen-sections", icon: <FiTag size={15} />, end: false },
  { label: "Add-ons", to: "/menu/addons", icon: <FiTag size={15} />, end: false },
  { label: "Combo Meals", to: "/menu/combos", icon: <FiPackage size={15} />, end: false },
  { label: "Reports", to: "/menu/reports", icon: <FiBarChart2 size={15} />, end: false },
];

const MenuTabs = () => {
  return (
    <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm shadow-black/[0.02] dark:shadow-none p-1.5 transition-colors">
      <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-[#3FA34D] dark:bg-[#43B75A] text-white shadow-sm"
                  : "text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-[#1E241C] hover:text-[#1F2937] dark:hover:text-white"
              }`
            }
          >
            {tab.icon}
            {tab.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default MenuTabs;
