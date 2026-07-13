// server/src/menu/menu.repository.js
import prisma from "../config/prisma.js";

// ---------- Category ----------

export const findAllCategories = () =>
  prisma.category.findMany({
    orderBy: { displayOrder: "asc" },
    include: { subCategories: true },
  });

export const findCategoryById = (id) =>
  prisma.category.findUnique({
    where: { id },
    include: { subCategories: true },
  });

export const createCategory = (data) =>
    prisma.category.create({
        data,
    });

export const updateCategory = (id, data) =>
  prisma.category.update({ where: { id }, data });

export const deleteCategory = (id) =>
  prisma.category.delete({ where: { id } });

// ---------- Menu Item ----------

export const findAllMenuItems = (filters = {}) => {
  const where = {};

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

export const findMenuItemById = (id) =>
  prisma.menuItem.findUnique({
    where: { id },
    include: { category: true, subCategory: true, kitchenSection: true },
  });

export const findMenuItemBySku = (sku) =>
  prisma.menuItem.findUnique({ where: { sku } });

export const createMenuItem = (data) => prisma.menuItem.create({ data });

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

export const findAllSubCategories = (categoryId) =>
  prisma.subCategory.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: { category: true },
    orderBy: { name: "asc" },
  });

export const findSubCategoryById = (id) =>
  prisma.subCategory.findUnique({ where: { id }, include: { category: true } });

export const createSubCategory = (data) => prisma.subCategory.create({ data });

export const updateSubCategory = (id, data) =>
  prisma.subCategory.update({ where: { id }, data });

export const deleteSubCategory = (id) =>
  prisma.subCategory.delete({ where: { id } });

// ---------- Kitchen Section ----------

export const findAllKitchenSections = () =>
  prisma.kitchenSection.findMany({ orderBy: { name: "asc" } });

export const findKitchenSectionById = (id) =>
  prisma.kitchenSection.findUnique({ where: { id } });

export const findKitchenSectionByName = (name) =>
  prisma.kitchenSection.findUnique({ where: { name } });

export const createKitchenSection = (data) =>
  prisma.kitchenSection.create({ data });

export const updateKitchenSection = (id, data) =>
  prisma.kitchenSection.update({ where: { id }, data });

export const deleteKitchenSection = (id) =>
  prisma.kitchenSection.delete({ where: { id } });

// ---------- Menu Variants ----------

export const findVariantsByMenuItem = (menuItemId) =>
  prisma.menuVariant.findMany({ where: { menuItemId } });

export const findVariantById = (id) => prisma.menuVariant.findUnique({ where: { id } });

export const createVariant = (data) => prisma.menuVariant.create({ data });

export const updateVariant = (id, data) =>
  prisma.menuVariant.update({ where: { id }, data });

export const deleteVariant = (id) => prisma.menuVariant.delete({ where: { id } });

// ---------- Add-ons ----------

export const findAllAddOns = () =>
  prisma.addOn.findMany({ orderBy: { name: "asc" } });

export const findAddOnById = (id) => prisma.addOn.findUnique({ where: { id } });

export const createAddOn = (data) => prisma.addOn.create({ data });

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

export const findAllCombos = () =>
  prisma.comboMeal.findMany({
    include: { items: { include: { menuItem: true } } },
    orderBy: { createdAt: "desc" },
  });

export const findComboById = (id) =>
  prisma.comboMeal.findUnique({
    where: { id },
    include: { items: { include: { menuItem: true } } },
  });

export const createCombo = (data) => prisma.comboMeal.create({ data });

export const updateCombo = (id, data) =>
  prisma.comboMeal.update({ where: { id }, data });

export const deleteCombo = (id) => prisma.comboMeal.delete({ where: { id } });

export const addComboItem = (comboMealId, menuItemId, quantity = 1) =>
  prisma.comboItem.create({ data: { comboMealId, menuItemId, quantity } });

export const removeComboItem = (id) => prisma.comboItem.delete({ where: { id } });

// ---------- Price History ----------

export const logPriceChange = (menuItemId, oldPrice, newPrice, changedBy) =>
  prisma.priceHistory.create({
    data: { menuItemId, oldPrice, newPrice, changedBy },
  });

export const findPriceHistoryForItem = (menuItemId) =>
  prisma.priceHistory.findMany({
    where: { menuItemId },
    orderBy: { changedAt: "desc" },
  });