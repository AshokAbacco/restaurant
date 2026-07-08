// server/src/inventory/inventory.routes.js
// Mount this once in your main app, e.g.: app.use("/api/inventory", inventoryRoutes)
import { Router } from "express";
import unitsRoutes from "./units/units.routes.js";
import ingredientCategoriesRoutes from "./ingredientCategories/ingredientCategories.routes.js";
import suppliersRoutes from "./suppliers/suppliers.routes.js";
import ingredientsRoutes from "./ingredients/ingredients.routes.js";
import inventoryStockRoutes from "./inventoryStock/inventoryStock.routes.js";
import purchaseOrdersRoutes from "./purchaseOrders/purchaseOrders.routes.js";
import purchaseEntriesRoutes from "./purchaseEntries/purchaseEntries.routes.js";
import stockMovementsRoutes from "./stockMovements/stockMovements.routes.js";
import recipesRoutes from "./recipes/recipes.routes.js";
import adjustmentsRoutes from "./adjustments/adjustments.routes.js";
import wastageRoutes from "./wastage/wastage.routes.js";
import consumptionRoutes from "./consumption/consumption.routes.js";
import alertsRoutes from "./alerts/alerts.routes.js";
import expiryBatchesRoutes from "./expiryBatches/expiryBatches.routes.js";

const router = Router();

router.use("/units", unitsRoutes);
router.use("/ingredient-categories", ingredientCategoriesRoutes);
router.use("/suppliers", suppliersRoutes);
router.use("/ingredients", ingredientsRoutes);
router.use("/stock", inventoryStockRoutes);
router.use("/purchase-orders", purchaseOrdersRoutes);
router.use("/purchase-entries", purchaseEntriesRoutes);
router.use("/movements", stockMovementsRoutes);
router.use("/recipes", recipesRoutes);
router.use("/adjustments", adjustmentsRoutes);
router.use("/wastage", wastageRoutes);
router.use("/consumption", consumptionRoutes);
router.use("/alerts", alertsRoutes);
router.use("/expiry-batches", expiryBatchesRoutes);

export default router;