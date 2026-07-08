import { Routes, Route } from "react-router-dom";
import PosOrderScreen from "./PosOrderScreen";
import KitchenDisplayScreen from "./Kitchen/KitchenDisplayScreen";
import OrdersPage from "./OrdersPage";

function PosRoutes() {
  return (
    <Routes>
      <Route index element={<PosOrderScreen />} />
      <Route path="kitchen" element={<KitchenDisplayScreen />} />
      <Route path="orders" element={<OrdersPage />} />
    </Routes>
  );
}

export default PosRoutes;