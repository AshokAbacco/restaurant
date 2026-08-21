// server/src/pos/kot/kot.service.test.js
//
// Covers the offline-replay safety guard added to updateKotStatus: a
// stale queued status update (from client/src/offline/kdsQueue.js) must
// never regress a ticket that's already moved further ahead by the time
// it's replayed.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  kitchenOrder: { findUnique: vi.fn(), update: vi.fn() },
  order: { findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock("../../config/prisma.js", () => ({ default: mockPrisma }));

const kotService = await import("./kot.service.js");

beforeEach(() => vi.clearAllMocks());

describe("updateKotStatus offline-replay guard", () => {
  it("applies a normal forward transition (NEW -> READY)", async () => {
    mockPrisma.kitchenOrder.findUnique.mockResolvedValue({
      id: "k1",
      status: "NEW",
      orderId: "o1",
    });
    mockPrisma.kitchenOrder.update.mockResolvedValue({
      id: "k1",
      status: "READY",
    });
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "o1",
      status: "ACCEPTED",
    });

    const result = await kotService.updateKotStatus("k1", "READY");
    expect(result.status).toBe("READY");
    expect(mockPrisma.kitchenOrder.update).toHaveBeenCalled();
  });

  it("no-ops a replayed update for the SAME status instead of logging a duplicate transition", async () => {
    mockPrisma.kitchenOrder.findUnique.mockResolvedValue({
      id: "k2",
      status: "READY",
      orderId: "o2",
    });

    const result = await kotService.updateKotStatus("k2", "READY");
    expect(result.status).toBe("READY");
    expect(mockPrisma.kitchenOrder.update).not.toHaveBeenCalled();
  });

  it("no-ops a stale replayed update trying to move the ticket BACKWARD", async () => {
    // Regression test: this is the exact offline scenario — a kitchen
    // device queues "mark READY" while offline, but by the time it syncs,
    // the ticket has already been marked SERVED (by this device once back
    // online sooner via a different tab, or another kitchen screen
    // entirely). The stale "READY" must not regress a SERVED ticket.
    mockPrisma.kitchenOrder.findUnique.mockResolvedValue({
      id: "k3",
      status: "SERVED",
      orderId: "o3",
    });

    const result = await kotService.updateKotStatus("k3", "READY");
    expect(result.status).toBe("SERVED");
    expect(mockPrisma.kitchenOrder.update).not.toHaveBeenCalled();
  });

  it("always allows CANCELLED regardless of current stage", async () => {
    mockPrisma.kitchenOrder.findUnique.mockResolvedValue({
      id: "k4",
      status: "SERVED",
      orderId: "o4",
    });
    mockPrisma.kitchenOrder.update.mockResolvedValue({
      id: "k4",
      status: "CANCELLED",
    });
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "o4",
      status: "SERVED",
    });

    const result = await kotService.updateKotStatus("k4", "CANCELLED");
    expect(result.status).toBe("CANCELLED");
    expect(mockPrisma.kitchenOrder.update).toHaveBeenCalled();
  });

  it("always allows RECALLED — a deliberate backward action, not a stale replay", async () => {
    mockPrisma.kitchenOrder.findUnique.mockResolvedValue({
      id: "k5",
      status: "READY",
      orderId: "o5",
    });
    mockPrisma.kitchenOrder.update.mockResolvedValue({
      id: "k5",
      status: "RECALLED",
    });
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "o5",
      status: "READY",
    });

    const result = await kotService.updateKotStatus("k5", "RECALLED");
    expect(result.status).toBe("RECALLED");
    expect(mockPrisma.kitchenOrder.update).toHaveBeenCalled();
  });

  it("throws if the kitchen order doesn't exist", async () => {
    mockPrisma.kitchenOrder.findUnique.mockResolvedValue(null);
    await expect(
      kotService.updateKotStatus("missing", "READY"),
    ).rejects.toThrow("Kitchen order not found");
  });
});
