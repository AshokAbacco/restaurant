// server/src/inventory/recipes/recipes.service.js
import prisma from "../../config/prisma.js";

const includeIngredient = {
  ingredient: {
    select: { id: true, name: true, itemCode: true, consumptionUnit: true },
  },
};

export const getRecipeForMenuItem = (menuItemId) =>
  prisma.recipeIngredient.findMany({
    where: { menuItemId },
    include: includeIngredient,
    orderBy: { createdAt: "asc" },
  });

// Replaces the entire recipe in one go — the "edit recipe" screen sends the
// full list every time rather than diffing, which is simpler for a UI to
// reason about (no add/remove tracking needed client-side).
export const setRecipe = (menuItemId, ingredients) =>
  prisma.$transaction(async (tx) => {
    await tx.recipeIngredient.deleteMany({ where: { menuItemId } });

    if (ingredients.length > 0) {
      await tx.recipeIngredient.createMany({
        data: ingredients.map((i) => ({
          menuItemId,
          ingredientId: i.ingredientId,
          quantity: i.quantity,
        })),
      });
    }

    return tx.recipeIngredient.findMany({
      where: { menuItemId },
      include: includeIngredient,
    });
  });

// Add or update a single ingredient line without touching the rest of the
// recipe — handy for a quick edit rather than resending the whole list.
export const upsertRecipeIngredient = (menuItemId, ingredientId, quantity) =>
  prisma.recipeIngredient.upsert({
    where: { menuItemId_ingredientId: { menuItemId, ingredientId } },
    create: { menuItemId, ingredientId, quantity },
    update: { quantity },
    include: includeIngredient,
  });

export const removeRecipeIngredient = (menuItemId, ingredientId) =>
  prisma.recipeIngredient.delete({
    where: { menuItemId_ingredientId: { menuItemId, ingredientId } },
  });