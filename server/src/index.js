import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./auth/auth.routes.js";
import { requireAuth, requireRole } from "./auth/auth.middleware.js";

import menuRoutes from "./menu/menu.routes.js";
import inventoryRoutes from "./inventory/inventory.routes.js";
import expensesRoutes from "./expenses/expenses.routes.js";
import employeeRoutes from "./employees/employees.routes.js";
import posRoutes from "./pos/pos.routes.js";
import kdsRoutes from "./kds/kds.routes.js";

const app = express();

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
// Every route below requires a valid access token. Role checks are layered on
// per-module based on who should reasonably touch that data; adjust as your
// permission model firms up (these mirror the canX() helpers in AuthContext).
// ==============================================
app.use("/api", requireAuth, menuRoutes);
app.use(
  "/api/inventory",
  requireAuth,
  requireRole("OWNER", "MANAGER", "STORE_KEEPER"),
  inventoryRoutes,
);
app.use(
  "/api/expenses",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  expensesRoutes,
);
app.use(
  "/api/employees",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  employeeRoutes,
);
app.use(
  "/api/pos",
  requireAuth,
  requireRole("OWNER", "MANAGER", "CASHIER"),
  posRoutes,
);
app.use(
  "/api/kds",
  requireAuth,
  requireRole("OWNER", "MANAGER", "CHEF", "KITCHEN"),
  kdsRoutes,
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
