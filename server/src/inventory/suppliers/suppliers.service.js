// server\src\inventory\service\suppliers.service.js
import prisma from "../../config/prisma.js";

export const listSuppliers = () =>
  prisma.supplier.findMany({ orderBy: { name: "asc" } });

export const getSupplierById = (id) =>
  prisma.supplier.findUnique({ where: { id } });

// Supplier history = every purchase entry received from them, most recent first.
export const getSupplierHistory = (id) =>
  prisma.purchaseEntry.findMany({
    where: { supplierId: id },
    include: { ingredient: { select: { name: true, itemCode: true } } },
    orderBy: { createdAt: "desc" },
  });

export const createSupplier = (data) =>
  prisma.supplier.create({
    data: {
      name: data.name,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: data.email,
      gstNumber: data.gstNumber,
      address: data.address,
      paymentTerms: data.paymentTerms,
    },
  });

export const updateSupplier = (id, data) =>
  prisma.supplier.update({
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

export const deleteSupplier = (id) => prisma.supplier.delete({ where: { id } });