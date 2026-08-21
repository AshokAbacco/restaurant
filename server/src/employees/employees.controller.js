// server/src/employees/employees.controller.js
import * as employeesService from "./employees.service.js";

export async function getEmployees(req, res) {
  try {
    const result = await employeesService.listEmployees(req.query, req.tenant.outletId);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch employees", error: err.message });
  }
}

export async function getEmployee(req, res) {
  try {
    const employee = await employeesService.getEmployeeById(req.params.id, req.tenant.outletId);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch employee", error: err.message });
  }
}

export async function createEmployee(req, res) {
  try {
    const employee = await employeesService.createEmployee(req.body, req.tenant.outletId);
    res.status(201).json(employee);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to create employee", error: err.message });
  }
}

export async function updateEmployee(req, res) {
  try {
    const employee = await employeesService.updateEmployee(
      req.params.id,
      req.body,
      req.tenant.outletId,
    );
    res.json(employee);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to update employee", error: err.message });
  }
}

export async function deleteEmployee(req, res) {
  try {
    await employeesService.deleteEmployee(req.params.id, req.user, req.tenant.outletId);
    res.status(204).send();
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to delete employee", error: err.message });
  }
}

export async function createLoginAccount(req, res) {
  try {
    const account = await employeesService.createLoginAccount(
      req.params.id,
      req.body,
      req.user,
      req.tenant.outletId,
    );
    res.status(201).json(account);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to create login account", error: err.message });
  }
}

export async function getDashboard(req, res) {
  try {
    const stats = await employeesService.getDashboardStats(req.tenant.outletId);
    res.json(stats);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch dashboard stats", error: err.message });
  }
}