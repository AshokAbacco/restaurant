// server/src/index.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./auth/auth.routes.js";
import { requireAuth, requireRole } from "./auth/auth.middleware.js";
import { requireOutletContext } from "./middleware/tenantContext.js";

import pricingRoutes from "./pricing/pricing.routes.js";
import { webhookHandler as razorpayWebhookHandler } from "./pricing/pricing.controller.js";

import contactRoutes from "./contact/contact.routes.js";

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
import printerProfilesRoutes from "./printer-profiles/printerProfiles.routes.js";
import crmRoutes from "./crm/crm.routes.js";

// Platform admin (/platform in the client) + restaurant-side support inbox
import platformRoutes from "./platform/platform.routes.js";
import supportRoutes from "./support/support.routes.js";
import { withWebhookLog } from "./platform/webhooks.controller.js";
import { requestMetrics, logServerError } from "./platform/health.monitor.js";
import { trackUsage } from "./platform/usage.tracker.js";
import { notifyOnSuccess } from "./platform/notify.js";

const app = express();
console.log("🚀 USING UPDATED INDEX.JS - KIOSK WITHOUT STAFF AUTH");
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true, // required so the refresh-token cookie is sent/received
  }),
);

// Platform observability: response-time metrics for the Health page and
// per-restaurant feature usage for the Activity page. Both only attach
// `finish` listeners — they never delay or alter a response.
app.use(requestMetrics);
app.use(trackUsage);

app.post(
  "/api/pricing/webhook",
  express.raw({ type: "application/json" }),
  withWebhookLog("razorpay", razorpayWebhookHandler),
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Server is live 🚀");
});

// ==============================================
// AUTH (public + a couple of protected endpoints handled inside auth.routes.js)
// ==============================================
// Platform team alerts (Settings -> Team notifications). Only observe the
// response; the routes themselves are unchanged.
const signupAlert = (req) =>
  `New restaurant signed up: ${req.body?.restaurantName} — ${req.body?.fullName} <${req.body?.email}>, ${req.body?.phone}`;
signupAlert.subject = "New restaurant signup";
app.post("/api/auth/register", notifyOnSuccess("onNewSignup", signupAlert));
app.post(
  "/api/pricing/verify-payment",
  notifyOnSuccess(
    "payment",
    (req, ok) =>
      `${ok ? "Checkout payment verified" : "Checkout verification FAILED"} — Razorpay order ${req.body?.razorpay_order_id || req.body?.orderId || "?"}`,
  ),
);
const enquiryAlert = (req) =>
  `New website enquiry from ${req.body?.fullName} (${req.body?.restaurantName}) <${req.body?.email}>, ${req.body?.phone}:\n\n${req.body?.message || ""}`;
enquiryAlert.subject = "New website enquiry";
app.post("/api/contact", notifyOnSuccess("onEnquiry", enquiryAlert));

app.use("/api/auth", authRoutes);

app.use("/api/pricing", pricingRoutes);

app.use("/api/contact", contactRoutes);

// ==============================================
// PLATFORM ADMIN — separate login, separate token (see platform.auth.js).
// Must be mounted before the catch-all `app.use("/api", requireAuth, ...)`.
// ==============================================
app.use("/api/platform", platformRoutes);

// Restaurant <-> platform team messaging (restaurant side).
app.use(
  "/api/support",
  requireAuth,
  requireRole("OWNER", "ADMIN", "MANAGER"),
  supportRoutes,
);

// ==============================================
// PROTECTED MODULES
// ==============================================
app.use("/api/kiosk", kioskRoutes);

app.use("/api", requireAuth, requireOutletContext, menuRoutes);
app.use(
  "/api/inventory",
  requireAuth,
  requireOutletContext,
  requireRole("OWNER", "ADMIN", "MANAGER", "STORE_KEEPER", "KITCHEN"),
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
  requireRole(
    "OWNER",
    "ADMIN",
    "MANAGER",
    "CASHIER",
    "WAITER",
    "CHEF",
    "KITCHEN",
  ),
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
app.use("/api/dashboard", requireAuth, requireOutletContext, dashboardRoutes);

// CRM — customer profiles, purchase history, groups, notes, follow-ups.
// Same roles as the POS, because staff pick/add customers while taking an
// order; crm.routes.js narrows destructive actions to managers and closes
// everything except /config when Settings -> CRM is off.
app.use(
  "/api/crm",
  requireAuth,
  requireOutletContext,
  requireRole("OWNER", "ADMIN", "MANAGER", "CASHIER", "WAITER"),
  crmRoutes,
);

// Printer profiles — mount at /pos/ path to match frontend
app.use(
  "/api/pos/printer-profiles",
  requireAuth,
  requireOutletContext,
  requireRole(
    "OWNER",
    "ADMIN",
    "MANAGER",
    "CASHIER",
    "WAITER",
    "CHEF",
    "KITCHEN",
  ),
  printerProfilesRoutes,
);

// ==============================================
// FALLBACK ERROR HANDLER
// ==============================================
app.use((err, req, res, next) => {
  console.error(err);
  if (!err.status || err.status >= 500)
    logServerError(err, req, err.status || 500);
  res.status(err.status || 500).json({
    success: false,
    message: err.expose
      ? err.message
      : "Something went wrong. Please try again.",
  });
});

export default app;
