// server/src/pos/kot/kotMove.service.js
//
// Phase 1.4 — Table-wise / KOT-wise / Item-wise "Move KOT/Items", matching
// PetPooja's three-tab dialog on the Table View screen.
//
// DESIGN NOTE (the ambiguity the build plan flagged): "moving items" means
// physically reassigning OrderItem rows (and, where possible, their
// KitchenOrderItem) to the destination table's order — never re-flagging
// in place. Already-fired items keep their current KOT status rather than
// restarting from NEW, since the kitchen shouldn't have to re-cook
// something just because it's now being served at a different table.
//
// Three tiers, increasing complexity:
//   1. Table-wise  — the whole order (every item, every KOT) moves as one
//      unit. Thin wrapper over pos.service.js's existing transferTable.
//   2. KOT-wise    — one entire ticket (all its items together) moves to
//      another table's order. Cheap: only KitchenOrder.orderId and its
//      items' OrderItem.orderId change; the ticket itself (status, chef,
//      timestamps) is untouched.
//   3. Item-wise   — a hand-picked subset of items moves, which may be
//      only PART of a KOT. If every item on a KOT is selected, this
//      degrades to case 2 for that KOT. If only some are selected, the
//      KOT has to split: the moving KitchenOrderItems are reassigned to a
//      NEW KitchenOrder at the destination (copying the original's
//      current status/chef so the kitchen doesn't lose progress), and if
//      the source KOT is left with zero items, it's marked CANCELLED
//      (never deleted — its statusLogs/notes are real history) rather
//      than removed.
import prisma from "../../config/prisma.js";
import { recalculateOrderTotals, generateOrderNumber } from "../pos.service.js";
import { transferTable as transferWholeOrder } from "../pos.service.js";
import { generateKotNumber } from "./kot.service.js";

class MoveError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function assertTableInOutlet(tableId, outletId, label = "Table") {
  const table = await prisma.restaurantTable.findFirst({ where: { id: tableId, outletId } });
  if (!table) throw new MoveError(`${label} not found`, 404);
  return table;
}

// Finds the destination table's currently-active order, or creates a bare
// new one if it doesn't have one yet. "Active" mirrors what every other
// order-lookup in this codebase treats as in-progress.
const ACTIVE_STATUSES_EXCLUDED = ["COMPLETED", "CANCELLED", "REFUNDED"];

async function findOrCreateDestinationOrder(destinationTableId, outletId, tx) {
  const existing = await tx.order.findFirst({
    where: {
      tableId: destinationTableId,
      outletId,
      status: { notIn: ACTIVE_STATUSES_EXCLUDED },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return { order: existing, createdNew: false };

  const orderNumber = await generateOrderNumber(outletId, tx);
  const order = await tx.order.create({
    data: {
      outletId,
      orderNumber,
      orderType: "DINE_IN",
      status: "NEW",
      tableId: destinationTableId,
      subtotal: 0,
      gstAmount: 0,
      serviceChargeAmount: 0,
      discountAmount: 0,
      grandTotal: 0,
    },
  });
  return { order, createdNew: true };
}

// ==================================================
// 1. TABLE-WISE — move everything on one table to another
// ==================================================

export async function moveTableWise({ sourceTableId, destinationTableId }, outletId) {
  if (sourceTableId === destinationTableId) {
    throw new MoveError("Source and destination table can't be the same.");
  }

  const sourceTable = await assertTableInOutlet(sourceTableId, outletId, "Source table");
  await assertTableInOutlet(destinationTableId, outletId, "Destination table");

  const order = await prisma.order.findFirst({
    where: { tableId: sourceTableId, outletId, status: { notIn: ACTIVE_STATUSES_EXCLUDED } },
  });
  if (!order) {
    throw new MoveError(`${sourceTable.name} has no active order to move.`);
  }

  // Reuses the exact same function the Table View's plain "transfer table"
  // action already calls — table-wise move in this dialog IS that action,
  // just reachable from a different entry point.
  return transferWholeOrder(order.id, destinationTableId, outletId);
}

// ==================================================
// 2. KOT-WISE — move one whole ticket to another table
// ==================================================

export async function moveKotWise({ kotId, destinationTableId }, outletId) {
  const kot = await prisma.kitchenOrder.findFirst({
    where: { id: kotId, outletId },
    include: { items: true, order: true },
  });
  if (!kot) throw new MoveError("Kitchen order not found", 404);
  if (kot.order.tableId === destinationTableId) {
    throw new MoveError("This ticket is already on that table.");
  }

  await assertTableInOutlet(destinationTableId, outletId, "Destination table");

  const sourceOrderId = kot.orderId;
  const orderItemIds = kot.items.map((i) => i.orderItemId);

  const result = await prisma.$transaction(async (tx) => {
    const { order: destinationOrder } = await findOrCreateDestinationOrder(
      destinationTableId,
      outletId,
      tx,
    );

    // The whole ticket moves as a unit — reassign the KOT itself and every
    // OrderItem it covers. Status, chef, timestamps, notes: untouched.
    await tx.kitchenOrder.update({ where: { id: kotId }, data: { orderId: destinationOrder.id } });
    await tx.orderItem.updateMany({
      where: { id: { in: orderItemIds } },
      data: { orderId: destinationOrder.id },
    });

    await tx.restaurantTable.update({
      where: { id: destinationTableId },
      data: { status: "OCCUPIED" },
    });

    return { destinationOrderId: destinationOrder.id };
  });

  // Recalculate both ends outside the transaction (read-then-write against
  // whatever the transaction just committed) — same pattern
  // addItemsToOrder already uses elsewhere in this codebase.
  const [sourceOrder, destinationOrder] = await Promise.all([
    recalculateOrderTotals(sourceOrderId),
    recalculateOrderTotals(result.destinationOrderId),
  ]);

  await freeTableIfOrderIsEmpty(sourceOrder.id, outletId);

  return { sourceOrder, destinationOrder };
}

// ==================================================
// 3. ITEM-WISE — move a hand-picked subset of items
// ==================================================

export async function moveItemsWise({ orderItemIds, destinationTableId }, outletId) {
  if (!Array.isArray(orderItemIds) || orderItemIds.length === 0) {
    throw new MoveError("Select at least one item to move.");
  }

  const items = await prisma.orderItem.findMany({
    where: { id: { in: orderItemIds } },
    include: {
      order: true,
      kitchenOrderItems: { include: { kitchenOrder: true } },
    },
  });
  if (items.length !== orderItemIds.length) {
    throw new MoveError("One or more items were not found.");
  }

  // All selected items must belong to the SAME source order — matches how
  // the dialog is actually used (staff are looking at one table's active
  // order and picking items off it), and keeps "what does moving items
  // spanning two different orders even mean" from being a real question.
  const sourceOrderIds = new Set(items.map((i) => i.orderId));
  if (sourceOrderIds.size > 1) {
    throw new MoveError("Selected items must all belong to the same order.");
  }
  const sourceOrder = items[0].order;
  if (sourceOrder.outletId !== outletId) {
    throw new MoveError("Items not found", 404);
  }
  if (sourceOrder.tableId === destinationTableId) {
    throw new MoveError("These items are already on that table.");
  }

  await assertTableInOutlet(destinationTableId, outletId, "Destination table");

  const result = await prisma.$transaction(async (tx) => {
    const { order: destinationOrder } = await findOrCreateDestinationOrder(
      destinationTableId,
      outletId,
      tx,
    );

    // Move the raw OrderItem rows themselves first — this is true
    // regardless of whether each one was ever fired to the kitchen.
    await tx.orderItem.updateMany({
      where: { id: { in: orderItemIds } },
      data: { orderId: destinationOrder.id },
    });

    // Group the moving items' KitchenOrderItems by their CURRENT KOT, so
    // we can tell (per KOT) whether this is "the whole ticket moved" (no
    // split needed) or "only some of it did" (needs a new KOT at the
    // destination for the moving portion).
    const kitchenOrderItemsByKot = new Map();
    for (const item of items) {
      for (const koi of item.kitchenOrderItems) {
        const kotId = koi.kitchenOrderId;
        if (!kitchenOrderItemsByKot.has(kotId)) {
          kitchenOrderItemsByKot.set(kotId, { kot: koi.kitchenOrder, kitchenOrderItems: [] });
        }
        kitchenOrderItemsByKot.get(kotId).kitchenOrderItems.push(koi);
      }
    }

    for (const [kotId, { kot, kitchenOrderItems: moving }] of kitchenOrderItemsByKot) {
      const totalItemsOnThisKot = await tx.kitchenOrderItem.count({
        where: { kitchenOrderId: kotId },
      });

      if (moving.length === totalItemsOnThisKot) {
        // Every item on this ticket is moving — same as KOT-wise, just
        // reassign the whole thing, no split needed.
        await tx.kitchenOrder.update({ where: { id: kotId }, data: { orderId: destinationOrder.id } });
        continue;
      }

      // Partial split: the moving KitchenOrderItems need a NEW ticket at
      // the destination, so the part staying behind still has a complete,
      // valid KOT of its own. Copies status/chef/timestamps from the
      // original so the kitchen doesn't lose already-in-progress work —
      // this ticket is not "new" from the kitchen's perspective, it's the
      // same food, just relabeled for a different table.
      const newKotNumber = await generateKotNumber(outletId, tx);
      const newKot = await tx.kitchenOrder.create({
        data: {
          outletId,
          orderId: destinationOrder.id,
          kotNumber: newKotNumber,
          status: kot.status,
          priority: kot.priority,
          kitchenSectionId: kot.kitchenSectionId,
          chefId: kot.chefId,
          targetPrepMinutes: kot.targetPrepMinutes,
          acceptedAt: kot.acceptedAt,
          printedAt: kot.printedAt,
        },
      });

      await tx.kitchenOrderItem.updateMany({
        where: { id: { in: moving.map((koi) => koi.id) } },
        data: { kitchenOrderId: newKot.id },
      });

      // The original ticket lost some (not all) of its items — nothing
      // else about it needs to change; it's still a valid, smaller KOT.
    }

    // Any KOT that's now left with zero items (every one of its items
    // moved, but the ABOVE loop already handled the "whole thing moves"
    // case in one step) — this only catches the case where the split
    // path above happened to remove literally everything. Marked
    // CANCELLED rather than deleted; its statusLogs/notes stay as real
    // history, not orphaned.
    for (const [kotId] of kitchenOrderItemsByKot) {
      const remaining = await tx.kitchenOrderItem.count({ where: { kitchenOrderId: kotId } });
      const stillExists = await tx.kitchenOrder.findUnique({ where: { id: kotId } });
      if (remaining === 0 && stillExists && stillExists.status !== "CANCELLED") {
        await tx.kitchenOrder.update({
          where: { id: kotId },
          data: { status: "CANCELLED" },
        });
        await tx.kitchenOrderStatusLog.create({
          data: {
            kitchenOrderId: kotId,
            fromStatus: stillExists.status,
            toStatus: "CANCELLED",
            reason: "All items moved to another table",
          },
        });
      }
    }

    await tx.restaurantTable.update({
      where: { id: destinationTableId },
      data: { status: "OCCUPIED" },
    });

    return { destinationOrderId: destinationOrder.id };
  });

  const [updatedSourceOrder, destinationOrder] = await Promise.all([
    recalculateOrderTotals(sourceOrder.id),
    recalculateOrderTotals(result.destinationOrderId),
  ]);

  await freeTableIfOrderIsEmpty(updatedSourceOrder.id, outletId);

  return { sourceOrder: updatedSourceOrder, destinationOrder };
}

// Shared cleanup: if a source order has had every one of its items moved
// away, its table has nothing left on it — free it up for the next walk-in
// rather than leaving it OCCUPIED for an order with zero items. The
// (now-empty) order itself is left as-is rather than auto-cancelled; an
// owner reviewing "what happened to order X" should still find it, showing
// zero items, not have it vanish from history.
async function freeTableIfOrderIsEmpty(orderId, outletId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId },
    include: { items: { select: { id: true } } },
  });
  if (order && order.items.length === 0 && order.tableId) {
    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: "FREE" },
    });
  }
}

export { MoveError };