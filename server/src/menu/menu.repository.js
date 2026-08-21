// server/src/menu/menu.repository.js
import prisma from "../config/prisma.js";

// ---------- Category ----------

export const findAllCategories = (outletId) =>
  prisma.category.findMany({
    where: { outletId },
    orderBy: { displayOrder: "asc" },
    include: { subCategories: true },
  });

export const findCategoryById = (id, outletId) =>
  prisma.category.findFirst({
    where: { id, outletId },
    include: { subCategories: true },
  });

export const createCategory = (data, outletId) =>
    prisma.category.create({
        data: { ...data, outletId },
    });

export const updateCategory = (id, data) =>
  prisma.category.update({ where: { id }, data });

export const deleteCategory = (id) =>
  prisma.category.delete({ where: { id } });

// ---------- Menu Item ----------

export const findAllMenuItems = (filters = {}, outletId) => {
  const where = { outletId };

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.subCategoryId) where.subCategoryId = filters.subCategoryId;
  if (filters.foodType) where.foodType = filters.foodType;
  if (filters.isAvailable !== undefined) {
    where.isAvailable = filters.isAvailable === true || filters.isAvailable === "true";
  }
  if (filters.kitchenSectionId) where.kitchenSectionId = filters.kitchenSectionId;
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { sku: { contains: filters.search, mode: "insensitive" } },
      { barcode: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.menuItem.findMany({
    where,
    include: { category: true, subCategory: true, kitchenSection: true },
    orderBy: { createdAt: "desc" },
  });
};

export const findMenuItemById = (id, outletId) =>
  prisma.menuItem.findFirst({
    where: { id, outletId },
    include: { category: true, subCategory: true, kitchenSection: true },
  });

// sku is @@unique([outletId, sku]) now, not globally unique — findUnique
// with just { sku } no longer matches Prisma's generated unique input
// shape, and would be wrong anyway since two outlets can share a SKU.
export const findMenuItemBySku = (sku, outletId) =>
  prisma.menuItem.findFirst({ where: { sku, outletId } });

export const createMenuItem = (data, outletId) =>
  prisma.menuItem.create({ data: { ...data, outletId } });

export const updateMenuItem = (id, data) => {
  return prisma.menuItem.update({
    where: { id },
    data,
  });
};

export const softDeleteMenuItem = (id) =>
  prisma.menuItem.update({ where: { id }, data: { status: "DELETED" } });

export const hardDeleteMenuItem = (id) =>
  prisma.menuItem.delete({ where: { id } });

// ---------- SubCategory ----------

export const findAllSubCategories = (categoryId, outletId) =>
  prisma.subCategory.findMany({
    where: { outletId, ...(categoryId ? { categoryId } : {}) },
    include: { category: true },
    orderBy: { name: "asc" },
  });

export const findSubCategoryById = (id, outletId) =>
  prisma.subCategory.findFirst({
    where: { id, outletId },
    include: { category: true },
  });

export const createSubCategory = (data, outletId) =>
  prisma.subCategory.create({ data: { ...data, outletId } });

export const updateSubCategory = (id, data) =>
  prisma.subCategory.update({ where: { id }, data });

export const deleteSubCategory = (id) =>
  prisma.subCategory.delete({ where: { id } });

// ---------- Kitchen Section ----------

export const findAllKitchenSections = (outletId) =>
  prisma.kitchenSection.findMany({ where: { outletId }, orderBy: { name: "asc" } });

export const findKitchenSectionById = (id, outletId) =>
  prisma.kitchenSection.findFirst({ where: { id, outletId } });

// name is @@unique([outletId, name]) now — see findMenuItemBySku above for
// why this can't be findUnique({ where: { name } }) any more.
export const findKitchenSectionByName = (name, outletId) =>
  prisma.kitchenSection.findFirst({ where: { name, outletId } });

export const createKitchenSection = (data, outletId) =>
  prisma.kitchenSection.create({ data: { ...data, outletId } });

export const updateKitchenSection = (id, data) =>
  prisma.kitchenSection.update({ where: { id }, data });

export const deleteKitchenSection = (id) =>
  prisma.kitchenSection.delete({ where: { id } });

// ---------- Menu Variants ----------

export const findVariantsByMenuItem = (menuItemId, outletId) =>
  prisma.menuVariant.findMany({ where: { menuItemId, outletId } });

export const findVariantById = (id, outletId) =>
  prisma.menuVariant.findFirst({ where: { id, outletId } });

export const createVariant = (data, outletId) =>
  prisma.menuVariant.create({ data: { ...data, outletId } });

export const updateVariant = (id, data) =>
  prisma.menuVariant.update({ where: { id }, data });

export const deleteVariant = (id) => prisma.menuVariant.delete({ where: { id } });

// ---------- Add-ons ----------
// NOTE: this duplicates server/src/pos/add-ons/addOns.service.js almost
// exactly — same AddOn model, same CRUD shape, reachable at a different
// URL (/api/addons here vs /api/pos/add-ons there). Both are now correctly
// outlet-scoped, but this is worth consolidating onto one implementation;
// see the note left in menu.service.js's Add-ons section.

export const findAllAddOns = (outletId) =>
  prisma.addOn.findMany({ where: { outletId }, orderBy: { name: "asc" } });

export const findAddOnById = (id, outletId) =>
  prisma.addOn.findFirst({ where: { id, outletId } });

export const createAddOn = (data, outletId) =>
  prisma.addOn.create({ data: { ...data, outletId } });

export const updateAddOn = (id, data) => prisma.addOn.update({ where: { id }, data });

export const deleteAddOn = (id) => prisma.addOn.delete({ where: { id } });

export const linkAddOnToItem = (menuItemId, addOnId) =>
  prisma.menuItemAddOn.create({ data: { menuItemId, addOnId } });

export const unlinkAddOnFromItem = (menuItemId, addOnId) =>
  prisma.menuItemAddOn.delete({
    where: { menuItemId_addOnId: { menuItemId, addOnId } },
  });

export const findAddOnsForItem = (menuItemId) =>
  prisma.menuItemAddOn.findMany({
    where: { menuItemId },
    include: { addOn: true },
  });

// ---------- Combo Meals ----------

export const findAllCombos = (outletId) =>
  prisma.comboMeal.findMany({
    where: { outletId },
    include: { items: { include: { menuItem: true } } },
    orderBy: { createdAt: "desc" },
  });

export const findComboById = (id, outletId) =>
  prisma.comboMeal.findFirst({
    where: { id, outletId },
    include: { items: { include: { menuItem: true } } },
  });

export const createCombo = (data, outletId) =>
  prisma.comboMeal.create({ data: { ...data, outletId } });

export const updateCombo = (id, data) =>
  prisma.comboMeal.update({ where: { id }, data });

export const deleteCombo = (id) => prisma.comboMeal.delete({ where: { id } });

export const addComboItem = (comboMealId, menuItemId, quantity = 1) =>
  prisma.comboItem.create({ data: { comboMealId, menuItemId, quantity } });

export const removeComboItem = (id) => prisma.comboItem.delete({ where: { id } });

// ---------- Price History ----------

export const logPriceChange = (menuItemId, oldPrice, newPrice, changedBy, outletId) =>
  prisma.priceHistory.create({
    data: { outletId, menuItemId, oldPrice, newPrice, changedBy },
  });

export const findPriceHistoryForItem = (menuItemId, outletId) =>
  prisma.priceHistory.findMany({
    where: { menuItemId, outletId },
    orderBy: { changedAt: "desc" },
  });