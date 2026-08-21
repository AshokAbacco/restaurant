// server/src/inventory/ingredients/ingredients.service.js
import prisma from "../../config/prisma.js";

const includeRelations = {
  category: true,
  purchaseUnit: true,
  consumptionUnit: true,
  inventoryStock: true,
};

export const listIngredients = async ({ search, categoryId, lowStock, outOfStock }, outletId) => {
  const where = { outletId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { itemCode: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
    ];
  }

  if (categoryId) where.categoryId = categoryId;

  const ingredients = await prisma.ingredient.findMany({
    where,
    include: includeRelations,
    orderBy: { name: "asc" },
  });

  // Low/out-of-stock depend on comparing live stock to the ingredient's own
  // threshold, so filter in memory rather than trying to express it in Prisma `where`.
  if (lowStock) {
    return ingredients.filter((i) => {
      const qty = Number(i.inventoryStock?.quantityOnHand ?? 0);
      return qty > 0 && qty <= Number(i.minimumStockLevel);
    });
  }

  if (outOfStock) {
    return ingredients.filter((i) => Number(i.inventoryStock?.quantityOnHand ?? 0) <= 0);
  }

  return ingredients;
};

export const getIngredientById = (id, outletId) =>
  prisma.ingredient.findFirst({ where: { id, outletId }, include: includeRelations });

export const createIngredient = (data, outletId) =>
  prisma.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.create({
      data: {
        outletId,
        name: data.name,
        itemCode: data.itemCode,
        barcode: data.barcode,
        description: data.description,
        categoryId: data.categoryId,
        purchaseUnitId: data.purchaseUnitId,
        consumptionUnitId: data.consumptionUnitId,
        conversionRatio: data.conversionRatio ?? 1,
        minimumStockLevel: data.minimumStockLevel ?? 0,
      },
    });

    // Every ingredient needs a stock row to exist, starting at zero on-hand.
    await tx.inventoryStock.create({
      data: { outletId, ingredientId: ingredient.id, quantityOnHand: 0, averageCost: 0 },
    });

    return tx.ingredient.findUnique({
      where: { id: ingredient.id },
      include: includeRelations,
    });
  });

export const updateIngredient = async (id, data, outletId) => {
  const existing = await prisma.ingredient.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Ingredient not found");
    err.code = "P2025";
    throw err;
  }
  return prisma.ingredient.update({
    where: { id },
    data: {
      name: data.name,
      itemCode: data.itemCode,
      barcode: data.barcode,
      description: data.description,
      categoryId: data.categoryId,
      purchaseUnitId: data.purchaseUnitId,
      consumptionUnitId: data.consumptionUnitId,
      conversionRatio: data.conversionRatio,
      minimumStockLevel: data.minimumStockLevel,
      isEnabled: data.isEnabled,
    },
    include: includeRelations,
  });
};

export const deleteIngredient = async (id, outletId) => {
  const existing = await prisma.ingredient.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Ingredient not found");
    err.code = "P2025";
    throw err;
  }
  return prisma.ingredient.delete({ where: { id } });
};