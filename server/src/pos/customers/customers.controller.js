// server/src/pos/customers/customers.controller.js
import * as customersService from "./customers.service.js";

export async function getCustomers(req, res) {
  try {
    res.json(await customersService.listCustomers(req.query, req.tenant.outletId));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch customers", error: err.message });
  }
}

export async function searchCustomers(req, res) {
  try {
    res.json(
      await customersService.searchCustomers(req.query.q || "", req.tenant.outletId),
    );
  } catch (err) {
    res.status(500).json({ message: "Failed to search customers", error: err.message });
  }
}

export async function getCustomer(req, res) {
  try {
    const customer = await customersService.getCustomerById(
      req.params.id,
      req.tenant.outletId,
    );
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch customer", error: err.message });
  }
}

export async function createCustomer(req, res) {
  try {
    const customer = await customersService.createCustomer(req.body, req.tenant.outletId);
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ message: "Failed to create customer", error: err.message });
  }
}

export async function updateCustomer(req, res) {
  try {
    const customer = await customersService.updateCustomer(
      req.params.id,
      req.body,
      req.tenant.outletId,
    );
    res.json(customer);
  } catch (err) {
    res.status(400).json({ message: "Failed to update customer", error: err.message });
  }
}

export async function deleteCustomer(req, res) {
  try {
    await customersService.deleteCustomer(req.params.id, req.tenant.outletId);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: "Failed to delete customer", error: err.message });
  }
}