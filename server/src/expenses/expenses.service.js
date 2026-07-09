import prisma from "../config/prisma.js";

async function generateExpenseNumber() {
  const count = await prisma.expense.count();
  return `EXP-${String(count + 1).padStart(6, "0")}`;
}

export const getAllExpenses = async (filters = {}) => {
  const { category, status, store, from, to, search } = filters;
  const where = {};

  if (category) where.categoryId = category;
  if (status) where.status = status;
  if (store) where.store = store;
  if (from || to) {
    where.expenseDate = {};
    if (from) where.expenseDate.gte = new Date(from);
    if (to) where.expenseDate.lte = new Date(to);
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { expenseNumber: { contains: search, mode: "insensitive" } },
      { invoiceNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  return prisma.expense.findMany({
    where,
    include: { category: true, supplier: true, attachments: true },
    orderBy: { expenseDate: "desc" },
  });
};

export const getExpenseById = (id) =>
  prisma.expense.findUnique({
    where: { id },
    include: {
      category: true,
      supplier: true,
      attachments: true,
      approvals: true,
      auditLogs: { orderBy: { createdAt: "desc" } },
    },
  });

export const createExpense = async (data, userId) => {
  const expenseNumber = await generateExpenseNumber();

  const expense = await prisma.expense.create({
    data: {
      ...data,
      expenseDate: new Date(data.expenseDate),
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
      supplierId: data.supplierId || null,
      invoiceNumber: data.invoiceNumber || null,
      transactionReference: data.transactionReference || null,
      description: data.description || null,
      paymentMethod: data.paymentMethod || null,
      expenseNumber,
      createdBy: userId || null,
    },
  });

  await prisma.expenseAuditLog.create({
    data: {
      expenseId: expense.id,
      action: "CREATE",
      changedBy: userId || null,
      newValue: data,
    },
  });

  return expense;
};

export const updateExpense = async (id, data, userId) => {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) return null;

  const updated = await prisma.expense.update({ where: { id }, data });

  await prisma.expenseAuditLog.create({
    data: {
      expenseId: id,
      action: "UPDATE",
      changedBy: userId || null,
      oldValue: existing,
      newValue: data,
    },
  });

  return updated;
};

export const deleteExpense = async (id, userId) => {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) return null;

  if (["APPROVED", "PAID"].includes(existing.status)) {
    throw new Error("Cannot delete an approved or paid expense");
  }

  await prisma.expenseAuditLog.create({
    data: {
      expenseId: id,
      action: "DELETE",
      changedBy: userId || null,
      oldValue: existing,
    },
  });

  return prisma.expense.delete({ where: { id } });
};

export const approveExpense = async (id, { action, level, approverId, comment }) => {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return null;

  await prisma.expenseApproval.create({
    data: { expenseId: id, action, level, approverId, comment },
  });

  const newStatus = action === "REJECTED" ? "REJECTED" : "APPROVED";

  const updated = await prisma.expense.update({
    where: { id },
    data: { status: newStatus },
  });

  await prisma.expenseAuditLog.create({
    data: {
      expenseId: id,
      action: action === "REJECTED" ? "REJECT" : "APPROVE",
      changedBy: approverId || null,
      oldValue: { status: expense.status },
      newValue: { status: newStatus },
    },
  });

  // Placeholder hook: once the Profit & Loss module exists, an APPROVED
  // expense should push its totalPaid into that period's calculation here.

  return updated;
};

export const getDashboard = async (store) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const baseWhere = store ? { store } : {};

  const [todayAgg, monthAgg, pendingAgg, paidAgg, unpaidAgg, byCategory, categories] =
    await Promise.all([
      prisma.expense.aggregate({
        where: { ...baseWhere, expenseDate: { gte: startOfToday, lt: endOfToday } },
        _sum: { totalPaid: true },
      }),
      prisma.expense.aggregate({
        where: { ...baseWhere, expenseDate: { gte: startOfMonth } },
        _sum: { totalPaid: true },
      }),
      prisma.expense.aggregate({
        where: { ...baseWhere, status: "PENDING_APPROVAL" },
        _sum: { totalPaid: true },
      }),
      prisma.expense.aggregate({
        where: { ...baseWhere, paymentStatus: "PAID" },
        _sum: { totalPaid: true },
      }),
      prisma.expense.aggregate({
        where: { ...baseWhere, paymentStatus: { in: ["UNPAID", "PARTIAL", "OVERDUE"] } },
        _sum: { totalPaid: true },
      }),
      prisma.expense.groupBy({
        by: ["categoryId"],
        where: baseWhere,
        _sum: { totalPaid: true },
      }),
      prisma.expenseCategory.findMany(),
    ]);

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return {
    todaysExpense: todayAgg._sum.totalPaid || 0,
    monthlyExpense: monthAgg._sum.totalPaid || 0,
    pendingApproval: pendingAgg._sum.totalPaid || 0,
    paidExpenses: paidAgg._sum.totalPaid || 0,
    unpaidExpenses: unpaidAgg._sum.totalPaid || 0,
    categoryWise: byCategory.map((c) => ({
      category: categoryMap[c.categoryId] || "Unknown",
      total: c._sum.totalPaid || 0,
    })),
  };
};

export const getReports = async ({ from, to, groupBy }) => {
  const where = {};
  if (from || to) {
    where.expenseDate = {};
    if (from) where.expenseDate.gte = new Date(from);
    if (to) where.expenseDate.lte = new Date(to);
  }

  if (groupBy === "category") {
    const rows = await prisma.expense.groupBy({
      by: ["categoryId"],
      where,
      _sum: { totalPaid: true },
      _count: { id: true },
    });
    const categories = await prisma.expenseCategory.findMany();
    const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
    return rows.map((r) => ({
      category: categoryMap[r.categoryId] || "Unknown",
      total: r._sum.totalPaid || 0,
      count: r._count.id,
    }));
  }

  return prisma.expense.findMany({
    where,
    include: { category: true, supplier: true },
    orderBy: { expenseDate: "desc" },
  });
};