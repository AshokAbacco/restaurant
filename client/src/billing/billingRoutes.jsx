// src/billing/billingRoutes.jsx
import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Billings from "./Billings";

// PERFORMANCE: Due Payments and Bill History are separate screens, so they
// are split into their own chunks instead of being downloaded (and parsed)
// every time the main Billing page opens. Suspensions are caught by the
// SuspenseOutlet boundary App.jsx already wraps the admin routes in.
const DuePayments = lazy(() => import("./DuePayments"));
const BillHistory = lazy(() => import("./BillHistory"));

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