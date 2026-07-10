//client\src\inventory\inventoryRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import InventoryLayout from "./InventoryLayout";
import CatalogLayout from "./pages/CatalogLayout";
import StockLayout from "./pages/StockLayout";
import Dashboard from "./pages/Dashboard";
import { CategoriesPage, UnitsPage } from "./pages/CatalogSimplePages";
import SuppliersPage from "./pages/SuppliersPage";
import IngredientsPage from "./pages/IngredientsPage";
import PurchaseEntriesPage from "./pages/PurchaseEntriesPage";
import StockMovementsPage from "./pages/StockMovementsPage";
import AdjustmentsPage from "./pages/AdjustmentsPage";
import WastagePage from "./pages/WastagePage";
import ExpiryBatchesPage from "./pages/ExpiryBatchesPage";
import AlertsPage from "./pages/AlertsPage";
import RecipesPage from "./pages/RecipesPage";

const InventoryRoutes = () => {
  return (
    <Routes>
      <Route element={<InventoryLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="alerts" element={<AlertsPage />} />

        {/* Catalog group: Ingredients / Categories / Units / Suppliers */}
        <Route path="catalog" element={<CatalogLayout />}>
          <Route index element={<Navigate to="ingredients" replace />} />
          <Route path="ingredients" element={<IngredientsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="units" element={<UnitsPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
        </Route>

        <Route path="purchase-entries" element={<PurchaseEntriesPage />} />

        {/* Stock group: Ledger / Adjustments / Wastage / Expiry Batches */}
        <Route path="stock" element={<StockLayout />}>
          <Route index element={<Navigate to="ledger" replace />} />
          <Route path="ledger" element={<StockMovementsPage />} />
          <Route path="adjustments" element={<AdjustmentsPage />} />
          <Route path="wastage" element={<WastagePage />} />
          <Route path="expiry" element={<ExpiryBatchesPage />} />
        </Route>

        <Route path="recipes" element={<RecipesPage />} />
      </Route>
    </Routes>
  );
};

export default InventoryRoutes;
