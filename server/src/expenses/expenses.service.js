import prisma from "../config/prisma.js";
import ExcelJS from "exceljs";

// FIX: was count()+1 — collides with an existing expenseNumber once any
// expense row is ever deleted. Same bug/fix as pos.service.js's
// generateOrderNumber; basing it on the highest number actually seen
// removes the collision. Scoped per outlet now too, since expenseNumber is
// @@unique([outletId, expenseNumber]).
async function generateExpenseNumber(outletId) {
  const last = await prisma.expense.findFirst({
    where: { outletId },
    orderBy: { expenseNumber: "desc" },
    select: { expenseNumber: true },
  });
  const lastNum = last
    ? parseInt(last.expenseNumber.replace("EXP-", ""), 10) || 0
    : 0;
  return `EXP-${String(lastNum + 1).padStart(6, "0")}`;
}

// ==============================================
// EXCEL IMPORT
// ==============================================
//
// FIX: "Store" used to be a required column here, matched against a
// free-text `Expense.store` field. That field doesn't exist anymore (see
// schema.prisma section 0.1) — which outlet an imported expense belongs to
// is no longer something a spreadsheet cell decides, it's simply the
// outlet of whoever is logged in and doing the import. Removed the column
// entirely rather than quietly ignoring it, so the template/instructions
// don't ask for something that no longer means anything.

const IMPORT_COLUMNS = [
  { header: "Title", key: "title", required: true },
  { header: "Category", key: "categoryName", required: true },
  { header: "Expense Date (YYYY-MM-DD)", key: "expenseDate", required: true },
  { header: "Amount", key: "amount", required: true },
  { header: "GST Amount", key: "gstAmount", required: false },
  { header: "Discount", key: "discount", required: false },
  { header: "Invoice Number", key: "invoiceNumber", required: false },
  { header: "Payment Method", key: "paymentMethod", required: false },
  { header: "Payment Status", key: "paymentStatus", required: false },
  { header: "Payment Date (YYYY-MM-DD)", key: "paymentDate", required: false },
  {
    header: "Transaction Reference",
    key: "transactionReference",
    required: false,
  },
  { header: "Description", key: "description", required: false },
];

const VALID_PAYMENT_METHODS = [
  "CASH",
  "CARD",
  "UPI",
  "BANK_TRANSFER",
  "CHEQUE",
  "OTHER",
];
const VALID_PAYMENT_STATUSES = ["UNPAID", "PARTIAL", "PAID", "OVERDUE"];

const REQUIRED_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF8CBAD" },
}; // soft red/orange
const OPTIONAL_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFDCE6F7" },
}; // soft blue
const REQUIRED_FONT_COLOR = { argb: "FF7A2E0E" };

// Builds the downloadable template:
//  - a Data sheet where required columns are shaded red and marked with *,
//    optional columns are shaded blue, dropdowns are provided for Category /
//    Payment Method / Payment Status so people can't mistype them, and the
//    header row is frozen so it stays visible while scrolling.
//  - an Instructions sheet with a plain-language headline up top, then a
//    row-by-row breakdown of every column (with the real, current category
//    names so people don't have to guess).
//  - a hidden Lists sheet that just backs the Category dropdown.
export const generateImportTemplate = async (outletId) => {
  const workbook = new ExcelJS.Workbook();

  const categories = await prisma.expenseCategory.findMany({
    where: { outletId, isEnabled: true },
    orderBy: { name: "asc" },
  });
  const categoryNames =
    categories.map((c) => c.name).join(", ") ||
    "(no categories yet — add one first)";

  // ---------- Data sheet ----------
  const data = workbook.addWorksheet("Data", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  data.columns = IMPORT_COLUMNS.map((c) => ({
    header: c.required ? `${c.header} *` : c.header,
    key: c.key,
    width: 26,
  }));

  IMPORT_COLUMNS.forEach((col, i) => {
    const cell = data.getRow(1).getCell(i + 1);
    cell.font = {
      bold: true,
      color: col.required ? REQUIRED_FONT_COLOR : { argb: "FF1F1F1F" },
    };
    cell.fill = col.required ? REQUIRED_FILL : OPTIONAL_FILL;
    cell.alignment = { wrapText: true, vertical: "middle" };
  });
  data.getRow(1).height = 30;

  data.addRow({
    title: "Example: June Electricity Bill",
    categoryName: categories[0]?.name || "Utilities",
    expenseDate: "2026-06-05",
    amount: 4500,
    gstAmount: 0,
    discount: 0,
    invoiceNumber: "INV-1029",
    paymentMethod: "UPI",
    paymentStatus: "PAID",
    paymentDate: "2026-06-06",
    transactionReference: "UPI123456",
    description: "Delete this example row before importing your own data",
  });
  data.getRow(2).font = { italic: true, color: { argb: "FF999999" } };

  // Dropdown validations so Category / Payment Method / Payment Status can't
  // be mistyped. Category pulls from a hidden sheet since names are dynamic
  // and can be longer than Excel's ~255-char inline-list limit.
  const LAST_ROW = 500; // room to add many rows without re-downloading

  if (categories.length > 0) {
    const lists = workbook.addWorksheet("Lists");
    lists.state = "hidden";
    lists.getCell("A1").value = "Category";
    categories.forEach((c, i) => {
      lists.getCell(`A${i + 2}`).value = c.name;
    });
    const categoryColLetter = data.getColumn("categoryName").letter;
    for (let r = 2; r <= LAST_ROW; r++) {
      data.getCell(`${categoryColLetter}${r}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [`Lists!$A$2:$A$${categories.length + 1}`],
        showErrorMessage: true,
        errorTitle: "Unknown category",
        error:
          "Pick a category from the dropdown — it must match one already set up in the app.",
      };
    }
  }

  const paymentMethodColLetter = data.getColumn("paymentMethod").letter;
  const paymentStatusColLetter = data.getColumn("paymentStatus").letter;
  for (let r = 2; r <= LAST_ROW; r++) {
    data.getCell(`${paymentMethodColLetter}${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${VALID_PAYMENT_METHODS.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "Unknown payment method",
      error: `Must be one of: ${VALID_PAYMENT_METHODS.join(", ")} (or leave blank).`,
    };
    data.getCell(`${paymentStatusColLetter}${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${VALID_PAYMENT_STATUSES.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "Unknown payment status",
      error: `Must be one of: ${VALID_PAYMENT_STATUSES.join(", ")} (or leave blank — defaults to UNPAID).`,
    };
  }

  // ---------- Instructions sheet ----------
  const instructions = workbook.addWorksheet("Instructions");
  instructions.columns = [
    { key: "column", width: 6 },
    { key: "required", width: 36 },
    { key: "help", width: 75 },
  ];

  instructions.mergeCells("A1:C1");
  instructions.getCell("A1").value = "📋 How to fill this template";
  instructions.getCell("A1").font = {
    bold: true,
    size: 16,
    color: { argb: "FF1F4E78" },
  };
  instructions.getRow(1).height = 28;

  instructions.mergeCells("A2:C2");
  instructions.getCell("A2").value =
    "Go to the 'Data' tab and fill in one row per expense. Columns shaded RED are required; " +
    "columns shaded BLUE are optional. Category, Payment Method and Payment Status have dropdown " +
    "lists — click a cell in those columns and choose from the arrow instead of typing. Delete the " +
    "grey example row before importing your real data, then upload the file back in the app to see " +
    "a preview of what will be imported and any rows that need fixing.";
  instructions.getCell("A2").alignment = { wrapText: true, vertical: "top" };
  instructions.getRow(2).height = 75;

  instructions.mergeCells("A3:C3"); // spacer row

  instructions.getRow(4).values = ["", "Required?", "What to enter"];
  instructions.getRow(4).font = { bold: true };
  instructions.getRow(4).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDCE6F7" },
  };

  const instructionRows = [
    {
      required: "Title *",
      help: "Short name for the expense, e.g. 'June Electricity Bill'.",
    },
    {
      required: "Category *",
      help: `Pick from the dropdown. Available: ${categoryNames}`,
    },
    {
      required: "Expense Date *",
      help: "Format: YYYY-MM-DD, e.g. 2026-07-09.",
    },
    {
      required: "Amount *",
      help: "Bill amount before GST/discount. Must be a number greater than 0.",
    },
    {
      required: "GST Amount",
      help: "Leave blank for 0. This is the GST amount in rupees, not a percentage.",
    },
    { required: "Discount", help: "Leave blank for 0." },
    {
      required: "Invoice Number",
      help: "Supplier's invoice/bill number, if you have one.",
    },
    {
      required: "Payment Method",
      help: "Pick from the dropdown, or leave blank.",
    },
    {
      required: "Payment Status",
      help: "Pick from the dropdown. Defaults to UNPAID if left blank.",
    },
    {
      required: "Payment Date",
      help: "Format: YYYY-MM-DD. Required only if Payment Status is PAID or PARTIAL.",
    },
    {
      required: "Transaction Reference",
      help: "UPI reference number or cheque number, if applicable.",
    },
    { required: "Description", help: "Any extra notes about this expense." },
  ];
  instructionRows.forEach((r, i) => {
    const row = instructions.getRow(5 + i);
    row.values = ["", r.required, r.help];
    row.getCell(3).alignment = { wrapText: true, vertical: "top" };
  });

  return workbook.xlsx.writeBuffer();
};

const parseExcelDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// Reads an uploaded file and validates every row WITHOUT touching the DB.
// Returns { validRows, errorRows } for the frontend preview step.
export const parseImportFile = async (fileBuffer, outletId) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const sheet = workbook.getWorksheet("Data") || workbook.worksheets[0];
  if (!sheet) throw new Error("Could not find a 'Data' sheet in this file");

  const categories = await prisma.expenseCategory.findMany({ where: { outletId } });
  const categoryByName = Object.fromEntries(
    categories.map((c) => [c.name.trim().toLowerCase(), c]),
  );

  const validRows = [];
  const errorRows = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header row

    const values = row.values; // 1-indexed; values[0] is empty
    const isBlank = values
      .slice(1)
      .every((v) => v === null || v === undefined || v === "");
    if (isBlank) return;

    const record = {};
    IMPORT_COLUMNS.forEach((col, i) => {
      record[col.key] = values[i + 1];
    });

    // skip the shipped example row
    if (typeof record.title === "string" && record.title.startsWith("Example:"))
      return;

    const errors = [];

    if (!record.title || !String(record.title).trim())
      errors.push("Title is required");

    const categoryMatch = record.categoryName
      ? categoryByName[String(record.categoryName).trim().toLowerCase()]
      : null;
    if (!record.categoryName || !String(record.categoryName).trim()) {
      errors.push("Category is required");
    } else if (!categoryMatch) {
      errors.push(
        `Category "${record.categoryName}" was not found — check spelling against the Instructions sheet`,
      );
    }

    const expenseDate = parseExcelDate(record.expenseDate);
    if (!expenseDate)
      errors.push(
        "Expense Date is missing or not a valid date (use YYYY-MM-DD)",
      );

    const amount = Number(record.amount);
    if (!record.amount || isNaN(amount) || amount <= 0)
      errors.push("Amount must be a number greater than 0");

    const gstAmount = record.gstAmount ? Number(record.gstAmount) : 0;
    if (record.gstAmount && isNaN(gstAmount))
      errors.push("GST Amount must be a number");

    const discount = record.discount ? Number(record.discount) : 0;
    if (record.discount && isNaN(discount))
      errors.push("Discount must be a number");

    const paymentMethod = record.paymentMethod
      ? String(record.paymentMethod).trim().toUpperCase()
      : null;
    if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      errors.push(
        `Payment Method "${record.paymentMethod}" is not valid (${VALID_PAYMENT_METHODS.join(", ")})`,
      );
    }

    const paymentStatus = record.paymentStatus
      ? String(record.paymentStatus).trim().toUpperCase()
      : "UNPAID";
    if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
      errors.push(
        `Payment Status "${record.paymentStatus}" is not valid (${VALID_PAYMENT_STATUSES.join(", ")})`,
      );
    }

    const paymentDate = parseExcelDate(record.paymentDate);
    if (["PAID", "PARTIAL"].includes(paymentStatus) && !paymentDate) {
      errors.push(
        "Payment Date is required when Payment Status is PAID or PARTIAL",
      );
    }

    if (errors.length > 0) {
      errorRows.push({ rowNumber, errors });
      return;
    }

    validRows.push({
      rowNumber,
      title: String(record.title).trim(),
      categoryId: categoryMatch.id,
      categoryName: categoryMatch.name,
      expenseDate: expenseDate.toISOString(),
      amount,
      gstAmount,
      discount,
      totalPaid: Math.max(0, amount + gstAmount - discount),
      invoiceNumber: record.invoiceNumber
        ? String(record.invoiceNumber).trim()
        : null,
      paymentMethod,
      paymentStatus,
      paymentDate: paymentDate ? paymentDate.toISOString() : null,
      transactionReference: record.transactionReference
        ? String(record.transactionReference).trim()
        : null,
      description: record.description
        ? String(record.description).trim()
        : null,
    });
  });

  return { validRows, errorRows };
};

// Actually creates the expenses. Sequential (not Promise.all) because
// generateExpenseNumber() counts rows — parallel creates would race and
// could hand out duplicate expense numbers.
export const bulkCreateExpenses = async (rows, userId, outletId) => {
  const created = [];
  for (const row of rows) {
    const expense = await createExpense(
      {
        title: row.title,
        categoryId: row.categoryId,
        expenseDate: row.expenseDate,
        amount: row.amount,
        gstAmount: row.gstAmount,
        discount: row.discount,
        totalPaid: row.totalPaid,
        invoiceNumber: row.invoiceNumber,
        paymentMethod: row.paymentMethod,
        paymentStatus: row.paymentStatus,
        paymentDate: row.paymentDate,
        transactionReference: row.transactionReference,
        description: row.description,
      },
      userId,
      outletId,
    );
    created.push(expense);
  }
  return created;
};

// Called when the user clicks "Confirm Import". Re-checks the rows the
// client already validated (categories/amounts could theoretically have
// changed since the preview) before actually writing anything.
export const confirmImportRows = async (rows, userId, outletId) => {
  const categories = await prisma.expenseCategory.findMany({ where: { outletId } });
  const categoryIds = new Set(categories.map((c) => c.id));

  const toCreate = [];
  const skipped = [];

  for (const row of rows) {
    if (
      !row.categoryId ||
      !categoryIds.has(row.categoryId) ||
      !row.amount ||
      row.amount <= 0 ||
      !row.expenseDate
    ) {
      skipped.push({
        rowNumber: row.rowNumber,
        reason: "No longer valid — please re-upload and preview again",
      });
      continue;
    }
    toCreate.push(row);
  }

  const created = await bulkCreateExpenses(toCreate, userId, outletId);
  return { created, skipped };
};

// ==============================================
// EXCEL EXPORT
// ==============================================

export const exportExpensesToExcel = async (filters = {}, outletId) => {
  const expenses = await getAllExpenses(filters, outletId);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Expenses");

  sheet.columns = [
    { header: "Expense Number", key: "expenseNumber", width: 16 },
    { header: "Title", key: "title", width: 30 },
    { header: "Category", key: "category", width: 20 },
    { header: "Expense Date", key: "expenseDate", width: 14 },
    { header: "Amount", key: "amount", width: 12 },
    { header: "GST Amount", key: "gstAmount", width: 12 },
    { header: "Discount", key: "discount", width: 12 },
    { header: "Total Paid", key: "totalPaid", width: 14 },
    { header: "Invoice Number", key: "invoiceNumber", width: 16 },
    { header: "Payment Method", key: "paymentMethod", width: 16 },
    { header: "Payment Status", key: "paymentStatus", width: 14 },
    { header: "Payment Date", key: "paymentDate", width: 14 },
    { header: "Status", key: "status", width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDCE6F7" },
  };

  expenses.forEach((e) => {
    sheet.addRow({
      expenseNumber: e.expenseNumber,
      title: e.title,
      category: e.category?.name || "",
      expenseDate: e.expenseDate
        ? new Date(e.expenseDate).toLocaleDateString("en-IN")
        : "",
      amount: Number(e.amount),
      gstAmount: Number(e.gstAmount),
      discount: Number(e.discount),
      totalPaid: Number(e.totalPaid),
      invoiceNumber: e.invoiceNumber || "",
      paymentMethod: e.paymentMethod || "",
      paymentStatus: e.paymentStatus,
      paymentDate: e.paymentDate
        ? new Date(e.paymentDate).toLocaleDateString("en-IN")
        : "",
      status: e.status,
    });
  });

  return workbook.xlsx.writeBuffer();
};

export const getAllExpenses = async (filters = {}, outletId) => {
  const { category, status, from, to, search } = filters;
  const where = { outletId };

  if (category) where.categoryId = category;
  if (status) where.status = status;
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

export const getExpenseById = (id, outletId) =>
  prisma.expense.findFirst({
    where: { id, outletId },
    include: {
      category: true,
      supplier: true,
      attachments: true,
      approvals: true,
      auditLogs: { orderBy: { createdAt: "desc" } },
    },
  });

export const createExpense = async (data, userId, outletId) => {
  const expenseNumber = await generateExpenseNumber(outletId);

  const expense = await prisma.expense.create({
    data: {
      ...data,
      outletId,
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

export const updateExpense = async (id, data, userId, outletId) => {
  const existing = await prisma.expense.findFirst({ where: { id, outletId } });
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

export const deleteExpense = async (id, userId, outletId) => {
  const existing = await prisma.expense.findFirst({ where: { id, outletId } });
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

export const approveExpense = async (
  id,
  { action, level, approverId, comment },
  outletId,
) => {
  const expense = await prisma.expense.findFirst({ where: { id, outletId } });
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

export const getDashboard = async (outletId) => {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const baseWhere = { outletId };

  const [
    todayAgg,
    monthAgg,
    pendingAgg,
    paidAgg,
    unpaidAgg,
    byCategory,
    categories,
  ] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        ...baseWhere,
        expenseDate: { gte: startOfToday, lt: endOfToday },
      },
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
      where: {
        ...baseWhere,
        paymentStatus: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
      },
      _sum: { totalPaid: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: baseWhere,
      _sum: { totalPaid: true },
    }),
    prisma.expenseCategory.findMany({ where: { outletId } }),
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

export const getReports = async ({ from, to, groupBy }, outletId) => {
  const where = { outletId };
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
    const categories = await prisma.expenseCategory.findMany({ where: { outletId } });
    const categoryMap = Object.fromEntries(
      categories.map((c) => [c.id, c.name]),
    );
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