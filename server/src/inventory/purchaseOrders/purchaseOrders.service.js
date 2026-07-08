// server/src/inventory/purchaseOrders/purchaseOrders.service.js
import prisma from "../../config/prisma.js";

const includeRelations = {
  supplier: true,
  items: { include: { ingredient: { select: { id: true, name: true, itemCode: true } } } },
};

// Simple sequential PO number: PO-000123. Not race-proof under heavy concurrent
// writes (two requests could read the same count before either inserts), but
// fine for a single-location restaurant's write volume. Revisit with a DB
// sequence/transaction lock if this ever becomes a real bottleneck.
const generatePoNumber = async () => {
  const count = await prisma.purchaseOrder.count();
  return `PO-${String(count + 1).padStart(6, "0")}`;
};

export const listPurchaseOrders = ({ supplierId, status }) => {
  const where = {};
  if (supplierId) where.supplierId = supplierId;
  if (status) where.status = status;

  return prisma.purchaseOrder.findMany({
    where,
    include: includeRelations,
    orderBy: { createdAt: "desc" },
  });
};

export const getPurchaseOrderById = (id) =>
  prisma.purchaseOrder.findUnique({ where: { id }, include: includeRelations });

// items: [{ ingredientId, quantity, unitPrice, taxPercent }]
export const createPurchaseOrder = (data) =>
  prisma.$transaction(async (tx) => {
    const poNumber = await generatePoNumber();

    const itemsWithTotals = data.items.map((item) => {
      const taxPercent = item.taxPercent ?? 0;
      const lineSubtotal = Number(item.quantity) * Number(item.unitPrice);
      const totalAmount = lineSubtotal + lineSubtotal * (taxPercent / 100);
      return {
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxPercent,
        totalAmount,
      };
    });

    const totalAmount = itemsWithTotals.reduce((sum, i) => sum + i.totalAmount, 0);

    const purchaseOrder = await tx.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
        notes: data.notes,
        totalAmount,
        items: { create: itemsWithTotals },
      },
    });

    return tx.purchaseOrder.findUnique({
      where: { id: purchaseOrder.id },
      include: includeRelations,
    });
  });

export const updatePurchaseOrderStatus = (id, status) =>
  prisma.purchaseOrder.update({
    where: { id },
    data: { status },
    include: includeRelations,
  });

export const updatePurchaseOrderDetails = (id, { expectedDelivery, notes }) =>
  prisma.purchaseOrder.update({
    where: { id },
    data: {
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
      notes,
    },
    include: includeRelations,
  });

// Only DRAFT orders can be deleted outright — anything ORDERED/RECEIVED has
// real-world consequences (a supplier may already be preparing it, or stock
// already moved) so those should be CANCELLED via status update instead.
export const deletePurchaseOrder = async (id) => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) {
    const err = new Error("Purchase order not found");
    err.code = "P2025";
    throw err;
  }
  if (po.status !== "DRAFT") {
    const err = new Error("Only DRAFT purchase orders can be deleted — cancel it instead");
    err.code = "NOT_DRAFT";
    throw err;
  }
  return prisma.purchaseOrder.delete({ where: { id } });
};