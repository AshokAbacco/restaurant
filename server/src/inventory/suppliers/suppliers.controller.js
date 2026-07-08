// server\src\inventory\controllers\suppliers.controller.js
import * as suppliersService from "./suppliers.service.js";

export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await suppliersService.listSuppliers();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch suppliers", error: err.message });
  }
};

export const getSupplier = async (req, res) => {
  try {
    const supplier = await suppliersService.getSupplierById(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch supplier", error: err.message });
  }
};

export const getSupplierHistory = async (req, res) => {
  try {
    const history = await suppliersService.getSupplierHistory(req.params.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch supplier history", error: err.message });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const supplier = await suppliersService.createSupplier(req.body);
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ message: "Failed to create supplier", error: err.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const supplier = await suppliersService.updateSupplier(req.params.id, req.body);
    res.json(supplier);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.status(500).json({ message: "Failed to update supplier", error: err.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    await suppliersService.deleteSupplier(req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Supplier not found" });
    }
    if (err.code === "P2003") {
      return res
        .status(409)
        .json({ message: "Cannot delete a supplier with existing purchase history" });
    }
    res.status(500).json({ message: "Failed to delete supplier", error: err.message });
  }
};