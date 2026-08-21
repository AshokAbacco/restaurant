// server/src/pos/billing/billing.service.test.js
//
// Covers the offline-replay safety guard on completeBilling: a retried
// "complete billing" call for an order that's already been billed (e.g.
// an offline-queued cash payment replaying after it actually succeeded
// once, but the client never saw the response) must return the existing
// invoice/payments — never throw, and never create a second Payment or
// Invoice for the same order.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  order: { findUnique: vi.fn() },
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

vi.mock("../../config/prisma.js", () => ({ default: mockPrisma }));
vi.mock("../payments/payments.service.js", () => mockPaymentsService);
vi.mock("../pos.service.js", () => mockPosService);
vi.mock("../invoices/invoices.service.js", () => mockInvoicesService);
vi.mock("../discounts/discounts.service.js", () => mockDiscountsService);

const billingService = await import("./billing.service.js");

beforeEach(() => vi.clearAllMocks());

describe("completeBilling offline-replay guard", () => {
  it("returns the existing invoice/payments for an already-COMPLETED order instead of throwing", async () => {
    const existingOrder = { id: "o1", status: "COMPLETED" };
    const existingInvoice = { id: "inv-1", invoiceNumber: "INV-000001" };
    const existingPayments = [{ id: "p1", method: "CASH", amount: 500 }];

    mockPrisma.order.findUnique.mockResolvedValue(existingOrder);
    mockInvoicesService.getInvoiceByOrder.mockResolvedValue(existingInvoice);
    mockPaymentsService.listPaymentsForOrder.mockResolvedValue(
      existingPayments,
    );

    const result = await billingService.completeBilling("o1", {
      payments: [{ method: "CASH", amount: 500 }],
    });

    expect(result.invoice).toBe(existingInvoice);
    expect(result.payments).toBe(existingPayments);
    expect(result.alreadyBilled).toBe(true);
    // No new financial records created on the replay:
    expect(mockPaymentsService.createPayment).not.toHaveBeenCalled();
    expect(mockInvoicesService.generateInvoice).not.toHaveBeenCalled();
    expect(mockPosService.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("still throws if the order is COMPLETED but genuinely has no invoice on record", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "o2",
      status: "COMPLETED",
    });
    mockInvoicesService.getInvoiceByOrder.mockResolvedValue(null);

    await expect(
      billingService.completeBilling("o2", {
        payments: [{ method: "CASH", amount: 100 }],
      }),
    ).rejects.toThrow("already been completed and billed");
  });

  it("still refuses to bill a cancelled order", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "o3",
      status: "CANCELLED",
    });

    await expect(
      billingService.completeBilling("o3", {
        payments: [{ method: "CASH", amount: 100 }],
      }),
    ).rejects.toThrow("Cannot bill a cancelled order");
  });

  it("bills normally when the order isn't already completed", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
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

    const result = await billingService.completeBilling("o4", {
      payments: [{ method: "CASH", amount: 300 }],
    });

    expect(mockPaymentsService.createPayment).toHaveBeenCalledTimes(1);
    expect(mockPosService.updateOrderStatus).toHaveBeenCalledWith(
      "o4",
      "COMPLETED",
    );
    expect(result.invoice.invoiceNumber).toBe("INV-000042");
  });

  it("throws if the order doesn't exist", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    await expect(
      billingService.completeBilling("missing", {
        payments: [{ method: "CASH", amount: 100 }],
      }),
    ).rejects.toThrow("Order not found");
  });
});
