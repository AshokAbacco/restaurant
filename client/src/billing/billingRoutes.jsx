// src/billing/billingRoutes.jsx
import { Routes, Route } from "react-router-dom";
import Billings from "./Billings";
import DuePayments from "./DuePayments";
import BillHistory from "./BillHistory";

// Mounted in App.jsx as <Route path="/billing/*" element={<BillingRoutes />} />,
// so this needs its own <Routes> — matches the pattern used by MenuRoutes,
// PosRoutes, etc. Paths here are relative to /billing.
export default function BillingRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Billings />} />
      <Route path="due-payments" element={<DuePayments />} />
      <Route path="history" element={<BillHistory />} />
    </Routes>
  );
}