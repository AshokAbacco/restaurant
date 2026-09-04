// server/src/pos/pos.service.js
import { randomUUID } from "node:crypto";
import prisma from "../config/prisma.js";
import * as kotService from "./kot/kot.service.js";
import { writeAuditLog } from "../lib/auditLog.service.js";

/**
 * Generates the next sequential order number, e.g. ORD-000123.
 * NOTE: simple count-based approach, same pattern as employees/expenses codes.
 */
// FIX: was `count() + 1`, which collides with an existing order's number
// once any order has ever been hard-deleted (deleteOrder shrinks the count,
// so the "next" number can land on one that's already taken by a
// higher-numbered order that's still around — exactly the unique
// constraint violation on orderNumber that showed up after adding delete).
// Basing it on the highest orderNumber actually seen removes that
// possibility. Lexicographic DESC sort matches numeric order here because
// every orderNumber is zero-padded to the same width.
// Exported for reuse by kot/kotMove.service.js (Phase 1.4 — Table/KOT/Item-wise
// move creates a fresh Order at the destination table when none exists yet,
// and needs the exact same numbering scheme every other order uses).
export async function generateOrderNumber(outletId, client = prisma) {
  const last = await client.order.findFirst({
    where: { outletId },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  const lastNum = last
    ? parseInt(last.orderNumber.replace("ORD-", ""), 10) || 0
    : 0;
  return `ORD-${String(lastNum + 1).padStart(6, "0")}`;
}

// Same fix as generateOrderNumber above — holdNumber is also
// @@unique([outletId, holdNumber]) now, so the sequence must be per-outlet
// too, or two outlets numbering independently would still collide the
// moment they both reach the same count.
async function generateHoldNumber(outletId, client = prisma) {
  const last = await client.order.findFirst({
    where: { outletId, holdNumber: { not: null } },
    orderBy: { holdNumber: "desc" },
    select: { holdNumber: true },
  });
  const lastNum = last?.holdNumber
    ? parseInt(last.holdNumber.replace("HOLD-", ""), 10) || 0
    : 0;
  return `HOLD-${String(lastNum + 1).padStart(4, "0")}`;
}

// Statuses that are allowed to follow the current status. Keeps the kitchen/
// front-of-house flow honest instead of letting the client jump states.
// COMPLETED is reachable from every active status (not just SERVED) because
// "Complete Service" on the Orders page is a checkout/close-out action —
// staff may need to close a table even if a dish never made it past PREPARING.
const STATUS_FLOW = {
  NEW: ["ACCEPTED", "CANCELLED", "ON_HOLD", "COMPLETED"],
  ON_HOLD: ["NEW", "CANCELLED", "COMPLETED"],
  ACCEPTED: ["PREPARING", "CANCELLED", "COMPLETED"],
  PREPARING: ["READY", "CANCELLED", "COMPLETED"],
  READY: ["SERVED", "OUT_FOR_DELIVERY", "COMPLETED"],
  SERVED: ["COMPLETED"],
  OUT_FOR_DELIVERY: ["COMPLETED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

// `prefetched` lets a caller that has ALREADY loaded the menu items (see
// buildOrderPlan, which loads them in parallel with everything else) reuse
// them instead of paying for a second identical findMany.
async function computeItemPricing(
  items,
  outletId,
  client = prisma,
  prefetched = null,
) {
  const menuItems =
    prefetched ??
    (await client.menuItem.findMany({
      where: { id: { in: items.map((i) => i.menuItemId) }, outletId },
    }));
  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  let subtotal = 0;
  let gstAmount = 0;

  const itemsData = items.map((item) => {
    const menuItem = menuItemMap.get(item.menuItemId);
    // Also covers the cross-outlet case: a menuItemId that's real but
    // belongs to a DIFFERENT outlet simply won't be in menuItemMap (the
    // findMany above is already scoped to this outlet), so it fails the
    // same "not found" path rather than silently pricing/ordering another
    // outlet's item.
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

  return { itemsData, subtotal, gstAmount, menuItemMap };
}

async function resolveAddOnPricing(
  itemsData,
  outletId,
  client = prisma,
  prefetched = null,
) {
  const addOnIds = itemsData.flatMap((i) => i.addOns.map((a) => a.addOnId));
  if (addOnIds.length === 0) return { itemsData, addOnTotal: 0 };

  const addOns =
    prefetched ??
    (await client.addOn.findMany({
      where: { id: { in: addOnIds }, outletId },
    }));
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

// Verifies every foreign reference on an order payload (table, customer,
// waiter, delivery partner) actually belongs to THIS outlet before
// anything is created. None of this existed before — a tableId, customerId
// etc. was trusted outright — which was already a latent bug (a stale ID
// from a deleted row would only fail deep inside a nested Prisma create)
// and would have been a real cross-outlet data leak once multiple outlets
// existed, letting one outlet's order silently reference another outlet's
// table/customer/waiter.
async function validateOrderReferences(
  {
    tableId,
    customerId,
    waiterId,
    deliveryPartnerId,
    counterId,
    onlinePlatformId,
    kitchenBranchId,
  },
  outletId,
  client = prisma,
) {
  const [
    table,
    customer,
    waiter,
    deliveryPartner,
    counter,
    onlinePlatform,
    kitchenBranch,
  ] = await Promise.all([
    tableId
      ? client.restaurantTable.findFirst({ where: { id: tableId, outletId } })
      : null,
    customerId
      ? client.customer.findFirst({ where: { id: customerId, outletId } })
      : null,
    waiterId
      ? client.employee.findFirst({ where: { id: waiterId, outletId } })
      : null,
    deliveryPartnerId
      ? client.deliveryPartner.findFirst({
          where: { id: deliveryPartnerId, outletId },
        })
      : null,
    // Phase 2.2 — Counter/Terminal tracking: counterId is optional (an
    // outlet that hasn't set up counters yet, or a device that hasn't
    // picked one, simply omits it) but if given, it must be a real,
    // active counter belonging to this outlet.
    counterId
      ? client.billingCounter.findFirst({ where: { id: counterId, outletId, isActive: true } })
      : null,
    // Online Orders — same optionality/ownership pattern as counterId.
    onlinePlatformId
      ? client.onlinePlatform.findFirst({ where: { id: onlinePlatformId, outletId, isActive: true } })
      : null,
    // Kitchen Branches — same optionality/ownership pattern again. Must be
    // active: routing an order to a kitchen that's been shut down would put
    // the ticket on a display nobody is watching.
    kitchenBranchId
      ? client.kitchenBranch.findFirst({ where: { id: kitchenBranchId, outletId, isActive: true } })
      : null,
  ]);

  if (tableId && !table) throw new Error("Table not found");
  if (customerId && !customer) throw new Error("Customer not found");
  if (waiterId && !waiter) throw new Error("Waiter not found");
  if (deliveryPartnerId && !deliveryPartner)
    throw new Error("Delivery partner not found");
  if (counterId && !counter) throw new Error("Counter not found");
  if (onlinePlatformId && !onlinePlatform) throw new Error("Online platform not found");
  if (kitchenBranchId && !kitchenBranch)
    throw new Error("Kitchen not found, or it has been deactivated");
}

// Does ALL the reading and arithmetic an order needs — validation, pricing,
// numbering — and returns a ready-to-insert write payload with every id
// already generated. It performs no writes, so it is safe (and much
// faster) to run OUTSIDE a transaction.
//
// Every read that doesn't depend on another read is issued in parallel.
// This is the single biggest win in this file: inside an interactive
// transaction Prisma pins one connection and runs queries strictly
// one-at-a-time, so a Promise.all in there is a lie — it still costs one
// full network round trip per query. Out here it genuinely is parallel.
async function buildOrderPlan(payload, outletId, client = prisma) {
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
    clientRequestId,
    counterId,
    onlinePlatformId,
    // Which physical kitchen cooks this order. Applies to EVERY order type —
    // dine-in, takeaway, delivery and online all get routed the same way.
    kitchenBranchId,
    status = "NEW",
  } = payload;

  if (!items || items.length === 0)
    throw new Error("Order must have at least one item");

  const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
  const addOnIds = [
    ...new Set(
      items.flatMap((i) => (i.addOns || []).map((a) => a.addOnId)),
    ),
  ];

  const [, menuItems, addOns, orderNumber] = await Promise.all([
    validateOrderReferences(
      {
        tableId,
        customerId,
        waiterId,
        deliveryPartnerId,
        counterId,
        onlinePlatformId,
        kitchenBranchId,
      },
      outletId,
      client,
    ),
    client.menuItem.findMany({
      where: { id: { in: menuItemIds }, outletId },
    }),
    addOnIds.length
      ? client.addOn.findMany({ where: { id: { in: addOnIds }, outletId } })
      : Promise.resolve([]),
    generateOrderNumber(outletId, client),
  ]);

  const { itemsData, subtotal, gstAmount, menuItemMap } =
    await computeItemPricing(items, outletId, client, menuItems);
  const { addOnTotal } = await resolveAddOnPricing(
    itemsData,
    outletId,
    client,
    addOns,
  );

  const grandTotal =
    subtotal +
    gstAmount +
    addOnTotal +
    Number(serviceChargeAmount || 0) +
    Number(deliveryCharge || 0) +
    Number(packagingCharge || 0);

  // Pre-generated ids — see buildKitchenOrderCreates in kot.service.js for
  // why. Knowing the OrderItem ids up front is what lets the kitchen
  // tickets be built and inserted in the SAME batch as the order itself,
  // rather than having to insert the order, read its items back, and only
  // then create the tickets.
  const orderId = randomUUID();
  const itemPlans = itemsData.map((item) => ({
    ...item,
    id: randomUUID(),
    menuItem: menuItemMap.get(item.menuItemId),
  }));

  const orderData = {
    id: orderId,
    outletId,
    orderNumber,
    orderType,
    status,
    tableId,
    customerId,
    waiterId,
    counterId,
    onlinePlatformId,
    kitchenBranchId: kitchenBranchId || null,
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
    clientRequestId,
    items: {
      create: itemPlans.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes,
        addOns: {
          create: item.addOns.map((a) => ({
            id: randomUUID(),
            addOnId: a.addOnId,
            quantity: a.quantity,
            unitPrice: a.unitPrice,
            totalPrice: a.totalPrice,
          })),
        },
      })),
    },
  };

  return {
    orderId,
    orderNumber,
    orderData,
    itemPlans,
    // Dine-in orders occupy the table immediately
    tableUpdate:
      orderType === "DINE_IN" && tableId
        ? { where: { id: tableId }, data: { status: "OCCUPIED" } }
        : null,
  };
}

export async function createOrder(payload, outletId, client = prisma) {
  const { clientRequestId } = payload;

  // FEATURE: offline mode idempotency (phase 1, step 6). If this exact
  // clientRequestId already produced an order — e.g. the offline queue's
  // sync succeeded once already but the client never saw the response and
  // is retrying — return that SAME order instead of creating a second
  // one. This must be checked before any pricing/creation work below.
  // Scoped to outletId too: clientRequestId is client-generated
  // (crypto.randomUUID()), effectively unique regardless, but scoping
  // keeps this lookup consistent with every other query in this file
  // rather than being the one exception that reads across outlets.
  if (clientRequestId) {
    const existing = await client.order.findFirst({
      where: { clientRequestId, outletId },
      include: { items: { include: { addOns: true } } },
    });
    if (existing) return existing;
  }

  // `status` is forced here rather than read off the payload — buildOrderPlan
  // accepts one only so createOrderAndSendToKitchen can open straight at
  // ACCEPTED. A client must never be able to post its own order status.
  const plan = await buildOrderPlan(
    { ...payload, status: "NEW" },
    outletId,
    client,
  );

  let order;
  try {
    order = await client.order.create({
      data: plan.orderData,
      include: { items: { include: { addOns: true } } },
    });
  } catch (err) {
    // Extremely narrow race: two near-simultaneous sync attempts for the
    // SAME clientRequestId both pass the findFirst check above before
    // either has inserted. The @unique constraint on clientRequestId
    // catches it at the DB level — fetch and return the winner's row
    // instead of surfacing a confusing constraint-violation error.
    if (
      err.code === "P2002" &&
      err.meta?.target?.includes("clientRequestId") &&
      clientRequestId
    ) {
      const winner = await client.order.findFirst({
        where: { clientRequestId, outletId },
        include: { items: { include: { addOns: true } } },
      });
      if (winner) return winner;
    }
    throw err;
  }

  if (plan.tableUpdate) {
    await client.restaurantTable.update(plan.tableUpdate);
  }

  return order;
}

// Creates the order AND sends it to the kitchen as a single atomic unit.
// If any part fails, the whole transaction rolls back — no Order, no
// OrderItem, no KOT, no table status change ever gets committed. This is the
// endpoint the POS UI should call instead of createOrder + sendToKitchen as
// two separate requests, since that two-step version can leave a real Order
// behind even when the kitchen send fails.
//
// ─────────────────────────────────────────────────────────────────────
// FIX: "Transaction already closed ... 15000 ms" on Send to Kitchen.
//
// The old version ran EVERYTHING — idempotency lookup, six ownership
// checks, menu-item pricing, add-on pricing, order numbering, the order
// insert, the table update, then sendToKitchen's own re-reads and one KOT
// insert per section — inside a single interactive `$transaction(async
// (tx) => ...)`.
//
// Two things made that fatal rather than merely slow:
//
//   1. An interactive transaction holds ONE pinned connection and executes
//      its queries strictly in sequence. Even the `Promise.all` in
//      validateOrderReferences degraded into six separate round trips.
//      All told this path made 30-plus sequential round trips.
//   2. DATABASE_URL points at a Render Postgres instance in Oregon while
//      the app runs from India. That is roughly 350-500 ms per round trip,
//      so 30-plus of them is 12-18 seconds — which is exactly the
//      "15263 ms passed" in the error.
//
// Raising the timeout would only hide it (and hold a pooled connection
// hostage for 30 s per order while the POS looks frozen). The real fix is
// to stop doing read work inside the transaction:
//
//   * Phase 1 does every read OUTSIDE any transaction, in parallel, where
//     Promise.all actually parallelises. ~2 round trips instead of ~25.
//   * Phase 2 hands the writes to prisma.$transaction([...]) in ARRAY
//     form. Prisma pipelines a batch like that as BEGIN + statements +
//     COMMIT, so it is one round trip, it is still fully atomic, and the
//     interactive-transaction timeout does not apply to it at all.
//
// Reads moving outside the transaction costs nothing in correctness: they
// were only ever validation, and every genuine race they could lose is
// already caught by a database constraint and handled below.
// ─────────────────────────────────────────────────────────────────────
export async function createOrderAndSendToKitchen(payload, outletId) {
  // ── PHASE 1: reads only, no transaction ──────────────────────────────

  // FEATURE: offline-sync idempotency guard. If this clientRequestId
  // already produced an order, it was also already sent to the kitchen the
  // first time — return it as-is rather than creating anything.
  // kot.service.js's sendToKitchen deliberately THROWS on items that are
  // already ticketed (its own duplicate-KOT guard for double-clicks), so
  // without this early return a harmless retried sync would surface as a
  // hard failure instead of a silent no-op.
  if (payload.clientRequestId) {
    const existing = await prisma.order.findFirst({
      where: { clientRequestId: payload.clientRequestId, outletId },
      select: { id: true },
    });
    if (existing) return getOrderById(existing.id, outletId);
  }

  const [plan, lastKotSequence] = await Promise.all([
    // Created straight into ACCEPTED: this order is going to the kitchen
    // in the same breath, so the old create-as-NEW-then-update-to-ACCEPTED
    // dance was a wasted write and a state nobody ever observed.
    buildOrderPlan({ ...payload, status: "ACCEPTED" }, outletId),
    kotService.getLastKotSequence(outletId),
  ]);

  const kotCreates = kotService.buildKitchenOrderCreates({
    orderId: plan.orderId,
    outletId,
    orderItems: plan.itemPlans,
    isOnlineOrder: Boolean(payload.onlinePlatformId),
    lastKotSequence,
    // Routes every ticket for this order to the chosen physical kitchen.
    // Applies uniformly to dine-in, takeaway, delivery and online.
    kitchenBranchId: payload.kitchenBranchId || null,
  });

  // ── PHASE 2: writes only, one batched atomic transaction ─────────────
  const writes = [
    prisma.order.create({ data: plan.orderData }),
    ...(plan.tableUpdate
      ? [prisma.restaurantTable.update(plan.tableUpdate)]
      : []),
    ...kotCreates.map((data) => prisma.kitchenOrder.create({ data })),
  ];

  try {
    await prisma.$transaction(writes);
  } catch (err) {
    // Same narrow race createOrder guards against, just at batch level:
    // two simultaneous syncs of the SAME clientRequestId both pass the
    // lookup above before either inserts. The @unique constraint catches
    // the loser; return the winner's row rather than a confusing
    // constraint-violation error.
    if (
      err.code === "P2002" &&
      err.meta?.target?.includes("clientRequestId") &&
      payload.clientRequestId
    ) {
      const winner = await prisma.order.findFirst({
        where: { clientRequestId: payload.clientRequestId, outletId },
        select: { id: true },
      });
      if (winner) return getOrderById(winner.id, outletId);
    }
    throw err;
  }

  return getOrderById(plan.orderId, outletId);
}

export async function listOrders(
  {
    status,
    // "Everything still open" — what the Table View's Takeaway and Delivery
    // sections need. `status` only takes one value, so without this the
    // only way to ask for open orders was to fetch every order ever placed
    // and filter client-side.
    active,
    orderType,
    tableId,
    customerId,
    from,
    to,
    // "board" returns the slim card-shaped payload; anything else returns
    // the full order with items, add-ons and menu items as before.
    view,
    page = 1,
    limit = 20,
  },
  outletId,
) {
  const where = {
    outletId,
    ...(status ? { status } : {}),
    // Same closed-order list the tables board uses, so a takeaway card and
    // a table card disappear from the floor under the same conditions.
    // Compared against the string too: the controller hands req.query
    // straight through, so this arrives as "true", and a bare truthiness
    // check would also match the string "false".
    ...((active === true || active === "true") && !status
      ? { status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] } }
      : {}),
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

  // The floor view renders a ~90px card per order: number, elapsed time,
  // amount, colour. The full include below carries every order item, its
  // menu item, and every add-on with its add-on record — for up to 100
  // orders at a time. That's megabytes of JSON and a fistful of joins to
  // draw a card that shows four fields, and it's re-fetched every 15
  // seconds by the poll.
  //
  // `view=board` swaps it for exactly what a card reads.
  if (view === "board") {
    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          orderType: true,
          grandTotal: true,
          createdAt: true,
          onlinePlatformId: true,
          customer: { select: { name: true } },
          onlinePlatform: { select: { id: true, name: true } },
          payments: { select: { id: true, amount: true, status: true } },
          kitchenOrders: { select: { id: true, status: true } },
          // Count only — the card shows "3 items", never which three.
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  }

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        table: true,
        customer: true,
        waiter: { select: { fullName: true, employeeCode: true } },
        counter: { select: { id: true, name: true } },
        onlinePlatform: { select: { id: true, name: true } },
        items: {
          include: { menuItem: true, addOns: { include: { addOn: true } } },
        },
        // The Orders page derives a card's live kitchen status from these
        // (same rows the Kitchen Display reads), exactly as the tables
        // board does — without them a takeaway/delivery card could only
        // fall back to Order.status and would drift from the kitchen.
        // The id is needed too: a takeaway order is already COMPLETED by
        // the time it reaches the board (billed up front), so "Order
        // Delivered" closes out its kitchen tickets rather than the order.
        kitchenOrders: { select: { id: true, status: true } },
        kitchenBranch: { select: { id: true, name: true } },
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

export async function getOrderById(id, outletId) {
  return prisma.order.findFirst({
    where: { id, outletId },
    include: {
      table: true,
      customer: true,
      waiter: { select: { fullName: true, employeeCode: true } },
      counter: { select: { id: true, name: true } },
      onlinePlatform: { select: { id: true, name: true } },
      deliveryPartner: true,
      items: {
        include: { menuItem: true, addOns: { include: { addOn: true } } },
      },
      payments: true,
      billSplits: true,
      discountsApplied: true,
      kitchenOrders: true,
      invoice: true,
    },
  });
}

export async function updateOrderStatus(id, status, outletId) {
  const order = await prisma.order.findFirst({ where: { id, outletId } });
  if (!order) throw new Error("Order not found");

  // FIX: idempotent replay guard — same reasoning as kot.service.js's
  // KOT_STAGE_RANK guard. Without this, ANY retried request for the same
  // status (an offline-queued "mark COMPLETED" replaying after it already
  // succeeded once, or even a plain network retry with no offline
  // involved at all) would re-run consumeStockForOrder below and
  // DOUBLE-DEDUCT inventory for the same order — and would also throw
  // unnecessarily, since STATUS_FLOW's COMPLETED entry doesn't list
  // COMPLETED as a valid "next" status from itself. Already at the
  // target status -> safe no-op, return as-is.
  if (order.status === status) return order;

  const allowed = STATUS_FLOW[order.status] || [];
  if (!allowed.includes(status)) {
    throw new Error(`Cannot move order from ${order.status} to ${status}`);
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status },
  });

  if (status === "COMPLETED") {
    await consumeStockForOrder(id, outletId);
  }

  if (status === "COMPLETED" && order.tableId) {
    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: "FREE" },
    });
  }

  return updated;
}

// Decrements InventoryStock per recipe ingredient and writes an audit
// StockMovement row, same pattern used elsewhere for SALE_CONSUMPTION.
async function consumeStockForOrder(orderId, outletId) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: { menuItem: { include: { recipeIngredients: true } } },
  });

  for (const item of items) {
    for (const recipe of item.menuItem.recipeIngredients) {
      const consumeQty = Number(recipe.quantity) * item.quantity;

      const stock = await prisma.inventoryStock.findUnique({
        where: { ingredientId: recipe.ingredientId },
      });
      const previousStock = Number(stock?.quantityOnHand || 0);
      const newStock = previousStock - consumeQty;

      // InventoryStock.outletId is required with no default — this row may
      // not exist yet for an ingredient that's never been stocked, so the
      // upsert's create branch has to supply it explicitly.
      await prisma.inventoryStock.upsert({
        where: { ingredientId: recipe.ingredientId },
        create: {
          ingredientId: recipe.ingredientId,
          outletId,
          quantityOnHand: newStock,
        },
        update: { quantityOnHand: newStock },
      });

      // StockMovement.outletId is also required with no default — same
      // gap as InventoryStock above, just missed the first time around.
      await prisma.stockMovement.create({
        data: {
          ingredientId: recipe.ingredientId,
          outletId,
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

export async function holdOrder(id, outletId) {
  const order = await prisma.order.findFirst({ where: { id, outletId } });
  if (!order) throw new Error("Order not found");

  const holdNumber = await generateHoldNumber(outletId);
  return prisma.order.update({
    where: { id },
    data: { status: "ON_HOLD", holdNumber },
  });
}

export async function resumeOrder(id, outletId) {
  const order = await prisma.order.findFirst({ where: { id, outletId } });
  if (!order) throw new Error("Order not found");

  return prisma.order.update({
    where: { id },
    data: { status: "NEW", holdNumber: null },
  });
}

export async function cancelOrder(id, reason, outletId) {
  const order = await prisma.order.findFirst({ where: { id, outletId } });
  if (!order) throw new Error("Order not found");

  if (order.tableId) {
    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: "FREE" },
    });
  }

  return prisma.order.update({
    where: { id },
    data: {
      status: "CANCELLED",
      notes: reason
        ? `${order.notes || ""}\nCancelled: ${reason}`
        : order.notes,
    },
  });
}

export async function transferTable(orderId, newTableId, outletId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId },
  });
  if (!order) throw new Error("Order not found");

  // Both the order's current table and the destination table must belong
  // to the same outlet — without this check a stray/guessed tableId from
  // another outlet would silently move an order onto a table it can never
  // actually reach on the floor plan.
  const newTable = await prisma.restaurantTable.findFirst({
    where: { id: newTableId, outletId },
  });
  if (!newTable) throw new Error("Table not found");

  if (order.tableId) {
    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: "FREE" },
    });
  }
  await prisma.restaurantTable.update({
    where: { id: newTableId },
    data: { status: "OCCUPIED" },
  });

  return prisma.order.update({
    where: { id: orderId },
    data: { tableId: newTableId },
  });
}

// Adds new items to an order that's already been placed (e.g. the customer
// asks for 2 more items mid-meal). Returns both the updated order AND the
// newly created OrderItem rows specifically — the caller needs those ids to
// send ONLY the new items to the kitchen, not the whole order again.
export async function addItemsToOrder(orderId, items, outletId) {
  // FIX: this function previously never checked the order existed at all
  // (let alone that it belonged to this outlet) before creating OrderItem
  // rows against orderId — a stray/guessed orderId from another outlet
  // would have silently attached items to it.
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId },
  });
  if (!order) throw new Error("Order not found");

  const { itemsData } = await computeItemPricing(items, outletId);
  await resolveAddOnPricing(itemsData, outletId);

  // Created one-by-one (not createMany) specifically so we get each row's id
  // back — createMany doesn't return the created rows in Postgres.
  const newItems = await Promise.all(
    itemsData.map((item) =>
      prisma.orderItem.create({
        data: {
          orderId,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes,
        },
        include: { menuItem: true },
      }),
    ),
  );

  const updatedOrder = await recalculateOrderTotals(orderId);
  return { order: updatedOrder, newItems };
}

// ==============================================
// VOID AN ORDER ITEM (billing-time cancellation)
// ==============================================
//
// A waiter asks for a dish to come off the bill while the cashier is taking
// payment. Removes ONE OrderItem and re-prices the order from what's left.
//
// Three things make this more than a delete:
//
//  1. KitchenOrderItem.orderItemId has NO onDelete: Cascade (schema.prisma).
//     Deleting an OrderItem that already reached a kitchen ticket raises
//     `kitchen_order_items_orderItemId_fkey` — the same violation
//     deleteOrder() had to be fixed for. Those rows are cleared first, in
//     the same transaction.
//
//  2. recalculateOrderTotals() does NOT recompute GST — it keeps
//     `order.gstAmount` as-is (see its own "recompute if needed" comment).
//     Reusing it here would leave the customer paying tax on a dish that is
//     no longer on the bill. GST is recomputed from the surviving items.
//
//  3. Removing items from a bill is a textbook shrinkage route, so every
//     void writes an AuditLog row naming who did it and what it was worth.
//     There is no isVoided column to soft-delete into, and adding one is a
//     migration; the audit entry gives the trail without one.
export async function removeOrderItem(orderId, orderItemId, actor, outletId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found");

  // Once an order is billed the invoice exists and the money is recorded —
  // changing what it contains at that point would put the paper and the
  // database out of step. Refunds are a different flow.
  if (order.status === "COMPLETED") {
    throw new Error(
      "This order is already completed and billed. Items can't be removed.",
    );
  }
  if (order.status === "CANCELLED") {
    throw new Error("This order is cancelled.");
  }

  const target = order.items.find((i) => i.id === orderItemId);
  if (!target) throw new Error("Item not found on this order");

  // An order with nothing on it isn't a bill. Cancelling the whole order is
  // a different, deliberate action with its own reason/audit trail.
  if (order.items.length === 1) {
    throw new Error(
      "This is the only item on the order — cancel the whole order instead.",
    );
  }

  await prisma.$transaction(async (tx) => {
    // See (1) above. OrderItemAddOn DOES cascade from OrderItem, so those
    // need no explicit cleanup.
    await tx.kitchenOrderItem.deleteMany({ where: { orderItemId } });
    await tx.orderItem.delete({ where: { id: orderItemId } });

    // See (3). Written inside the transaction so a void is never recorded
    // for a delete that then rolled back.
    await tx.auditLog.create({
      data: {
        action: "ORDER_ITEM_VOIDED",
        entityType: "OrderItem",
        entityId: orderItemId,
        performedById: actor?.employeeId ?? null,
        performedByRole: actor?.role ?? null,
        outletId,
        metadata: {
          orderId,
          orderNumber: order.orderNumber,
          quantity: target.quantity,
          unitPrice: Number(target.unitPrice),
          lineTotal: Number(target.totalPrice),
          orderStatus: order.status,
        },
      },
    });
  });

  return repriceOrderFromItems(orderId);
}

// Re-derives subtotal AND gst from the order's surviving items, then the
// grand total from those. Separate from recalculateOrderTotals() so that
// function's existing callers keep their current behaviour untouched.
//
// Per-item gstPercent is read from the MenuItem rather than stored on the
// line, matching how computeItemPricing() calculates it at order time.
export async function repriceOrderFromItems(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { menuItem: true, addOns: true } } },
  });
  if (!order) throw new Error("Order not found");

  let subtotal = 0;
  let gstAmount = 0;

  for (const item of order.items) {
    const addOnTotal = (item.addOns || []).reduce(
      (sum, a) => sum + Number(a.totalPrice || 0),
      0,
    );
    const lineTotal = Number(item.totalPrice) + addOnTotal;
    subtotal += lineTotal;
    // GST follows the dish, not its add-ons — same basis computeItemPricing
    // uses, so a voided item removes exactly the tax it added.
    gstAmount +=
      (Number(item.totalPrice) * Number(item.menuItem?.gstPercent || 0)) / 100;
  }

  const round2 = (n) => Math.round(n * 100) / 100;
  subtotal = round2(subtotal);
  gstAmount = round2(gstAmount);

  const grandTotal = round2(
    subtotal +
      gstAmount +
      Number(order.serviceChargeAmount || 0) +
      Number(order.deliveryCharge || 0) +
      Number(order.packagingCharge || 0) -
      Number(order.discountAmount || 0),
  );

  return prisma.order.update({
    where: { id: orderId },
    data: { subtotal, gstAmount, grandTotal },
    include: { items: { include: { menuItem: true, addOns: true } } },
  });
}

export async function recalculateOrderTotals(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  const subtotal = order.items.reduce(
    (sum, i) => sum + Number(i.totalPrice),
    0,
  );
  const gstAmount = subtotal * 0; // per-item gst already embedded at creation; recompute if needed
  const grandTotal =
    subtotal +
    Number(order.gstAmount) +
    Number(order.serviceChargeAmount) +
    Number(order.deliveryCharge || 0) +
    Number(order.packagingCharge || 0) -
    Number(order.discountAmount);

  return prisma.order.update({
    where: { id: orderId },
    data: { subtotal, grandTotal },
  });
}

// Owner-only: permanently removes an order and everything tied to it.
//
// OrderItem/OrderItemAddOn, KitchenOrder (+ its KitchenOrderItem/
// KitchenOrderStatusLog/KitchenNote children), BillSplit, and OrderDiscount
// are all declared `onDelete: Cascade` in schema.prisma, so a plain
// `order.delete()` cleans those up automatically.
//
// Payment and Invoice are NOT cascaded (no onDelete on those relations) —
// deleting the order first would hit a foreign key violation, so they're
// removed explicitly first. LoyaltyTransaction is also not cascaded, but
// its rows represent a customer's points ledger history (points already
// earned/redeemed) rather than order-specific data, so instead of deleting
// that history we just detach the reference (orderId -> null).
export async function deleteOrder(id, actor, outletId) {
  const order = await prisma.order.findFirst({ where: { id, outletId } });
  if (!order) throw new Error("Order not found");

  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany({ where: { orderId: id } });
    await tx.invoice.deleteMany({ where: { orderId: id } });
    await tx.loyaltyTransaction.updateMany({
      where: { orderId: id },
      data: { orderId: null },
    });
    // KitchenOrderItem.orderItemId is NOT a cascading FK (only
    // KitchenOrderItem.kitchenOrderId is) — deleting the order would
    // cascade-delete its OrderItems while these rows still point at them,
    // which is exactly the "kitchen_order_items_orderItemId_fkey" violation.
    // Delete them explicitly first; their parent KitchenOrder still gets
    // cleaned up normally via the order.delete() cascade below.
    await tx.kitchenOrderItem.deleteMany({
      where: { orderItem: { orderId: id } },
    });
    await tx.order.delete({ where: { id } });
  });

  // Free the table if this order still had it occupied — same as cancelOrder.
  if (order.tableId) {
    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: "FREE" },
    });
  }

  // Highest-priority audit case of the three wired up in this pass — this
  // is a permanent delete of a potentially-paid order, requested
  // specifically as a kept feature despite the record-keeping tradeoff
  // discussed earlier. This is the row that lets you answer "who deleted
  // order ORD-000123 and when" after the fact.
  await writeAuditLog({
    outletId,
    action: "ORDER_DELETED",
    entityType: "Order",
    entityId: id,
    performedById: actor?.employeeId ?? actor?.id ?? null,
    performedByRole: actor?.role ?? null,
    metadata: {
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      grandTotal: order.grandTotal,
    },
  });

  return { success: true, id };
}