// server/src/pos/printer-profiles/printerProfiles.service.js
//
// Thermal printer / paper geometry per outlet. See the PrinterProfile model
// in schema.prisma for why this exists: a receipt is laid out against paper,
// and 80mm / 70mm / 58mm rolls need genuinely different layouts.
//
// The client reads these at print time (client/src/print/printing.js) and
// builds @page + font + column sizing from them. Nothing here renders
// anything; this is purely the stored spec.
import prisma from "../config/prisma.js";

// Guard rails, not preferences. A profile outside these ranges doesn't
// produce a slightly-off receipt, it produces one the printer physically
// can't feed — so it's rejected rather than silently clamped.
const LIMITS = {
  paperWidthMm: [40, 120],
  printableWidthMm: [30, 120],
  printableDots: [128, 1728],
  columns: [16, 96],
  speedMmPerSec: [10, 1000],
  baseFontPx: [6, 20],
  extraMarginMm: [0, 20],
  copies: [1, 5],
};

// Recorded, not dialled: the browser prints through the OS dialog, so this
// documents what staff physically connected rather than selecting a
// transport. Rejected if unrecognised so the UI can rely on the set.
const CONNECTION_TYPES = ["SYSTEM", "NETWORK", "USB", "BLUETOOTH"];

// What a printer is allowed to receive. The whole point of this feature: a
// kitchen printer must never produce an invoice and a cashier printer must
// never produce a KOT.
const PURPOSES = ["KOT", "INVOICE", "BOTH"];

// Per-printer print behaviour. Listed rather than spread so an unknown key in
// the request body can't quietly become a column.
const BEHAVIOUR_FLAGS = [
  "autoPrintKot",
  "autoPrintReceipt",
  "autoPrintInvoice",
  "allowReprint",
  "printLogo",
  "printGstDetails",
  "printQrCode",
  "printBarcode",
  "printItemNotes",
  "printTableNumber",
  "printOrderTime",
  "openCashDrawer",
];

function fail(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
}

function toNumber(value, field, { integer = true } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) fail(`${field} must be a number.`);
  if (integer && !Number.isInteger(n)) fail(`${field} must be a whole number.`);
  const [min, max] = LIMITS[field];
  if (n < min || n > max) fail(`${field} must be between ${min} and ${max}.`);
  return n;
}

// The one rule that actually matters for print correctness: you cannot print
// wider than the paper. Everything downstream (the page margin, and therefore
// whether content sits centred or runs off the edge) is derived from the
// difference between these two.
function assertGeometry({ paperWidthMm, printableWidthMm }) {
  if (printableWidthMm > paperWidthMm) {
    fail(
      `Printable width (${printableWidthMm}mm) can't be wider than the paper ` +
        `roll (${paperWidthMm}mm).`,
    );
  }
}

const purposeOf = (data) => data.purpose || "BOTH";

function normalise(input, { partial = false } = {}) {
  const data = {};
  const has = (k) => input[k] !== undefined && input[k] !== null && input[k] !== "";

  if (has("name")) data.name = String(input.name).trim();
  else if (!partial) fail("Profile name is required.");
  if (data.name === "") fail("Profile name is required.");

  for (const key of ["model", "deviceLabel", "notes", "ipAddress"]) {
    if (input[key] !== undefined) {
      const v = input[key] === null ? null : String(input[key]).trim();
      data[key] = v || null;
    }
  }

  for (const key of [
    "paperWidthMm",
    "printableWidthMm",
    "printableDots",
    "columns",
    "speedMmPerSec",
    "copies",
  ]) {
    if (has(key)) data[key] = toNumber(input[key], key);
  }

  if (has("purpose")) {
    const value = String(input.purpose).toUpperCase();
    if (!PURPOSES.includes(value)) {
      fail(`purpose must be one of ${PURPOSES.join(", ")}.`);
    }
    data.purpose = value;
  }

  // Explicit null is meaningful here — it clears the binding back to "any
  // kitchen" — so this can't go through the `has()` truthiness check.
  if (input.kitchenBranchId !== undefined) {
    data.kitchenBranchId = input.kitchenBranchId || null;
  }

  if (has("connectionType")) {
    const value = String(input.connectionType).toUpperCase();
    if (!CONNECTION_TYPES.includes(value)) {
      fail(`connectionType must be one of ${CONNECTION_TYPES.join(", ")}.`);
    }
    data.connectionType = value;
  }

  for (const flag of BEHAVIOUR_FLAGS) {
    if (input[flag] !== undefined) data[flag] = Boolean(input[flag]);
  }

  for (const key of ["baseFontPx", "extraMarginMm"]) {
    if (has(key)) data[key] = toNumber(input[key], key, { integer: false });
  }

  if (input.isActive !== undefined) data.isActive = Boolean(input.isActive);
  if (input.isDefault !== undefined) data.isDefault = Boolean(input.isDefault);

  return data;
}

export async function listPrinterProfiles(
  { activeOnly, purpose, kitchenBranchId } = {},
  outletId,
) {
  return prisma.printerProfile.findMany({
    where: {
      outletId,
      ...(activeOnly === "true" || activeOnly === true ? { isActive: true } : {}),
      ...(purpose ? { purpose: String(purpose).toUpperCase() } : {}),
      ...(kitchenBranchId ? { kitchenBranchId } : {}),
    },
    include: { kitchenBranch: { select: { id: true, name: true } } },
    // Default first — the client picks profiles[0] as its fallback when a
    // device has never chosen one.
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getPrinterProfileById(id, outletId) {
  return prisma.printerProfile.findFirst({ where: { id, outletId } });
}

// The profile a device should use when it hasn't picked one itself.
// `purpose` narrows it to that stream's default.
export async function getDefaultPrinterProfile(outletId, purpose) {
  const purposeFilter =
    purpose && purpose !== "BOTH"
      ? { purpose: { in: [purpose, "BOTH"] } }
      : {};

  return (
    (await prisma.printerProfile.findFirst({
      where: { outletId, isDefault: true, isActive: true, ...purposeFilter },
      // A printer dedicated to this purpose beats a BOTH catch-all.
      orderBy: { purpose: "asc" },
    })) ||
    (await prisma.printerProfile.findFirst({
      where: { outletId, isActive: true, ...purposeFilter },
      orderBy: [{ purpose: "asc" }, { name: "asc" }],
    }))
  );
}

// Which printer should this specific job go to?
//
// Resolution order for a KOT, most specific first:
//   1. a KOT printer bound to this exact kitchen
//   2. that kitchen's BOTH printer
//   3. an unbound KOT printer ("any kitchen" — correct for single-kitchen
//      outlets, and the sane fallback when a new kitchen has no printer yet)
//   4. the outlet default for this purpose
//
// Returns { profile, matchedOn } so the caller can tell an exact hit from a
// fallback. That distinction matters: silently printing a Rooftop ticket on
// the Ground Floor printer is worse than saying the routing is incomplete.
export async function resolvePrinterProfile(
  { purpose = "BOTH", kitchenBranchId } = {},
  outletId,
) {
  const target = String(purpose).toUpperCase();
  if (!PURPOSES.includes(target)) {
    fail(`purpose must be one of ${PURPOSES.join(", ")}.`);
  }

  const base = { outletId, isActive: true };

  if (target === "KOT" && kitchenBranchId) {
    const exact = await prisma.printerProfile.findFirst({
      where: { ...base, purpose: "KOT", kitchenBranchId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    if (exact) return { profile: exact, matchedOn: "KITCHEN_EXACT" };

    const shared = await prisma.printerProfile.findFirst({
      where: { ...base, purpose: "BOTH", kitchenBranchId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    if (shared) return { profile: shared, matchedOn: "KITCHEN_SHARED" };
  }

  if (target !== "BOTH") {
    const unbound = await prisma.printerProfile.findFirst({
      where: { ...base, purpose: target, kitchenBranchId: null },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    if (unbound) return { profile: unbound, matchedOn: "PURPOSE_ANY" };
  }

  const fallback = await getDefaultPrinterProfile(outletId, target);
  return {
    profile: fallback || null,
    matchedOn: fallback ? "OUTLET_DEFAULT" : "NONE",
  };
}

export async function createPrinterProfile(body, outletId) {
  const data = normalise(body);

  const merged = {
    paperWidthMm: 80,
    printableWidthMm: 72,
    ...data,
  };
  assertGeometry(merged);

  // First profile for an outlet becomes the default automatically —
  // otherwise a freshly-configured outlet has printers but nothing for a new
  // device to fall back to.
  // Scoped to this purpose: the first KOT printer and the first invoice
  // printer each become the default for their own stream.
  const existingCount = await prisma.printerProfile.count({
    where: { outletId, purpose: purposeOf(data) },
  });
  const shouldDefault = data.isDefault === true || existingCount === 0;

  try {
    return await prisma.$transaction(async (tx) => {
      if (shouldDefault) {
        await tx.printerProfile.updateMany({
          where: { outletId, isDefault: true, purpose: purposeOf(data) },
          data: { isDefault: false },
        });
      }
      return tx.printerProfile.create({
        data: { ...data, outletId, isDefault: shouldDefault },
      });
    });
  } catch (err) {
    if (err.code === "P2002") {
      fail(`A printer profile named "${data.name}" already exists.`, 409);
    }
    throw err;
  }
}

export async function updatePrinterProfile(id, body, outletId) {
  const existing = await prisma.printerProfile.findFirst({ where: { id, outletId } });
  if (!existing) fail("Printer profile not found", 404);

  const data = normalise(body, { partial: true });
  assertGeometry({
    paperWidthMm: data.paperWidthMm ?? existing.paperWidthMm,
    printableWidthMm: data.printableWidthMm ?? existing.printableWidthMm,
  });

  // Refusing to un-default the last default keeps getDefaultPrinterProfile
  // meaningful; clearing it is done by promoting another profile instead.
  if (data.isDefault === false && existing.isDefault) {
    fail("Set another profile as the default instead of clearing this one.");
  }
  // Same for deactivating the default — devices falling back to it would
  // silently get nothing.
  if (data.isActive === false && existing.isDefault) {
    fail("This is the default profile. Make another profile the default first.");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (data.isDefault === true) {
        await tx.printerProfile.updateMany({
          where: {
            outletId,
            isDefault: true,
            purpose: data.purpose ?? existing.purpose,
            NOT: { id },
          },
          data: { isDefault: false },
        });
      }
      return tx.printerProfile.update({ where: { id }, data });
    });
  } catch (err) {
    if (err.code === "P2002") {
      fail(`A printer profile named "${data.name}" already exists.`, 409);
    }
    throw err;
  }
}

export async function setDefaultPrinterProfile(id, outletId) {
  const existing = await prisma.printerProfile.findFirst({ where: { id, outletId } });
  if (!existing) fail("Printer profile not found", 404);
  if (!existing.isActive) fail("Reactivate this profile before making it the default.");

  return prisma.$transaction(async (tx) => {
    await tx.printerProfile.updateMany({
      where: { outletId, isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });
    return tx.printerProfile.update({ where: { id }, data: { isDefault: true } });
  });
}

// Deactivate, never hard-delete: devices cache their chosen profile id
// locally, and a row vanishing mid-shift would leave those terminals with no
// geometry at all.
export async function deactivatePrinterProfile(id, outletId) {
  const existing = await prisma.printerProfile.findFirst({ where: { id, outletId } });
  if (!existing) fail("Printer profile not found", 404);
  if (existing.isDefault) {
    fail("This is the default profile. Make another profile the default first.");
  }
  return prisma.printerProfile.update({ where: { id }, data: { isActive: false } });
}