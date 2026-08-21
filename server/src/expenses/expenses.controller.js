import * as expenseService from "./expenses.service.js";
import multer from "multer";


export const uploadMiddleware = multer({ storage: multer.memoryStorage() }).single("file");

export const downloadImportTemplate = async (req, res) => {
  try {
    const buffer = await expenseService.generateImportTemplate(req.tenant.outletId);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="expense-import-template.xlsx"');
    return res.send(Buffer.from(buffer));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const validateImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please attach an .xlsx file" });
    }
    const result = await expenseService.parseImportFile(req.file.buffer, req.tenant.outletId);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const confirmImport = async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No rows to import" });
    }
    // FIX: was req.body.createdBy — nothing in the frontend actually sends
    // that, so every imported expense's audit trail silently had no
    // creator. Using the authenticated session's employeeId instead.
    const result = await expenseService.confirmImportRows(
      rows,
      req.user?.employeeId,
      req.tenant.outletId,
    );
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const exportExpenses = async (req, res) => {
  try {
    const buffer = await expenseService.exportExpensesToExcel(req.query, req.tenant.outletId);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="expenses-export.xlsx"');
    return res.send(Buffer.from(buffer));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getAllExpenses = async (req, res) => {
  try {
    const expenses = await expenseService.getAllExpenses(req.query, req.tenant.outletId);
    return res.status(200).json(expenses);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getExpenseById = async (req, res) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.id, req.tenant.outletId);

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    return res.status(200).json(expense);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const createExpense = async (req, res) => {
  try {
    const {
      title,
      amount,
      categoryId,
      expenseDate,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: "Expense title is required" });
    }

    if (!categoryId) {
      return res.status(400).json({ error: "Expense category is required" });
    }

    if (!expenseDate) {
      return res.status(400).json({ error: "Expense date is required" });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    // FIX: was req.body.createdBy — same always-unsent gap as confirmImport.
    const expense = await expenseService.createExpense(
      req.body,
      req.user?.employeeId,
      req.tenant.outletId,
    );

    return res.status(201).json(expense);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const {
      title,
      amount,
      categoryId,
      expenseDate,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: "Expense title is required" });
    }

    if (!categoryId) {
      return res.status(400).json({ error: "Expense category is required" });
    }

    if (!expenseDate) {
      return res.status(400).json({ error: "Expense date is required" });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    const updated = await expenseService.updateExpense(
      req.params.id,
      req.body,
      req.user?.employeeId,
      req.tenant.outletId,
    );

    if (!updated) {
      return res.status(404).json({ error: "Expense not found" });
    }

    return res.status(200).json(updated);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const deleted = await expenseService.deleteExpense(
      req.params.id,
      req.user?.employeeId,
      req.tenant.outletId,
    );

    if (!deleted) {
      return res.status(404).json({ error: "Expense not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const approveExpense = async (req, res) => {
  try {
    const { action, level, comment } = req.body;

    if (!action) {
      return res.status(400).json({ error: "Approval action is required" });
    }

    if (!["APPROVED", "REJECTED"].includes(action)) {
      return res.status(400).json({
        error: "Action must be APPROVED or REJECTED",
      });
    }

    // FIX: was req.body.approverId — same always-unsent gap; the approver
    // is whoever is actually logged in and clicking Approve/Reject, not a
    // value the client should get to assert about itself.
    const updated = await expenseService.approveExpense(
      req.params.id,
      {
        action,
        level,
        approverId: req.user?.employeeId,
        comment,
      },
      req.tenant.outletId,
    );

    if (!updated) {
      return res.status(404).json({ error: "Expense not found" });
    }

    return res.status(200).json(updated);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const getDashboard = async (req, res) => {
  try {
    const dashboard = await expenseService.getDashboard(req.tenant.outletId);
    return res.status(200).json(dashboard);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getReports = async (req, res) => {
  try {
    const report = await expenseService.getReports(req.query, req.tenant.outletId);
    return res.status(200).json(report);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};