// ==============================================
// client/src/App.jsx
// ==============================================

import { Routes, Route, Navigate } from "react-router-dom";

import AuthLayout from "./auth/AuthLayout";
import Login from "./auth/Login";
import Register from "./auth/Register";
import ForgotPassword from "./auth/ForgotPassword";
import ResetPassword from "./auth/ResetPassword";
import ProtectedRoute from "./auth/ProtectedRoute";
import ReportsRoutes from "./reports/reportsRoutes";
import CounterSummaryRoutes from "./counterSummary/counterSummaryRoutes";
import ProfitLossRoutes from "./profitLoss/profitLossRoutes";
import InventoryRoutes from "./inventory/inventoryRoutes";
import EmployeesRoutes from "./employees/employeesRoutes";

// ==============================================
// Layout
// ==============================================

import AdminLayout from "./components/layout/AdminLayout";

// ==============================================
// Dashboard
// ==============================================

import DashboardRoutes from "./dashboard/dashboardRoutes";

// ==============================================
// Profile
// FIX: ProfileMenu.jsx's "My Profile" and "Change Password" links pointed
// to /profile and /change-password, but neither route existed anywhere
// below — every unmatched path falls through to the catch-all
// (`<Route path="*" element={<Navigate to="/dashboard" replace />} />`),
// so clicking either link silently bounced straight back to /dashboard.
// That's what looked like "the profile tab isn't working."
// ==============================================

import Profile from "./profile/Profile";
import ChangePassword from "./profile/ChangePassword";
import HelpSupport from "./profile/HelpSupport";

// ==============================================
// Module Routes
// ==============================================

import MenuRoutes from "./menu/menuRoutes";
import PosRoutes from "./pos/posRoutes";
import Tables from "./tables/tablesRoutes";
import SettingsRoutes from "./settings/settingsRoutes";
import KitchenRoutes from "./pos/Kitchen/KitchenRoutes";
import KioskRoutes from "./kiosk/kioskRoutes";
import ExpenseRoutes from "./expenses/expensesRoutes";
import BillingRoutes from "./billing/billingRoutes";
import PaymentRoutes from "./payment/paymentRoutes";
import TableReservation from "./tableReservation/TableReservation";

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

        {/* Public Owner signup. Only the OWNER role can self-register —
            staff accounts are created from inside the app by the logged-in
            owner (Employees module), never from here. */}
        <Route path="/register" element={<Register />} />

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

          <Route path="/dashboard/*" element={<DashboardRoutes />} />

          {/* Profile */}

          <Route path="/profile" element={<Profile />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/help" element={<HelpSupport />} />

          {/* Menu */}

          <Route path="/menu/*" element={<MenuRoutes />} />

          {/* POS */}

          <Route path="/pos/*" element={<PosRoutes />} />
          <Route path="/tables/*" element={<Tables />} />
          <Route path="/kitchen/*" element={<KitchenRoutes />} />
          <Route path="/billing/*" element={<BillingRoutes />} />
          <Route path="/payments/*" element={<PaymentRoutes />} />

          {/* Reports */}
          <Route path="/reports/*" element={<ReportsRoutes />} />
          <Route
            path="/counter-summary/*"
            element={<CounterSummaryRoutes />}
          />

          {/* Profit Loss */}
          <Route path="/profit-loss/*" element={<ProfitLossRoutes />} />

          {/* Inventory */}
          <Route path="/inventory/*" element={<InventoryRoutes />} />
          <Route path="/expenses/*" element={<ExpenseRoutes />} />

          {/* Employees */}
          <Route path="/employees/*" element={<EmployeesRoutes />} />

          {/* Settings */}

          <Route path="/settings/*" element={<SettingsRoutes />} />
          <Route path="/table-reservations" element={<TableReservation />} />
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