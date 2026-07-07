// server/src/pos/pos.service.js
import prisma from "../config/prisma.js";
import { createKitchenOrdersForOrder } from "../kds/kds.service.js";

/**
 * Generates the next sequential order number, e.g. ORD-000123.
 * NOTE: simple count-based approach, same pattern as employees/expenses codes.
 */
async function generateOrderNumber() {
  const count = await prisma.order.count();
  const next = count + 1;
  return `ORD-${String(next).padStart(6, "0")}`;
}

async function generateHoldNumber() {
  const count = await prisma.order.count({ where: { status: "ON_HOLD" } });
  return `HOLD-${String(count + 1).padStart(4, "0")}`;
}

// Statuses that are allowed to follow the current status. Keeps the kitchen/
// front-of-house flow honest instead of letting the client jump states.
const STATUS_FLOW = {
  NEW: ["ACCEPTED", "CANCELLED", "ON_HOLD"],
  ON_HOLD: ["NEW", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "OUT_FOR_DELIVERY"],
  SERVED: ["COMPLETED"],
  OUT_FOR_DELIVERY: ["COMPLETED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

async function computeItemPricing(items) {
  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
  });
  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  let subtotal = 0;
  let gstAmount = 0;

  const itemsData = items.map((item) => {
    const menuItem = menuItemMap.get(item.menuItemId);
    if (!menuItem) throw new Error(`Menu item ${item.menuItemId} not found`);

    const unitPrice = Number(menuItem.sellingPrice);
    const lineTotal = unitPrice * item.quantity;
    const lineGst = (lineTotal * Number(menuItem.gstPercent || 0)) / 100;

    subtotal += lineTotal;
    gstAmount += lineGst;

    const addOns = (item.addOns || []).map((a) => ({
      addOnId: a.addOnId,
      quantity: a.quantity || 1,
      unitPrice: a.unitPrice, // filled in below once AddOn catalog is looked up
      totalPrice: 0,
    }));

    return {
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      unitPrice,
      totalPrice: lineTotal,
      notes: item.notes,
      addOns,
    };
  });

  return { itemsData, subtotal, gstAmount };
}

async function resolveAddOnPricing(itemsData) {
  const addOnIds = itemsData.flatMap((i) => i.addOns.map((a) => a.addOnId));
  if (addOnIds.length === 0) return { itemsData, addOnTotal: 0 };

  const addOns = await prisma.addOn.findMany({ where: { id: { in: addOnIds } } });
  const addOnMap = new Map(addOns.map((a) => [a.id, a]));

  let addOnTotal = 0;
  for (const item of itemsData) {
    for (const a of item.addOns) {
      const addOn = addOnMap.get(a.addOnId);
      if (!addOn) throw new Error(`Add-on ${a.addOnId} not found`);
      a.unitPrice = Number(addOn.price);
      a.totalPrice = a.unitPrice * a.quantity;
      addOnTotal += a.totalPrice;
    }
  }
  return { itemsData, addOnTotal };
}

export async function createOrder(payload) {
  const {
    orderType,
    tableId,
    customerId,
    waiterId,
    numberOfGuests,
    items,
    deliveryPartnerId,
    deliveryCharge,
    deliveryAddress,
    estimatedDeliveryTime,
    pickupTime,
    packagingCharge,
    serviceChargeAmount = 0,
    notes,
    store,
  } = payload;

  if (!items || items.length === 0) throw new Error("Order must have at least one item");

  const { itemsData, subtotal, gstAmount } = await computeItemPricing(items);
  const { addOnTotal } = await resolveAddOnPricing(itemsData);

  const grandTotal =
    subtotal + gstAmount + addOnTotal + Number(serviceChargeAmount || 0) + Number(deliveryCharge || 0) + Number(packagingCharge || 0);

  const orderNumber = await generateOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      orderType,
      status: "NEW",
      tableId,
      customerId,
      waiterId,
      numberOfGuests,
      deliveryPartnerId,
      deliveryCharge,
      deliveryAddress,
      estimatedDeliveryTime,
      pickupTime,
      packagingCharge,
      subtotal,
      gstAmount,
      serviceChargeAmount,
      grandTotal,
      notes,
      store,
      items: {
        create: itemsData.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes,
          addOns: {
            create: item.addOns.map((a) => ({
              addOnId: a.addOnId,
              quantity: a.quantity,
              unitPrice: a.unitPrice,
              totalPrice: a.totalPrice,
            })),
          },
        })),
      },
    },
    include: { items: { include: { addOns: true } } },
  });

  // Dine-in orders occupy the table immediately
  if (orderType === "DINE_IN" && tableId) {
    await prisma.restaurantTable.update({ where: { id: tableId }, data: { status: "OCCUPIED" } });
  }

  // Generate one KOT per kitchen station for this order (KDS module).
  // Failure here shouldn't fail the whole order — the order is already
  // placed/paid-for-later; log it so it can be re-sent to the kitchen manually.
  try {
    await createKitchenOrdersForOrder(order.id);
  } catch (err) {
    console.error(`[POS] Failed to generate KOTs for order ${order.id}:`, err.message);
  }

  return order;
}

export async function listOrders({ status, orderType, tableId, customerId, from, to, page = 1, limit = 20 }) {
  const where = {
    ...(status ? { status } : {}),
    ...(orderType ? { orderType } : {}),
    ...(tableId ? { tableId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        table: true,
        customer: true,
        waiter: { select: { fullName: true, employeeCode: true } },
        items: { include: { menuItem: true, addOns: { include: { addOn: true } } } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.order.count({ where }),
  ]);

  return { data, total, page: Number(page), limit: Number(limit) };
}

export async function getOrderById(id) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      table: true,
      customer: true,
      waiter: { select: { fullName: true, employeeCode: true } },
      deliveryPartner: true,
      items: { include: { menuItem: true, addOns: { include: { addOn: true } } } },
      payments: true,
      billSplits: true,
      discountsApplied: true,
      kitchenOrders: true,
      invoice: true,
    },
  });
}

export async function updateOrderStatus(id, status) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new Error("Order not found");

  const allowed = STATUS_FLOW[order.status] || [];
  if (!allowed.includes(status)) {
    throw new Error(`Cannot move order from ${order.status} to ${status}`);
  }

  const updated = await prisma.order.update({ where: { id }, data: { status } });

  if (status === "COMPLETED") {
    await consumeStockForOrder(id);
  }

  if (status === "COMPLETED" && order.tableId) {
    await prisma.restaurantTable.update({ where: { id: order.tableId }, data: { status: "FREE" } });
  }

  return updated;
}

// Decrements InventoryStock per recipe ingredient and writes an audit
// StockMovement row, same pattern used elsewhere for SALE_CONSUMPTION.
async function consumeStockForOrder(orderId) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: { menuItem: { include: { recipeIngredients: true } } },
  });

  for (const item of items) {
    for (const recipe of item.menuItem.recipeIngredients) {
      const consumeQty = Number(recipe.quantity) * item.quantity;

      const stock = await prisma.inventoryStock.findUnique({ where: { ingredientId: recipe.ingredientId } });
      const previousStock = Number(stock?.quantityOnHand || 0);
      const newStock = previousStock - consumeQty;

      await prisma.inventoryStock.upsert({
        where: { ingredientId: recipe.ingredientId },
        create: { ingredientId: recipe.ingredientId, quantityOnHand: newStock },
        update: { quantityOnHand: newStock },
      });

      await prisma.stockMovement.create({
        data: {
          ingredientId: recipe.ingredientId,
          type: "SALE_CONSUMPTION",
          quantity: -consumeQty,
          previousStock,
          newStock,
          referenceId: orderId,
          reason: "POS order completed",
        },
      });
    }
  }
}

export async function holdOrder(id) {
  const holdNumber = await generateHoldNumber();
  return prisma.order.update({ where: { id }, data: { status: "ON_HOLD", holdNumber } });
}

export async function resumeOrder(id) {
  return prisma.order.update({ where: { id }, data: { status: "NEW", holdNumber: null } });
}

export async function cancelOrder(id, reason) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new Error("Order not found");

  if (order.tableId) {
    await prisma.restaurantTable.update({ where: { id: order.tableId }, data: { status: "FREE" } });
  }

  return prisma.order.update({ where: { id }, data: { status: "CANCELLED", notes: reason ? `${order.notes || ""}\nCancelled: ${reason}` : order.notes } });
}

export async function transferTable(orderId, newTableId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");

  if (order.tableId) {
    await prisma.restaurantTable.update({ where: { id: order.tableId }, data: { status: "FREE" } });
  }
  await prisma.restaurantTable.update({ where: { id: newTableId }, data: { status: "OCCUPIED" } });

  return prisma.order.update({ where: { id: orderId }, data: { tableId: newTableId } });
}

export async function addItemsToOrder(orderId, items) {
  const { itemsData } = await computeItemPricing(items);
  await resolveAddOnPricing(itemsData);

  await prisma.orderItem.createMany({
    data: itemsData.map((item) => ({
      orderId,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      notes: item.notes,
    })),
  });

  // Send the newly added items to the kitchen too. createKitchenOrdersForOrder
  // only tickets items that don't already have a KitchenOrderItem, so this is
  // safe to call again without duplicating tickets for items sent earlier.
  try {
    await createKitchenOrdersForOrder(orderId);
  } catch (err) {
    console.error(`[POS] Failed to generate KOTs for added items on order ${orderId}:`, err.message);
  }

  return recalculateOrderTotals(orderId);
}

async function recalculateOrderTotals(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  const subtotal = order.items.reduce((sum, i) => sum + Number(i.totalPrice), 0);
  const gstAmount = subtotal * 0; // per-item gst already embedded at creation; recompute if needed
  const grandTotal = subtotal + Number(order.gstAmount) + Number(order.serviceChargeAmount) + Number(order.deliveryCharge || 0) + Number(order.packagingCharge || 0) - Number(order.discountAmount);

  return prisma.order.update({ where: { id: orderId }, data: { subtotal, grandTotal } });
}