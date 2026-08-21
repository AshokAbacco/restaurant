import prisma from "../../config/prisma.js";

export const getAllCategories = (outletId) =>
  prisma.expenseCategory.findMany({
    where: { outletId },
    orderBy: { name: "asc" },
  });

export const getCategoryById = (id, outletId) =>
  prisma.expenseCategory.findFirst({ where: { id, outletId } });

export const createCategory = (data, outletId) =>
  prisma.expenseCategory.create({ data: { ...data, outletId } });

export const updateCategory = async (id, data, outletId) => {
  const existing = await prisma.expenseCategory.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Category not found");
    err.code = "P2025";
    throw err;
  }
  return prisma.expenseCategory.update({ where: { id }, data });
};

// Categories are disabled rather than hard-deleted when expenses already
// reference them, so historical expenses never lose their category.
export const deleteCategory = async (id, outletId) => {
  const existing = await prisma.expenseCategory.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Category not found");
    err.code = "P2025";
    throw err;
  }
  // Scoped by outletId too, even though categoryId already narrows this —
  // consistent with every other query in this codebase.
  const inUse = await prisma.expense.count({ where: { categoryId: id, outletId } });
  if (inUse > 0) {
    return prisma.expenseCategory.update({
      where: { id },
      data: { isEnabled: false },
    });
  }
  return prisma.expenseCategory.delete({ where: { id } });
};