// ==============================================
// prisma/restaurant.seed.js
//
// Seeds restaurant-operations data (menu, categories, sub-categories,
// kitchen sections, add-ons, combo meals, floors/tables, table
// reservations, and sample orders) for the outlet owned by
// owner@gmail.com ("Mehfil Arabic Restaurant" -> "Main Branch").
//
// Assumes prisma/seed.js has already been run, since that's what
// creates the Organization / Outlet / Employee / UserAccount rows
// this script attaches to.
//
// Run with: node prisma/restaurant.seed.js
// ==============================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OWNER_EMAIL = "owner@gmail.com";
const OUTLET_NAME = "Main Branch";

// ─────────────────────────────────────────────
// Generic "find by outletId+name, else create" helper for models that
// don't carry a DB-level unique constraint on name (Category,
// SubCategory, AddOn, ComboMeal, Floor, RestaurantTable).
// ─────────────────────────────────────────────
async function findOrCreate(model, where, data) {
  const existing = await prisma[model].findFirst({ where });
  if (existing) return existing;
  return prisma[model].create({ data });
}

async function main() {
  // ── Resolve the org / outlet / owner employee this seed attaches to ──
  const organization = await prisma.organization.findUnique({
    where: { ownerEmail: OWNER_EMAIL },
  });
  if (!organization) {
    throw new Error(
      `No organization found for ${OWNER_EMAIL}. Run prisma/seed.js first.`,
    );
  }

  const outlet = await prisma.outlet.findFirst({
    where: { organizationId: organization.id, name: OUTLET_NAME },
  });
  if (!outlet) {
    throw new Error(`Outlet "${OUTLET_NAME}" not found for ${organization.name}.`);
  }

  const ownerAccount = await prisma.userAccount.findUnique({
    where: { email: OWNER_EMAIL },
    include: { employee: true },
  });
  const ownerEmployeeId = ownerAccount?.employee?.id ?? null;

  console.log(`Seeding restaurant data into "${organization.name}" / "${outlet.name}"...`);

  // ─────────────────────────────────────────────
  // CATEGORIES + SUB-CATEGORIES
  // ─────────────────────────────────────────────
  const categoryDefs = [
    { name: "Starters", subCategories: ["Soups", "Salads"] },
    { name: "Main Course", subCategories: ["Grills", "Rice & Biryani"] },
    { name: "Beverages", subCategories: ["Hot Drinks", "Cold Drinks"] },
    { name: "Desserts", subCategories: ["Arabic Sweets"] },
  ];

  const categories = {}; // name -> Category
  const subCategories = {}; // "Category>>SubCategory" -> SubCategory

  for (const [i, def] of categoryDefs.entries()) {
    const category = await findOrCreate(
      "category",
      { outletId: outlet.id, name: def.name },
      { outletId: outlet.id, name: def.name, displayOrder: i, isEnabled: true },
    );
    categories[def.name] = category;
    console.log(`  Category: ${def.name}`);

    for (const subName of def.subCategories) {
      const subCategory = await findOrCreate(
        "subCategory",
        { outletId: outlet.id, name: subName, categoryId: category.id },
        { outletId: outlet.id, name: subName, categoryId: category.id },
      );
      subCategories[`${def.name}>>${subName}`] = subCategory;
      console.log(`    SubCategory: ${subName}`);
    }
  }

  // ─────────────────────────────────────────────
  // KITCHEN SECTIONS
  // ─────────────────────────────────────────────
  const kitchenSectionNames = ["Main Kitchen", "Grill Station", "Beverage Station"];
  const kitchenSections = {};

  for (const name of kitchenSectionNames) {
    const section = await prisma.kitchenSection.upsert({
      where: { outletId_name: { outletId: outlet.id, name } },
      update: {},
      create: { outletId: outlet.id, name },
    });
    kitchenSections[name] = section;
    console.log(`  KitchenSection: ${name}`);
  }

  // ─────────────────────────────────────────────
  // ADD-ONS
  // ─────────────────────────────────────────────
  const addOnDefs = [
    { name: "Extra Cheese", price: 40 },
    { name: "Extra Sauce", price: 20 },
    { name: "Extra Rice", price: 60 },
    { name: "Extra Bread", price: 30 },
  ];
  const addOns = {};

  for (const def of addOnDefs) {
    const addOn = await findOrCreate(
      "addOn",
      { outletId: outlet.id, name: def.name },
      { outletId: outlet.id, name: def.name, price: def.price },
    );
    addOns[def.name] = addOn;
    console.log(`  AddOn: ${def.name} (₹${def.price})`);
  }

  // ─────────────────────────────────────────────
  // MENU ITEMS
  // ─────────────────────────────────────────────
  const menuItemDefs = [
    {
      sku: "STR-001",
      name: "Hummus",
      category: "Starters",
      subCategory: "Salads",
      kitchenSection: "Main Kitchen",
      price: 149,
      foodType: "VEG",
      prepTimeMinutes: 8,
    },
    {
      sku: "STR-002",
      name: "Lentil Soup",
      category: "Starters",
      subCategory: "Soups",
      kitchenSection: "Main Kitchen",
      price: 129,
      foodType: "VEG",
      prepTimeMinutes: 10,
    },
    {
      sku: "STR-003",
      name: "Fattoush Salad",
      category: "Starters",
      subCategory: "Salads",
      kitchenSection: "Main Kitchen",
      price: 179,
      foodType: "VEG",
      prepTimeMinutes: 8,
    },
    {
      sku: "MAIN-001",
      name: "Chicken Shawarma",
      category: "Main Course",
      subCategory: "Grills",
      kitchenSection: "Grill Station",
      price: 219,
      foodType: "NON_VEG",
      prepTimeMinutes: 12,
    },
    {
      sku: "MAIN-002",
      name: "Mixed Grill Platter",
      category: "Main Course",
      subCategory: "Grills",
      kitchenSection: "Grill Station",
      price: 649,
      foodType: "NON_VEG",
      prepTimeMinutes: 25,
    },
    {
      sku: "MAIN-003",
      name: "Chicken Mandi",
      category: "Main Course",
      subCategory: "Rice & Biryani",
      kitchenSection: "Main Kitchen",
      price: 379,
      foodType: "NON_VEG",
      prepTimeMinutes: 20,
    },
    {
      sku: "MAIN-004",
      name: "Mutton Biryani",
      category: "Main Course",
      subCategory: "Rice & Biryani",
      kitchenSection: "Main Kitchen",
      price: 429,
      foodType: "NON_VEG",
      prepTimeMinutes: 22,
    },
    {
      sku: "BEV-001",
      name: "Arabic Coffee",
      category: "Beverages",
      subCategory: "Hot Drinks",
      kitchenSection: "Beverage Station",
      price: 99,
      foodType: "VEG",
      prepTimeMinutes: 5,
    },
    {
      sku: "BEV-002",
      name: "Mint Lemonade",
      category: "Beverages",
      subCategory: "Cold Drinks",
      kitchenSection: "Beverage Station",
      price: 119,
      foodType: "VEG",
      prepTimeMinutes: 4,
    },
    {
      sku: "DES-001",
      name: "Kunafa",
      category: "Desserts",
      subCategory: "Arabic Sweets",
      kitchenSection: "Main Kitchen",
      price: 199,
      foodType: "VEG",
      prepTimeMinutes: 10,
    },
    {
      sku: "DES-002",
      name: "Baklava",
      category: "Desserts",
      subCategory: "Arabic Sweets",
      kitchenSection: "Main Kitchen",
      price: 159,
      foodType: "VEG",
      prepTimeMinutes: 5,
    },
  ];

  const menuItems = {}; // sku -> MenuItem

  for (const def of menuItemDefs) {
    const menuItem = await prisma.menuItem.upsert({
      where: { outletId_sku: { outletId: outlet.id, sku: def.sku } },
      update: {},
      create: {
        outletId: outlet.id,
        sku: def.sku,
        name: def.name,
        categoryId: categories[def.category].id,
        subCategoryId: subCategories[`${def.category}>>${def.subCategory}`].id,
        kitchenSectionId: kitchenSections[def.kitchenSection].id,
        foodType: def.foodType,
        sellingPrice: def.price,
        gstPercent: 5,
        prepTimeMinutes: def.prepTimeMinutes,
      },
    });
    menuItems[def.sku] = menuItem;
    console.log(`  MenuItem: ${def.name} (₹${def.price})`);
  }

  // ─────────────────────────────────────────────
  // COMBO MEALS
  // ─────────────────────────────────────────────
  const comboDefs = [
    {
      name: "Shawarma Combo",
      price: 289,
      description: "Chicken Shawarma + Mint Lemonade",
      items: [
        { sku: "MAIN-001", quantity: 1 },
        { sku: "BEV-002", quantity: 1 },
      ],
    },
    {
      name: "Grill Feast",
      price: 999,
      description: "Mixed Grill Platter + Mutton Biryani + Arabic Coffee",
      items: [
        { sku: "MAIN-002", quantity: 1 },
        { sku: "MAIN-004", quantity: 1 },
        { sku: "BEV-001", quantity: 1 },
      ],
    },
  ];

  for (const def of comboDefs) {
    let combo = await prisma.comboMeal.findFirst({
      where: { outletId: outlet.id, name: def.name },
    });
    if (!combo) {
      combo = await prisma.comboMeal.create({
        data: {
          outletId: outlet.id,
          name: def.name,
          price: def.price,
          description: def.description,
        },
      });
      for (const item of def.items) {
        await prisma.comboItem.create({
          data: {
            comboMealId: combo.id,
            menuItemId: menuItems[item.sku].id,
            quantity: item.quantity,
          },
        });
      }
    }
    console.log(`  ComboMeal: ${def.name} (₹${def.price})`);
  }

  // ─────────────────────────────────────────────
  // FLOORS + TABLES (5 tables total)
  // ─────────────────────────────────────────────
  const floorDefs = [
    { name: "Ground Floor", tables: ["T-1", "T-2", "T-3"] },
    { name: "Rooftop", tables: ["T-4", "T-5"] },
  ];

  const tables = {}; // name -> RestaurantTable

  for (const def of floorDefs) {
    const floor = await findOrCreate(
      "floor",
      { outletId: outlet.id, name: def.name },
      { outletId: outlet.id, name: def.name },
    );
    console.log(`  Floor: ${def.name}`);

    for (const tableName of def.tables) {
      const table = await findOrCreate(
        "restaurantTable",
        { outletId: outlet.id, name: tableName },
        { outletId: outlet.id, name: tableName, floorId: floor.id, capacity: 4 },
      );
      tables[tableName] = table;
      console.log(`    Table: ${tableName} (${def.name})`);
    }
  }

  // ─────────────────────────────────────────────
  // TABLE RESERVATIONS
  // ─────────────────────────────────────────────
  const tonight8pm = new Date();
  tonight8pm.setHours(20, 0, 0, 0);

  const tomorrowNoon = new Date();
  tomorrowNoon.setDate(tomorrowNoon.getDate() + 1);
  tomorrowNoon.setHours(12, 0, 0, 0);

  const reservationDefs = [
    {
      tableName: "T-4",
      customerName: "Ahmed Khan",
      customerPhone: "9876500001",
      partySize: 4,
      reservedFor: tonight8pm,
    },
    {
      tableName: "T-1",
      customerName: "Sara Ali",
      customerPhone: "9876500002",
      partySize: 2,
      reservedFor: tomorrowNoon,
    },
  ];

  for (const def of reservationDefs) {
    const existing = await prisma.tableReservation.findFirst({
      where: {
        outletId: outlet.id,
        tableId: tables[def.tableName].id,
        customerName: def.customerName,
        reservedFor: def.reservedFor,
      },
    });
    if (!existing) {
      await prisma.tableReservation.create({
        data: {
          outletId: outlet.id,
          tableId: tables[def.tableName].id,
          customerName: def.customerName,
          customerPhone: def.customerPhone,
          partySize: def.partySize,
          reservedFor: def.reservedFor,
          createdById: ownerEmployeeId,
        },
      });
    }
    console.log(`  Reservation: ${def.customerName} @ ${def.tableName}`);
  }

  // ─────────────────────────────────────────────
  // SAMPLE ORDERS (dine-in, with items + KOT + payment)
  // ─────────────────────────────────────────────
  const orderDefs = [
    {
      orderNumber: "ORD-000001",
      tableName: "T-2",
      status: "COMPLETED",
      items: [
        { sku: "MAIN-001", quantity: 2 },
        { sku: "BEV-002", quantity: 2 },
      ],
      paymentMethod: "CARD",
    },
    {
      orderNumber: "ORD-000002",
      tableName: "T-5",
      status: "PREPARING",
      items: [
        { sku: "MAIN-002", quantity: 1 },
        { sku: "MAIN-004", quantity: 1 },
        { sku: "BEV-001", quantity: 2 },
      ],
      paymentMethod: "UPI",
    },
  ];

  for (const def of orderDefs) {
    const lineItems = def.items.map((it) => {
      const menuItem = menuItems[it.sku];
      const unitPrice = Number(menuItem.sellingPrice);
      const totalPrice = unitPrice * it.quantity;
      return { menuItem, quantity: it.quantity, unitPrice, totalPrice };
    });

    const subtotal = lineItems.reduce((sum, li) => sum + li.totalPrice, 0);
    const gstAmount = Math.round(subtotal * 0.05 * 100) / 100;
    const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;

    const existingOrder = await prisma.order.findUnique({
      where: { outletId_orderNumber: { outletId: outlet.id, orderNumber: def.orderNumber } },
    });
    if (existingOrder) {
      console.log(`  Order ${def.orderNumber} already exists — skipping.`);
      continue;
    }

    const order = await prisma.order.create({
      data: {
        outletId: outlet.id,
        orderNumber: def.orderNumber,
        orderType: "DINE_IN",
        status: def.status,
        tableId: tables[def.tableName].id,
        subtotal,
        gstAmount,
        grandTotal,
        items: {
          create: lineItems.map((li) => ({
            menuItemId: li.menuItem.id,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            totalPrice: li.totalPrice,
          })),
        },
      },
      include: { items: true },
    });

    // Kitchen order for this order — grouped under Main Kitchen for simplicity
    const kitchenOrder = await prisma.kitchenOrder.create({
      data: {
        outletId: outlet.id,
        orderId: order.id,
        kotNumber: `KOT-${def.orderNumber.split("-")[1]}`,
        status: def.status === "COMPLETED" ? "COMPLETED" : "PREPARING",
        kitchenSectionId: kitchenSections["Main Kitchen"].id,
        items: {
          create: order.items.map((oi) => ({
            orderItemId: oi.id,
            quantity: oi.quantity,
          })),
        },
      },
    });

    // Payment — fully paid for the completed order, unpaid for the in-progress one
    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: def.paymentMethod,
        amount: grandTotal,
        status: def.status === "COMPLETED" ? "PAID" : "UNPAID",
        paidAt: def.status === "COMPLETED" ? new Date() : null,
      },
    });

    console.log(
      `  Order: ${def.orderNumber} @ ${def.tableName} — ₹${grandTotal} (${def.status}), KOT ${kitchenOrder.kotNumber}`,
    );
  }

  // ─────────────────────────────────────────────
  // UNITS
  // ─────────────────────────────────────────────
  const unitDefs = [
    { name: "Kilogram", abbreviation: "kg" },
    { name: "Gram", abbreviation: "g" },
    { name: "Liter", abbreviation: "l" },
    { name: "Milliliter", abbreviation: "ml" },
    { name: "Piece", abbreviation: "pc" },
  ];
  const units = {};

  for (const def of unitDefs) {
    const unit = await prisma.unit.upsert({
      where: { outletId_name: { outletId: outlet.id, name: def.name } },
      update: {},
      create: { outletId: outlet.id, name: def.name, abbreviation: def.abbreviation },
    });
    units[def.name] = unit;
    console.log(`  Unit: ${def.name}`);
  }

  // ─────────────────────────────────────────────
  // INGREDIENT CATEGORIES
  // ─────────────────────────────────────────────
  const ingredientCategoryNames = ["Meat", "Vegetables", "Dairy", "Oil", "Grocery", "Beverages"];
  const ingredientCategories = {};

  for (const name of ingredientCategoryNames) {
    const cat = await prisma.ingredientCategory.upsert({
      where: { outletId_name: { outletId: outlet.id, name } },
      update: {},
      create: { outletId: outlet.id, name },
    });
    ingredientCategories[name] = cat;
    console.log(`  IngredientCategory: ${name}`);
  }

  // ─────────────────────────────────────────────
  // SUPPLIERS
  // ─────────────────────────────────────────────
  const supplierDefs = [
    {
      name: "Al Fahim Trading",
      contactPerson: "Yusuf Al Fahim",
      phone: "9998877001",
      email: "sales@alfahimtrading.example",
      gstNumber: "29AAFCA1234B1Z5",
      paymentTerms: "Net 15",
    },
    {
      name: "Gulf Dairy & Beverages",
      contactPerson: "Priya Menon",
      phone: "9998877002",
      email: "orders@gulfdairy.example",
      gstNumber: "29AAFCG5678C1Z2",
      paymentTerms: "Net 7",
    },
  ];
  const suppliers = {};

  for (const def of supplierDefs) {
    const supplier = await findOrCreate(
      "supplier",
      { outletId: outlet.id, name: def.name },
      { outletId: outlet.id, ...def },
    );
    suppliers[def.name] = supplier;
    console.log(`  Supplier: ${def.name}`);
  }

  // ─────────────────────────────────────────────
  // INGREDIENTS
  // (purchase unit / consumption unit / conversion ratio / opening stock /
  //  cost per consumption unit / whether it needs an expiry batch)
  // ─────────────────────────────────────────────
  const ingredientDefs = [
    { code: "ING-001", name: "Chicken", category: "Meat", purchaseUnit: "Kilogram", consumptionUnit: "Gram", ratio: 1000, minStock: 5000, openingStock: 15000, cost: 0.28, perishable: true },
    { code: "ING-002", name: "Mutton", category: "Meat", purchaseUnit: "Kilogram", consumptionUnit: "Gram", ratio: 1000, minStock: 3000, openingStock: 8000, cost: 0.55, perishable: true },
    { code: "ING-003", name: "Basmati Rice", category: "Grocery", purchaseUnit: "Kilogram", consumptionUnit: "Gram", ratio: 1000, minStock: 10000, openingStock: 40000, cost: 0.12, perishable: false },
    { code: "ING-004", name: "Chickpeas", category: "Grocery", purchaseUnit: "Kilogram", consumptionUnit: "Gram", ratio: 1000, minStock: 5000, openingStock: 12000, cost: 0.09, perishable: false },
    { code: "ING-005", name: "Tahini", category: "Grocery", purchaseUnit: "Liter", consumptionUnit: "Milliliter", ratio: 1000, minStock: 2000, openingStock: 6000, cost: 0.4, perishable: false },
    { code: "ING-006", name: "Mint Leaves", category: "Vegetables", purchaseUnit: "Kilogram", consumptionUnit: "Gram", ratio: 1000, minStock: 500, openingStock: 1500, cost: 0.2, perishable: true },
    { code: "ING-007", name: "Lemon", category: "Vegetables", purchaseUnit: "Piece", consumptionUnit: "Piece", ratio: 1, minStock: 50, openingStock: 200, cost: 5, perishable: true },
    { code: "ING-008", name: "Yogurt", category: "Dairy", purchaseUnit: "Kilogram", consumptionUnit: "Gram", ratio: 1000, minStock: 3000, openingStock: 0, cost: 0.18, perishable: true },
    { code: "ING-009", name: "Cheese", category: "Dairy", purchaseUnit: "Kilogram", consumptionUnit: "Gram", ratio: 1000, minStock: 2000, openingStock: 4000, cost: 0.6, perishable: true },
    { code: "ING-010", name: "Cooking Oil", category: "Oil", purchaseUnit: "Liter", consumptionUnit: "Milliliter", ratio: 1000, minStock: 5000, openingStock: 18000, cost: 0.15, perishable: false },
    { code: "ING-011", name: "Coffee Powder", category: "Beverages", purchaseUnit: "Kilogram", consumptionUnit: "Gram", ratio: 1000, minStock: 1000, openingStock: 3000, cost: 1.1, perishable: false },
    { code: "ING-012", name: "Sugar", category: "Grocery", purchaseUnit: "Kilogram", consumptionUnit: "Gram", ratio: 1000, minStock: 5000, openingStock: 10000, cost: 0.05, perishable: false },
    { code: "ING-013", name: "Kunafa Dough", category: "Grocery", purchaseUnit: "Kilogram", consumptionUnit: "Gram", ratio: 1000, minStock: 2000, openingStock: 3000, cost: 0.3, perishable: false },
    { code: "ING-014", name: "Phyllo Dough", category: "Grocery", purchaseUnit: "Kilogram", consumptionUnit: "Gram", ratio: 1000, minStock: 2000, openingStock: 2500, cost: 0.32, perishable: false },
  ];

  const ingredients = {}; // name -> Ingredient

  for (const def of ingredientDefs) {
    const ingredient = await prisma.ingredient.upsert({
      where: { outletId_itemCode: { outletId: outlet.id, itemCode: def.code } },
      update: {},
      create: {
        outletId: outlet.id,
        itemCode: def.code,
        name: def.name,
        categoryId: ingredientCategories[def.category].id,
        purchaseUnitId: units[def.purchaseUnit].id,
        consumptionUnitId: units[def.consumptionUnit].id,
        conversionRatio: def.ratio,
        minimumStockLevel: def.minStock,
      },
    });
    ingredients[def.name] = ingredient;
    console.log(`  Ingredient: ${def.name}`);

    // Opening stock: skip ingredients (like Yogurt below) that instead get
    // their stock from an explicit PurchaseEntry further down, so the
    // "goods receipt" workflow has something real to show.
    if (def.openingStock > 0) {
      const existingStock = await prisma.inventoryStock.findUnique({
        where: { ingredientId: ingredient.id },
      });
      if (!existingStock) {
        await prisma.inventoryStock.create({
          data: {
            ingredientId: ingredient.id,
            outletId: outlet.id,
            quantityOnHand: def.openingStock,
            averageCost: def.cost,
          },
        });
        await prisma.stockMovement.create({
          data: {
            ingredientId: ingredient.id,
            outletId: outlet.id,
            type: "ADJUSTMENT",
            quantity: def.openingStock,
            previousStock: 0,
            newStock: def.openingStock,
            reason: "Opening stock",
            userId: ownerEmployeeId,
          },
        });

        if (def.perishable) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 7);
          await prisma.expiryBatch.create({
            data: {
              outletId: outlet.id,
              ingredientId: ingredient.id,
              batchNumber: `${def.code}-OPEN`,
              expiryDate,
              quantityRemaining: def.openingStock,
            },
          });
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  // PURCHASE ORDER (placed, not yet received)
  // ─────────────────────────────────────────────
  const po = await prisma.purchaseOrder.upsert({
    where: { outletId_poNumber: { outletId: outlet.id, poNumber: "PO-000001" } },
    update: {},
    create: {
      outletId: outlet.id,
      poNumber: "PO-000001",
      supplierId: suppliers["Al Fahim Trading"].id,
      status: "ORDERED",
      totalAmount: 8400,
      notes: "Weekly restock — meat, rice, oil",
      items: {
        create: [
          {
            ingredientId: ingredients["Chicken"].id,
            quantity: 20,
            unitPrice: 280,
            taxPercent: 5,
            totalAmount: 5880,
          },
          {
            ingredientId: ingredients["Basmati Rice"].id,
            quantity: 50,
            unitPrice: 120,
            taxPercent: 5,
            totalAmount: 6300,
          },
          {
            ingredientId: ingredients["Cooking Oil"].id,
            quantity: 20,
            unitPrice: 150,
            taxPercent: 5,
            totalAmount: 3150,
          },
        ],
      },
    },
  });
  console.log(`  PurchaseOrder: ${po.poNumber} (ORDERED, ${suppliers["Al Fahim Trading"].name})`);

  // ─────────────────────────────────────────────
  // PURCHASE ENTRY (goods receipt) — receives Yogurt from Gulf Dairy,
  // which increases InventoryStock, logs a StockMovement, and opens an
  // ExpiryBatch, showing the full receiving workflow end-to-end.
  // ─────────────────────────────────────────────
  const existingEntry = await prisma.purchaseEntry.findFirst({
    where: { outletId: outlet.id, invoiceNumber: "INV-GD-3311" },
  });

  if (!existingEntry) {
    const yogurt = ingredients["Yogurt"];
    const quantityReceivedKg = 15; // purchase units (kg)
    const quantityReceivedGrams = quantityReceivedKg * 1000; // consumption units
    const purchasePricePerKg = 180;

    await prisma.purchaseEntry.create({
      data: {
        supplierId: suppliers["Gulf Dairy & Beverages"].id,
        ingredientId: yogurt.id,
        outletId: outlet.id,
        invoiceNumber: "INV-GD-3311",
        batchNumber: "YOG-0826",
        expiryDate: new Date(new Date().setDate(new Date().getDate() + 10)),
        quantityReceived: quantityReceivedKg,
        purchasePrice: purchasePricePerKg,
        gstPercent: 5,
        totalAmount: quantityReceivedKg * purchasePricePerKg * 1.05,
      },
    });

    const stock = await prisma.inventoryStock.upsert({
      where: { ingredientId: yogurt.id },
      update: {},
      create: { ingredientId: yogurt.id, outletId: outlet.id, quantityOnHand: 0, averageCost: 0 },
    });
    const previousStock = Number(stock.quantityOnHand);
    const newStock = previousStock + quantityReceivedGrams;

    await prisma.inventoryStock.update({
      where: { ingredientId: yogurt.id },
      data: { quantityOnHand: newStock, averageCost: purchasePricePerKg / 1000 },
    });

    await prisma.stockMovement.create({
      data: {
        ingredientId: yogurt.id,
        outletId: outlet.id,
        type: "PURCHASE",
        quantity: quantityReceivedGrams,
        previousStock,
        newStock,
        reason: "Goods receipt — INV-GD-3311",
        userId: ownerEmployeeId,
      },
    });

    await prisma.expiryBatch.create({
      data: {
        outletId: outlet.id,
        ingredientId: yogurt.id,
        batchNumber: "YOG-0826",
        expiryDate: new Date(new Date().setDate(new Date().getDate() + 10)),
        quantityRemaining: quantityReceivedGrams,
      },
    });

    console.log("  PurchaseEntry: 15kg Yogurt received from Gulf Dairy & Beverages (INV-GD-3311)");
  }

  // ─────────────────────────────────────────────
  // WASTAGE + STOCK ADJUSTMENT (sample records)
  // ─────────────────────────────────────────────
  const existingWastage = await prisma.wastage.findFirst({
    where: { outletId: outlet.id, reason: "Spoiled — past prep window" },
  });
  if (!existingWastage) {
    await prisma.wastage.create({
      data: {
        ingredientId: ingredients["Mint Leaves"].id,
        outletId: outlet.id,
        quantity: 150,
        reason: "Spoiled — past prep window",
        cost: 150 * 0.2,
        employeeId: ownerEmployeeId,
      },
    });
    console.log("  Wastage: 150g Mint Leaves spoiled");
  }

  const existingAdjustment = await prisma.stockAdjustment.findFirst({
    where: { outletId: outlet.id, reason: "Physical count correction" },
  });
  if (!existingAdjustment) {
    await prisma.stockAdjustment.create({
      data: {
        outletId: outlet.id,
        ingredientId: ingredients["Sugar"].id,
        type: "DECREASE",
        quantity: 200,
        reason: "Physical count correction",
        approvedBy: "Restaurant Owner",
      },
    });
    console.log("  StockAdjustment: -200g Sugar (physical count correction)");
  }

  // ─────────────────────────────────────────────
  // LOW-STOCK ALERT (Yogurt sits below its own minimum before this
  // receipt logic would run again next cycle — demonstrates the alert
  // table; harmless if stock is actually healthy, it's just sample data)
  // ─────────────────────────────────────────────
  const existingAlert = await prisma.inventoryAlert.findFirst({
    where: { outletId: outlet.id, ingredientId: ingredients["Mutton"].id, type: "LOW_STOCK" },
  });
  if (!existingAlert) {
    await prisma.inventoryAlert.create({
      data: {
        outletId: outlet.id,
        ingredientId: ingredients["Mutton"].id,
        type: "LOW_STOCK",
        message: "Mutton stock is approaching its minimum stock level.",
      },
    });
    console.log("  InventoryAlert: LOW_STOCK — Mutton");
  }

  // ─────────────────────────────────────────────
  // RECIPE INGREDIENTS — link menu items to what they consume
  // ─────────────────────────────────────────────
  const recipeDefs = [
    { sku: "STR-001", lines: [["Chickpeas", 150], ["Tahini", 30]] },
    { sku: "STR-003", lines: [["Mint Leaves", 10], ["Lemon", 1]] },
    { sku: "MAIN-001", lines: [["Chicken", 200], ["Cooking Oil", 15]] },
    { sku: "MAIN-002", lines: [["Chicken", 200], ["Mutton", 150], ["Cooking Oil", 20]] },
    { sku: "MAIN-003", lines: [["Chicken", 250], ["Basmati Rice", 200]] },
    { sku: "MAIN-004", lines: [["Mutton", 220], ["Basmati Rice", 200], ["Cooking Oil", 20]] },
    { sku: "BEV-001", lines: [["Coffee Powder", 15], ["Sugar", 10]] },
    { sku: "BEV-002", lines: [["Mint Leaves", 5], ["Lemon", 1], ["Sugar", 15]] },
    { sku: "DES-001", lines: [["Kunafa Dough", 150], ["Cheese", 100], ["Sugar", 50]] },
    { sku: "DES-002", lines: [["Phyllo Dough", 100], ["Sugar", 40]] },
  ];

  for (const def of recipeDefs) {
    const menuItem = menuItems[def.sku];
    for (const [ingredientName, quantity] of def.lines) {
      await prisma.recipeIngredient.upsert({
        where: {
          menuItemId_ingredientId: {
            menuItemId: menuItem.id,
            ingredientId: ingredients[ingredientName].id,
          },
        },
        update: {},
        create: {
          menuItemId: menuItem.id,
          ingredientId: ingredients[ingredientName].id,
          quantity,
        },
      });
    }
  }
  console.log("  RecipeIngredients linked for 10 menu items");

  // ─────────────────────────────────────────────
  // EXPENSE CATEGORIES
  // ─────────────────────────────────────────────
  const expenseCategoryDefs = ["Rent", "Electricity", "Salaries", "Maintenance", "Marketing", "Miscellaneous"];
  const expenseCategories = {};

  for (const name of expenseCategoryDefs) {
    const cat = await prisma.expenseCategory.upsert({
      where: { outletId_name: { outletId: outlet.id, name } },
      update: {},
      create: { outletId: outlet.id, name, isDefault: true },
    });
    expenseCategories[name] = cat;
    console.log(`  ExpenseCategory: ${name}`);
  }

  // ─────────────────────────────────────────────
  // RECURRING EXPENSE — monthly rent
  // ─────────────────────────────────────────────
  let recurringRent = await prisma.recurringExpense.findFirst({
    where: { outletId: outlet.id, title: "Shop Rent" },
  });
  if (!recurringRent) {
    const nextDueDate = new Date();
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    nextDueDate.setDate(1);
    recurringRent = await prisma.recurringExpense.create({
      data: {
        outletId: outlet.id,
        categoryId: expenseCategories["Rent"].id,
        title: "Shop Rent",
        amount: 65000,
        frequency: "MONTHLY",
        nextDueDate,
        reminderDaysBefore: 5,
      },
    });
    console.log("  RecurringExpense: Shop Rent (₹65,000/month)");
  }

  // ─────────────────────────────────────────────
  // PETTY CASH SESSION
  // ─────────────────────────────────────────────
  let pettyCashSession = await prisma.pettyCashSession.findFirst({
    where: { outletId: outlet.id, isClosed: false },
  });
  if (!pettyCashSession) {
    pettyCashSession = await prisma.pettyCashSession.create({
      data: {
        outletId: outlet.id,
        periodStart: new Date(new Date().setDate(1)),
        openingBalance: 5000,
      },
    });
    console.log("  PettyCashSession opened (₹5,000 float)");
  }

  // ─────────────────────────────────────────────
  // EXPENSES
  // ─────────────────────────────────────────────
  const expenseDefs = [
    {
      expenseNumber: "EXP-000001",
      categoryName: "Rent",
      title: "Shop Rent — current month",
      amount: 65000,
      totalPaid: 65000,
      status: "PAID",
      paymentMethod: "BANK_TRANSFER",
      paymentStatus: "PAID",
      recurringExpenseId: recurringRent.id,
      isPettyCash: false,
    },
    {
      expenseNumber: "EXP-000002",
      categoryName: "Marketing",
      title: "Instagram & Google Ads",
      amount: 8000,
      totalPaid: 8000,
      status: "APPROVED",
      paymentMethod: "CARD",
      paymentStatus: "PAID",
      isPettyCash: false,
    },
    {
      expenseNumber: "EXP-000003",
      categoryName: "Maintenance",
      title: "AC servicing — dining hall",
      amount: 2200,
      totalPaid: 0,
      status: "PENDING_APPROVAL",
      paymentMethod: null,
      paymentStatus: "UNPAID",
      isPettyCash: false,
    },
    {
      expenseNumber: "EXP-000004",
      categoryName: "Miscellaneous",
      title: "Cleaning supplies — cash purchase",
      amount: 650,
      totalPaid: 650,
      status: "PAID",
      paymentMethod: "CASH",
      paymentStatus: "PAID",
      isPettyCash: true,
      pettyCashSessionId: pettyCashSession.id,
    },
  ];

  for (const def of expenseDefs) {
    await prisma.expense.upsert({
      where: { outletId_expenseNumber: { outletId: outlet.id, expenseNumber: def.expenseNumber } },
      update: {},
      create: {
        outletId: outlet.id,
        expenseNumber: def.expenseNumber,
        categoryId: expenseCategories[def.categoryName].id,
        title: def.title,
        amount: def.amount,
        totalPaid: def.totalPaid,
        status: def.status,
        paymentMethod: def.paymentMethod,
        paymentStatus: def.paymentStatus,
        isPettyCash: def.isPettyCash ?? false,
        pettyCashSessionId: def.pettyCashSessionId ?? null,
        recurringExpenseId: def.recurringExpenseId ?? null,
        createdBy: ownerEmployeeId,
      },
    });
    console.log(`  Expense: ${def.expenseNumber} — ${def.title} (₹${def.amount})`);
  }

  // ─────────────────────────────────────────────
  // UTILITY BILL
  // ─────────────────────────────────────────────
  const existingUtilityBill = await prisma.utilityBill.findFirst({
    where: { outletId: outlet.id, utilityType: "Electricity", billNumber: "EB-08-2026" },
  });
  if (!existingUtilityBill) {
    const periodStart = new Date();
    periodStart.setDate(1);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(0);
    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + 10);

    await prisma.utilityBill.create({
      data: {
        outletId: outlet.id,
        utilityType: "Electricity",
        billNumber: "EB-08-2026",
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        dueDate,
        amount: 14500,
        paymentStatus: "UNPAID",
      },
    });
    console.log("  UtilityBill: Electricity — ₹14,500 (UNPAID)");
  }

  // ─────────────────────────────────────────────
  // ASSET PURCHASE
  // ─────────────────────────────────────────────
  const existingAsset = await prisma.assetPurchase.findFirst({
    where: { outletId: outlet.id, assetName: "Thermal Receipt Printer" },
  });
  if (!existingAsset) {
    await prisma.assetPurchase.create({
      data: {
        outletId: outlet.id,
        assetName: "Thermal Receipt Printer",
        assetCategory: "POS Devices",
        cost: 6500,
        supplierId: suppliers["Al Fahim Trading"].id,
        warrantyExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      },
    });
    console.log("  AssetPurchase: Thermal Receipt Printer (₹6,500)");
  }

  console.log("\nRestaurant seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });