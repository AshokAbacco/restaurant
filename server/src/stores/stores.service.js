import prisma from "../config/prisma.js";

export const getAllStores = () =>
  prisma.store.findMany({
    orderBy: { name: "asc" },
  });

export const getStoreById = (id) =>
  prisma.store.findUnique({ where: { id } });

export const createStore = (data) =>
  prisma.store.create({
    data: {
      name: data.name,
      address: data.address || null,
      phone: data.phone || null,
    },
  });

export const updateStore = (id, data) =>
  prisma.store.update({
    where: { id },
    data: {
      name: data.name,
      address: data.address || null,
      phone: data.phone || null,
    },
  });

// Stores are disabled rather than hard-deleted once anything references them
// (expenses, employees, inventory, etc. all key off Store.name as a string
// today, so a hard delete would silently orphan historical records).
export const deleteStore = async (id) => {
  const store = await prisma.store.findUnique({ where: { id } });
  if (!store) return null;

  const inUse = await prisma.expense.count({ where: { store: store.name } });
  if (inUse > 0) {
    return prisma.store.update({
      where: { id },
      data: { isActive: false },
    });
  }
  return prisma.store.delete({ where: { id } });
};