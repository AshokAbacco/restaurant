// server/src/pos/billing/billing.merge.test.js
//
// Table merge -> single bill (mergeOrdersIntoBill): two tables' orders end
// up as one order, one bill; the merged order is cancelled with its money
// zeroed so nothing is billed or reported twice.
import { describe, it, expect, vi, beforeEach } from "vitest";

const OUTLET = "outlet-1";

const tx = vi.hoisted(() => ({
  orderItem: { updateMany: vi.fn() },
  kitchenOrder: { updateMany: vi.fn() },
  orderDiscount: { updateMany: vi.fn() },
  order: { update: vi.fn() },
  restaurantTable: { updateMany: vi.fn() },
  auditLog: { create: vi.fn() },
}));

const mockPrisma = vi.hoisted(() => ({
  order: { findFirst: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}));

const mockPosService = vi.hoisted(() => ({
  repriceOrderFromItems: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

vi.mock("../../config/prisma.js", () => ({ default: mockPrisma }));
vi.mock("../pos.service.js", () => mockPosService);
vi.mock("../payments/payments.service.js", () => ({}));
vi.mock("../invoices/invoices.service.js", () => ({}));
vi.mock("../discounts/discounts.service.js", () => ({}));
vi.mock("../due-payments/duePayments.service.js", () => ({}));
vi.mock("../cash-drawer/cashDrawer.service.js", () => ({}));
vi.mock("../../crm/loyalty.service.js", () => ({
  getBillingLoyalty: vi.fn().mockResolvedValue(null),
}));
vi.mock("../../settings/outletSettings.service.js", () => ({
  getDeliveryBillingEnabled: vi.fn().mockResolvedValue(false),
}));

const billing = await import("./billing.service.js");

function order(over = {}) {
  return {
    id: "o1",
    orderNumber: "ORD-000001",
    orderType: "DINE_IN",
    status: "SERVED",
    tableId: "t1",
    table: { id: "t1", name: "T1" },
    customerId: null,
    numberOfGuests: 5,
    serviceChargeAmount: 0,
    discountAmount: 0,
    subtotal: 1000,
    gstAmount: 50,
    grandTotal: 1050,
    notes: null,
    invoice: null,
    duePayment: null,
    payments: [],
    _count: { billSplits: 0 },
    ...over,
  };
}

const target = order();
const source = order({
  id: "o2",
  orderNumber: "ORD-000002",
  tableId: "t2",
  table: { id: "t2", name: "T2" },
  customerId: "c9",
  numberOfGuests: 5,
  serviceChargeAmount: 20,
  discountAmount: 10,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((fn) => fn(tx));
});

describe("mergeOrdersIntoBill", () => {
  it("moves items/KOTs into the target, cancels + zeroes the source, frees its table and reprices", async () => {
    mockPrisma.order.findFirst
      .mockResolvedValueOnce(target) // merge: target lookup
      .mockResolvedValueOnce({
        // getBillingSummary at the end
        ...target,
        subtotal: 2000,
        gstAmount: 100,
        grandTotal: 2110,
        notes: "[Merged tables] T2",
        items: [],
        kitchenOrders: [],
        outlet: null,
        customer: null,
        waiter: null,
        kitchenBranch: null,
      });
    mockPrisma.order.findMany.mockResolvedValue([source]);

    const summary = await billing.mergeOrdersIntoBill(
      "o1",
      ["o2"],
      { performedById: "e1", role: "CASHIER" },
      OUTLET,
    );

    expect(tx.orderItem.updateMany).toHaveBeenCalledWith({
      where: { orderId: { in: ["o2"] } },
      data: { orderId: "o1" },
    });
    expect(tx.kitchenOrder.updateMany).toHaveBeenCalledWith({
      where: { orderId: { in: ["o2"] } },
      data: { orderId: "o1" },
    });

    const targetUpdate = tx.order.update.mock.calls.find((c) => c[0].where.id === "o1")[0];
    expect(targetUpdate.data.serviceChargeAmount).toBe(20);
    expect(targetUpdate.data.discountAmount).toBe(10);
    expect(targetUpdate.data.numberOfGuests).toBe(10);
    expect(targetUpdate.data.customerId).toBe("c9");
    expect(targetUpdate.data.notes).toBe("[Merged tables] T2");

    const sourceUpdate = tx.order.update.mock.calls.find((c) => c[0].where.id === "o2")[0];
    expect(sourceUpdate.data.status).toBe("CANCELLED");
    expect(sourceUpdate.data.grandTotal).toBe(0);

    expect(tx.restaurantTable.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["t2"] }, outletId: OUTLET },
      data: { status: "FREE" },
    });
    expect(mockPosService.repriceOrderFromItems).toHaveBeenCalledWith("o1");
    expect(summary.mergedTables).toEqual(["T2"]);
    expect(summary.grandTotal).toBe(2110);
  });

  it("refuses to merge an order that already has a payment", async () => {
    mockPrisma.order.findFirst.mockResolvedValueOnce(target);
    mockPrisma.order.findMany.mockResolvedValue([
      { ...source, payments: [{ id: "p1" }] },
    ]);
    await expect(
      billing.mergeOrdersIntoBill("o1", ["o2"], {}, OUTLET),
    ).rejects.toThrow(/payment/);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses non-table orders and empty selections", async () => {
    await expect(billing.mergeOrdersIntoBill("o1", [], {}, OUTLET)).rejects.toThrow(/at least one/);

    mockPrisma.order.findFirst.mockResolvedValueOnce(target);
    mockPrisma.order.findMany.mockResolvedValue([
      { ...source, orderType: "TAKEAWAY", tableId: null, table: null },
    ]);
    await expect(
      billing.mergeOrdersIntoBill("o1", ["o2"], {}, OUTLET),
    ).rejects.toThrow(/dine-in/);
  });
});