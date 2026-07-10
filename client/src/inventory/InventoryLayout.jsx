// client/src/inventory/InventoryLayout.jsx
// Top-level sub-nav for the inventory section (sits inside AdminLayout's
// content area — no sidebar of its own, since AdminLayout already has one).
// 6 top-level tabs; related screens (Ingredients/Categories/Units/Suppliers,
// and Stock Ledger/Adjustments/Wastage/Expiry) are grouped behind their own
// secondary pill nav — see CatalogLayout.jsx and StockLayout.jsx (unchanged,
// they already re-theme automatically via theme.css's CSS variables).
//
// Redesigned to use the same shared PageHeader + segmented tab-pill pattern
// as Menu Management and Expenses, so all three modules read as one product.
import { NavLink, Outlet } from "react-router-dom";
import { FiBox } from "react-icons/fi";
import PageHeader from "../components/layout/PageHeader";
import "./theme.css";

const TABS = [
  { to: "/inventory", label: "Dashboard", end: true },
  { to: "/inventory/alerts", label: "Alerts" },
  { to: "/inventory/catalog", label: "Catalog" },
  { to: "/inventory/purchase-entries", label: "Purchase Entries" },
  { to: "/inventory/stock", label: "Stock" },
  { to: "/inventory/recipes", label: "Recipes" },
];

const InventoryLayout = () => {
  return (
    <div className="inv-scope space-y-6 bg-[var(--inv-paper)] min-h-screen -m-6 p-6 transition-colors">
      <PageHeader
        title="Inventory"
        subtitle="Ingredients, stock levels, purchases, and recipes — all in one place."
        icon={<FiBox />}
      />

      <nav className="bg-[var(--inv-paper-raised)] rounded-2xl border border-[var(--inv-line)] shadow-sm shadow-black/[0.02] p-1.5 transition-colors">
        <ul className="flex gap-1 min-w-max overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-[var(--inv-pine)] text-white shadow-sm"
                      : "text-[var(--inv-steel)] hover:bg-[var(--inv-steel-light)] hover:text-[var(--inv-ink)]"
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
