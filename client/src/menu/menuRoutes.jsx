//client\src\menu\menuRoutes.jsx
import { Routes, Route } from "react-router-dom";
import MenuList from "./pages/MenuList";
import Categories from "./pages/Categories";
import SubCategories from "./pages/SubCategories";
import KitchenSections from "./pages/KitchenSections";
import AddOns from "./pages/AddOns";
import Combos from "./pages/Combos";
import Reports from "./pages/Reports";

const MenuRoutes = () => {
  return (
    <Routes>
      <Route index element={<MenuList />} />
      <Route path="categories" element={<Categories />} />
      <Route path="subcategories" element={<SubCategories />} />
      <Route path="kitchen-sections" element={<KitchenSections />} />
      <Route path="addons" element={<AddOns />} />
      <Route path="combos" element={<Combos />} />
      <Route path="reports" element={<Reports />} />
    </Routes>
  );
};

export default MenuRoutes;