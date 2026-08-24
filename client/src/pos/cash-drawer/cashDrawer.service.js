// server/src/pos/cash-drawer/cashDrawer.service.js
//
// Phase 2.1 — Cash Flow / Withdrawal / Cash Top-Up / Currency Conversion.
// See schema.prisma's CashDrawerSession/CashDrawerTransaction for why this
// is deliberately separate from PettyCashSession/Expense — this reconciles
// physical cash in the drawer, it doesn't track spending.
import prisma from "../../config/prisma.js";

class CashDrawerError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const SESSION_INCLUDE = {
  openedBy: { select: { fullName: true, employeeCode: true } },
  closedBy: { select: { fullName: true, employeeCode: true } },
  transactions: {
    orderBy: { createdAt: "desc" },
    include: { performedBy: { select: { fullName: true, employeeCode: true } } },
  },
};

// ==================================================
// OPEN
// ==================================================

export async function getCurrentSession(outletId) {
  return prisma.cashDrawerSession.findFirst({
    where: { outletId, status: "OPEN" },
    include: SESSION_INCLUDE,
  });
}

export async function openSession({ openingFloat, notes, openedById }, outletId) {
  const existing = await prisma.cashDrawerSession.findFirst({
    where: { outletId, status: "OPEN" },
  });
  if (existing) {
    throw new CashDrawerError(
      "A cash drawer session is already open for this outlet. Close it before opening a new one.",
      409,
    );
  }

  if (openingFloat === undefined || Number(openingFloat) < 0) {
    throw new CashDrawerError("openingFloat must be a non-negative amount.");
  }

  return prisma.cashDrawerSession.create({
    data: {
      outletId,
      openingFloat,
      openedById: openedById || null,
      notes: notes || null,
    },
    include: SESSION_INCLUDE,
  });
}

// ==================================================
// READ
// ==================================================

export async function getSessionById(id, outletId) {
  return prisma.cashDrawerSession.findFirst({
    where: { id, outletId },
    include: SESSION_INCLUDE,
  });
}

export async function listSessions({ status, page = 1, limit = 20 }, outletId) {
  const where = { outletId, ...(status ? { status } : {}) };

  const [data, total] = await Promise.all([
    prisma.cashDrawerSession.findMany({
      where,
      include: SESSION_INCLUDE,
      orderBy: { openedAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.cashDrawerSession.count({ where }),
  ]);

  return { data, total, page: Number(page), limit: Number(limit) };
}

async function assertOpenSession(sessionId, outletId) {
  const session = await prisma.cashDrawerSession.findFirst({
    where: { id: sessionId, outletId },
  });
  if (!session) throw new CashDrawerError("Cash drawer session not found", 404);
  if (session.status !== "OPEN") {
    throw new CashDrawerError("This session is already closed.", 409);
  }
  return session;
}

// ==================================================
// TRANSACTIONS
// ==================================================

async function createTransaction(sessionId, data, outletId) {
  return prisma.cashDrawerTransaction.create({
    data: { outletId, sessionId, ...data },
    include: { performedBy: { select: { fullName: true, employeeCode: true } } },
  });
}

export async function withdraw(sessionId, { amount, reason, performedById }, outletId) {
  await assertOpenSession(sessionId, outletId);
  if (!amount || Number(amount) <= 0) {
    throw new CashDrawerError("amount must be greater than 0.");
  }
  if (!reason || !reason.trim()) {
    throw new CashDrawerError("A reason is required for a withdrawal.");
  }

  return createTransaction(
    sessionId,
    { type: "WITHDRAWAL", amount, reason: reason.trim(), performedById: performedById || null },
    outletId,
  );
}

export async function topUp(sessionId, { amount, reason, performedById }, outletId) {
  await assertOpenSession(sessionId, outletId);
  if (!amount || Number(amount) <= 0) {
    throw new CashDrawerError("amount must be greater than 0.");
  }

  return createTransaction(
    sessionId,
    { type: "TOP_UP", amount, reason: reason || null, performedById: performedById || null },
    outletId,
  );
}

export async function convertCurrency(
  sessionId,
  { fromCurrency, toCurrency, foreignAmount, exchangeRate, performedById },
  outletId,
) {
  await assertOpenSession(sessionId, outletId);

  if (!fromCurrency || !toCurrency) {
    throw new CashDrawerError("fromCurrency and toCurrency are required.");
  }
  if (!foreignAmount || Number(foreignAmount) <= 0) {
    throw new CashDrawerError("foreignAmount must be greater than 0.");
  }
  if (!exchangeRate || Number(exchangeRate) <= 0) {
    throw new CashDrawerError("exchangeRate must be greater than 0.");
  }

  // The drawer's own currency total moves by the CONVERTED amount (what
  // actually lands in the till), not the foreign face value — amount on
  // this row is always in the outlet's own currency, same as every other
  // CashDrawerTransaction.
  const convertedAmount = Math.round(Number(foreignAmount) * Number(exchangeRate) * 100) / 100;

  return createTransaction(
    sessionId,
    {
      type: "CURRENCY_CONVERSION",
      amount: convertedAmount,
      reason: `Converted ${foreignAmount} ${fromCurrency} -> ${convertedAmount} ${toCurrency}`,
      fromCurrency,
      toCurrency,
      exchangeRate,
      performedById: performedById || null,
    },
    outletId,
  );
}

// Called from billing.service.js whenever a CASH payment is recorded —
// never called directly by a controller/route. Silently no-ops if there's
// no open session, rather than blocking a sale over till bookkeeping —
// a restaurant should never be unable to take a customer's cash just
// because nobody remembered to open a drawer session that morning. The
// gap just won't show up in cash reconciliation for that sale.
export async function recordSaleIfSessionOpen(amount, outletId, performedById) {
  const session = await prisma.cashDrawerSession.findFirst({
    where: { outletId, status: "OPEN" },
  });
  if (!session) return null;

  return createTransaction(
    session.id,
    { type: "SALE", amount, performedById: performedById || null },
    outletId,
  );
}

// ==================================================
// CLOSE / RECONCILE
// ==================================================

function computeExpectedClosingAmount(session) {
  const netMovement = session.transactions.reduce((sum, t) => {
    // SALE, TOP_UP, CURRENCY_CONVERSION all ADD to the drawer;
    // WITHDRAWAL removes from it.
    const sign = t.type === "WITHDRAWAL" ? -1 : 1;
    return sum + sign * Number(t.amount);
  }, 0);
  return Math.round((Number(session.openingFloat) + netMovement) * 100) / 100;
}

export async function closeSession(sessionId, { closingCounted, closedById, notes }, outletId) {
  const session = await prisma.cashDrawerSession.findFirst({
    where: { id: sessionId, outletId },
    include: { transactions: true },
  });
  if (!session) throw new CashDrawerError("Cash drawer session not found", 404);
  if (session.status !== "OPEN") {
    throw new CashDrawerError("This session is already closed.", 409);
  }
  if (closingCounted === undefined || Number(closingCounted) < 0) {
    throw new CashDrawerError("closingCounted must be a non-negative amount.");
  }

  const expectedClosingAmount = computeExpectedClosingAmount(session);
  const variance =
    Math.round((Number(closingCounted) - expectedClosingAmount) * 100) / 100;

  const closed = await prisma.cashDrawerSession.update({
    where: { id: sessionId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closingCounted,
      expectedClosingAmount,
      closedById: closedById || null,
      notes: notes || session.notes,
    },
    include: SESSION_INCLUDE,
  });

  return { session: closed, expectedClosingAmount, variance };
}

export { CashDrawerError };