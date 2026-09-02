// server/src/pos/printer-profiles/printerProfiles.service.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => {
  const profile = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  };
  return {
    printerProfile: profile,
    // The service uses interactive transactions; run the callback against the
    // same mock so assertions see every write.
    $transaction: vi.fn((fn) => fn({ printerProfile: profile })),
  };
});

vi.mock("../config/prisma.js", () => ({ default: mockPrisma }));

const service = await import("./printerProfiles.service.js");

const OUTLET = "outlet-1";
const VALID = {
  name: "Front counter — Posiflow 80mm",
  model: "Posiflow KP307-UEWB",
  paperWidthMm: 80,
  printableWidthMm: 72,
  printableDots: 576,
  columns: 48,
  speedMmPerSec: 300,
  baseFontPx: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.printerProfile.count.mockResolvedValue(1);
  mockPrisma.printerProfile.create.mockImplementation(({ data }) => ({ id: "p1", ...data }));
  mockPrisma.printerProfile.update.mockImplementation(({ data }) => ({ id: "p1", ...data }));
  mockPrisma.printerProfile.updateMany.mockResolvedValue({ count: 0 });
});

describe("createPrinterProfile", () => {
  it("stores the full paper geometry", async () => {
    const result = await service.createPrinterProfile(VALID, OUTLET);
    expect(result.printableWidthMm).toBe(72);
    expect(result.columns).toBe(48);
    expect(result.outletId).toBe(OUTLET);
  });

  it("rejects a printable width wider than the paper roll", async () => {
    await expect(
      service.createPrinterProfile(
        { ...VALID, paperWidthMm: 58, printableWidthMm: 72 },
        OUTLET,
      ),
    ).rejects.toThrow(/can't be wider than the paper/i);
  });

  it("accepts a 58mm profile", async () => {
    const result = await service.createPrinterProfile(
      {
        name: "Handheld 58mm",
        paperWidthMm: 58,
        printableWidthMm: 48,
        printableDots: 384,
        columns: 32,
        baseFontPx: 9,
      },
      OUTLET,
    );
    expect(result.paperWidthMm).toBe(58);
    expect(result.columns).toBe(32);
  });

  it("requires a name", async () => {
    await expect(
      service.createPrinterProfile({ ...VALID, name: "  " }, OUTLET),
    ).rejects.toThrow(/name is required/i);
  });

  it("rejects out-of-range values rather than clamping them", async () => {
    await expect(
      service.createPrinterProfile({ ...VALID, columns: 4 }, OUTLET),
    ).rejects.toThrow(/columns must be between/i);
    await expect(
      service.createPrinterProfile({ ...VALID, baseFontPx: 40 }, OUTLET),
    ).rejects.toThrow(/baseFontPx must be between/i);
  });

  it("rejects a non-numeric width", async () => {
    await expect(
      service.createPrinterProfile({ ...VALID, printableWidthMm: "wide" }, OUTLET),
    ).rejects.toThrow(/must be a number/i);
  });

  it("makes the very first profile the default", async () => {
    mockPrisma.printerProfile.count.mockResolvedValue(0);
    const result = await service.createPrinterProfile(VALID, OUTLET);
    expect(result.isDefault).toBe(true);
  });

  it("does not make a later profile default unless asked", async () => {
    const result = await service.createPrinterProfile(VALID, OUTLET);
    expect(result.isDefault).toBe(false);
  });

  it("clears the previous default of the SAME purpose only", async () => {
    // VALID carries no purpose, so it lands in the BOTH stream. A KOT or
    // INVOICE default elsewhere must survive this.
    await service.createPrinterProfile({ ...VALID, isDefault: true }, OUTLET);
    expect(mockPrisma.printerProfile.updateMany).toHaveBeenCalledWith({
      where: { outletId: OUTLET, isDefault: true, purpose: "BOTH" },
      data: { isDefault: false },
    });
  });

  it("surfaces a duplicate name as a 409", async () => {
    mockPrisma.printerProfile.create.mockRejectedValue({ code: "P2002" });
    await expect(service.createPrinterProfile(VALID, OUTLET)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe("connection and print behaviour", () => {
  it("stores the behaviour flags as booleans", async () => {
    const result = await service.createPrinterProfile(
      { ...VALID, autoPrintKot: false, openCashDrawer: 1, printBarcode: "yes" },
      OUTLET,
    );
    expect(result.autoPrintKot).toBe(false);
    expect(result.openCashDrawer).toBe(true);
    expect(result.printBarcode).toBe(true);
  });

  it("ignores unknown keys rather than passing them to Prisma", async () => {
    const result = await service.createPrinterProfile(
      { ...VALID, isSuperAdmin: true, outletId: "someone-elses-outlet" },
      OUTLET,
    );
    expect(result.isSuperAdmin).toBeUndefined();
    expect(result.outletId).toBe(OUTLET);
  });

  it("normalises connectionType case", async () => {
    const result = await service.createPrinterProfile(
      { ...VALID, connectionType: "network" },
      OUTLET,
    );
    expect(result.connectionType).toBe("NETWORK");
  });

  it("rejects an unrecognised connectionType", async () => {
    await expect(
      service.createPrinterProfile({ ...VALID, connectionType: "CARRIER_PIGEON" }, OUTLET),
    ).rejects.toThrow(/connectionType must be one of/i);
  });

  it("bounds the copy count", async () => {
    await expect(
      service.createPrinterProfile({ ...VALID, copies: 99 }, OUTLET),
    ).rejects.toThrow(/copies must be between/i);
  });
});

describe("updatePrinterProfile", () => {
  it("validates geometry against the stored values, not just the patch", async () => {
    mockPrisma.printerProfile.findFirst.mockResolvedValue({
      id: "p1",
      ...VALID,
      isDefault: false,
    });
    // Narrowing the roll alone would leave printable(72) > paper(58).
    await expect(
      service.updatePrinterProfile("p1", { paperWidthMm: 58 }, OUTLET),
    ).rejects.toThrow(/can't be wider than the paper/i);
  });

  it("patches a single behaviour flag without touching the rest", async () => {
    mockPrisma.printerProfile.findFirst.mockResolvedValue({ id: "p1", ...VALID });
    await service.updatePrinterProfile("p1", { openCashDrawer: true }, OUTLET);
    expect(mockPrisma.printerProfile.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { openCashDrawer: true },
    });
  });

  it("allows a partial patch without re-sending the name", async () => {
    mockPrisma.printerProfile.findFirst.mockResolvedValue({ id: "p1", ...VALID });
    const result = await service.updatePrinterProfile("p1", { baseFontPx: 9.5 }, OUTLET);
    expect(result.baseFontPx).toBe(9.5);
  });

  it("refuses to un-default the current default", async () => {
    mockPrisma.printerProfile.findFirst.mockResolvedValue({
      id: "p1",
      ...VALID,
      isDefault: true,
    });
    await expect(
      service.updatePrinterProfile("p1", { isDefault: false }, OUTLET),
    ).rejects.toThrow(/Set another profile as the default/i);
  });

  it("refuses to deactivate the default", async () => {
    mockPrisma.printerProfile.findFirst.mockResolvedValue({
      id: "p1",
      ...VALID,
      isDefault: true,
    });
    await expect(
      service.updatePrinterProfile("p1", { isActive: false }, OUTLET),
    ).rejects.toThrow(/default profile/i);
  });

  it("404s for another outlet's profile", async () => {
    mockPrisma.printerProfile.findFirst.mockResolvedValue(null);
    await expect(
      service.updatePrinterProfile("p1", { baseFontPx: 9 }, OUTLET),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("setDefaultPrinterProfile", () => {
  it("demotes every other profile in the same transaction", async () => {
    mockPrisma.printerProfile.findFirst.mockResolvedValue({
      id: "p2",
      ...VALID,
      isActive: true,
    });
    const result = await service.setDefaultPrinterProfile("p2", OUTLET);
    expect(mockPrisma.printerProfile.updateMany).toHaveBeenCalledWith({
      where: { outletId: OUTLET, isDefault: true, NOT: { id: "p2" } },
      data: { isDefault: false },
    });
    expect(result.isDefault).toBe(true);
  });

  it("won't promote a deactivated profile", async () => {
    mockPrisma.printerProfile.findFirst.mockResolvedValue({
      id: "p2",
      ...VALID,
      isActive: false,
    });
    await expect(service.setDefaultPrinterProfile("p2", OUTLET)).rejects.toThrow(
      /Reactivate/i,
    );
  });
});

describe("deactivatePrinterProfile", () => {
  it("soft-deactivates rather than deleting", async () => {
    mockPrisma.printerProfile.findFirst.mockResolvedValue({
      id: "p1",
      ...VALID,
      isDefault: false,
    });
    const result = await service.deactivatePrinterProfile("p1", OUTLET);
    expect(result.isActive).toBe(false);
    expect(mockPrisma.printerProfile.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { isActive: false },
    });
  });

  it("protects the default profile", async () => {
    mockPrisma.printerProfile.findFirst.mockResolvedValue({
      id: "p1",
      ...VALID,
      isDefault: true,
    });
    await expect(service.deactivatePrinterProfile("p1", OUTLET)).rejects.toThrow(
      /default profile/i,
    );
  });
});

describe("getDefaultPrinterProfile", () => {
  it("falls back to any active profile when none is flagged default", async () => {
    mockPrisma.printerProfile.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "p9", name: "Only one" });
    const result = await service.getDefaultPrinterProfile(OUTLET);
    expect(result.id).toBe("p9");
  });

  it("returns null when the outlet has no printers at all", async () => {
    mockPrisma.printerProfile.findFirst.mockResolvedValue(null);
    expect(await service.getDefaultPrinterProfile(OUTLET)).toBeNull();
  });
});

describe("purpose + kitchen routing", () => {
  it("rejects an unknown purpose", async () => {
    await expect(
      service.createPrinterProfile({ ...VALID, purpose: "RECEIPTS" }, OUTLET),
    ).rejects.toThrow(/purpose must be one of/i);
  });

  it("normalises purpose case and keeps the kitchen binding", async () => {
    const result = await service.createPrinterProfile(
      { ...VALID, purpose: "kot", kitchenBranchId: "kitchen-1" },
      OUTLET,
    );
    expect(result.purpose).toBe("KOT");
    expect(result.kitchenBranchId).toBe("kitchen-1");
  });

  it("lets an explicit null clear the kitchen binding", async () => {
    mockPrisma.printerProfile.findFirst.mockResolvedValue({ id: "p1", ...VALID });
    await service.updatePrinterProfile("p1", { kitchenBranchId: null }, OUTLET);
    expect(mockPrisma.printerProfile.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { kitchenBranchId: null },
    });
  });

  it("scopes the first-profile default to its own purpose", async () => {
    // An outlet that already has an invoice printer but no KOT printer:
    // the first KOT printer must still become the KOT default.
    mockPrisma.printerProfile.count.mockResolvedValue(0);
    const result = await service.createPrinterProfile(
      { ...VALID, purpose: "KOT" },
      OUTLET,
    );
    expect(mockPrisma.printerProfile.count).toHaveBeenCalledWith({
      where: { outletId: OUTLET, purpose: "KOT" },
    });
    expect(result.isDefault).toBe(true);
  });

  it("only demotes defaults of the same purpose", async () => {
    await service.createPrinterProfile(
      { ...VALID, purpose: "INVOICE", isDefault: true },
      OUTLET,
    );
    expect(mockPrisma.printerProfile.updateMany).toHaveBeenCalledWith({
      where: { outletId: OUTLET, isDefault: true, purpose: "INVOICE" },
      data: { isDefault: false },
    });
  });
});

describe("resolvePrinterProfile", () => {
  const hit = (profile) => mockPrisma.printerProfile.findFirst.mockResolvedValueOnce(profile);

  it("prefers a KOT printer bound to that exact kitchen", async () => {
    hit({ id: "kot-rooftop", purpose: "KOT", kitchenBranchId: "rooftop" });
    const out = await service.resolvePrinterProfile(
      { purpose: "KOT", kitchenBranchId: "rooftop" },
      OUTLET,
    );
    expect(out.profile.id).toBe("kot-rooftop");
    expect(out.matchedOn).toBe("KITCHEN_EXACT");
  });

  it("falls back to a shared printer in the same kitchen", async () => {
    hit(null); // no dedicated KOT printer there
    hit({ id: "both-rooftop", purpose: "BOTH", kitchenBranchId: "rooftop" });
    const out = await service.resolvePrinterProfile(
      { purpose: "KOT", kitchenBranchId: "rooftop" },
      OUTLET,
    );
    expect(out.profile.id).toBe("both-rooftop");
    expect(out.matchedOn).toBe("KITCHEN_SHARED");
  });

  it("falls back to an unbound KOT printer for a kitchen with none of its own", async () => {
    hit(null);
    hit(null);
    hit({ id: "kot-any", purpose: "KOT", kitchenBranchId: null });
    const out = await service.resolvePrinterProfile(
      { purpose: "KOT", kitchenBranchId: "new-kitchen" },
      OUTLET,
    );
    expect(out.profile.id).toBe("kot-any");
    expect(out.matchedOn).toBe("PURPOSE_ANY");
  });

  it("never returns a KOT printer for an invoice", async () => {
    // No INVOICE or BOTH printer configured anywhere.
    mockPrisma.printerProfile.findFirst.mockResolvedValue(null);
    const out = await service.resolvePrinterProfile({ purpose: "INVOICE" }, OUTLET);
    expect(out.profile).toBeNull();
    expect(out.matchedOn).toBe("NONE");
    // Every query it ran was constrained to INVOICE or BOTH.
    for (const call of mockPrisma.printerProfile.findFirst.mock.calls) {
      const w = call[0].where;
      const p = w.purpose;
      const allowed = typeof p === "string" ? [p] : p?.in || [];
      expect(allowed.every((x) => x === "INVOICE" || x === "BOTH")).toBe(true);
    }
  });

  it("reports NONE rather than guessing when nothing is configured", async () => {
    mockPrisma.printerProfile.findFirst.mockResolvedValue(null);
    const out = await service.resolvePrinterProfile(
      { purpose: "KOT", kitchenBranchId: "rooftop" },
      OUTLET,
    );
    expect(out.profile).toBeNull();
    expect(out.matchedOn).toBe("NONE");
  });

  it("rejects an unknown purpose", async () => {
    await expect(
      service.resolvePrinterProfile({ purpose: "NONSENSE" }, OUTLET),
    ).rejects.toThrow(/purpose must be one of/i);
  });
});

describe("listPrinterProfiles", () => {
  it("filters to active only when asked", async () => {
    mockPrisma.printerProfile.findMany.mockResolvedValue([]);
    await service.listPrinterProfiles({ activeOnly: "true" }, OUTLET);
    expect(mockPrisma.printerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { outletId: OUTLET, isActive: true },
      }),
    );
  });
});