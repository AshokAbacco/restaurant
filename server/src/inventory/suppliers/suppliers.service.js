// server/src/inventory/suppliers/suppliers.service.js
import prisma from "../../config/prisma.js";

export const listSuppliers = (outletId) =>
  prisma.supplier.findMany({ where: { outletId }, orderBy: { name: "asc" } });

export const getSupplierById = (id, outletId) =>
  prisma.supplier.findFirst({ where: { id, outletId } });

// Supplier history = every purchase entry received from them, most recent first.
export const getSupplierHistory = async (id, outletId) => {
  // FIX: previously queried PurchaseEntry by supplierId with no check the
  // supplier itself belonged to this outlet — a supplierId guessed/reused
  // from another outlet would have returned that outlet's purchase history.
  const supplier = await prisma.supplier.findFirst({ where: { id, outletId } });
  if (!supplier) return null;

  return prisma.purchaseEntry.findMany({
    where: { supplierId: id, outletId },
    include: { ingredient: { select: { name: true, itemCode: true } } },
    orderBy: { createdAt: "desc" },
  });
};

export const createSupplier = (data, outletId) =>
  prisma.supplier.create({
    data: {
      outletId,
      name: data.name,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: data.email,
      gstNumber: data.gstNumber,
      address: data.address,
      paymentTerms: data.paymentTerms,
    },
  });

export const updateSupplier = async (id, data, outletId) => {
  const existing = await prisma.supplier.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Supplier not found");
    err.code = "P2025";
    throw err;
  }
  return prisma.supplier.update({
    where: { id },
    data: {
      name: data.name,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: data.email,
      gstNumber: data.gstNumber,
      address: data.address,
      paymentTerms: data.paymentTerms,
      isEnabled: data.isEnabled,
    },
  });
};

export const deleteSupplier = async (id, outletId) => {
  const existing = await prisma.supplier.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Supplier not found");
    err.code = "P2025";
    throw err;
  }
  return prisma.supplier.delete({ where: { id } });
};