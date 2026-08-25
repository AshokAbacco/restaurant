// ==============================================
// prisma/seed.js
// Run with: node prisma/seed.js
// ==============================================
//

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const ORGANIZATIONS = [
  {
    name: "Mehfil Arabic Restaurant",
    ownerEmail: "owner@gmail.com",
    outlets: ["Main Branch", "Second Branch"],
    users: [
      {
        fullName: "Restaurant Owner",
        department: "Management",
        designation: "Owner",
        username: "owner",
        email: "owner@gmail.com",
        password: "123456",
        role: "OWNER",
        outlet: "Main Branch", // their "home" outlet — OWNER role still gets access to every outlet in the org, this is just where their Employee record lives
      },
      {
        fullName: "Restaurant Manager",
        department: "Management",
        designation: "Manager",
        username: "manager",
        email: "manager@gmail.com",
        password: "123456",
        role: "MANAGER",
        outlet: "Main Branch",
      },
      {
        fullName: "POS Cashier",
        department: "Service",
        designation: "Cashier",
        username: "cashier",
        email: "cashier@gmail.com",
        password: "123456",
        role: "CASHIER",
        outlet: "Main Branch",
      },
      {
        fullName: "Kitchen Staff",
        department: "Kitchen",
        designation: "Chef",
        username: "kitchen",
        email: "kitchen@gmail.com",
        password: "123456",
        role: "KITCHEN",
        outlet: "Main Branch",
      },
      // {
      //   fullName: "Waiter Staff",
      //   department: "Service",
      //   designation: "Waiter",
      //   username: "waiter",
      //   email: "waiter@gmail.com",
      //   password: "123456",
      //   role: "WAITER",
      //   outlet: "Main Branch",
      // },
    ],
  },
  {
    name: "Demo Org Two",
    ownerEmail: "owner2@gmail.com",
    outlets: ["Other Restaurant"],
    users: [
      {
        fullName: "Second Org Owner",
        department: "Management",
        designation: "Owner",
        username: "owner",
        // Deliberately reuses the username "owner" — this is exactly the
        // case auth.service.js's findAccountByIdentifier() has to handle
        // now that username is unique per-organization, not globally.
        // Logging in with "owner" (no @) should be rejected as ambiguous;
        // logging in with the email below should work fine.
        email: "owner2@gmail.com",
        password: "123456",
        role: "OWNER",
        outlet: "Other Restaurant",
      },
    ],
  },
];

async function findOrCreateOrganization(org) {
  const existing = await prisma.organization.findUnique({
    where: { ownerEmail: org.ownerEmail },
  });
  if (existing) {
    console.log(`Organization "${org.name}" already exists — reusing it.`);
    return existing;
  }
  const created = await prisma.organization.create({
    data: { name: org.name, ownerEmail: org.ownerEmail },
  });
  console.log(`Created organization "${org.name}"`);
  return created;
}

async function findOrCreateOutlets(organizationId, outletNames) {
  const outletsByName = {};
  for (const name of outletNames) {
    const existing = await prisma.outlet.findFirst({
      where: { organizationId, name },
    });
    if (existing) {
      outletsByName[name] = existing;
      console.log(`  Outlet "${name}" already exists — reusing it.`);
      continue;
    }
    const created = await prisma.outlet.create({
      data: { organizationId, name },
    });
    outletsByName[name] = created;
    console.log(`  Created outlet "${name}"`);
  }
  return outletsByName;
}

async function main() {
  for (const org of ORGANIZATIONS) {
    const organization = await findOrCreateOrganization(org);
    const outletsByName = await findOrCreateOutlets(organization.id, org.outlets);

    for (const seedUser of org.users) {
      const existing = await prisma.userAccount.findUnique({
        where: { email: seedUser.email },
      });

      if (existing) {
        console.log(`  Skipping ${seedUser.email} — already exists.`);
        continue;
      }

      const outlet = outletsByName[seedUser.outlet];
      if (!outlet) {
        throw new Error(
          `Seed data error: "${seedUser.outlet}" isn't in ${org.name}'s outlets list.`,
        );
      }

      // employeeCode is now @@unique([outletId, employeeCode]) — base the
      // next number on how many employees already exist in THIS outlet,
      // not a global count, so two outlets can each have an EMP-0001.
      const employeeCountInOutlet = await prisma.employee.count({
        where: { outletId: outlet.id },
      });
      const employeeCode = `EMP-${String(employeeCountInOutlet + 1).padStart(4, "0")}`;

      const passwordHash = await bcrypt.hash(seedUser.password, 12);

      await prisma.employee.create({
        data: {
          outletId: outlet.id,
          employeeCode,
          fullName: seedUser.fullName,
          department: seedUser.department,
          designation: seedUser.designation,
          joiningDate: new Date(),
          email: seedUser.email,
          userAccount: {
            create: {
              outletId: outlet.id,
              organizationId: organization.id,
              username: seedUser.username,
              email: seedUser.email,
              passwordHash,
              role: seedUser.role,
            },
          },
        },
      });

      console.log(
        `  Created ${seedUser.role} -> ${seedUser.email} / ${seedUser.password} (outlet: ${seedUser.outlet})`,
      );
    }
  }

  console.log("\nDone. Try logging in as:");
  console.log("  owner@gmail.com / 123456   (Mehfil — 2 outlets, will prompt for outlet selection)");
  console.log("  manager@gmail.com / 123456 (Mehfil — Main Branch only, logs straight in)");
  console.log("  owner2@gmail.com / 123456  (Demo Org Two — separate tenant, logs straight in)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });