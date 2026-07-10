// server/src/menu/menu.service.js
import * as repo from "./menu.repository.js";
import { uploadToR2, deleteFromR2 } from "../config/r2.js";
import * as XLSX from "xlsx";

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
// Expected columns: name,sku,categoryName,sellingPrice,costPrice,gstPercent,foodType,description
//
// bulkImportMenuItems() now accepts BOTH a CSV file and an Excel file
// (.xlsx/.xls). `originalName` (the uploaded file's name) is used to
// decide which parser to use — everything downstream (validation,
// category matching, row-by-row creation) is shared between the two.

// Minimal RFC4180-style CSV line parser: respects quoted fields, commas
// inside quotes, and doubled "" as an escaped quote. Needed because both
// the "Download Sample CSV" and "Export CSV" client features wrap every
// value in double quotes — a plain split(",") would leave the quote
// characters stuck to every value and break category/SKU matching.
function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'; // escaped quote ("")
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  values.push(current.trim());
  return values;
}

// Parses either a CSV or an Excel buffer into { headers, dataRows }.
// dataRows is an array of arrays (one per spreadsheet row, header excluded),
// with values already coerced to trimmed strings so the rest of the import
// logic doesn't need to care which format the file came in as.
function parseImportFile(fileBuffer, originalName = "") {
  const isExcel = /\.(xlsx|xls)$/i.test(originalName || "");

  if (isExcel) {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new AppError("Spreadsheet has no sheets", 400);

    const sheet = workbook.Sheets[sheetName];
    // header: 1 => array-of-arrays instead of objects, so column order and
    // blank cells are preserved exactly like the CSV path.
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });

    if (aoa.length < 2) throw new AppError("Spreadsheet has no data rows", 400);

    const headers = aoa[0].map((h) => String(h ?? "").trim());
    const dataRows = aoa
      .slice(1)
      .filter((r) => r.some((cell) => String(cell ?? "").trim() !== "")) // skip fully blank rows
      .map((r) => headers.map((_, idx) => String(r[idx] ?? "").trim()));

    return { headers, dataRows };
  }

  // CSV path
  const text = fileBuffer.toString("utf-8");
  const lines = text.split(/\r?\n/).filter((r) => r.trim());
  if (lines.length < 2) throw new AppError("CSV has no data rows", 400);

  const headers = parseCsvLine(lines[0]);
  const dataRows = lines.slice(1).map((line) => parseCsvLine(line));

  return { headers, dataRows };
}

export const bulkImportMenuItems = async (fileBuffer, originalName = "") => {
  const { headers, dataRows } = parseImportFile(fileBuffer, originalName);

  const requiredCols = ["name", "sku", "categoryName", "sellingPrice"];

  for (const col of requiredCols) {
    if (!headers.includes(col)) {
      throw new AppError(`File missing required column: ${col}`, 400);
    }
  }

  const results = {
    created: [],
    updated: [],
    skipped: [],
    summary: {
      totalRows: dataRows.length,
      created: 0,
      updated: 0,
      skipped: 0,
    },
  };

  const normalize = (value) =>
    String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  // Load all categories once
  const categories = await repo.findAllCategories();

  for (let i = 0; i < dataRows.length; i++) {
    const values = dataRows[i];

    const row = Object.fromEntries(
      headers.map((h, idx) => [h, values[idx] ?? ""])
    );

    const rowNum = i + 2;

    try {
      if (
        !row.name ||
        !row.sku ||
        !row.categoryName ||
        row.sellingPrice === "" ||
        row.sellingPrice === undefined
      ) {
        results.skipped.push({
            row: rowNum,
            sku: row.sku || "",
            name: row.name || "",
            reason: "Name, SKU, Category and Selling Price are required",
        });

        results.summary.skipped++;
        continue;
      }

      if (isNaN(Number(row.sellingPrice))) {
      results.skipped.push({
          row: rowNum,
          sku: row.sku,
          name: row.name,
          reason: `Invalid Selling Price (${row.sellingPrice})`,
      });

      results.summary.skipped++;
        continue;
      }

      let category = categories.find(
          c => normalize(c.name) === normalize(row.categoryName)
      );

      if (!category) {
          category = await repo.createCategory({
              name: row.categoryName.trim(),
              isEnabled: true,
              displayOrder: 0,
          });

          categories.push(category);
      }

      const existingItem = await repo.findMenuItemBySku(row.sku);

      const payload = {
        name: row.name.trim(),
        sku: row.sku.trim(),
        categoryId: category.id,
        sellingPrice: Number(row.sellingPrice),
        costPrice:
          row.costPrice !== "" && row.costPrice != null
            ? Number(row.costPrice)
            : null,
        gstPercent:
          row.gstPercent !== "" && row.gstPercent != null
            ? Number(row.gstPercent)
            : 0,
        foodType: ["VEG", "NON_VEG", "EGG"].includes(row.foodType)
          ? row.foodType
          : "VEG",
        description: row.description?.trim() || null,
      };

      if (existingItem) {
      await repo.updateMenuItem(existingItem.id, payload);

      results.updated.push({
          sku: payload.sku,
          name: payload.name,
          categoryName: category.name,
          sellingPrice: payload.sellingPrice,
          updatedFields: [
              "sellingPrice",
              "costPrice",
              "gstPercent",
              "description",
          ],
      });

      results.summary.updated++;
      } else {
      await repo.createMenuItem(payload);

      results.created.push({
          sku: payload.sku,
          name: payload.name,
          categoryName: category.name,
          sellingPrice: payload.sellingPrice,
      });

      results.summary.created++;
      }
    } catch (err) {
    results.skipped.push({
        row: rowNum,
        sku: row.sku || "",
        name: row.name || "",
        reason: err.message,
    });

    results.summary.skipped++;
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