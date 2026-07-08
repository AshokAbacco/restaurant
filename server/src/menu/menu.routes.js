// server/src/menu/menu.routes.js
import { Router } from "express";
import * as controller from "./menu.controller.js";
import upload from "../config/upload.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

// ==============================================
// Role rules (per Menu Management doc):
// - View (GET)              -> OWNER, MANAGER, CASHIER, KITCHEN
// - Add / Edit (POST/PUT)   -> OWNER, MANAGER
// - Delete                  -> OWNER only
// - Reports / Export        -> OWNER, MANAGER
// - Bulk Import             -> OWNER only
//
// IMPORTANT: literal routes like /menu/report and /menu/export MUST be
// registered BEFORE /menu/:id. Express matches routes top-to-bottom, and
// /menu/:id would otherwise treat "report"/"export" as an :id value,
// causing a false 404 ("menu item not found") instead of hitting the
// intended handler.
// ==============================================

const VIEW_ROLES = ["OWNER", "MANAGER", "CASHIER", "KITCHEN"];
const EDIT_ROLES = ["OWNER", "MANAGER"];

const router = Router();

// ---------- Category ----------
router.get("/categories", requireAuth, requireRole(...VIEW_ROLES), controller.getCategories);
router.get("/categories/:id", requireAuth, requireRole(...VIEW_ROLES), controller.getCategoryById);
router.post("/categories", requireAuth, requireRole(...EDIT_ROLES), controller.createCategory);
router.put("/categories/:id", requireAuth, requireRole(...EDIT_ROLES), controller.updateCategory);
router.delete("/categories/:id", requireAuth, requireRole("OWNER"), controller.deleteCategory);

// ---------- SubCategory ----------
router.get("/subcategories", requireAuth, requireRole(...VIEW_ROLES), controller.getSubCategories);
router.post("/subcategories", requireAuth, requireRole(...EDIT_ROLES), controller.createSubCategory);
router.put("/subcategories/:id", requireAuth, requireRole(...EDIT_ROLES), controller.updateSubCategory);
router.delete("/subcategories/:id", requireAuth, requireRole("OWNER"), controller.deleteSubCategory);

// ---------- Kitchen Sections ----------
router.get("/kitchen-sections", requireAuth, requireRole(...VIEW_ROLES), controller.getKitchenSections);
router.post("/kitchen-sections", requireAuth, requireRole(...EDIT_ROLES), controller.createKitchenSection);
router.put("/kitchen-sections/:id", requireAuth, requireRole(...EDIT_ROLES), controller.updateKitchenSection);
router.delete("/kitchen-sections/:id", requireAuth, requireRole("OWNER"), controller.deleteKitchenSection);

// ---------- Menu Items: literal routes FIRST ----------
router.get("/menu/export", requireAuth, requireRole(...EDIT_ROLES), controller.exportMenuItems);
router.get("/menu/report", requireAuth, requireRole(...EDIT_ROLES), controller.getMenuReport);
router.post(
  "/menu/import",
  requireAuth,
  requireRole("OWNER"),
  upload.single("file"),
  controller.importMenuItems
);

// ---------- Menu Items: core CRUD ----------
router.get("/menu", requireAuth, requireRole(...VIEW_ROLES), controller.getMenuItems);
router.get("/menu/:id", requireAuth, requireRole(...VIEW_ROLES), controller.getMenuItemById);
router.post("/menu", requireAuth, requireRole(...EDIT_ROLES), controller.createMenuItem);
router.put("/menu/:id", requireAuth, requireRole(...EDIT_ROLES), controller.updateMenuItem);
router.delete("/menu/:id", requireAuth, requireRole("OWNER"), controller.deleteMenuItem);

// ---------- Menu Variants ----------
router.get("/menu/:menuItemId/variants", requireAuth, requireRole(...VIEW_ROLES), controller.getVariants);
router.post("/menu/:menuItemId/variants", requireAuth, requireRole(...EDIT_ROLES), controller.createVariant);
router.put("/variants/:id", requireAuth, requireRole(...EDIT_ROLES), controller.updateVariant);
router.delete("/variants/:id", requireAuth, requireRole("OWNER"), controller.deleteVariant);

// ---------- Add-ons ----------
router.get("/addons", requireAuth, requireRole(...VIEW_ROLES), controller.getAddOns);
router.post("/addons", requireAuth, requireRole(...EDIT_ROLES), controller.createAddOn);
router.put("/addons/:id", requireAuth, requireRole(...EDIT_ROLES), controller.updateAddOn);
router.delete("/addons/:id", requireAuth, requireRole("OWNER"), controller.deleteAddOn);

router.get("/menu/:menuItemId/addons", requireAuth, requireRole(...VIEW_ROLES), controller.getAddOnsForItem);
router.post("/menu/:menuItemId/addons", requireAuth, requireRole(...EDIT_ROLES), controller.attachAddOn);
router.delete("/menu/:menuItemId/addons/:addOnId", requireAuth, requireRole(...EDIT_ROLES), controller.detachAddOn);

// ---------- Combo Meals ----------
router.get("/combos", requireAuth, requireRole(...VIEW_ROLES), controller.getCombos);
router.get("/combos/:id", requireAuth, requireRole(...VIEW_ROLES), controller.getComboById);
router.post("/combos", requireAuth, requireRole(...EDIT_ROLES), controller.createCombo);
router.put("/combos/:id", requireAuth, requireRole(...EDIT_ROLES), controller.updateCombo);
router.delete("/combos/:id", requireAuth, requireRole("OWNER"), controller.deleteCombo);
router.post("/combos/:id/items", requireAuth, requireRole(...EDIT_ROLES), controller.addComboItem);
router.delete("/combos/items/:comboItemId", requireAuth, requireRole(...EDIT_ROLES), controller.removeComboItem);

// ---------- Price History ----------
router.get("/menu/:id/price-history", requireAuth, requireRole(...EDIT_ROLES), controller.getPriceHistory);

// ---------- Image Upload (used by menu item / category / combo forms) ----------
router.post(
  "/upload",
  requireAuth,
  requireRole(...EDIT_ROLES),
  upload.single("image"),
  controller.uploadImage
);

export default router;