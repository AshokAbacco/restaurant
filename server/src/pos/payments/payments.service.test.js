// server/src/pos/payments/payments.service.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  payment: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  order: { findUnique: vi.fn() },
}));

vi.mock("../../config/prisma.js", () => ({ default: mockPrisma }));

const paymentsService = await import("./payments.service.js");

beforeEach(() => vi.clearAllMocks());

describe("syncOrderPaymentStatus", () => {
  it("marks the order PAID once payments cover the full grand total", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      grandTotal: 500,
      payments: [{ amount: 500 }],
    });

    const status = await paymentsService.syncOrderPaymentStatus("order-1");
    expect(status.paymentStatus).toBe("PAID");
  });

  it("marks the order PARTIAL when some but not all is paid", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      grandTotal: 1000,
      payments: [{ amount: 400 }],
    });

    const status = await paymentsService.syncOrderPaymentStatus("order-2");
    expect(status.paymentStatus).toBe("PARTIAL");
    expect(status.totalPaid).toBe(400);
  });

  it("marks the order UNPAID when nothing has been paid", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      grandTotal: 300,
      payments: [],
    });

    const status = await paymentsService.syncOrderPaymentStatus("order-3");
    expect(status.paymentStatus).toBe("UNPAID");
  });

  it("sums multiple payments toward the same order", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      grandTotal: 300,
      payments: [{ amount: 100 }, { amount: 100 }, { amount: 100 }],
    });

    const status = await paymentsService.syncOrderPaymentStatus("order-4");
    expect(status.totalPaid).toBe(300);
    expect(status.paymentStatus).toBe("PAID");
  });
});

describe("createPayment", () => {
  it("creates a PAID payment row and re-syncs the order's status", async () => {
    mockPrisma.payment.create.mockResolvedValue({
      id: "p1",
      amount: 500,
      status: "PAID",
    });
    mockPrisma.order.findUnique.mockResolvedValue({
      grandTotal: 500,
      payments: [{ amount: 500 }],
    });

    const payment = await paymentsService.createPayment("order-1", {
      method: "CASH",
      amount: 500,
    });

    expect(payment.status).toBe("PAID");
    expect(mockPrisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "order-1",
          method: "CASH",
          amount: 500,
          status: "PAID",
        }),
      }),
    );
  });
});

describe("deletePayment", () => {
  it("throws if the payment doesn't exist", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(null);
    await expect(paymentsService.deletePayment("missing")).rejects.toThrow(
      "Payment not found",
    );
  });

  it("re-syncs the order's payment status after deleting a payment", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "p1",
      orderId: "order-4",
    });
    mockPrisma.order.findUnique.mockResolvedValue({
      grandTotal: 200,
      payments: [],
    });

    const status = await paymentsService.deletePayment("p1");
    expect(mockPrisma.payment.delete).toHaveBeenCalledWith({
      where: { id: "p1" },
    });
    expect(status.paymentStatus).toBe("UNPAID");
  });
});
