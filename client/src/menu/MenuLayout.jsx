// client/src/menu/MenuLayout.jsx
// ==============================================
// Shared shell for the whole Menu Management section:
// the same PageHeader used on the Dashboard, plus the tab bar,
// so every tab (Items, Categories, Add-ons, ...) doesn't have to
// repeat the page background / header markup on its own.
// ==============================================
import React from "react";
import { Outlet } from "react-router-dom";
import { FiCoffee } from "react-icons/fi";
import PageHeader from "../components/layout/PageHeader";
import MenuTabs from "./MenuTabs";

const MenuLayout = () => {
  return (
    <div className="space-y-6 bg-[#F3F5EE] dark:bg-[#0D110C] min-h-screen -m-6 p-6 transition-colors">
      <PageHeader
        title="Menu Management"
        subtitle="Organize items, categories, add-ons, and combos for your restaurant."
        icon={<FiCoffee />}
      />

      <MenuTabs />

      <Outlet />
    </div>
  );
};

export default MenuLayout;
