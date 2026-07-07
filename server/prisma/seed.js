// ==============================================
// prisma/seed.js
// Run with: node prisma/seed.js
// ==============================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const SEED_USERS = [
  {
    fullName: "Restaurant Owner",
    department: "Management",
    designation: "Owner",
    username: "owner",
    email: "owner@gmail.com",
    password: "123456",
    role: "OWNER",
  },
  {
    fullName: "Restaurant Manager",
    department: "Management",
    designation: "Manager",
    username: "manager",
    email: "manager@gmail.com",
    password: "123456",
    role: "MANAGER",
  },
  {
    fullName: "POS Cashier",
    department: "Service",
    designation: "Cashier",
    username: "cashier",
    email: "cashier@gmail.com",
    password: "123456",
    role: "CASHIER",
  },
  {
    fullName: "Kitchen Staff",
    department: "Kitchen",
    designation: "Chef",
    username: "kitchen",
    email: "kitchen@gmail.com",
    password: "123456",
    role: "KITCHEN",
  },
];

async function main() {
  for (let i = 0; i < SEED_USERS.length; i++) {
    const seedUser = SEED_USERS[i];

    const existing = await prisma.userAccount.findUnique({
      where: { email: seedUser.email },
    });

    if (existing) {
      console.log(`Skipping ${seedUser.email} — already exists.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(seedUser.password, 12);

    // employeeCode is unique/required with no @default in the schema, so we
    // generate one here — swap for your own numbering scheme if you have one.
    const employeeCode = `EMP-${String(i + 1).padStart(4, "0")}`;

    await prisma.employee.create({
      data: {
        employeeCode,
        fullName: seedUser.fullName,
        department: seedUser.department,
        designation: seedUser.designation,
        joiningDate: new Date(),
        email: seedUser.email,
        userAccount: {
          create: {
            username: seedUser.username,
            email: seedUser.email,
            passwordHash,
            role: seedUser.role,
          },
        },
      },
    });

    console.log(
      `Created ${seedUser.role} -> ${seedUser.email} / ${seedUser.password}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
