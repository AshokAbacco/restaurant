// server/src/inventory/recipes/recipes.service.js
import prisma from "../../config/prisma.js";

const includeIngredient = {
  ingredient: {
    select: { id: true, name: true, itemCode: true, consumptionUnit: true },
  },
};

// RecipeIngredient has no outletId of its own (a join table between
// MenuItem and Ingredient — scope comes from its parents, same pattern as
// OrderItem/KitchenNote elsewhere). FIX: none of the functions below
// previously checked menuItemId belonged to this outlet at all, let alone
// that the ingredientId(s) being linked did too — a stray menuItemId from
// another outlet could have had its ENTIRE recipe wiped and replaced via
// setRecipe, and any function could link an ingredient that belongs to a
// different outlet entirely. Every mutation now verifies both ends first.

async function assertMenuItemInOutlet(menuItemId, outletId) {
  const menuItem = await prisma.menuItem.findFirst({
    where: { id: menuItemId, outletId },
  });
  if (!menuItem) {
    const err = new Error("Menu item not found");
    err.code = "P2025";
    throw err;
  }
}

export const getRecipeForMenuItem = async (menuItemId, outletId) => {
  await assertMenuItemInOutlet(menuItemId, outletId);
  return prisma.recipeIngredient.findMany({
    where: { menuItemId },
    include: includeIngredient,
    orderBy: { createdAt: "asc" },
  });
};

// Replaces the entire recipe in one go — the "edit recipe" screen sends the
// full list every time rather than diffing, which is simpler for a UI to
// reason about (no add/remove tracking needed client-side).
export const setRecipe = (menuItemId, ingredients, outletId) =>
  prisma.$transaction(async (tx) => {
    const menuItem = await tx.menuItem.findFirst({ where: { id: menuItemId, outletId } });
    if (!menuItem) {
      const err = new Error("Menu item not found");
      err.code = "P2025";
      throw err;
    }

    if (ingredients.length > 0) {
      const ingredientIds = ingredients.map((i) => i.ingredientId);
      const owned = await tx.ingredient.findMany({
        where: { id: { in: ingredientIds }, outletId },
        select: { id: true },
      });
      if (owned.length !== new Set(ingredientIds).size) {
        const err = new Error("One or more ingredients were not found in this outlet");
        err.code = "P2025";
        throw err;
      }
    }

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
export const upsertRecipeIngredient = async (menuItemId, ingredientId, quantity, outletId) => {
  await assertMenuItemInOutlet(menuItemId, outletId);

  const ingredient = await prisma.ingredient.findFirst({
    where: { id: ingredientId, outletId },
  });
  if (!ingredient) {
    const err = new Error("Ingredient not found");
    err.code = "P2025";
    throw err;
  }

  return prisma.recipeIngredient.upsert({
    where: { menuItemId_ingredientId: { menuItemId, ingredientId } },
    create: { menuItemId, ingredientId, quantity },
    update: { quantity },
    include: includeIngredient,
  });
};

export const removeRecipeIngredient = async (menuItemId, ingredientId, outletId) => {
  await assertMenuItemInOutlet(menuItemId, outletId);
  return prisma.recipeIngredient.delete({
    where: { menuItemId_ingredientId: { menuItemId, ingredientId } },
  });
};