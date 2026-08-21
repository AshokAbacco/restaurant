// ==============================================
// prisma/backfill-multi-tenant.js
// Section 0.5 — one-time data migration for EXISTING rows created before
// the multi-tenant schema (Organization/Outlet) existed.
// ==============================================
//
// READ THIS BEFORE RUNNING ANYTHING
// -------------------------------------------------------------------------
// If your database is currently EMPTY (a fresh dev DB, or only has the
// seed.js demo data created AFTER this retrofit), you don't need this
// script at all — just run:
//
//   npx prisma migrate dev --name multi_tenant_foundation
//   node prisma/seed.js
//
// and stop reading here. This script is only for the case where you have
// REAL pre-existing data (orders, employees, menu items, etc.) created
// under the OLD single-tenant schema, that you need to preserve while
// adding Organization/Outlet underneath it.
//
// WHY THIS CAN'T BE A SINGLE STEP
// -------------------------------------------------------------------------
// schema.prisma now declares `outletId String` (required, not nullable) on
// every tenant-scoped model. If you run `prisma migrate dev` directly
// against a database that already has rows in those tables, Postgres will
// refuse — you can't add a required NOT NULL column to a table that
// already has rows, with no value to put in it. Prisma's CLI will either
// prompt you for a one-time default or fail outright.
//
// The safe sequence is three steps:
//
//   STEP 1 — Make the new columns nullable temporarily.
//     In prisma/schema.prisma, find every `outletId String` (and
//     `organizationId String` on UserAccount) and change it to
//     `outletId String?` (add the `?`) just for this migration. Leave the
//     relation lines (`outlet Outlet @relation(...)`) as they are — Prisma
//     handles an optional relation automatically once the scalar field is
//     optional.
//
//     Then run:
//       npx prisma migrate dev --name add_tenant_columns_nullable
//
//     This adds the columns to every table as NULL-able, with all existing
//     rows getting NULL — safe, no data loss, nothing enforced yet.
//
//   STEP 2 — Run this script.
//       node prisma/backfill-multi-tenant.js
//
//     This creates one Organization + one Outlet representing your
//     existing restaurant, and backfills every NULL outletId (and
//     UserAccount.organizationId) to point at it.
//
//   STEP 3 — Make the columns required again.
//     In schema.prisma, change every `outletId String?` back to
//     `outletId String` (remove the `?`) — i.e. revert to exactly what's
//     already committed in schema.prisma today.
//
//     Then run:
//       npx prisma migrate dev --name make_tenant_columns_required
//
//     This is now safe — every row has a real value from Step 2, so the
//     NOT NULL constraint applies cleanly.
//
// This script is idempotent-ish: it checks for an existing Organization
// with the given owner email first and reuses it rather than creating a
// duplicate if you run it more than once. It does NOT undo Step 1/3's
// schema edits for you — those are manual, deliberately, so you can review
// the diff each time rather than have a script silently rewrite your
// schema file.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---- Configure these two for your real restaurant before running ----
const ORGANIZATION_NAME = process.env.BACKFILL_ORG_NAME || "My Restaurant";
const ORGANIZATION_OWNER_EMAIL =
  process.env.BACKFILL_ORG_OWNER_EMAIL || "owner@example.com";
const OUTLET_NAME = process.env.BACKFILL_OUTLET_NAME || "Main Branch";
// -----------------------------------------------------------------------

// Every Prisma Client model accessor that now carries outletId, in the
// same dependency-safe order used throughout this retrofit (parents before
// children isn't strictly required for updateMany, but grouped by module
// for readability when you're eyeballing the summary output).
const OUTLET_SCOPED_MODELS = [
  // Menu
  "category",
  "subCategory",
  "kitchenSection",
  "menuItem",
  "menuVariant",
  "addOn",
  "comboMeal",
  "priceHistory",
  // Inventory
  "unit",
  "ingredientCategory",
  "supplier",
  "ingredient",
  "purchaseOrder",
  "purchaseEntry",
  "inventoryStock",
  "stockMovement",
  "stockAdjustment",
  "wastage",
  "expiryBatch",
  "inventoryAlert",
  // Expenses
  "expenseCategory",
  "expense",
  "recurringExpense",
  "payrollRecord",
  "salaryExpense",
  "utilityBill",
  "pettyCashSession",
  "assetPurchase",
  // Employees / HR
  "employee",
  "attendance",
  "shift",
  "shiftAssignment",
  "leaveRequest",
  "incentive",
  "performanceRecord",
  "activityLog",
  // POS
  "floor",
  "restaurantTable",
  "customer",
  "deliveryPartner",
  "order",
  "kitchenOrder",
  "invoice",
  "loyaltyTransaction",
  "discount",
  // Auth / sessions
  "userAccount",
  "refreshToken",
  // Cross-cutting
  "auditLog",
];

async function main() {
  console.log("=== Multi-tenant backfill (Section 0.5) ===\n");

  // ---- Idempotency guard ----
  const existingOrg = await prisma.organization.findUnique({
    where: { ownerEmail: ORGANIZATION_OWNER_EMAIL },
  });

  let organization;
  let outlet;

  if (existingOrg) {
    console.log(
      `Organization "${existingOrg.name}" already exists for ${ORGANIZATION_OWNER_EMAIL} — reusing it (safe to re-run).`,
    );
    organization = existingOrg;

    outlet = await prisma.outlet.findFirst({
      where: { organizationId: organization.id, name: OUTLET_NAME },
    });
    if (!outlet) {
      outlet = await prisma.outlet.create({
        data: { organizationId: organization.id, name: OUTLET_NAME },
      });
      console.log(`Created missing outlet "${OUTLET_NAME}" under it.`);
    } else {
      console.log(`Outlet "${OUTLET_NAME}" already exists — reusing it.`);
    }
  } else {
    organization = await prisma.organization.create({
      data: { name: ORGANIZATION_NAME, ownerEmail: ORGANIZATION_OWNER_EMAIL },
    });
    outlet = await prisma.outlet.create({
      data: { organizationId: organization.id, name: OUTLET_NAME },
    });
    console.log(
      `Created organization "${ORGANIZATION_NAME}" and outlet "${OUTLET_NAME}".`,
    );
  }

  console.log(`\nBackfilling outletId = ${outlet.id} onto every NULL row...\n`);

  const summary = [];

  // Run inside one transaction — if anything fails partway, nothing is
  // left half-backfilled.
  await prisma.$transaction(
    async (tx) => {
      for (const modelName of OUTLET_SCOPED_MODELS) {
        if (!tx[modelName]) {
          console.warn(
            `  ⚠️  Skipping "${modelName}" — no such model on the Prisma client (schema drift? check spelling).`,
          );
          continue;
        }
        const result = await tx[modelName].updateMany({
          where: { outletId: null },
          data: { outletId: outlet.id },
        });
        summary.push({ model: modelName, updated: result.count });
      }

      // UserAccount additionally needs organizationId backfilled — it's a
      // separate field from outletId (denormalized so an owner's session
      // can resolve "which orgs can I access" without a join).
      const orgResult = await tx.userAccount.updateMany({
        where: { organizationId: null },
        data: { organizationId: organization.id },
      });
      summary.push({ model: "userAccount.organizationId", updated: orgResult.count });
    },
    { timeout: 60000 }, // generous — this can touch a lot of rows on a real dataset
  );

  console.log("Done. Rows updated per table:\n");
  for (const row of summary) {
    if (row.updated > 0) {
      console.log(`  ${row.model.padEnd(28)} ${row.updated}`);
    }
  }
  const untouched = summary.filter((r) => r.updated === 0).map((r) => r.model);
  if (untouched.length) {
    console.log(`\n  (0 rows — already empty or already backfilled): ${untouched.join(", ")}`);
  }

  console.log(
    `\nNext step: revert schema.prisma's outletId/organizationId fields back to required ` +
      `(remove the "?"), then run:\n  npx prisma migrate dev --name make_tenant_columns_required\n`,
  );
}

main()
  .catch((e) => {
    console.error("\nBackfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });