import express from "express";
import cors from "cors";
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
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is live 🚀");
});

// Mounted with no auth for now — role guards get added here later
app.use("/api", menuRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/kds", kdsRoutes);

export default app;