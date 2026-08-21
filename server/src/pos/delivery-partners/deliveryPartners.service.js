// server/src/pos/delivery-partners/deliveryPartners.service.js
import prisma from "../../config/prisma.js";

export async function listDeliveryPartners({ isActive } = {}, outletId) {
  return prisma.deliveryPartner.findMany({
    where: {
      outletId,
      ...(isActive !== undefined ? { isActive: isActive === "true" } : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function getDeliveryPartnerById(id, outletId) {
  return prisma.deliveryPartner.findFirst({
    where: { id, outletId },
    include: { orders: { take: 20, orderBy: { createdAt: "desc" } } },
  });
}

export async function createDeliveryPartner(payload, outletId) {
  return prisma.deliveryPartner.create({ data: { ...payload, outletId } });
}

export async function updateDeliveryPartner(id, payload, outletId) {
  const existing = await prisma.deliveryPartner.findFirst({ where: { id, outletId } });
  if (!existing) throw new Error("Delivery partner not found");
  return prisma.deliveryPartner.update({ where: { id }, data: payload });
}

export async function deleteDeliveryPartner(id, outletId) {
  const existing = await prisma.deliveryPartner.findFirst({ where: { id, outletId } });
  if (!existing) throw new Error("Delivery partner not found");
  return prisma.deliveryPartner.update({ where: { id }, data: { isActive: false } });
}