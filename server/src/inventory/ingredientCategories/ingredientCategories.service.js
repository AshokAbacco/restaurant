// server/src/inventory/ingredientCategories/ingredientCategories.service.js
import prisma from "../../config/prisma.js";

export const listCategories = (outletId) =>
  prisma.ingredientCategory.findMany({ where: { outletId }, orderBy: { name: "asc" } });

export const getCategoryById = (id, outletId) =>
  prisma.ingredientCategory.findFirst({ where: { id, outletId } });

export const createCategory = ({ name, description }, outletId) =>
  prisma.ingredientCategory.create({ data: { name, description, outletId } });

export const updateCategory = async (id, { name, description, isEnabled }, outletId) => {
  const existing = await prisma.ingredientCategory.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Category not found");
    err.code = "P2025";
    throw err;
  }
  return prisma.ingredientCategory.update({
    where: { id },
    data: { name, description, isEnabled },
  });
};

export const deleteCategory = async (id, outletId) => {
  const existing = await prisma.ingredientCategory.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Category not found");
    err.code = "P2025";
    throw err;
  }
  return prisma.ingredientCategory.delete({ where: { id } });
};