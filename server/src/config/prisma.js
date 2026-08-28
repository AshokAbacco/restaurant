//server\src\config\prisma.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  // Safety net, NOT the fix for the "Transaction already closed" error on
  // Send to Kitchen — that one is fixed properly in pos.service.js by
  // moving read work out of the transaction (see the long comment on
  // createOrderAndSendToKitchen).
  //
  // These raised defaults exist because DATABASE_URL points at a Render
  // Postgres in Oregon while this app runs from India, so every single
  // query costs ~350-500 ms of network time. Prisma's stock 5 s
  // interactive-transaction budget is simply too tight for that link, and
  // the other interactive transactions in this codebase (deleteOrder,
  // billing, stock consumption) would eventually trip over it too.
  transactionOptions: {
    maxWait: 10000, // how long to wait for a free connection
    timeout: 30000, // how long a transaction body may run
  },
});

export default prisma;