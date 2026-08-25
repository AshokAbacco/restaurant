// server/src/pos/billing/billing.service.test.js
//
// Covers the offline-replay safety guard on completeBilling: a retried
// "complete billing" call for an order that's already been billed (e.g.
// an offline-queued cash payment replaying after it actually succeeded
// once, but the client never saw the response) must return the existing
// invoice/payments — never throw, and never create a second Payment or
// Invoice for the same order.
//
// UPDATED for multi-tenancy: completeBilling/getBillingSummary now take an
// outletId and look the order up via findFirst (scoped by outletId)
// instead of findUnique — see billing.service.js. Every downstream service
// call (payments/pos/invoices/discounts) also now takes outletId as its
// last argument.
import { describe, it, expect, vi, beforeEach } from "vitest";

const TEST_OUTLET_ID = "outlet-1";

const mockPrisma = vi.hoisted(() => ({
  order: { findFirst: vi.fn() },
}));

const mockPaymentsService = vi.hoisted(() => ({
  createPayment: vi.fn(),
  syncOrderPaymentStatus: vi.fn(),
  listPaymentsForOrder: vi.fn(),
}));

const mockPosService = vi.hoisted(() => ({
  updateOrderStatus: vi.fn(),
}));

const mockInvoicesService = vi.hoisted(() => ({
  generateInvoice: vi.fn(),
  getInvoiceByOrder: vi.fn(),
}));

const mockDiscountsService = vi.hoisted(() => ({
  applyDiscountToOrder: vi.fn(),
}));

const mockDuePaymentsService = vi.hoisted(() => ({
  createDuePayment: vi.fn(),
}));

const mockCashDrawerService = vi.hoisted(() => ({
  recordSaleIfSessionOpen: vi.fn(),
}));

vi.mock("../../config/prisma.js", () => ({ default: mockPrisma }));
vi.mock("../payments/payments.service.js", () => mockPaymentsService);
vi.mock("../pos.service.js", () => mockPosService);
vi.mock("../invoices/invoices.service.js", () => mockInvoicesService);
vi.mock("../discounts/discounts.service.js", () => mockDiscountsService);
vi.mock("../due-payments/duePayments.service.js", () => mockDuePaymentsService);
vi.mock("../cash-drawer/cashDrawer.service.js", () => mockCashDrawerService);

const billingService = await import("./billing.service.js");

beforeEach(() => vi.clearAllMocks());

describe("completeBilling offline-replay guard", () => {
  it("returns the existing invoice/payments for an already-COMPLETED order instead of throwing", async () => {
    const existingOrder = { id: "o1", status: "COMPLETED" };
    const existingInvoice = { id: "inv-1", invoiceNumber: "INV-000001" };
    const existingPayments = [{ id: "p1", method: "CASH", amount: 500 }];

    mockPrisma.order.findFirst.mockResolvedValue(existingOrder);
    mockInvoicesService.getInvoiceByOrder.mockResolvedValue(existingInvoice);
    mockPaymentsService.listPaymentsForOrder.mockResolvedValue(
      existingPayments,
    );

    const result = await billingService.completeBilling(
      "o1",
      { payments: [{ method: "CASH", amount: 500 }] },
      TEST_OUTLET_ID,
    );

    expect(result.invoice).toBe(existingInvoice);
    expect(result.payments).toBe(existingPayments);
    expect(result.alreadyBilled).toBe(true);
    // No new financial records created on the replay:
    expect(mockPaymentsService.createPayment).not.toHaveBeenCalled();
    expect(mockInvoicesService.generateInvoice).not.toHaveBeenCalled();
    expect(mockPosService.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("still throws if the order is COMPLETED but genuinely has no invoice on record", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: "o2",
      status: "COMPLETED",
    });
    mockInvoicesService.getInvoiceByOrder.mockResolvedValue(null);

    await expect(
      billingService.completeBilling(
        "o2",
        { payments: [{ method: "CASH", amount: 100 }] },
        TEST_OUTLET_ID,
      ),
    ).rejects.toThrow("already been completed and billed");
  });

  it("still refuses to bill a cancelled order", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: "o3",
      status: "CANCELLED",
    });

    await expect(
      billingService.completeBilling(
        "o3",
        { payments: [{ method: "CASH", amount: 100 }] },
        TEST_OUTLET_ID,
      ),
    ).rejects.toThrow("Cannot bill a cancelled order");
  });

  it("bills normally when the order isn't already completed", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: "o4",
      status: "SERVED",
    });
    mockPaymentsService.createPayment.mockResolvedValue({
      id: "p-new",
      method: "CASH",
      amount: 300,
    });
    mockPaymentsService.syncOrderPaymentStatus.mockResolvedValue({
      paymentStatus: "PAID",
      totalPaid: 300,
      grandTotal: 300,
    });
    mockPosService.updateOrderStatus.mockResolvedValue({
      id: "o4",
      status: "COMPLETED",
    });
    mockInvoicesService.generateInvoice.mockResolvedValue({ id: "inv-new" });
    mockInvoicesService.getInvoiceByOrder.mockResolvedValue({
      id: "inv-new",
      invoiceNumber: "INV-000042",
    });

    const result = await billingService.completeBilling(
      "o4",
      { payments: [{ method: "CASH", amount: 300 }], performedById: "emp-1" },
      TEST_OUTLET_ID,
    );

    expect(mockPaymentsService.createPayment).toHaveBeenCalledTimes(1);
    expect(mockPosService.updateOrderStatus).toHaveBeenCalledWith(
      "o4",
      "COMPLETED",
      TEST_OUTLET_ID,
    );
    expect(result.invoice.invoiceNumber).toBe("INV-000042");
  });

  it("logs a cash-drawer SALE transaction for a CASH payment, attributed to whoever completed the bill", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({ id: "o4b", status: "SERVED" });
    mockPaymentsService.createPayment.mockResolvedValue({ id: "p-cash", method: "CASH", amount: 150 });
    mockPaymentsService.syncOrderPaymentStatus.mockResolvedValue({
      paymentStatus: "PAID",
      totalPaid: 150,
      grandTotal: 150,
    });
    mockPosService.updateOrderStatus.mockResolvedValue({ id: "o4b", status: "COMPLETED" });
    mockInvoicesService.generateInvoice.mockResolvedValue({ id: "inv-cash" });
    mockInvoicesService.getInvoiceByOrder.mockResolvedValue({ id: "inv-cash" });

    await billingService.completeBilling(
      "o4b",
      { payments: [{ method: "CASH", amount: 150 }], performedById: "emp-9" },
      TEST_OUTLET_ID,
    );

    expect(mockCashDrawerService.recordSaleIfSessionOpen).toHaveBeenCalledWith(
      150,
      TEST_OUTLET_ID,
      "emp-9",
    );
  });

  it("does NOT log a cash-drawer transaction for a non-CASH payment", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({ id: "o4c", status: "SERVED" });
    mockPaymentsService.createPayment.mockResolvedValue({ id: "p-card", method: "CARD", amount: 500 });
    mockPaymentsService.syncOrderPaymentStatus.mockResolvedValue({
      paymentStatus: "PAID",
      totalPaid: 500,
      grandTotal: 500,
    });
    mockPosService.updateOrderStatus.mockResolvedValue({ id: "o4c", status: "COMPLETED" });
    mockInvoicesService.generateInvoice.mockResolvedValue({ id: "inv-card" });
    mockInvoicesService.getInvoiceByOrder.mockResolvedValue({ id: "inv-card" });

    await billingService.completeBilling(
      "o4c",
      { payments: [{ method: "CARD", amount: 500 }] },
      TEST_OUTLET_ID,
    );

    expect(mockCashDrawerService.recordSaleIfSessionOpen).not.toHaveBeenCalled();
  });

  it("throws if the order doesn't exist in this outlet", async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);
    await expect(
      billingService.completeBilling(
        "missing",
        { payments: [{ method: "CASH", amount: 100 }] },
        TEST_OUTLET_ID,
      ),
    ).rejects.toThrow("Order not found");
  });

  it("scopes the order lookup by outletId, not id alone — a cross-outlet order id must 404", async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);

    await expect(
      billingService.completeBilling(
        "o1",
        { payments: [{ method: "CASH", amount: 100 }] },
        "some-other-outlet",
      ),
    ).rejects.toThrow("Order not found");

    expect(mockPrisma.order.findFirst).toHaveBeenCalledWith({
      where: { id: "o1", outletId: "some-other-outlet" },
    });
  });
});

describe("completeBilling — Due Payment Settlement (Phase 1.2)", () => {
  it("still throws on incomplete payment when allowDue isn't requested (no behavior change for existing callers)", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: "o5",
      status: "SERVED",
      customerId: "cust-1",
    });
    mockPaymentsService.createPayment.mockResolvedValue({ id: "p1", amount: 100 });
    mockPaymentsService.syncOrderPaymentStatus.mockResolvedValue({
      paymentStatus: "PARTIAL",
      totalPaid: 100,
      grandTotal: 500,
    });

    await expect(
      billingService.completeBilling(
        "o5",
        { payments: [{ method: "CASH", amount: 100 }] },
        TEST_OUTLET_ID,
      ),
    ).rejects.toThrow("Payment is incomplete");

    expect(mockDuePaymentsService.createDuePayment).not.toHaveBeenCalled();
    expect(mockPosService.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("creates a DuePayment for the remaining balance and still completes the order when allowDue is true", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: "o6",
      status: "SERVED",
      customerId: "cust-1",
    });
    mockPaymentsService.createPayment.mockResolvedValue({ id: "p1", amount: 200 });
    mockPaymentsService.syncOrderPaymentStatus.mockResolvedValue({
      paymentStatus: "PARTIAL",
      totalPaid: 200,
      grandTotal: 500,
    });
    mockDuePaymentsService.createDuePayment.mockResolvedValue({
      id: "due-1",
      originalAmount: 300,
      status: "OUTSTANDING",
    });
    mockPosService.updateOrderStatus.mockResolvedValue({ id: "o6", status: "COMPLETED" });
    mockInvoicesService.generateInvoice.mockResolvedValue({ id: "inv-1" });
    mockInvoicesService.getInvoiceByOrder.mockResolvedValue({ id: "inv-1" });

    const result = await billingService.completeBilling(
      "o6",
      { payments: [{ method: "CASH", amount: 200 }], allowDue: true },
      TEST_OUTLET_ID,
    );

    expect(mockDuePaymentsService.createDuePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "o6",
        customerId: "cust-1", // fell back to order.customerId — none was passed explicitly
        originalAmount: 300, // 500 grandTotal - 200 already paid
        amountPaidUpfront: 0, // the 200 is already a normal Payment, not double-counted here
      }),
      TEST_OUTLET_ID,
    );
    // The order still completes (table freed, stock consumed) despite the
    // balance being incomplete — this is the actual feature.
    expect(mockPosService.updateOrderStatus).toHaveBeenCalledWith("o6", "COMPLETED", TEST_OUTLET_ID);
    expect(result.duePayment.id).toBe("due-1");
  });

  it("throws if allowDue is used but no customer is attached to the order or given explicitly", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: "o7",
      status: "SERVED",
      customerId: null,
    });
    mockPaymentsService.createPayment.mockResolvedValue({ id: "p1", amount: 0 });
    mockPaymentsService.syncOrderPaymentStatus.mockResolvedValue({
      paymentStatus: "UNPAID",
      totalPaid: 0,
      grandTotal: 500,
    });

    await expect(
      billingService.completeBilling("o7", { payments: [], allowDue: true }, TEST_OUTLET_ID),
    ).rejects.toThrow("A customer is required");

    expect(mockPosService.updateOrderStatus).not.toHaveBeenCalled();
  });
});