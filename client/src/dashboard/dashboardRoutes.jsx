// src/dashboard/dashboardRoutes.jsx
//
// Mounted in App.jsx as <Route path="/dashboard/*" element={<DashboardRoutes />} />,
// same pattern as posRoutes / menuRoutes / tablesRoutes. Paths here are
// relative to /dashboard, so "/" is /dashboard itself.
//
// /dashboard          Table View — the live floor (see Dashboard.jsx)
// /dashboard/analytics  The KPI/chart dashboard this replaced. Kept rather
//                     than deleted: the revenue, kitchen, low-stock and
//                     top-seller panels are still the only place several of
//                     those numbers appear anywhere in the app.
import { Routes, Route } from "react-router-dom";
import Dashboard from "./Dashboard";
import AnalyticsDashboard from "./AnalyticsDashboard";

export default function DashboardRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="analytics" element={<AnalyticsDashboard />} />
    </Routes>
  );
}