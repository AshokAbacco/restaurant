//client\src\inventory\inventoryRoutes.jsx
import { Routes, Route } from "react-router-dom";
import InventoryLayout from "./InventoryLayout";
import Dashboard from "./pages/Dashboard";
import UnitsPage from "./pages/UnitsPage";
import CategoriesPage from "./pages/CategoriesPage";
import SuppliersPage from "./pages/SuppliersPage";
import IngredientsPage from "./pages/IngredientsPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
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
        <Route path="ingredients" element={<IngredientsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="units" element={<UnitsPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="purchase-entries" element={<PurchaseEntriesPage />} />
        <Route path="movements" element={<StockMovementsPage />} />
        <Route path="adjustments" element={<AdjustmentsPage />} />
        <Route path="wastage" element={<WastagePage />} />
        <Route path="expiry" element={<ExpiryBatchesPage />} />
        <Route path="recipes" element={<RecipesPage />} />
      </Route>
    </Routes>
  );
};

export default InventoryRoutes;