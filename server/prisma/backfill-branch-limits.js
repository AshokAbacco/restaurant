// ==============================================
// server/prisma/backfill-branch-limits.js
// ==============================================
// RUN ONCE, right after applying the schema change that adds
// Organization.branchLimit / planId / planExpiresAt.
//
//   node prisma/backfill-branch-limits.js
//   node prisma/backfill-branch-limits.js --dry-run
//
// WHY THIS IS NECESSARY
// ---------------------
// Organization.branchLimit defaults to 1. Applied to a database that
// already has organizations in it, that default is actively wrong: an
// existing customer running three outlets would be handed a 1-branch limit
// and would find themselves unable to restore a branch they deactivate, or
// to re-add one they delete. The limit must never be lower than what they
// are already operating.
//
// So each existing organization gets:
//   branchLimit = max(branches it paid for, active outlets it already has, 1)
//
// Taking the MAX rather than the payment alone is the important part —
// grandfathering costs nothing, while retroactively taking a working branch
// away from a paying customer is a support incident.
//
// Idempotent: re-running it never lowers a limit, so it's safe to run again
// after a partial failure. Organizations registered through the new signup
// flow already have a correct branchLimit and are left alone.

import prisma from "./client.js";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      planId: true,
      branchLimit: true,
      planExpiresAt: true,
      owner: {
        select: {
          pricingPayment: {
            select: {
              planId: true,
              branches: true,
              billingCycle: true,
              createdAt: true,
              status: true,
            },
          },
        },
      },
      _count: { select: { outlets: true } },
    },
  });

  console.log(
    `${organizations.length} organization(s) found.${DRY_RUN ? " (dry run — nothing will be written)" : ""}\n`,
  );

  let updated = 0;
  let skipped = 0;

  for (const org of organizations) {
    // Count active outlets separately: _count.outlets above includes
    // deactivated ones, and deactivated outlets don't hold a plan slot (see
    // stores.service.js's getBranchUsage), so counting them here would
    // inflate the limit.
    const activeOutlets = await prisma.outlet.count({
      where: { organizationId: org.id, isActive: true },
    });

    const payment = org.owner?.pricingPayment;
    const paidBranches =
      payment && payment.status === "PAID" ? payment.branches || 1 : 1;

    const limit = Math.max(paidBranches, activeOutlets, 1);

    // Never lower an existing limit.
    const nextLimit = Math.max(limit, org.branchLimit || 1);

    const nextPlanId = org.planId || payment?.planId || null;

    let nextExpiry = org.planExpiresAt;
    if (!nextExpiry && payment && payment.status === "PAID") {
      const expiry = new Date(payment.createdAt);
      if (payment.planId === "free") {
        expiry.setDate(expiry.getDate() + 30);
      } else {
        expiry.setMonth(
          expiry.getMonth() + (payment.billingCycle === "year" ? 12 : 1),
        );
      }
      nextExpiry = expiry;
    }

    const unchanged =
      nextLimit === org.branchLimit &&
      nextPlanId === org.planId &&
      String(nextExpiry) === String(org.planExpiresAt);

    if (unchanged) {
      skipped += 1;
      continue;
    }

    console.log(
      `  ${org.name}: branchLimit ${org.branchLimit} -> ${nextLimit} ` +
        `(paid for ${paidBranches}, ${activeOutlets} active outlet(s))` +
        (nextPlanId !== org.planId ? `, plan -> ${nextPlanId}` : ""),
    );

    if (!DRY_RUN) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          branchLimit: nextLimit,
          planId: nextPlanId,
          planExpiresAt: nextExpiry,
        },
      });
    }

    updated += 1;
  }

  console.log(
    `\nDone. ${updated} updated, ${skipped} already correct.` +
      (DRY_RUN ? " (dry run — nothing was written)" : ""),
  );
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());