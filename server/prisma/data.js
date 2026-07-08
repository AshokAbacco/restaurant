// server\prisma\data.js
//
// Run with: node prisma/seed.js
// (or add "seed": "node prisma/seed.js" under package.json's "scripts" and
//  run: npm run seed)
//
// Populates: Categories, Sub Categories, Kitchen Sections, Add-ons,
// Menu Items (with prep/serve time), and one Combo Meal — enough to
// exercise every Menu Management screen with realistic data.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Menu Management data...");

  // ---------- Kitchen Sections ----------
  const kitchenSectionNames = ["Main Kitchen", "Bakery", "Bar", "Juice Counter", "Dessert Counter"];
  const kitchenSections = {};
  for (const name of kitchenSectionNames) {
    const section = await prisma.kitchenSection.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    kitchenSections[name] = section;
  }
  console.log(`  Kitchen Sections: ${kitchenSectionNames.length}`);

  // ---------- Categories + Sub Categories ----------
  const categoryData = [
    { name: "Starters", description: "Appetizers and small plates", displayOrder: 1, subs: [] },
    { name: "Biryani", description: "Fragrant rice dishes", displayOrder: 2, subs: [] },
    { name: "Chinese", description: "Indo-Chinese favorites", displayOrder: 3, subs: ["Noodles", "Fried Rice", "Manchurian"] },
    { name: "Pizza", description: "Wood-fired pizzas", displayOrder: 4, subs: ["Veg Pizza", "Chicken Pizza"] },
    { name: "Burger", description: "Burgers and sides", displayOrder: 5, subs: [] },
    { name: "Beverages", description: "Hot and cold drinks", displayOrder: 6, subs: [] },
    { name: "Desserts", description: "Sweet endings", displayOrder: 7, subs: [] },
  ];

  const categories = {};
  const subCategories = {};

  for (const cat of categoryData) {
    let category = await prisma.category.findFirst({ where: { name: cat.name } });
    if (!category) {
      category = await prisma.category.create({
        data: { name: cat.name, description: cat.description, displayOrder: cat.displayOrder },
      });
    }
    categories[cat.name] = category;

    for (const subName of cat.subs) {
      let sub = await prisma.subCategory.findFirst({ where: { name: subName, categoryId: category.id } });
      if (!sub) {
        sub = await prisma.subCategory.create({ data: { name: subName, categoryId: category.id } });
      }
      subCategories[subName] = sub;
    }
  }
  console.log(`  Categories: ${categoryData.length}`);

  // ---------- Add-ons ----------
  const addOnData = [
    { name: "Extra Cheese", price: 40 },
    { name: "Extra Chicken", price: 70 },
    { name: "Extra Sauce", price: 20 },
    { name: "Boiled Egg", price: 25 },
  ];
  const addOns = {};
  for (const a of addOnData) {
    let addOn = await prisma.addOn.findFirst({ where: { name: a.name } });
    if (!addOn) {
      addOn = await prisma.addOn.create({ data: a });
    }
    addOns[a.name] = addOn;
  }
  console.log(`  Add-ons: ${addOnData.length}`);

  // ---------- Menu Items ----------
  // prepTimeMinutes = kitchen cook time; targetServeMinutes = total order-to-table target
  const itemData = [
    {
      name: "Chicken Biryani", sku: "BIR-001", categoryName: "Biryani",
      foodType: "NON_VEG", sellingPrice: 320, costPrice: 150, gstPercent: 5,
      kitchenSection: "Main Kitchen", prepTimeMinutes: 20, targetServeMinutes: 25,
      description: "Fragrant basmati rice layered with spiced chicken",
    },
    {
      name: "Veg Manchurian", sku: "CHI-001", categoryName: "Chinese", subCategoryName: "Manchurian",
      foodType: "VEG", sellingPrice: 220, costPrice: 90, gstPercent: 5,
      kitchenSection: "Main Kitchen", prepTimeMinutes: 15, targetServeMinutes: 20,
      description: "Crispy vegetable balls tossed in a tangy sauce",
    },
    {
      name: "Chicken Fried Rice", sku: "CHI-002", categoryName: "Chinese", subCategoryName: "Fried Rice",
      foodType: "NON_VEG", sellingPrice: 240, costPrice: 100, gstPercent: 5,
      kitchenSection: "Main Kitchen", prepTimeMinutes: 15, targetServeMinutes: 20,
      description: "Wok-tossed rice with chicken and vegetables",
    },
    {
      name: "Margherita Pizza", sku: "PIZ-001", categoryName: "Pizza", subCategoryName: "Veg Pizza",
      foodType: "VEG", sellingPrice: 280, costPrice: 110, gstPercent: 5,
      kitchenSection: "Main Kitchen", prepTimeMinutes: 18, targetServeMinutes: 25,
      description: "Classic tomato, mozzarella, and basil",
    },
    {
      name: "Chicken Burger", sku: "BUR-001", categoryName: "Burger",
      foodType: "NON_VEG", sellingPrice: 180, costPrice: 80, gstPercent: 5,
      kitchenSection: "Main Kitchen", prepTimeMinutes: 10, targetServeMinutes: 15,
      description: "Grilled chicken patty with lettuce and mayo",
    },
    {
      name: "French Fries", sku: "STA-001", categoryName: "Starters",
      foodType: "VEG", sellingPrice: 120, costPrice: 40, gstPercent: 5,
      kitchenSection: "Main Kitchen", prepTimeMinutes: 8, targetServeMinutes: 12,
      description: "Crispy golden fries",
    },
    {
      name: "Cold Coffee", sku: "BEV-001", categoryName: "Beverages",
      foodType: "VEG", sellingPrice: 130, costPrice: 45, gstPercent: 12,
      kitchenSection: "Juice Counter", prepTimeMinutes: 5, targetServeMinutes: 8,
      description: "Chilled coffee blended with ice cream",
    },
    {
      name: "Coke", sku: "BEV-002", categoryName: "Beverages",
      foodType: "VEG", sellingPrice: 60, costPrice: 25, gstPercent: 12,
      kitchenSection: "Juice Counter", prepTimeMinutes: 1, targetServeMinutes: 3,
      description: "Chilled soft drink",
    },
    {
      name: "Chocolate Brownie", sku: "DES-001", categoryName: "Desserts",
      foodType: "VEG", sellingPrice: 150, costPrice: 55, gstPercent: 5,
      kitchenSection: "Dessert Counter", prepTimeMinutes: 5, targetServeMinutes: 8,
      description: "Warm brownie with a molten center",
    },
  ];

  const items = {};
  for (const it of itemData) {
    let item = await prisma.menuItem.findFirst({ where: { sku: it.sku } });
    if (!item) {
      item = await prisma.menuItem.create({
        data: {
          name: it.name,
          sku: it.sku,
          categoryId: categories[it.categoryName].id,
          subCategoryId: it.subCategoryName ? subCategories[it.subCategoryName].id : null,
          foodType: it.foodType,
          kitchenSectionId: kitchenSections[it.kitchenSection].id,
          sellingPrice: it.sellingPrice,
          costPrice: it.costPrice,
          gstPercent: it.gstPercent,
          prepTimeMinutes: it.prepTimeMinutes,
          targetServeMinutes: it.targetServeMinutes,
          description: it.description,
          status: "ACTIVE",
          isAvailable: true,
        },
      });
    }
    items[it.name] = item;
  }
  console.log(`  Menu Items: ${itemData.length}`);

  // ---------- Variant example: Cold Coffee sizes ----------
  const coldCoffee = items["Cold Coffee"];
  const variantData = [
    { name: "Small", price: 100 },
    { name: "Medium", price: 130 },
    { name: "Large", price: 160 },
  ];
  for (const v of variantData) {
    const existing = await prisma.menuVariant.findFirst({ where: { menuItemId: coldCoffee.id, name: v.name } });
    if (!existing) {
      await prisma.menuVariant.create({ data: { menuItemId: coldCoffee.id, ...v } });
    }
  }
  console.log(`  Variants: ${variantData.length} (on Cold Coffee)`);

  // ---------- Combo Meal ----------
  let combo = await prisma.comboMeal.findFirst({ where: { name: "Combo 1" } });
  if (!combo) {
    combo = await prisma.comboMeal.create({
      data: { name: "Combo 1", price: 299, description: "Burger + Fries + Coke" },
    });
    await prisma.comboItem.create({ data: { comboMealId: combo.id, menuItemId: items["Chicken Burger"].id, quantity: 1 } });
    await prisma.comboItem.create({ data: { comboMealId: combo.id, menuItemId: items["French Fries"].id, quantity: 1 } });
    await prisma.comboItem.create({ data: { comboMealId: combo.id, menuItemId: items["Coke"].id, quantity: 1 } });
  }
  console.log("  Combo Meals: 1 (Combo 1)");

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });