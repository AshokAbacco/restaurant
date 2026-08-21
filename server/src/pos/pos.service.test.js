// server/src/pos/pos.service.test.js
//
// Unit tests for the money-critical paths: createOrder (pricing math),
// updateOrderStatus (status-flow enforcement), deleteOrder (the
// non-cascading-FK cleanup order that caused the earlier
// "kitchen_order_items_orderItemId_fkey" bug), and generateOrderNumber's
// collision-safety. Prisma is fully mocked — no real database is touched,
// so these run in milliseconds and are safe on every commit.
//
// These are NOT a substitute for an integration test against a real
// Postgres test database before this goes to production — see
// src/test/README.md for why, and what that next step looks like.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  order: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  menuItem: { findMany: vi.fn() },
  addOn: { findMany: vi.fn() },
  restaurantTable: { update: vi.fn() },
  payment: { deleteMany: vi.fn() },
  invoice: { deleteMany: vi.fn() },
  loyaltyTransaction: { updateMany: vi.fn() },
  kitchenOrderItem: { deleteMany: vi.fn() },
  orderItem: { findMany: vi.fn() },
  inventoryStock: { findUnique: vi.fn(), upsert: vi.fn() },
  stockMovement: { create: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../config/prisma.js", () => ({ default: mockPrisma }));
vi.mock("./kot/kot.service.js", () => ({ sendToKitchen: vi.fn() }));

const posService = await import("./pos.service.js");

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
});

describe("createOrder", () => {
  it("computes subtotal, GST, and grand total correctly from menu item prices", async () => {
    mockPrisma.menuItem.findMany.mockResolvedValue([
      { id: "item-1", sellingPrice: 100, gstPercent: 5 },
    ]);
    mockPrisma.addOn.findMany.mockResolvedValue([]);
    mockPrisma.order.findFirst.mockResolvedValue(null); // no prior orders -> ORD-000001
    mockPrisma.order.create.mockImplementation(({ data }) => ({
      id: "order-1",
      ...data,
      items: [{ id: "oi-1", menuItemId: "item-1", ...data.items.create[0] }],
    }));

    const order = await posService.createOrder({
      orderType: "DINE_IN",
      tableId: "table-1",
      items: [{ menuItemId: "item-1", quantity: 2 }],
    });

    // 2 x ₹100 = ₹200 subtotal, 5% GST = ₹10, no add-ons/charges -> ₹210 total
    expect(order.subtotal).toBe(200);
    expect(order.gstAmount).toBe(10);
    expect(order.grandTotal).toBe(210);
    expect(order.orderNumber).toBe("ORD-000001");
  });

  it("throws if the order has no items", async () => {
    await expect(
      posService.createOrder({ orderType: "TAKEAWAY", items: [] }),
    ).rejects.toThrow("at least one item");
  });

  it("throws if a menu item referenced in the order doesn't exist", async () => {
    mockPrisma.menuItem.findMany.mockResolvedValue([]); // referenced item not found
    await expect(
      posService.createOrder({
        orderType: "TAKEAWAY",
        items: [{ menuItemId: "missing", quantity: 1 }],
      }),
    ).rejects.toThrow("not found");
  });

  it("occupies the table for a DINE_IN order", async () => {
    mockPrisma.menuItem.findMany.mockResolvedValue([
      { id: "item-1", sellingPrice: 50, gstPercent: 0 },
    ]);
    mockPrisma.addOn.findMany.mockResolvedValue([]);
    mockPrisma.order.findFirst.mockResolvedValue(null);
    mockPrisma.order.create.mockImplementation(({ data }) => ({
      id: "order-2",
      ...data,
      items: [],
    }));

    await posService.createOrder({
      orderType: "DINE_IN",
      tableId: "table-9",
      items: [{ menuItemId: "item-1", quantity: 1 }],
    });

    expect(mockPrisma.restaurantTable.update).toHaveBeenCalledWith({
      where: { id: "table-9" },
      data: { status: "OCCUPIED" },
    });
  });
});

describe("generateOrderNumber (via createOrder)", () => {
  it("continues from the highest existing orderNumber, not a row count", async () => {
    // Regression test for the count()-based collision bug: the next
    // number must continue from the highest orderNumber ON RECORD, not
    // from however many rows currently exist (which shrinks on delete).
    mockPrisma.order.findFirst.mockResolvedValue({ orderNumber: "ORD-000042" });
    mockPrisma.menuItem.findMany.mockResolvedValue([
      { id: "item-1", sellingPrice: 10, gstPercent: 0 },
    ]);
    mockPrisma.addOn.findMany.mockResolvedValue([]);
    mockPrisma.order.create.mockImplementation(({ data }) => ({
      id: "order-x",
      ...data,
      items: [],
    }));

    const order = await posService.createOrder({
      orderType: "TAKEAWAY",
      items: [{ menuItemId: "item-1", quantity: 1 }],
    });

    expect(order.orderNumber).toBe("ORD-000043");
  });
});

describe("createOrder idempotency (offline sync)", () => {
  it("returns the existing order instead of creating a duplicate for a repeated clientRequestId", async () => {
    const existingOrder = {
      id: "order-existing",
      clientRequestId: "client-uuid-1",
      items: [],
    };
    mockPrisma.order.findUnique.mockResolvedValue(existingOrder);

    const result = await posService.createOrder({
      orderType: "DINE_IN",
      tableId: "table-1",
      items: [{ menuItemId: "item-1", quantity: 1 }],
      clientRequestId: "client-uuid-1",
    });

    expect(result).toBe(existingOrder);
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expect(mockPrisma.menuItem.findMany).not.toHaveBeenCalled(); // never even priced it
  });

  it("creates normally when no clientRequestId is given (online orders unaffected)", async () => {
    mockPrisma.menuItem.findMany.mockResolvedValue([
      { id: "item-1", sellingPrice: 20, gstPercent: 0 },
    ]);
    mockPrisma.addOn.findMany.mockResolvedValue([]);
    mockPrisma.order.findFirst.mockResolvedValue(null);
    mockPrisma.order.create.mockImplementation(({ data }) => ({
      id: "order-normal",
      ...data,
      items: [],
    }));

    await posService.createOrder({
      orderType: "TAKEAWAY",
      items: [{ menuItemId: "item-1", quantity: 1 }],
    });

    // No clientRequestId in payload -> the idempotency lookup must be skipped entirely
    expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.order.create).toHaveBeenCalled();
  });
});

describe("createOrderAndSendToKitchen idempotency (offline sync)", () => {
  it("does NOT re-send to the kitchen on a replayed sync — sendToKitchen throws on already-ticketed items", async () => {
    // Regression test: sendToKitchen (kot.service.js) deliberately throws
    // if the items are already on a live ticket. Without the early
    // short-circuit, a retried offline sync would surface as a hard
    // error instead of silently succeeding.
    mockPrisma.order.findUnique.mockResolvedValue({ id: "order-existing" });

    const kotService = await import("./kot/kot.service.js");
    const order = await posService.createOrderAndSendToKitchen({
      orderType: "DINE_IN",
      items: [{ menuItemId: "item-1", quantity: 1 }],
      clientRequestId: "client-uuid-2",
    });

    expect(kotService.sendToKitchen).not.toHaveBeenCalled();
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
  });
});

describe("updateOrderStatus", () => {
  it("allows a valid transition (NEW -> ACCEPTED)", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "o1",
      status: "NEW",
      tableId: null,
    });
    mockPrisma.order.update.mockResolvedValue({ id: "o1", status: "ACCEPTED" });

    const result = await posService.updateOrderStatus("o1", "ACCEPTED");
    expect(result.status).toBe("ACCEPTED");
  });

  it("rejects an invalid transition (CANCELLED -> NEW)", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "o2",
      status: "CANCELLED",
      tableId: null,
    });

    await expect(posService.updateOrderStatus("o2", "NEW")).rejects.toThrow(
      "Cannot move order from CANCELLED to NEW",
    );
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it("frees the table when an order is marked COMPLETED", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "o3",
      status: "SERVED",
      tableId: "table-5",
    });
    mockPrisma.order.update.mockResolvedValue({
      id: "o3",
      status: "COMPLETED",
    });
    mockPrisma.orderItem.findMany.mockResolvedValue([]); // no recipe ingredients to consume

    await posService.updateOrderStatus("o3", "COMPLETED");

    expect(mockPrisma.restaurantTable.update).toHaveBeenCalledWith({
      where: { id: "table-5" },
      data: { status: "FREE" },
    });
  });

  it("no-ops a replayed status update instead of re-running it (and double-deducting stock)", async () => {
    // Regression test: without this guard, retrying "mark COMPLETED" for
    // an order that's ALREADY COMPLETED (offline-queue replay, or just a
    // plain network retry) would re-run consumeStockForOrder and
    // double-deduct inventory for the same order, and would also
    // needlessly throw via STATUS_FLOW (COMPLETED isn't a valid "next"
    // status from COMPLETED itself).
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "o3b",
      status: "COMPLETED",
      tableId: "table-9",
    });

    const result = await posService.updateOrderStatus("o3b", "COMPLETED");

    expect(result.status).toBe("COMPLETED");
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
    expect(mockPrisma.orderItem.findMany).not.toHaveBeenCalled(); // consumeStockForOrder never ran
    expect(mockPrisma.restaurantTable.update).not.toHaveBeenCalled();
  });
});

describe("deleteOrder", () => {
  it("deletes payments, invoice, and kitchen-order-items BEFORE the order itself", async () => {
    // Regression test for the "kitchen_order_items_orderItemId_fkey"
    // violation: KitchenOrderItem.orderItemId doesn't cascade, so it MUST
    // be cleared before order.delete() cascades away the OrderItems it
    // points to. Payment/Invoice similarly aren't cascaded.
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "o4",
      tableId: "table-3",
    });

    await posService.deleteOrder("o4");

    const callOrder = [
      mockPrisma.payment.deleteMany.mock.invocationCallOrder[0],
      mockPrisma.invoice.deleteMany.mock.invocationCallOrder[0],
      mockPrisma.kitchenOrderItem.deleteMany.mock.invocationCallOrder[0],
      mockPrisma.order.delete.mock.invocationCallOrder[0],
    ];
    expect(callOrder).toEqual([...callOrder].sort((a, b) => a - b));
    expect(mockPrisma.order.delete).toHaveBeenCalledWith({
      where: { id: "o4" },
    });
  });

  it("frees the table if the deleted order had one", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "o5",
      tableId: "table-7",
    });

    await posService.deleteOrder("o5");

    expect(mockPrisma.restaurantTable.update).toHaveBeenCalledWith({
      where: { id: "table-7" },
      data: { status: "FREE" },
    });
  });

  it("writes an audit log entry recording who deleted the order", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "o6",
      tableId: null,
      orderNumber: "ORD-000006",
      orderType: "DINE_IN",
      status: "COMPLETED",
      grandTotal: 450,
    });

    await posService.deleteOrder("o6", { employeeId: "emp-1", role: "OWNER" });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "ORDER_DELETED",
        entityType: "Order",
        entityId: "o6",
        performedById: "emp-1",
        performedByRole: "OWNER",
        metadata: expect.objectContaining({
          orderNumber: "ORD-000006",
          grandTotal: 450,
        }),
      }),
    });
  });

  it("throws if the order doesn't exist", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    await expect(posService.deleteOrder("missing")).rejects.toThrow(
      "Order not found",
    );
  });
});
