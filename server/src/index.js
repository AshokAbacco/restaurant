// server/src/index.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./auth/auth.routes.js";
import { requireAuth, requireRole } from "./auth/auth.middleware.js";
import { requireOutletContext } from "./middleware/tenantContext.js";

import menuRoutes from "./menu/menu.routes.js";
import inventoryRoutes from "./inventory/inventory.routes.js";
import expensesRoutes from "./expenses/expenses.routes.js";
import employeeRoutes from "./employees/employees.routes.js";
import kotRoutes from "./pos/kot/kot.routes.js";
import posRoutes from "./pos/pos.routes.js";
import reservationsRoutes from "./reservations/reservations.routes.js"; // lives as its own top-level module, not nested under pos/
import kdsRoutes from "./kds/kds.routes.js";
import storesRoutes from "./stores/stores.routes.js";
import kitchenBranchesRoutes from "./kitchen-branches/kitchenBranches.routes.js";
import settingsRoutes from "./settings/settings.routes.js";
import kioskRoutes from "./kiosk/kiosk.routes.js";
import ReportsRoutes from "./reports/reports.routes.js";
import profitLossRoutes from "./profitLoss/profitLoss.routes.js";
import dashboardRoutes from "./dashboard/dashboard.routes.js";

const app = express();
console.log("🚀 USING UPDATED INDEX.JS - KIOSK WITHOUT STAFF AUTH");
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true, // required so the refresh-token cookie is sent/received
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Server is live 🚀");
});

// ==============================================
// AUTH (public + a couple of protected endpoints handled inside auth.routes.js)
// ==============================================
app.use("/api/auth", authRoutes);

// ==============================================
// PROTECTED MODULES
// ==============================================
app.use("/api/kiosk", kioskRoutes);

app.use("/api", requireAuth, requireOutletContext, menuRoutes);
app.use(
  "/api/inventory",
  requireAuth,
  requireOutletContext,
  requireRole("OWNER", "ADMIN", "MANAGER", "STORE_KEEPER"),
  inventoryRoutes,
);
app.use(
  "/api/expenses",
  requireAuth,
  requireOutletContext,
  requireRole("OWNER", "ADMIN", "MANAGER"),
  expensesRoutes,
);
app.use(
  "/api/employees",
  requireAuth,
  requireOutletContext,
  requireRole("OWNER", "ADMIN", "MANAGER"),
  employeeRoutes,
);
app.use(
  "/api/pos/kot",
  requireAuth,
  requireOutletContext,
  requireRole("OWNER", "ADMIN", "MANAGER", "CASHIER", "KITCHEN", "WAITER"),
  kotRoutes,
);
app.use(
  "/api/pos",
  requireAuth,
  requireOutletContext,
  requireRole("OWNER", "ADMIN", "MANAGER", "CASHIER", "WAITER"),
  posRoutes,
);

// Reservations — kept as its own top-level module (src/reservations/), so
// it's mounted directly here rather than nested inside pos.routes.js. The
// URL path stays /api/pos/reservations to match the existing frontend
// client (tableReservationApi.js calls "/pos/reservations"), and it uses
// the same role gate as the rest of /api/pos — reservations.routes.js then
// narrows further per-route (browse vs manage) internally.
app.use(
  "/api/pos/reservations",
  requireAuth,
  requireOutletContext,
  requireRole("OWNER", "ADMIN", "MANAGER", "CASHIER", "WAITER"),
  reservationsRoutes,
);

app.use(
  "/api/kds",
  requireAuth,
  requireOutletContext,
  requireRole("OWNER", "ADMIN", "MANAGER", "CHEF", "KITCHEN"),
  kdsRoutes,
);
app.use(
  "/api/stores",
  requireAuth,
  requireOutletContext,
  requireRole("OWNER", "ADMIN", "MANAGER"),
  storesRoutes,
);
// Physical kitchens. WAITER and CASHIER are included because the POS
// Send-to-Kitchen picker needs to list them; KITCHEN/CHEF because the
// Kitchen Display filters by them. Write access is narrowed again inside
// kitchenBranches.routes.js.
app.use(
  "/api/kitchen-branches",
  requireAuth,
  requireOutletContext,
  requireRole("OWNER", "ADMIN", "MANAGER", "CASHIER", "WAITER", "CHEF", "KITCHEN"),
  kitchenBranchesRoutes,
);
app.use(
  "/api/settings",
  requireAuth,
  requireOutletContext,
  requireRole("OWNER", "ADMIN", "MANAGER"),
  settingsRoutes,
);
app.use(
  "/api/reports",
  requireAuth,
  requireOutletContext,
  requireRole("OWNER", "ADMIN", "MANAGER"),
  ReportsRoutes,
);

// Profit & Loss — requireAuth + requireOutletContext only here; each route
// inside profitLossRoutes applies its own role check (Owner/Admin full
// access, Manager summary-only)
app.use(
  "/api/profit-loss",
  requireAuth,
  requireOutletContext,
  profitLossRoutes,
);

// Dashboard
app.use(
  "/api/dashboard",
  requireAuth,
  requireOutletContext,
  dashboardRoutes,
);

// ==============================================
// FALLBACK ERROR HANDLER
// ==============================================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.expose
      ? err.message
      : "Something went wrong. Please try again.",
  });
});

export default app;