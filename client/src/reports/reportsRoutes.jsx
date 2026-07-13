// ==============================================
// src/reports/reportsRoutes.jsx
// ==============================================

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ReportsDashboard from "./ReportsDashboard";

const ReportsRoutes = () => {
  return (
    <Routes>
      <Route index element={<ReportsDashboard />} />

      <Route
        path="*"
        element={<Navigate to="/reports" replace />}
      />
    </Routes>
  );
};

export default ReportsRoutes;