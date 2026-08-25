// server/src/menu/menu.controller.js
import * as service from "./menu.service.js";
import { validateCategoryInput, validateMenuItemInput } from "./menu.validation.js";

const handleError = (res, err) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ success: false, message: err.message || "Something went wrong" });
};

// ---------- Category ----------

export const getCategories = async (req, res) => {
  try {
    const categories = await service.listCategories(req.tenant.outletId);
    res.json({ success: true, data: categories });
  } catch (err) {
    handleError(res, err);
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await service.getCategory(req.params.id, req.tenant.outletId);
    res.json({ success: true, data: category });
  } catch (err) {
    handleError(res, err);
  }
};

export const createCategory = async (req, res) => {
  try {
    const errors = validateCategoryInput(req.body);
    if (errors.length) return res.status(400).json({ success: false, errors });

    const category = await service.addCategory(req.body, req.tenant.outletId);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    handleError(res, err);
  }
};

export const updateCategory = async (req, res) => {
  try {
    const errors = validateCategoryInput(req.body, { isUpdate: true });
    if (errors.length) return res.status(400).json({ success: false, errors });

    const category = await service.editCategory(req.params.id, req.body, req.tenant.outletId);
    res.json({ success: true, data: category });
  } catch (err) {
    handleError(res, err);
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await service.removeCategory(req.params.id, req.tenant.outletId);
    res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Menu Item ----------

export const getMenuItems = async (req, res) => {
  try {
    const items = await service.listMenuItems(req.query, req.tenant.outletId);
    res.json({ success: true, data: items });
  } catch (err) {
    handleError(res, err);
  }
};

export const getMenuItemById = async (req, res) => {
  try {
    const item = await service.getMenuItem(req.params.id, req.tenant.outletId);
    res.json({ success: true, data: item });
  } catch (err) {
    handleError(res, err);
  }
};

export const createMenuItem = async (req, res) => {
  try {
    const errors = validateMenuItemInput(req.body);
    if (errors.length) return res.status(400).json({ success: false, errors });

    const item = await service.addMenuItem(req.body, req.tenant.outletId);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    handleError(res, err);
  }
};

export const updateMenuItem = async (req, res) => {
  try {
    const errors = validateMenuItemInput(req.body, { isUpdate: true });
    if (errors.length) return res.status(400).json({ success: false, errors });

    const item = await service.editMenuItemWithPriceTracking(
      req.params.id,
      req.body,
      req.user?.id,
      req.tenant.outletId,
    );
    res.json({ success: true, data: item });
  } catch (err) {
    handleError(res, err);
  }
};

export const deleteMenuItem = async (req, res) => {
  try {
    await service.removeMenuItem(req.params.id, req.tenant.outletId);
    res.json({ success: true, message: "Menu item deleted" });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Image Upload ----------
// Not outlet-scoped by design — this just uploads a file to object storage
// and returns its URL; the URL is only ever attached to outlet-scoped data
// (a MenuItem/Category) in a separate, already-scoped call.

export const uploadImage = async (req, res) => {
  try {
    const url = await service.uploadMenuItemImage(req.file, req.body.folder);
    res.json({ success: true, data: { url } });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- SubCategory ----------

export const getSubCategories = async (req, res) => {
  try {
    const subs = await service.listSubCategories(req.query.categoryId, req.tenant.outletId);
    res.json({ success: true, data: subs });
  } catch (err) {
    handleError(res, err);
  }
};

export const createSubCategory = async (req, res) => {
  try {
    if (!req.body.name || !req.body.categoryId) {
      return res.status(400).json({ success: false, message: "name and categoryId are required" });
    }
    const sub = await service.addSubCategory(req.body, req.tenant.outletId);
    res.status(201).json({ success: true, data: sub });
  } catch (err) {
    handleError(res, err);
  }
};

export const updateSubCategory = async (req, res) => {
  try {
    const sub = await service.editSubCategory(req.params.id, req.body, req.tenant.outletId);
    res.json({ success: true, data: sub });
  } catch (err) {
    handleError(res, err);
  }
};

export const deleteSubCategory = async (req, res) => {
  try {
    await service.removeSubCategory(req.params.id, req.tenant.outletId);
    res.json({ success: true, message: "Sub-category deleted" });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Kitchen Section ----------

export const getKitchenSections = async (req, res) => {
  try {
    const sections = await service.listKitchenSections(req.tenant.outletId);
    res.json({ success: true, data: sections });
  } catch (err) {
    handleError(res, err);
  }
};

export const createKitchenSection = async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ success: false, message: "name is required" });
    }
    const section = await service.addKitchenSection(req.body, req.tenant.outletId);
    res.status(201).json({ success: true, data: section });
  } catch (err) {
    handleError(res, err);
  }
};

export const updateKitchenSection = async (req, res) => {
  try {
    const section = await service.editKitchenSection(req.params.id, req.body, req.tenant.outletId);
    res.json({ success: true, data: section });
  } catch (err) {
    handleError(res, err);
  }
};

export const deleteKitchenSection = async (req, res) => {
  try {
    await service.removeKitchenSection(req.params.id, req.tenant.outletId);
    res.json({ success: true, message: "Kitchen section deleted" });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Menu Variants ----------

export const getVariants = async (req, res) => {
  try {
    const variants = await service.listVariants(req.params.menuItemId, req.tenant.outletId);
    res.json({ success: true, data: variants });
  } catch (err) {
    handleError(res, err);
  }
};

export const createVariant = async (req, res) => {
  try {
    const variant = await service.addVariant(req.params.menuItemId, req.body, req.tenant.outletId);
    res.status(201).json({ success: true, data: variant });
  } catch (err) {
    handleError(res, err);
  }
};

export const updateVariant = async (req, res) => {
  try {
    const variant = await service.editVariant(req.params.id, req.body, req.tenant.outletId);
    res.json({ success: true, data: variant });
  } catch (err) {
    handleError(res, err);
  }
};

export const deleteVariant = async (req, res) => {
  try {
    await service.removeVariant(req.params.id, req.tenant.outletId);
    res.json({ success: true, message: "Variant deleted" });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Add-ons ----------
// NOTE: src/pos/add-ons/addOns.controller.js now delegates here instead
// of maintaining its own copy — see that file's header comment.

export const getAddOns = async (req, res) => {
  try {
    const addOns = await service.listAddOns(req.tenant.outletId);
    res.json({ success: true, data: addOns });
  } catch (err) {
    handleError(res, err);
  }
};

export const createAddOn = async (req, res) => {
  try {
    const addOn = await service.addAddOn(req.body, req.tenant.outletId);
    res.status(201).json({ success: true, data: addOn });
  } catch (err) {
    handleError(res, err);
  }
};

export const updateAddOn = async (req, res) => {
  try {
    const addOn = await service.editAddOn(req.params.id, req.body, req.tenant.outletId);
    res.json({ success: true, data: addOn });
  } catch (err) {
    handleError(res, err);
  }
};

export const deleteAddOn = async (req, res) => {
  try {
    await service.removeAddOn(req.params.id, req.tenant.outletId);
    res.json({ success: true, message: "Add-on deleted" });
  } catch (err) {
    handleError(res, err);
  }
};

export const attachAddOn = async (req, res) => {
  try {
    const link = await service.attachAddOnToItem(
      req.params.menuItemId,
      req.body.addOnId,
      req.tenant.outletId,
    );
    res.status(201).json({ success: true, data: link });
  } catch (err) {
    handleError(res, err);
  }
};

export const detachAddOn = async (req, res) => {
  try {
    await service.detachAddOnFromItem(
      req.params.menuItemId,
      req.params.addOnId,
      req.tenant.outletId,
    );
    res.json({ success: true, message: "Add-on detached" });
  } catch (err) {
    handleError(res, err);
  }
};

export const getAddOnsForItem = async (req, res) => {
  try {
    const links = await service.listAddOnsForItem(req.params.menuItemId, req.tenant.outletId);
    res.json({ success: true, data: links });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Combo Meals ----------

export const getCombos = async (req, res) => {
  try {
    const combos = await service.listCombos(req.tenant.outletId);
    res.json({ success: true, data: combos });
  } catch (err) {
    handleError(res, err);
  }
};

export const getComboById = async (req, res) => {
  try {
    const combo = await service.getCombo(req.params.id, req.tenant.outletId);
    res.json({ success: true, data: combo });
  } catch (err) {
    handleError(res, err);
  }
};

export const createCombo = async (req, res) => {
  try {
    const combo = await service.addCombo(req.body, req.tenant.outletId);
    res.status(201).json({ success: true, data: combo });
  } catch (err) {
    handleError(res, err);
  }
};

export const updateCombo = async (req, res) => {
  try {
    const combo = await service.editCombo(req.params.id, req.body, req.tenant.outletId);
    res.json({ success: true, data: combo });
  } catch (err) {
    handleError(res, err);
  }
};

export const deleteCombo = async (req, res) => {
  try {
    await service.removeCombo(req.params.id, req.tenant.outletId);
    res.json({ success: true, message: "Combo deleted" });
  } catch (err) {
    handleError(res, err);
  }
};

export const addComboItem = async (req, res) => {
  try {
    const item = await service.addItemToCombo(
      req.params.id,
      req.body.menuItemId,
      req.body.quantity,
      req.tenant.outletId,
    );
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    handleError(res, err);
  }
};

export const removeComboItem = async (req, res) => {
  try {
    await service.removeItemFromCombo(req.params.comboItemId, req.tenant.outletId);
    res.json({ success: true, message: "Item removed from combo" });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Price History ----------

export const getPriceHistory = async (req, res) => {
  try {
    const history = await service.getPriceHistory(req.params.id, req.tenant.outletId);
    res.json({ success: true, data: history });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Bulk Import / Export ----------

export const importMenuItems = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "CSV file is required" });
    }
    const result = await service.bulkImportMenuItems(
      req.file.buffer,
      req.file.originalname,
      req.tenant.outletId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
};

export const exportMenuItems = async (req, res) => {
  try {
    const csv = await service.exportMenuItemsToCsv(req.tenant.outletId);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=menu-export.csv");
    res.send(csv);
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Reports ----------

export const getMenuReport = async (req, res) => {
  try {
    const report = await service.generateMenuReport(req.tenant.outletId);
    res.json({ success: true, data: report });
  } catch (err) {
    handleError(res, err);
  }
};