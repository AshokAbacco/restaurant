// server\src\inventory\service\ingredientCategories.service.js
import prisma from "../../config/prisma.js";

export const listCategories = () =>
  prisma.ingredientCategory.findMany({ orderBy: { name: "asc" } });

export const getCategoryById = (id) =>
  prisma.ingredientCategory.findUnique({ where: { id } });

export const createCategory = ({ name, description }) =>
  prisma.ingredientCategory.create({ data: { name, description } });

export const updateCategory = (id, { name, description, isEnabled }) =>
  prisma.ingredientCategory.update({
    where: { id },
    data: { name, description, isEnabled },
  });

export const deleteCategory = (id) =>
  prisma.ingredientCategory.delete({ where: { id } });