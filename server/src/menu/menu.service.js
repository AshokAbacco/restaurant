// server/src/menu/menu.service.js
import * as repo from "./menu.repository.js";
import { uploadToR2, deleteFromR2 } from "../config/r2.js";

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ---------- Category ----------

export const listCategories = () => repo.findAllCategories();

export const getCategory = async (id) => {
  const category = await repo.findCategoryById(id);
  if (!category) throw new AppError("Category not found", 404);
  return category;
};

export const addCategory = (data) =>
  repo.createCategory({
    name: data.name.trim(),
    description: data.description ?? null,
    imageUrl: data.imageUrl ?? null,
    displayOrder: data.displayOrder ? Number(data.displayOrder) : 0,
    isEnabled: data.isEnabled ?? true,
  });

export const editCategory = async (id, data) => {
  await getCategory(id); // throws 404 if missing
  return repo.updateCategory(id, data);
};

export const removeCategory = async (id) => {
  await getCategory(id);
  return repo.deleteCategory(id);
};

// ---------- Menu Item ----------

export const listMenuItems = (filters) => repo.findAllMenuItems(filters);

export const getMenuItem = async (id) => {
  const item = await repo.findMenuItemById(id);
  if (!item) throw new AppError("Menu item not found", 404);
  return item;
};

export const addMenuItem = async (data) => {
  const category = await repo.findCategoryById(data.categoryId);
  if (!category) throw new AppError("Category does not exist", 400);

  const existingSku = await repo.findMenuItemBySku(data.sku);
  if (existingSku) throw new AppError("SKU already exists", 409);

  return repo.createMenuItem({
    name: data.name.trim(),
    shortName: data.shortName ?? null,
    sku: data.sku.trim(),
    barcode: data.barcode ?? null,
    categoryId: data.categoryId,
    subCategoryId: data.subCategoryId ?? null,
    foodType: data.foodType ?? "VEG",
    kitchenSectionId: data.kitchenSectionId ?? null,
    sellingPrice: Number(data.sellingPrice),
    costPrice: data.costPrice !== undefined ? Number(data.costPrice) : null,
    gstPercent: data.gstPercent !== undefined ? Number(data.gstPercent) : 0,
    serviceCharge: data.serviceCharge !== undefined ? Number(data.serviceCharge) : null,
    isAvailable: data.isAvailable ?? true,
    isSeasonal: data.isSeasonal ?? false,
    isHiddenFromPOS: data.isHiddenFromPOS ?? false,
    status: data.status ?? "ACTIVE",
    imageUrl: data.imageUrl ?? null,
    description: data.description ?? null,
    prepTimeMinutes: data.prepTimeMinutes ? Number(data.prepTimeMinutes) : null,
    targetServeMinutes: data.targetServeMinutes ? Number(data.targetServeMinutes) : null,
  });
};

export const editMenuItem = async (id, data) => {
  await getMenuItem(id); // throws 404 if missing

  if (data.categoryId) {
    const category = await repo.findCategoryById(data.categoryId);
    if (!category) throw new AppError("Category does not exist", 400);
  }

  if (data.sku) {
    const existing = await repo.findMenuItemBySku(data.sku);
    if (existing && existing.id !== id) {
      throw new AppError("SKU already exists", 409);
    }
  }

  return repo.updateMenuItem(id, data);
};

// Soft delete by default, matching the doc's "Deleted (Soft Delete)" status
export const removeMenuItem = async (id) => {
  await getMenuItem(id);
  return repo.softDeleteMenuItem(id);
};

export const uploadMenuItemImage = async (file, folder = "menu-items") => {
  if (!file) throw new AppError("No file uploaded", 400);
  const { url } = await uploadToR2(file.buffer, file.originalname, file.mimetype, folder);
  return url;
};

// ---------- SubCategory ----------

export const listSubCategories = (categoryId) => repo.findAllSubCategories(categoryId);

export const getSubCategory = async (id) => {
  const sub = await repo.findSubCategoryById(id);
  if (!sub) throw new AppError("Sub-category not found", 404);
  return sub;
};

export const addSubCategory = async (data) => {
  const category = await repo.findCategoryById(data.categoryId);
  if (!category) throw new AppError("Category does not exist", 400);
  return repo.createSubCategory({ name: data.name.trim(), categoryId: data.categoryId });
};

export const editSubCategory = async (id, data) => {
  await getSubCategory(id);
  return repo.updateSubCategory(id, data);
};

export const removeSubCategory = async (id) => {
  await getSubCategory(id);
  return repo.deleteSubCategory(id);
};

// ---------- Kitchen Section ----------

export const listKitchenSections = () => repo.findAllKitchenSections();

export const getKitchenSection = async (id) => {
  const section = await repo.findKitchenSectionById(id);
  if (!section) throw new AppError("Kitchen section not found", 404);
  return section;
};

export const addKitchenSection = async (data) => {
  const existing = await repo.findKitchenSectionByName(data.name.trim());
  if (existing) throw new AppError("Kitchen section already exists", 409);
  return repo.createKitchenSection({ name: data.name.trim() });
};

export const editKitchenSection = async (id, data) => {
  await getKitchenSection(id);
  return repo.updateKitchenSection(id, data);
};

export const removeKitchenSection = async (id) => {
  await getKitchenSection(id);
  return repo.deleteKitchenSection(id);
};

// ---------- Menu Variants ----------

export const listVariants = (menuItemId) => repo.findVariantsByMenuItem(menuItemId);

export const addVariant = async (menuItemId, data) => {
  await getMenuItem(menuItemId); // 404 if item missing
  if (!data.name || data.price === undefined) {
    throw new AppError("Variant name and price are required", 400);
  }
  return repo.createVariant({
    menuItemId,
    name: data.name.trim(),
    price: Number(data.price),
    prepTimeMinutes: data.prepTimeMinutes ? Number(data.prepTimeMinutes) : null,
    targetServeMinutes: data.targetServeMinutes ? Number(data.targetServeMinutes) : null,
    calories: data.calories ? Number(data.calories) : null,
  });
};

export const editVariant = async (id, data) => {
  const variant = await repo.findVariantById(id);
  if (!variant) throw new AppError("Variant not found", 404);
  return repo.updateVariant(id, data);
};

export const removeVariant = async (id) => {
  const variant = await repo.findVariantById(id);
  if (!variant) throw new AppError("Variant not found", 404);
  return repo.deleteVariant(id);
};

// ---------- Add-ons ----------

export const listAddOns = () => repo.findAllAddOns();

export const addAddOn = (data) => {
  if (!data.name || data.price === undefined) {
    throw new AppError("Add-on name and price are required", 400);
  }
  return repo.createAddOn({ name: data.name.trim(), price: Number(data.price) });
};

export const editAddOn = async (id, data) => {
  const addOn = await repo.findAddOnById(id);
  if (!addOn) throw new AppError("Add-on not found", 404);
  return repo.updateAddOn(id, data);
};

export const removeAddOn = async (id) => {
  const addOn = await repo.findAddOnById(id);
  if (!addOn) throw new AppError("Add-on not found", 404);
  return repo.deleteAddOn(id);
};

export const attachAddOnToItem = async (menuItemId, addOnId) => {
  await getMenuItem(menuItemId);
  const addOn = await repo.findAddOnById(addOnId);
  if (!addOn) throw new AppError("Add-on not found", 404);
  return repo.linkAddOnToItem(menuItemId, addOnId);
};

export const detachAddOnFromItem = (menuItemId, addOnId) =>
  repo.unlinkAddOnFromItem(menuItemId, addOnId);

export const listAddOnsForItem = (menuItemId) => repo.findAddOnsForItem(menuItemId);

// ---------- Combo Meals ----------

export const listCombos = () => repo.findAllCombos();

export const getCombo = async (id) => {
  const combo = await repo.findComboById(id);
  if (!combo) throw new AppError("Combo meal not found", 404);
  return combo;
};

export const addCombo = (data) => {
  if (!data.name || data.price === undefined) {
    throw new AppError("Combo name and price are required", 400);
  }
  return repo.createCombo({
    name: data.name.trim(),
    price: Number(data.price),
    description: data.description ?? null,
    imageUrl: data.imageUrl ?? null,
  });
};

export const editCombo = async (id, data) => {
  await getCombo(id);
  return repo.updateCombo(id, data);
};

export const removeCombo = async (id) => {
  await getCombo(id);
  return repo.deleteCombo(id);
};

export const addItemToCombo = async (comboMealId, menuItemId, quantity = 1) => {
  await getCombo(comboMealId);
  await getMenuItem(menuItemId);
  return repo.addComboItem(comboMealId, menuItemId, quantity);
};

export const removeItemFromCombo = (comboItemId) => repo.removeComboItem(comboItemId);

// ---------- Price History ----------
// Wraps the existing editMenuItem so a price change is auto-logged.

export const editMenuItemWithPriceTracking = async (id, data, changedBy) => {
  const existing = await getMenuItem(id);

  const updated = await editMenuItem(id, data);

  if (
    data.sellingPrice !== undefined &&
    Number(data.sellingPrice) !== Number(existing.sellingPrice)
  ) {
    await repo.logPriceChange(id, existing.sellingPrice, Number(data.sellingPrice), changedBy);
  }

  return updated;
};

export const getPriceHistory = (menuItemId) => repo.findPriceHistoryForItem(menuItemId);

// ---------- Bulk Import / Export ----------
// Expected CSV columns: name,sku,categoryName,sellingPrice,costPrice,gstPercent,foodType,description

export const bulkImportMenuItems = async (fileBuffer) => {
  const text = fileBuffer.toString("utf-8");
  const rows = text.split(/\r?\n/).filter((r) => r.trim());
  if (rows.length < 2) throw new AppError("CSV has no data rows", 400);

  const headers = rows[0].split(",").map((h) => h.trim());
  const requiredCols = ["name", "sku", "categoryName", "sellingPrice"];
  for (const col of requiredCols) {
    if (!headers.includes(col)) {
      throw new AppError(`CSV missing required column: ${col}`, 400);
    }
  }

  const results = { created: 0, skipped: 0, errors: [] };

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i].split(",").map((v) => v.trim());
    const row = Object.fromEntries(headers.map((h, idx) => [h, values[idx]]));

    try {
      const categories = await repo.findAllCategories();
      const category = categories.find(
        (c) => c.name.toLowerCase() === (row.categoryName || "").toLowerCase()
      );
      if (!category) {
        results.errors.push(`Row ${i + 1}: category "${row.categoryName}" not found`);
        results.skipped++;
        continue;
      }

      const existingSku = await repo.findMenuItemBySku(row.sku);
      if (existingSku) {
        results.errors.push(`Row ${i + 1}: SKU "${row.sku}" already exists, skipped`);
        results.skipped++;
        continue;
      }

      await repo.createMenuItem({
        name: row.name,
        sku: row.sku,
        categoryId: category.id,
        sellingPrice: Number(row.sellingPrice) || 0,
        costPrice: row.costPrice ? Number(row.costPrice) : null,
        gstPercent: row.gstPercent ? Number(row.gstPercent) : 0,
        foodType: ["VEG", "NON_VEG", "EGG"].includes(row.foodType) ? row.foodType : "VEG",
        description: row.description || null,
      });
      results.created++;
    } catch (err) {
      results.errors.push(`Row ${i + 1}: ${err.message}`);
      results.skipped++;
    }
  }

  return results;
};

export const exportMenuItemsToCsv = async () => {
  const items = await repo.findAllMenuItems({});
  const headers = ["name", "sku", "categoryName", "sellingPrice", "costPrice", "gstPercent", "foodType", "status"];
  const lines = [headers.join(",")];

  for (const item of items) {
    lines.push(
      [
        item.name,
        item.sku,
        item.category?.name ?? "",
        item.sellingPrice,
        item.costPrice ?? "",
        item.gstPercent,
        item.foodType,
        item.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
  }

  return lines.join("\n");
};

// ---------- Reports ----------

export const generateMenuReport = async () => {
  const items = await repo.findAllMenuItems({});

  const totalItems = items.length;
  const activeItems = items.filter((i) => i.status === "ACTIVE").length;
  const outOfStock = items.filter((i) => i.status === "OUT_OF_STOCK").length;
  const inactiveItems = items.filter((i) => i.status === "INACTIVE").length;

  const byCategory = {};
  for (const item of items) {
    const catName = item.category?.name ?? "Uncategorized";
    byCategory[catName] = (byCategory[catName] || 0) + 1;
  }

  const avgSellingPrice =
    totalItems > 0
      ? items.reduce((sum, i) => sum + Number(i.sellingPrice), 0) / totalItems
      : 0;

  return {
    totalItems,
    activeItems,
    outOfStock,
    inactiveItems,
    itemsByCategory: byCategory,
    averageSellingPrice: Math.round(avgSellingPrice * 100) / 100,
  };
};

export { AppError };