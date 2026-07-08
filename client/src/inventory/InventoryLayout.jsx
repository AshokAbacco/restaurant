// client/src/inventory/InventoryLayout.jsx
// No sidebar here — AdminLayout already provides the app shell and already
// has an "Inventory" entry in its own Sidebar (pointing at /inventory).
// This just renders a horizontal sub-nav for the inventory section's own
// pages, the same way /menu's sub-pages (categories, subcategories, etc.)
// appear to work based on Header's breadcrumb/title map.
import { NavLink, Outlet } from "react-router-dom";
import "./theme.css";

const TABS = [
  { to: "/inventory", label: "Dashboard", end: true },
  { to: "/inventory/alerts", label: "Alerts" },
  { to: "/inventory/ingredients", label: "Ingredients" },
  { to: "/inventory/categories", label: "Categories" },
  { to: "/inventory/units", label: "Units" },
  { to: "/inventory/suppliers", label: "Suppliers" },
  { to: "/inventory/purchase-orders", label: "Purchase Orders" },
  { to: "/inventory/purchase-entries", label: "Purchase Entries" },
  { to: "/inventory/movements", label: "Stock Ledger" },
  { to: "/inventory/adjustments", label: "Adjustments" },
  { to: "/inventory/wastage", label: "Wastage" },
  { to: "/inventory/expiry", label: "Expiry Batches" },
  { to: "/inventory/recipes", label: "Recipes" },
];

const InventoryLayout = () => {
  return (
    <div className="inv-scope">
      <nav className="mb-6 border-b border-[var(--inv-line)] overflow-x-auto">
        <ul className="flex gap-1 min-w-max">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `inline-block px-3.5 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    isActive
                      ? "border-[var(--inv-pine)] text-[var(--inv-pine-dark)] font-medium"
                      : "border-transparent text-[var(--inv-steel)] hover:text-[var(--inv-ink)]"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
};

export default InventoryLayout;