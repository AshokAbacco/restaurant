// client/src/pos/Kitchen/KitchenRoutes.jsx
import { Routes, Route } from "react-router-dom";
import KitchenDisplayScreen from "./KitchenDisplayScreen.jsx";
import KitchenNotesPage from "./KitchenNotesPage.jsx";

// Mounted at /kitchen/* in App.jsx. Kept as its own tiny router (same
// pattern as PosRoutes/MenuRoutes) so a "Kitchen Notes" sidebar link can
// point at /kitchen/notes without needing a whole new top-level route.
export default function KitchenRoutes() {
  return (
    <Routes>
      <Route index element={<KitchenDisplayScreen />} />
      <Route path="notes" element={<KitchenNotesPage />} />
    </Routes>
  );
}