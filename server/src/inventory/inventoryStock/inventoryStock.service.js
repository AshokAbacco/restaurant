// server\src\inventory\service\inventoryStock.service.js
// Read model over current on-hand stock. Quantities are only ever changed via
// StockMovement-producing actions (purchase entries, adjustments, wastage,
// recipe consumption) added in later phases — this module is read-only for now.
import prisma from "../../config/prisma.js";

export const listStock = () =>
  prisma.inventoryStock.findMany({
    include: {
      ingredient: {
        include: { category: true, consumptionUnit: true },
      },
    },
    orderBy: { ingredient: { name: "asc" } },
  });

export const getStockByIngredientId = (ingredientId) =>
  prisma.inventoryStock.findUnique({
    where: { ingredientId },
    include: {
      ingredient: {
        include: { category: true, consumptionUnit: true },
      },
    },
  });

export const getDashboardSummary = async () => {
  const stock = await prisma.inventoryStock.findMany({
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