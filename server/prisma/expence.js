// ==============================================
// prisma/seed.js
// ==============================================
// Seeds Stores, Expense Categories, and a batch of realistic sample Expenses
// so the Expenses/Dashboard/Reports screens have real data to show.
//
// Safe to re-run: Stores and Categories are upserted (won't duplicate), and
// Expenses are only created once — if any already exist, that step is
// skipped so you don't end up with the sample data multiplying every time
// you run `npx prisma db seed`.
//
// Run with:
//   npx prisma db seed
// (requires this in package.json:  "prisma": { "seed": "node prisma/seed.js" })
// or directly:
//   node prisma/seed.js

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==============================================
// SEED DATA
// ==============================================

const STORES = [
  { name: "Main Store", address: "12 MG Road, Chennai", phone: "9840012345" },
  { name: "Downtown Branch", address: "45 Anna Salai, Chennai", phone: "9840067890" },
  { name: "Airport Outlet", address: "Chennai International Airport, Terminal 1", phone: "9840054321" },
];

const CATEGORIES = [
  { name: "Rent", icon: "FiHome", color: "purple", isDefault: true },
  { name: "Electricity", icon: "FiZap", color: "yellow", isDefault: true },
  { name: "Water", icon: "FiDroplet", color: "blue", isDefault: true },
  { name: "Salaries", icon: "FiUsers", color: "green", isDefault: true },
  { name: "Ingredients & Supplies", icon: "FiShoppingBag", color: "orange", isDefault: true },
  { name: "Maintenance & Repairs", icon: "FiTool", color: "gray", isDefault: false },
  { name: "Marketing & Advertising", icon: "FiTrendingUp", color: "pink", isDefault: false },
  { name: "Internet & Software", icon: "FiWifi", color: "cyan", isDefault: false },
  { name: "Equipment", icon: "FiBox", color: "indigo", isDefault: false },
  { name: "Miscellaneous", icon: "FiTag", color: "blue", isDefault: false },
];

const PAYMENT_METHODS = ["CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"];

// title + amount range per category, so the sample data reads naturally
// instead of being random noise
const EXPENSE_TEMPLATES = {
  Rent: [{ title: "Monthly Store Rent", min: 45000, max: 65000 }],
  Electricity: [{ title: "Electricity Bill", min: 3500, max: 9000 }],
  Water: [{ title: "Water Bill", min: 800, max: 2000 }],
  Salaries: [
    { title: "Kitchen Staff Salary", min: 18000, max: 28000 },
    { title: "Waiter Staff Salary", min: 15000, max: 22000 },
  ],
  "Ingredients & Supplies": [
    { title: "Vegetable Supply", min: 4000, max: 12000 },
    { title: "Meat & Poultry Supply", min: 8000, max: 20000 },
    { title: "Dairy Supply", min: 2000, max: 6000 },
    { title: "Packaging Material", min: 1500, max: 4500 },
  ],
  "Maintenance & Repairs": [
    { title: "AC Servicing", min: 2000, max: 6000 },
    { title: "Kitchen Equipment Repair", min: 1500, max: 8000 },
  ],
  "Marketing & Advertising": [
    { title: "Instagram Ads", min: 2000, max: 8000 },
    { title: "Local Newspaper Ad", min: 3000, max: 7000 },
  ],
  "Internet & Software": [
    { title: "Broadband Bill", min: 1200, max: 2500 },
    { title: "POS Software Subscription", min: 2500, max: 4000 },
  ],
  Equipment: [{ title: "Kitchen Utensils Purchase", min: 3000, max: 15000 }],
  Miscellaneous: [
    { title: "Office Stationery", min: 500, max: 2000 },
    { title: "Cleaning Supplies", min: 800, max: 2500 },
  ],
};

// ==============================================
// HELPERS
// ==============================================

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[randomInt(0, arr.length - 1)];
const randomDateWithinLastMonths = (months) => {
  const now = new Date();
  const past = new Date();
  past.setMonth(now.getMonth() - months);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
};

async function generateExpenseNumber(sequence) {
  return `EXP-${String(sequence).padStart(6, "0")}`;
}

// ==============================================
// SEED FUNCTIONS
// ==============================================

async function seedStores() {
  console.log("Seeding stores...");
  const stores = [];
  for (const store of STORES) {
    const created = await prisma.store.upsert({
      where: { name: store.name },
      update: {},
      create: store,
    });
    stores.push(created);
  }
  console.log(`  -> ${stores.length} stores ready`);
  return stores;
}

async function seedCategories() {
  console.log("Seeding expense categories...");
  const categories = [];
  for (const category of CATEGORIES) {
    const created = await prisma.expenseCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
    categories.push(created);
  }
  console.log(`  -> ${categories.length} categories ready`);
  return categories;
}

async function seedExpenses(stores, categories) {
  const existingCount = await prisma.expense.count();
  if (existingCount > 0) {
    console.log(`Skipping expense seed — ${existingCount} expense(s) already exist.`);
    return;
  }

  console.log("Seeding sample expenses...");

  const categoryByName = Object.fromEntries(categories.map((c) => [c.name, c]));
  let sequence = 1;
  const rows = [];

  // Roughly 4-6 expenses per category, spread across the last 3 months,
  // across all stores, with a realistic mix of payment statuses.
  for (const [categoryName, templates] of Object.entries(EXPENSE_TEMPLATES)) {
    const category = categoryByName[categoryName];
    if (!category) continue;

    const countForCategory = randomInt(4, 6);
    for (let i = 0; i < countForCategory; i++) {
      const template = randomItem(templates);
      const store = randomItem(stores);
      const amount = randomInt(template.min, template.max);
      const gstAmount = Math.round(amount * (Math.random() < 0.5 ? 0.05 : 0)); // some bills have GST, some don't
      const discount = Math.random() < 0.15 ? randomInt(50, 500) : 0;
      const totalPaid = Math.max(0, amount + gstAmount - discount);

      const expenseDate = randomDateWithinLastMonths(3);

      // weight toward PAID so dashboards look realistic, but include a
      // genuine mix so the UI has something to filter/report on
      const paymentStatus = randomItem(["PAID", "PAID", "PAID", "UNPAID", "PARTIAL", "OVERDUE"]);
      const paymentMethod = paymentStatus === "UNPAID" ? null : randomItem(PAYMENT_METHODS);
      const paymentDate =
        paymentStatus === "PAID" || paymentStatus === "PARTIAL"
          ? new Date(expenseDate.getTime() + randomInt(0, 5) * 24 * 60 * 60 * 1000)
          : null;

      const status = paymentStatus === "PAID" ? "PAID" : randomItem(["APPROVED", "PENDING_APPROVAL"]);

      rows.push({
        expenseNumber: await generateExpenseNumber(sequence++),
        categoryId: category.id,
        title: template.title,
        description: null,
        expenseDate,
        amount,
        gstAmount,
        discount,
        totalPaid,
        invoiceNumber: Math.random() < 0.6 ? `INV-${randomInt(1000, 9999)}` : null,
        paymentMethod,
        paymentStatus,
        paymentDate,
        transactionReference:
          paymentMethod === "UPI" ? `UPI${randomInt(100000, 999999)}` : null,
        status,
        store: store.name,
      });
    }
  }

  // Sequential inserts (not createMany) so expenseNumber stays unique and
  // ordered the same way the real bulk-import path works.
  for (const row of rows) {
    await prisma.expense.create({ data: row });
  }

  console.log(`  -> ${rows.length} sample expenses created`);
}

// ==============================================
// MAIN
// ==============================================

async function main() {
  const stores = await seedStores();
  const categories = await seedCategories();
  await seedExpenses(stores, categories);
  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });