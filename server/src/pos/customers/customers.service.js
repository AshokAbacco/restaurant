// server/src/pos/customers/customers.service.js
import prisma from "../../config/prisma.js";

export async function listCustomers({ search, page = 1, limit = 20 }, outletId) {
  const where = {
    outletId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { mobile: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.customer.count({ where }),
  ]);

  return { data, total, page: Number(page), limit: Number(limit) };
}

// Used by POS search bar — quick lookup by mobile/name while taking an order.
export async function searchCustomers(query, outletId) {
  return prisma.customer.findMany({
    where: {
      outletId,
      OR: [
        { mobile: { contains: query } },
        { name: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 10,
  });
}

export async function getCustomerById(id, outletId) {
  return prisma.customer.findFirst({
    where: { id, outletId },
    include: {
      orders: { orderBy: { createdAt: "desc" }, take: 20 },
      loyaltyTransactions: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function createCustomer(payload, outletId) {
  return prisma.customer.create({ data: { ...payload, outletId } });
}

export async function updateCustomer(id, payload, outletId) {
  const existing = await prisma.customer.findFirst({ where: { id, outletId } });
  if (!existing) throw new Error("Customer not found");
  return prisma.customer.update({ where: { id }, data: payload });
}

export async function deleteCustomer(id, outletId) {
  const existing = await prisma.customer.findFirst({ where: { id, outletId } });
  if (!existing) throw new Error("Customer not found");
  return prisma.customer.delete({ where: { id } });
}