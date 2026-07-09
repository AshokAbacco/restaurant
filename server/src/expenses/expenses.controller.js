import * as expenseService from "./expenses.service.js";

export const getAllExpenses = async (req, res) => {
  try {
    const expenses = await expenseService.getAllExpenses(req.query);
    return res.status(200).json(expenses);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getExpenseById = async (req, res) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.id);

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

    const expense = await expenseService.createExpense(
      req.body,
      req.body.createdBy
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
      req.body.updatedBy
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
      req.query.userId
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
    const { action, level, approverId, comment } = req.body;

    if (!action) {
      return res.status(400).json({ error: "Approval action is required" });
    }

    if (!["APPROVED", "REJECTED"].includes(action)) {
      return res.status(400).json({
        error: "Action must be APPROVED or REJECTED",
      });
    }

    const updated = await expenseService.approveExpense(req.params.id, {
      action,
      level,
      approverId,
      comment,
    });

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
    const dashboard = await expenseService.getDashboard(req.query.store);
    return res.status(200).json(dashboard);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getReports = async (req, res) => {
  try {
    const report = await expenseService.getReports(req.query);
    return res.status(200).json(report);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};