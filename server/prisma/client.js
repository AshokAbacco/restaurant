// ==============================================
// src/prisma/client.js
// ==============================================
// Single shared PrismaClient instance. In dev with hot-reload, re-importing
// this module must not spawn a new client each time, so we stash it on
// globalThis the way Prisma's own docs recommend.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
