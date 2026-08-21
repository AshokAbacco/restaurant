// server/src/inventory/inventoryStock/inventoryStock.service.js
// Read model over current on-hand stock. Quantities are only ever changed via
// StockMovement-producing actions (purchase entries, adjustments, wastage,
// recipe consumption) added in later phases — this module is read-only for now.
import prisma from "../../config/prisma.js";

export const listStock = (outletId) =>
  prisma.inventoryStock.findMany({
    where: { outletId },
    include: {
      ingredient: {
        include: { category: true, consumptionUnit: true },
      },
    },
    orderBy: { ingredient: { name: "asc" } },
  });

// ingredientId alone is still the unique lookup key on InventoryStock (1:1
// with Ingredient) — outletId is added as a defense-in-depth filter, not
// because the lookup would otherwise be ambiguous, same reasoning as the
// FEFO helper's outletId param.
export const getStockByIngredientId = (ingredientId, outletId) =>
  prisma.inventoryStock.findFirst({
    where: { ingredientId, outletId },
    include: {
      ingredient: {
        include: { category: true, consumptionUnit: true },
      },
    },
  });

export const getDashboardSummary = async (outletId) => {
  const stock = await prisma.inventoryStock.findMany({
    where: { outletId },
    include: { ingredient: true },
  });

  const totalInventoryValue = stock.reduce(
    (sum, s) => sum + Number(s.quantityOnHand) * Number(s.averageCost),
    0
  );

  const lowStockCount = stock.filter(
    (s) =>
      Number(s.quantityOnHand) > 0 &&
      Number(s.quantityOnHand) <= Number(s.ingredient.minimumStockLevel)
  ).length;

  const outOfStockCount = stock.filter((s) => Number(s.quantityOnHand) <= 0).length;

  return {
    totalInventoryValue,
    totalIngredients: stock.length,
    lowStockCount,
    outOfStockCount,
  };
};