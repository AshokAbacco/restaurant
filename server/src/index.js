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
import kdsRoutes from "./kds/kds.routes.js";
import storesRoutes from "./stores/stores.routes.js";
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
// Every route below requires a valid access token AND an outlet selected
// for the session (requireOutletContext — see
// src/middleware/tenantContext.js — populates req.tenant, which every
// service in these modules now uses to scope its Prisma queries). Role
// checks are layered on per-module based on who should reasonably touch
// that data; adjust as your permission model firms up (these mirror the
// canX() helpers in AuthContext).
//
// /api/kiosk is deliberately excluded — it's the no-staff-auth
// customer-facing flow, resolved to an outlet via the QR code/table
// reference in the request itself rather than a staff JWT. Follow-up:
// give kiosk routes their own outlet-resolution path rather than assuming
// req.tenant exists there.
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

// Dashboard — FIX: this route was previously mounted with NO auth
// middleware at all, despite the comment above claiming "requireAuth
// only" — meaning /api/dashboard was reachable by anyone, unauthenticated.
// Now correctly requires both.
app.use(
  "/api/dashboard",
  requireAuth,
  requireOutletContext,
  dashboardRoutes,
);

// ==============================================
// FALLBACK ERROR HANDLER
// Catches thrown/rejected errors from any route above so a bug in a
// controller doesn't crash the process or leak a stack trace to the client.
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