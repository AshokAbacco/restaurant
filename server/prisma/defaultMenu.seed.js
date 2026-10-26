// ==============================================
// server/prisma/defaultMenu.seed.js
//
// ONE place that owns the default menu every account starts with:
//   • Kitchen sections  (menu sections a dish is routed to — Tandoor, Wok…)
//   • Categories + sub-categories
//   • Add-ons
//   • Menu items
//   • Kitchen branches  (physical kitchens)
//
// …applied to every BRANCH (Outlet) of every user.
//
// HOW ISOLATION WORKS
// -------------------
// The default menu below is only a TEMPLATE held in memory. It is never
// stored as shared rows. When an outlet is initialised, every row is
// COPIED into that outlet with its own outletId and its own ids, so from
// that moment on the outlet owns its menu outright: editing, adding or
// deleting anything touches only that outlet's rows (all menu services
// already filter by req.tenant.outletId). Two users who both start from
// "Starters" have two completely separate "Starters" rows.
//
// WHEN IT RUNS
// ------------
//   • New user registers           -> auth.service.js registerOwner()
//   • Owner adds a new branch      -> stores.service.js createOutlet()
//   • Any login / outlet switch    -> auth.service.js finalizeLogin()  (safety net)
//   • Server boot                  -> server.js (backfills existing users)
//   • Manually                     -> npm run seed:menu
//
// IDEMPOTENT, NO DUPLICATES, NEVER OVERWRITES
// -------------------------------------------
//   • Each outlet is initialised exactly ONCE, recorded in
//     Outlet.defaultMenuSeededAt. After that the seeder never touches the
//     outlet again — so if a user deletes a default category it stays
//     deleted, and an edited item is never reset.
//   • For an existing user with menu data already, only the MISSING defaults
//     are added. Matching is by name (case-insensitive) and, for items, by
//     SKU as well. Existing rows are never updated or deleted.
//   • A Postgres advisory lock per outlet stops two concurrent runs (boot
//     backfill + a login, say) from both inserting the same rows.
//
// Run manually with:  node prisma/defaultMenu.seed.js
//                or:  npm run seed:menu
// ==============================================

import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";

// ─────────────────────────────────────────────
// DEFAULT MENU TEMPLATE
// Edit this to change what new users start with. Changes only affect
// outlets that have not been initialised yet — existing users' menus are
// theirs and are never rewritten.
// ─────────────────────────────────────────────

// Menu sections — the functional station a dish is cooked at.
export const DEFAULT_KITCHEN_SECTIONS = [
  "Main Kitchen",
  "Tandoor",
  "Grill Station",
  "Chinese Wok",
  "Beverage Station",
  "Dessert Station",
];

// Physical kitchens. One is enough to start; owners add more themselves.
export const DEFAULT_KITCHEN_BRANCHES = ["Main Kitchen"];

export const DEFAULT_CATEGORIES = [
  {
    name: "Starters",
    description: "Small plates to begin the meal",
    subCategories: ["Veg Starters", "Non-Veg Starters", "Soups"],
  },
  {
    name: "Main Course",
    description: "Curries and gravies",
    subCategories: ["Veg Curries", "Non-Veg Curries"],
  },
  {
    name: "Breads",
    description: "Fresh from the tandoor",
    subCategories: ["Tandoori Breads"],
  },
  {
    name: "Rice & Biryani",
    description: "Biryanis and rice dishes",
    subCategories: ["Biryani", "Rice"],
  },
  {
    name: "Chinese",
    description: "Indo-Chinese favourites",
    subCategories: ["Noodles", "Manchurian"],
  },
  {
    name: "Beverages",
    description: "Hot and cold drinks",
    subCategories: ["Hot Beverages", "Cold Beverages", "Fresh Juices"],
  },
  {
    name: "Desserts",
    description: "Something sweet to finish",
    subCategories: ["Indian Sweets", "Ice Creams"],
  },
];

export const DEFAULT_ADD_ONS = [
  { name: "Extra Cheese", price: 30 },
  { name: "Extra Butter", price: 20 },
  { name: "Extra Gravy", price: 40 },
  { name: "Raita", price: 40 },
  { name: "Roasted Papad", price: 20 },
];

// category / subCategory / kitchenSection refer to names above.
export const DEFAULT_MENU_ITEMS = [
  // Starters
  { sku: "DEF-STR-001", name: "Paneer Tikka", category: "Starters", subCategory: "Veg Starters", kitchenSection: "Tandoor", foodType: "VEG", price: 249, prep: 15 },
  { sku: "DEF-STR-002", name: "Veg Spring Rolls", category: "Starters", subCategory: "Veg Starters", kitchenSection: "Chinese Wok", foodType: "VEG", price: 179, prep: 12 },
  { sku: "DEF-STR-003", name: "Chicken 65", category: "Starters", subCategory: "Non-Veg Starters", kitchenSection: "Main Kitchen", foodType: "NON_VEG", price: 269, prep: 15 },
  { sku: "DEF-STR-004", name: "Tandoori Chicken (Half)", category: "Starters", subCategory: "Non-Veg Starters", kitchenSection: "Tandoor", foodType: "NON_VEG", price: 299, prep: 20 },
  { sku: "DEF-STR-005", name: "Tomato Soup", category: "Starters", subCategory: "Soups", kitchenSection: "Main Kitchen", foodType: "VEG", price: 119, prep: 8 },
  // Main course
  { sku: "DEF-MC-001", name: "Paneer Butter Masala", category: "Main Course", subCategory: "Veg Curries", kitchenSection: "Main Kitchen", foodType: "VEG", price: 259, prep: 15 },
  { sku: "DEF-MC-002", name: "Dal Tadka", category: "Main Course", subCategory: "Veg Curries", kitchenSection: "Main Kitchen", foodType: "VEG", price: 189, prep: 12 },
  { sku: "DEF-MC-003", name: "Butter Chicken", category: "Main Course", subCategory: "Non-Veg Curries", kitchenSection: "Main Kitchen", foodType: "NON_VEG", price: 319, prep: 18 },
  { sku: "DEF-MC-004", name: "Egg Curry", category: "Main Course", subCategory: "Non-Veg Curries", kitchenSection: "Main Kitchen", foodType: "EGG", price: 199, prep: 12 },
  // Breads
  { sku: "DEF-BRD-001", name: "Butter Naan", category: "Breads", subCategory: "Tandoori Breads", kitchenSection: "Tandoor", foodType: "VEG", price: 59, prep: 6 },
  { sku: "DEF-BRD-002", name: "Tandoori Roti", category: "Breads", subCategory: "Tandoori Breads", kitchenSection: "Tandoor", foodType: "VEG", price: 35, prep: 5 },
  // Rice & Biryani
  { sku: "DEF-RB-001", name: "Veg Biryani", category: "Rice & Biryani", subCategory: "Biryani", kitchenSection: "Main Kitchen", foodType: "VEG", price: 229, prep: 20 },
  { sku: "DEF-RB-002", name: "Chicken Biryani", category: "Rice & Biryani", subCategory: "Biryani", kitchenSection: "Main Kitchen", foodType: "NON_VEG", price: 289, prep: 20 },
  { sku: "DEF-RB-003", name: "Jeera Rice", category: "Rice & Biryani", subCategory: "Rice", kitchenSection: "Main Kitchen", foodType: "VEG", price: 149, prep: 10 },
  // Chinese
  { sku: "DEF-CHN-001", name: "Veg Hakka Noodles", category: "Chinese", subCategory: "Noodles", kitchenSection: "Chinese Wok", foodType: "VEG", price: 189, prep: 12 },
  { sku: "DEF-CHN-002", name: "Gobi Manchurian", category: "Chinese", subCategory: "Manchurian", kitchenSection: "Chinese Wok", foodType: "VEG", price: 199, prep: 12 },
  // Beverages
  { sku: "DEF-BEV-001", name: "Masala Chai", category: "Beverages", subCategory: "Hot Beverages", kitchenSection: "Beverage Station", foodType: "VEG", price: 49, prep: 5 },
  { sku: "DEF-BEV-002", name: "Filter Coffee", category: "Beverages", subCategory: "Hot Beverages", kitchenSection: "Beverage Station", foodType: "VEG", price: 59, prep: 5 },
  { sku: "DEF-BEV-003", name: "Sweet Lassi", category: "Beverages", subCategory: "Cold Beverages", kitchenSection: "Beverage Station", foodType: "VEG", price: 89, prep: 5 },
  { sku: "DEF-BEV-004", name: "Fresh Lime Soda", category: "Beverages", subCategory: "Cold Beverages", kitchenSection: "Beverage Station", foodType: "VEG", price: 79, prep: 4 },
  { sku: "DEF-BEV-005", name: "Watermelon Juice", category: "Beverages", subCategory: "Fresh Juices", kitchenSection: "Beverage Station", foodType: "VEG", price: 99, prep: 5 },
  // Desserts
  { sku: "DEF-DES-001", name: "Gulab Jamun", category: "Desserts", subCategory: "Indian Sweets", kitchenSection: "Dessert Station", foodType: "VEG", price: 89, prep: 3 },
  { sku: "DEF-DES-002", name: "Vanilla Ice Cream", category: "Desserts", subCategory: "Ice Creams", kitchenSection: "Dessert Station", foodType: "VEG", price: 99, prep: 2 },
];

const DEFAULT_GST_PERCENT = 5; // standard restaurant GST in India

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const key = (s) => String(s ?? "").trim().toLowerCase();
const subKey = (categoryId, name) => `${categoryId}::${key(name)}`;

// ─────────────────────────────────────────────
// CORE: initialise ONE outlet
// ─────────────────────────────────────────────
//
// Returns { seeded: boolean, created: {...counts} }.
// seeded === false means the outlet was already initialised (or doesn't
// exist) and nothing was written.
export async function seedDefaultMenuForOutlet(prisma, outletId, { log = false } = {}) {
  if (!outletId) return { seeded: false, reason: "no-outlet" };

  // Cheap pre-check outside the transaction so the common case (already
  // initialised — every login after the first) costs one indexed read.
  const pre = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true, defaultMenuSeededAt: true },
  });
  if (!pre) return { seeded: false, reason: "not-found" };
  if (pre.defaultMenuSeededAt) return { seeded: false, reason: "already-seeded" };

  return prisma.$transaction(
    async (tx) => {
      // Serialise per outlet. Released automatically at commit/rollback.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"default-menu:" + outletId}))`;

      // Re-check under the lock — a concurrent run may have just finished.
      const outlet = await tx.outlet.findUnique({
        where: { id: outletId },
        select: { id: true, name: true, defaultMenuSeededAt: true },
      });
      if (!outlet || outlet.defaultMenuSeededAt) {
        return { seeded: false, reason: "already-seeded" };
      }

      const created = {
        kitchenSections: 0,
        kitchenBranches: 0,
        categories: 0,
        subCategories: 0,
        addOns: 0,
        menuItems: 0,
      };

      // ── Kitchen sections ──────────────────────
      const existingSections = await tx.kitchenSection.findMany({
        where: { outletId },
        select: { id: true, name: true },
      });
      const sectionNames = new Set(existingSections.map((s) => key(s.name)));
      const sectionsToCreate = DEFAULT_KITCHEN_SECTIONS.filter((n) => !sectionNames.has(key(n)));
      if (sectionsToCreate.length) {
        const r = await tx.kitchenSection.createMany({
          data: sectionsToCreate.map((name) => ({ outletId, name })),
          skipDuplicates: true,
        });
        created.kitchenSections = r.count;
      }

      // ── Kitchen branches ──────────────────────
      const existingBranches = await tx.kitchenBranch.findMany({
        where: { outletId },
        select: { name: true },
      });
      const branchNames = new Set(existingBranches.map((b) => key(b.name)));
      const branchesToCreate = DEFAULT_KITCHEN_BRANCHES.filter((n) => !branchNames.has(key(n)));
      if (branchesToCreate.length) {
        const r = await tx.kitchenBranch.createMany({
          data: branchesToCreate.map((name) => ({ outletId, name, isActive: true })),
          skipDuplicates: true,
        });
        created.kitchenBranches = r.count;
      }

      // ── Categories ────────────────────────────
      const existingCategories = await tx.category.findMany({
        where: { outletId },
        select: { id: true, name: true, displayOrder: true },
      });
      const categoryNames = new Set(existingCategories.map((c) => key(c.name)));
      // Append after the user's own categories rather than interleaving.
      const orderBase = existingCategories.reduce((m, c) => Math.max(m, c.displayOrder ?? 0), -1) + 1;
      const categoriesToCreate = DEFAULT_CATEGORIES.filter((c) => !categoryNames.has(key(c.name)));
      if (categoriesToCreate.length) {
        const r = await tx.category.createMany({
          data: categoriesToCreate.map((c, i) => ({
            outletId,
            name: c.name,
            description: c.description ?? null,
            displayOrder: orderBase + i,
            isEnabled: true,
          })),
        });
        created.categories = r.count;
      }

      // Re-read so we have ids for both pre-existing and newly created rows.
      const categories = await tx.category.findMany({
        where: { outletId },
        select: { id: true, name: true },
      });
      const categoryByName = new Map();
      for (const c of categories) {
        if (!categoryByName.has(key(c.name))) categoryByName.set(key(c.name), c.id);
      }

      // ── Sub-categories ────────────────────────
      const existingSubs = await tx.subCategory.findMany({
        where: { outletId },
        select: { id: true, name: true, categoryId: true },
      });
      const subKeys = new Set(existingSubs.map((s) => subKey(s.categoryId, s.name)));
      const subsToCreate = [];
      for (const c of DEFAULT_CATEGORIES) {
        const categoryId = categoryByName.get(key(c.name));
        if (!categoryId) continue;
        for (const name of c.subCategories) {
          if (subKeys.has(subKey(categoryId, name))) continue;
          subsToCreate.push({ outletId, categoryId, name });
          subKeys.add(subKey(categoryId, name));
        }
      }
      if (subsToCreate.length) {
        const r = await tx.subCategory.createMany({ data: subsToCreate });
        created.subCategories = r.count;
      }

      // ── Add-ons ───────────────────────────────
      const existingAddOns = await tx.addOn.findMany({
        where: { outletId },
        select: { name: true },
      });
      const addOnNames = new Set(existingAddOns.map((a) => key(a.name)));
      const addOnsToCreate = DEFAULT_ADD_ONS.filter((a) => !addOnNames.has(key(a.name)));
      if (addOnsToCreate.length) {
        const r = await tx.addOn.createMany({
          data: addOnsToCreate.map((a) => ({ outletId, name: a.name, price: a.price, isEnabled: true })),
        });
        created.addOns = r.count;
      }

      // ── Menu items ────────────────────────────
      const [sections, subs, existingItems] = await Promise.all([
        tx.kitchenSection.findMany({ where: { outletId }, select: { id: true, name: true } }),
        tx.subCategory.findMany({ where: { outletId }, select: { id: true, name: true, categoryId: true } }),
        // Includes soft-deleted items on purpose: if a user already deleted
        // "Paneer Tikka" it must not come back.
        tx.menuItem.findMany({ where: { outletId }, select: { sku: true, name: true } }),
      ]);
      const sectionByName = new Map(sections.map((s) => [key(s.name), s.id]));
      const subByKey = new Map(subs.map((s) => [subKey(s.categoryId, s.name), s.id]));
      const itemSkus = new Set(existingItems.map((i) => key(i.sku)));
      const itemNames = new Set(existingItems.map((i) => key(i.name)));

      const itemsToCreate = [];
      for (const item of DEFAULT_MENU_ITEMS) {
        if (itemSkus.has(key(item.sku)) || itemNames.has(key(item.name))) continue;
        const categoryId = categoryByName.get(key(item.category));
        if (!categoryId) continue; // category is required on MenuItem
        itemsToCreate.push({
          outletId,
          name: item.name,
          sku: item.sku,
          categoryId,
          subCategoryId: subByKey.get(subKey(categoryId, item.subCategory)) ?? null,
          kitchenSectionId: sectionByName.get(key(item.kitchenSection)) ?? null,
          foodType: item.foodType,
          sellingPrice: item.price,
          gstPercent: DEFAULT_GST_PERCENT,
          prepTimeMinutes: item.prep ?? null,
          isAvailable: true,
          status: "ACTIVE",
        });
      }
      if (itemsToCreate.length) {
        const r = await tx.menuItem.createMany({ data: itemsToCreate, skipDuplicates: true });
        created.menuItems = r.count;
      }

      // ── Mark initialised — never seeded again ─
      await tx.outlet.update({
        where: { id: outletId },
        data: { defaultMenuSeededAt: new Date() },
      });

      if (log) {
        console.log(`  ✓ ${outlet.name} (${outletId})`, created);
      }
      return { seeded: true, created };
    },
    { timeout: 30_000, maxWait: 10_000 },
  );
}

// Wrapper for request paths (register, login, new branch): never lets a
// seeding problem break the user's actual action. A failure just leaves
// defaultMenuSeededAt null, so the next login / boot retries it.
export async function ensureDefaultMenu(prisma, outletId) {
  try {
    return await seedDefaultMenuForOutlet(prisma, outletId);
  } catch (err) {
    console.error(`[default-menu] could not initialise outlet ${outletId}:`, err.message);
    return { seeded: false, reason: "error", error: err };
  }
}

// ─────────────────────────────────────────────
// BACKFILL: every outlet of every existing user
// ─────────────────────────────────────────────
export async function seedDefaultMenuForAllOutlets(prisma, { log = false } = {}) {
  const pending = await prisma.outlet.findMany({
    where: { defaultMenuSeededAt: null },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  let seeded = 0;
  let failed = 0;
  for (const outlet of pending) {
    try {
      const r = await seedDefaultMenuForOutlet(prisma, outlet.id, { log });
      if (r.seeded) seeded += 1;
    } catch (err) {
      failed += 1;
      console.error(`[default-menu] failed for outlet "${outlet.name}" (${outlet.id}):`, err.message);
    }
  }
  return { pending: pending.length, seeded, failed };
}

// ─────────────────────────────────────────────
// CLI:  node prisma/defaultMenu.seed.js
// ─────────────────────────────────────────────
const isCli =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  const prisma = new PrismaClient();
  console.log("Applying default menu to every outlet that hasn't been initialised yet...");
  seedDefaultMenuForAllOutlets(prisma, { log: true })
    .then(({ pending, seeded, failed }) => {
      console.log(`\nDone. ${seeded} outlet(s) initialised, ${pending - seeded - failed} already done, ${failed} failed.`);
      if (failed) process.exitCode = 1;
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}