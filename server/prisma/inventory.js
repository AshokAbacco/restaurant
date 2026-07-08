// server\prisma\inventory.js
//
// Run with: node prisma/inventory.js
// (from the server/ folder — wherever your DATABASE_URL and JWT env vars load from)
//
// Safe to run more than once — every insert either upserts on a unique field
// or checks for an existing row first, so re-running won't create duplicates.
//
// Creates enough data to actually test the Inventory UI end to end:
//   - Units, Ingredient Categories, a Supplier
//   - 3 Ingredients (Rice, Chicken, Cooking Oil) with real conversion ratios
//   - A Menu Category + Menu Item ("Chicken Biryani") so the Recipes screen
//     has something to select
//   - A Recipe linking that menu item to its 3 ingredients (the worked
//     example from our conversation)
//   - One login account (OWNER) so you can actually get past auth

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  console.log("Seeding…");

  // ── Units ──
  const unitDefs = [
    { name: "Kg", abbreviation: "kg" },
    { name: "Gram", abbreviation: "g" },
    { name: "Liter", abbreviation: "L" },
    { name: "ml", abbreviation: "ml" },
    { name: "Piece", abbreviation: "pc" },
    { name: "Bottle", abbreviation: "btl" },
  ];
  const units = {};
  for (const u of unitDefs) {
    units[u.name] = await prisma.unit.upsert({
      where: { name: u.name },
      update: {},
      create: u,
    });
  }
  console.log(`✓ Units (${Object.keys(units).length})`);

  // ── Ingredient Categories ──
  const categoryDefs = [
    { name: "Grains", description: "Rice, wheat, and other staples" },
    { name: "Meat", description: "Chicken, mutton, seafood" },
    { name: "Oil", description: "Cooking oils" },
  ];
  const categories = {};
  for (const c of categoryDefs) {
    categories[c.name] = await prisma.ingredientCategory.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
  }
  console.log(`✓ Ingredient Categories (${Object.keys(categories).length})`);

  // ── Supplier ── (no unique field on name, so find-or-create manually)
  let supplier = await prisma.supplier.findFirst({ where: { name: "Fresh Farms Pvt Ltd" } });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        name: "Fresh Farms Pvt Ltd",
        contactPerson: "Ramesh Kumar",
        phone: "9876543210",
        email: "ramesh@freshfarms.in",
        gstNumber: "29ABCDE1234F1Z5",
        address: "Plot 12, APMC Yard, Bengaluru",
        paymentTerms: "Net 15 days",
      },
    });
  }
  console.log("✓ Supplier");

  // ── Ingredients ──
  // Rice and Chicken: purchased and consumed in the same unit (ratio 1).
  // Cooking Oil: bought as a 5L bottle, consumed in ml (ratio 5000) — the
  // conversion example from our earlier conversation.
  const ingredientDefs = [
    {
      name: "Rice",
      itemCode: "ING-RICE-001",
      categoryId: categories["Grains"].id,
      purchaseUnitId: units["Kg"].id,
      consumptionUnitId: units["Gram"].id,
      conversionRatio: 1000, // 1 Kg = 1000 g
      minimumStockLevel: 5000, // alert below 5kg worth
    },
    {
      name: "Chicken",
      itemCode: "ING-CHKN-001",
      categoryId: categories["Meat"].id,
      purchaseUnitId: units["Kg"].id,
      consumptionUnitId: units["Gram"].id,
      conversionRatio: 1000,
      minimumStockLevel: 3000,
    },
    {
      name: "Cooking Oil",
      itemCode: "ING-OIL-001",
      categoryId: categories["Oil"].id,
      purchaseUnitId: units["Bottle"].id,
      consumptionUnitId: units["ml"].id,
      conversionRatio: 5000, // 1 bottle (5L) = 5000 ml
      minimumStockLevel: 5000,
    },
  ];

  const ingredients = {};
  for (const i of ingredientDefs) {
    const ingredient = await prisma.ingredient.upsert({
      where: { itemCode: i.itemCode },
      update: {},
      create: i,
    });
    ingredients[i.name] = ingredient;

    // Every ingredient needs a stock row — matches what createIngredient()
    // does automatically in the real API, but upsert here doesn't trigger that.
    await prisma.inventoryStock.upsert({
      where: { ingredientId: ingredient.id },
      update: {},
      create: { ingredientId: ingredient.id, quantityOnHand: 0, averageCost: 0 },
    });
  }
  console.log(`✓ Ingredients (${Object.keys(ingredients).length})`);

  // ── A purchase entry so stock isn't sitting at zero ──
  // Brings in 10kg Rice, 8kg Chicken, 2 bottles of Oil, with expiry dates so
  // the Expiry Batches / Alerts screens have something to show too.
  const purchaseDefs = [
    { name: "Rice", quantityReceived: 10, purchasePrice: 60, daysUntilExpiry: 180 },
    { name: "Chicken", quantityReceived: 8, purchasePrice: 220, daysUntilExpiry: 3 }, // expiring soon on purpose
    { name: "Cooking Oil", quantityReceived: 2, purchasePrice: 700, daysUntilExpiry: 365 },
  ];

  for (const p of purchaseDefs) {
    const ingredient = ingredients[p.name];
    const existingEntry = await prisma.purchaseEntry.findFirst({
      where: { ingredientId: ingredient.id, invoiceNumber: "SEED-INV-001" },
    });
    if (existingEntry) continue; // already seeded this one

    const conversionRatio = Number(ingredient.conversionRatio);
    const consumptionQty = p.quantityReceived * conversionRatio;
    const totalAmount = p.quantityReceived * p.purchasePrice;
    const costPerConsumptionUnit = totalAmount / consumptionQty;

    await prisma.purchaseEntry.create({
      data: {
        supplierId: supplier.id,
        ingredientId: ingredient.id,
        invoiceNumber: "SEED-INV-001",
        batchNumber: `BATCH-${p.name.toUpperCase()}-001`,
        expiryDate: new Date(Date.now() + p.daysUntilExpiry * 24 * 60 * 60 * 1000),
        quantityReceived: p.quantityReceived,
        purchasePrice: p.purchasePrice,
        totalAmount,
      },
    });

    const stock = await prisma.inventoryStock.findUnique({ where: { ingredientId: ingredient.id } });
    const previousQty = Number(stock.quantityOnHand);
    const newQty = previousQty + consumptionQty;

    await prisma.inventoryStock.update({
      where: { ingredientId: ingredient.id },
      data: { quantityOnHand: newQty, averageCost: costPerConsumptionUnit },
    });

    await prisma.stockMovement.create({
      data: {
        ingredientId: ingredient.id,
        type: "PURCHASE",
        quantity: consumptionQty,
        previousStock: previousQty,
        newStock: newQty,
        reason: "Seed data — initial stock",
        store: "Main Store",
      },
    });

    await prisma.expiryBatch.create({
      data: {
        ingredientId: ingredient.id,
        batchNumber: `BATCH-${p.name.toUpperCase()}-001`,
        expiryDate: new Date(Date.now() + p.daysUntilExpiry * 24 * 60 * 60 * 1000),
        quantityRemaining: consumptionQty,
      },
    });
  }
  console.log("✓ Purchase entries + starting stock (Chicken expires in 3 days, on purpose)");

  // ── Menu Category + Menu Item ── (so the Recipes screen has something to pick)
  let menuCategory = await prisma.category.findFirst({ where: { name: "Main Course" } });
  if (!menuCategory) {
    menuCategory = await prisma.category.create({
      data: { name: "Main Course", description: "Rice and curry dishes" },
    });
  }

  const menuItem = await prisma.menuItem.upsert({
    where: { sku: "BIR-001" },
    update: {},
    create: {
      name: "Chicken Biryani",
      sku: "BIR-001",
      categoryId: menuCategory.id,
      sellingPrice: 250,
      costPrice: 120,
      gstPercent: 5,
      foodType: "NON_VEG",
      description: "Fragrant basmati rice with spiced chicken",
      prepTimeMinutes: 20,
    },
  });
  console.log("✓ Menu category + Chicken Biryani menu item");

  // ── Recipe: Chicken Biryani = 200g Rice + 150g Chicken + 20ml Oil ──
  const recipeDefs = [
    { ingredient: "Rice", quantity: 200 },
    { ingredient: "Chicken", quantity: 150 },
    { ingredient: "Cooking Oil", quantity: 20 },
  ];
  for (const r of recipeDefs) {
    await prisma.recipeIngredient.upsert({
      where: {
        menuItemId_ingredientId: {
          menuItemId: menuItem.id,
          ingredientId: ingredients[r.ingredient].id,
        },
      },
      update: { quantity: r.quantity },
      create: {
        menuItemId: menuItem.id,
        ingredientId: ingredients[r.ingredient].id,
        quantity: r.quantity,
      },
    });
  }
  console.log("✓ Recipe for Chicken Biryani (200g rice, 150g chicken, 20ml oil)");

  // ── Login account (OWNER) ──
  let employee = await prisma.employee.findUnique({ where: { employeeCode: "EMP-0001" } });
  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        employeeCode: "EMP-0001",
        fullName: "Restaurant Owner",
        department: "Management",
        designation: "Owner",
        joiningDate: new Date(),
      },
    });
  }

  const existingAccount = await prisma.userAccount.findUnique({
    where: { employeeId: employee.id },
  });
  if (!existingAccount) {
    const passwordHash = await bcrypt.hash("Password123!", SALT_ROUNDS);
    await prisma.userAccount.create({
      data: {
        employeeId: employee.id,
        username: "owner",
        email: "owner@restaurant.test",
        passwordHash,
        role: "OWNER",
      },
    });
    console.log("✓ Login account created — username: owner / password: Password123!");
  } else {
    console.log("✓ Login account already exists (username: owner)");
  }

  console.log("\nSeeding complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });