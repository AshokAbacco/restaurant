// server/src/pos/invoices/invoices.service.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  invoice: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  order: { findUnique: vi.fn() },
}));

vi.mock("../../config/prisma.js", () => ({ default: mockPrisma }));

const invoicesService = await import("./invoices.service.js");

beforeEach(() => vi.clearAllMocks());

describe("generateInvoice", () => {
  it("returns the existing invoice instead of creating a duplicate", async () => {
    const existing = { id: "inv-1", invoiceNumber: "INV-000001" };
    mockPrisma.invoice.findUnique.mockResolvedValue(existing);

    const result = await invoicesService.generateInvoice("order-1");
    expect(result).toBe(existing);
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  it("throws if the order doesn't exist", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(null);
    mockPrisma.order.findUnique.mockResolvedValue(null);

    await expect(invoicesService.generateInvoice("missing")).rejects.toThrow(
      "Order not found",
    );
  });

  it("continues invoice numbering from the highest existing number, not a row count", async () => {
    // Regression test for the count()-based collision bug — this one is
    // especially important since Owner-deleting an order actually deletes
    // its Invoice row (see pos.service.js's deleteOrder), which is exactly
    // what makes count() unsafe here.
    mockPrisma.invoice.findUnique.mockResolvedValue(null);
    mockPrisma.order.findUnique.mockResolvedValue({ id: "order-2" });
    mockPrisma.invoice.findFirst.mockResolvedValue({
      invoiceNumber: "INV-000099",
    });
    mockPrisma.invoice.create.mockImplementation(({ data }) => ({
      id: "inv-100",
      ...data,
    }));

    const invoice = await invoicesService.generateInvoice("order-2");
    expect(invoice.invoiceNumber).toBe("INV-000100");
  });

  it("starts at INV-000001 when no invoice has ever been created", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue(null);
    mockPrisma.order.findUnique.mockResolvedValue({ id: "order-3" });
    mockPrisma.invoice.findFirst.mockResolvedValue(null);
    mockPrisma.invoice.create.mockImplementation(({ data }) => ({
      id: "inv-1",
      ...data,
    }));

    const invoice = await invoicesService.generateInvoice("order-3");
    expect(invoice.invoiceNumber).toBe("INV-000001");
  });
});

describe("markSent", () => {
  it("appends a new channel without duplicating an existing one", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      sentVia: "print",
    });
    mockPrisma.invoice.update.mockImplementation(({ data }) => data);

    const result = await invoicesService.markSent("inv-1", "email");
    expect(result.sentVia).toBe("print,email");
  });

  it("doesn't duplicate a channel that was already recorded", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      sentVia: "print,email",
    });
    mockPrisma.invoice.update.mockImplementation(({ data }) => data);

    const result = await invoicesService.markSent("inv-1", "print");
    expect(result.sentVia).toBe("print,email");
  });
});
