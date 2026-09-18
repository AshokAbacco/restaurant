// ==============================================
// client/src/App.jsx
// ==============================================

import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
 

import ProtectedRoute from "./auth/ProtectedRoute";
import {
  RouteFallback,
  SuspenseOutlet,
} from "./components/layout/RouteFallback";

// ==============================================
// Public site
// ==============================================

import LandingLayout from "./landing/LandingLayout";
import Home from "./landing/Home";
import ComingSoon from "./landing/ComingSoon";
import Pricing from "./landing/pages/Pricing";
import ContactUs from "./landing/pages/ContactUs";
import GlowCursor from "@/components/GlowCursor";
// ==============================================
// Auth
// ==============================================

const AuthLayout = lazy(() => import("./auth/AuthLayout"));
const Login = lazy(() => import("./auth/Login"));
const Register = lazy(() => import("./auth/Register"));
const ForgotPassword = lazy(() => import("./auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./auth/ResetPassword"));

// ==============================================
// Layout
// ==============================================

const AdminLayout = lazy(() => import("./components/layout/AdminLayout"));

// ==============================================
// Dashboard
// ==============================================

const DashboardRoutes = lazy(() => import("./dashboard/dashboardRoutes"));

// ==============================================
// Profile
// FIX: ProfileMenu.jsx's "My Profile" and "Change Password" links pointed
// to /profile and /change-password, but neither route existed anywhere
// below — every unmatched path falls through to the catch-all
// (`<Route path="*" element={<Navigate to="/dashboard" replace />} />`),
// so clicking either link silently bounced straight back to /dashboard.
// That's what looked like "the profile tab isn't working."
// ==============================================

const Profile = lazy(() => import("./profile/Profile"));
const ChangePassword = lazy(() => import("./profile/ChangePassword"));
const HelpSupport = lazy(() => import("./profile/HelpSupport"));

// ==============================================
// Module Routes
// ==============================================

const MenuRoutes = lazy(() => import("./menu/menuRoutes"));
const PosRoutes = lazy(() => import("./pos/posRoutes"));
const Tables = lazy(() => import("./tables/tablesRoutes"));
const SettingsRoutes = lazy(() => import("./settings/settingsRoutes"));
const KitchenRoutes = lazy(() => import("./pos/Kitchen/KitchenRoutes"));
const KioskRoutes = lazy(() => import("./kiosk/kioskRoutes"));
const ExpenseRoutes = lazy(() => import("./expenses/expensesRoutes"));
const BillingRoutes = lazy(() => import("./billing/billingRoutes"));
const PaymentRoutes = lazy(() => import("./payment/paymentRoutes"));
const TableReservation = lazy(
  () => import("./tableReservation/TableReservation"),
);
const ReportsRoutes = lazy(() => import("./reports/reportsRoutes"));
const CounterSummaryRoutes = lazy(
  () => import("./counterSummary/counterSummaryRoutes"),
);
const ProfitLossRoutes = lazy(() => import("./profitLoss/profitLossRoutes"));
const InventoryRoutes = lazy(() => import("./inventory/inventoryRoutes"));
const EmployeesRoutes = lazy(() => import("./employees/employeesRoutes"));

// ==============================================
// APP
// ==============================================

function App() {
  return (
    // The outer boundary covers the shells — auth layout, admin layout,
    // kiosk. Nothing inside the public site suspends, so a first-time
    // visitor never sees this fallback at all.
    <>
<GlowCursor
  style={{
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    pointerEvents: "none",
    width: "100vw",
    height: "100vh",
  }}
  blendMode="normal"
  color="#09a743"
  secondaryColor="#3fa34d"
/>
    <Suspense fallback={<RouteFallback />}>
     
      <Routes>
          
        {/* ==========================================
          PUBLIC SITE
          (Navbar + Footer, no login required)

          These sit above the auth routes because "/" is now the
          marketing homepage rather than a redirect into the app. A
          logged-in visitor still sees it — the navbar swaps its buttons
          for a link to the dashboard rather than the page bouncing,
          because a customer who wants to re-read the pricing page
          shouldn't be thrown into the POS.

          About / Services / Pricing / Contact are stubbed for now. See
          ComingSoon.jsx for why they're routed at all rather than left
          to the catch-all.
      ========================================== */}

        <Route element={<LandingLayout />}>
          <Route path="/" element={<Home />} />

          <Route path="/about" element={<ComingSoon title="About" />} />

          <Route path="/services" element={<ComingSoon title="Services" />} />

          <Route path="/pricing" element={<Pricing />} />

          <Route path="/contact" element={<ContactUs />} />
        </Route>

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
            {/* An inner boundary, so a module's chunk loads inside the
              shell instead of replacing it. See RouteFallback.jsx. */}
            <Route element={<SuspenseOutlet />}>
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
              <Route
                path="/table-reservations"
                element={<TableReservation />}
              />
            </Route>
          </Route>
        </Route>

        {/* ==========================================
          DEFAULT ROUTE

          "/" used to redirect to /dashboard. It renders the public
          homepage now, so the redirect is gone — the route above owns
          it. Staff land on the dashboard from the sign-in flow, which
          is unchanged.
      ========================================== */}

        {/* ==========================================
          NOT FOUND
      ========================================== */}

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
    </>
  );
}

export default App;
