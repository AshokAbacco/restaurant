// server/src/employees/payroll/payroll.controller.js
import * as payrollService from "./payroll.service.js";

export async function getPayroll(req, res) {
  try {
    res.json(await payrollService.listPayroll(req.query, req.tenant.outletId));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch payroll records", error: err.message });
  }
}

export async function generatePayroll(req, res) {
  try {
    res.status(201).json(await payrollService.generatePayroll(req.body, req.tenant.outletId));
  } catch (err) {
    res.status(400).json({ message: "Failed to generate payroll", error: err.message });
  }
}

export async function payPayroll(req, res) {
  try {
    res.json(await payrollService.markAsPaid(req.params.id, req.tenant.outletId));
  } catch (err) {
    res.status(400).json({ message: "Failed to mark payroll as paid", error: err.message });
  }
}