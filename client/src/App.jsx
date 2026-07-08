// ==============================================
// client/src/App.jsx
// ==============================================

import { Routes, Route, Navigate } from "react-router-dom";

// ==============================================
// Authentication
// ==============================================

import AuthLayout from "./auth/AuthLayout";
import Login from "./auth/Login";
import ForgotPassword from "./auth/ForgotPassword";
import ResetPassword from "./auth/ResetPassword";
import ProtectedRoute from "./auth/ProtectedRoute";
import ReportsRoutes from "./reports/reportsRoutes";
import ProfitLossRoutes from "./profitLoss/profitLossRoutes";

// ==============================================
// Layout
// ==============================================

import AdminLayout from "./components/layout/AdminLayout";

// ==============================================
// Dashboard
// ==============================================

import Dashboard from "./dashboard/Dashboard";

// ==============================================
// Module Routes
// ==============================================

import MenuRoutes from "./menu/menuRoutes";
import PosRoutes from "./pos/posRoutes";
import SettingsRoutes from "./settings/settingsRoutes";
import KioskRoutes from "./kiosk/kioskRoutes";

// ==============================================
// APP
// ==============================================

function App() {
  return (
    <Routes>
      {/* ==========================================
          PUBLIC ROUTES
      ========================================== */}

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* ==========================================
          KIOSK ROUTES
          (No Login Required)
      ========================================== */}

      <Route path="/kiosk/*" element={<KioskRoutes />} />

      {/* ==========================================
          PROTECTED ADMIN ROUTES
      ========================================== */}

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          {/* Dashboard */}

          <Route path="/dashboard" element={<Dashboard />} />

          {/* Menu */}

          <Route path="/menu/*" element={<MenuRoutes />} />

          {/* POS */}

          <Route path="/pos/*" element={<PosRoutes />} />

          {/* Reports */}
          <Route path="/reports/*" element={<ReportsRoutes />} />

          {/* Profit Loss */}
          <Route path="/profit-loss/*" element={<ProfitLossRoutes />} />

          {/* Settings */}

          <Route path="/settings/*" element={<SettingsRoutes />} />
        </Route>
      </Route>

      {/* ==========================================
          DEFAULT ROUTE
      ========================================== */}

      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* ==========================================
          NOT FOUND
      ========================================== */}

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
