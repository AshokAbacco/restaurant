// src/print/printerProfiles.js
//
// The paper side of printing: known printer models, and the maths that turns
// a stored PrinterProfile row into the numbers a receipt is laid out against.
//
// Nothing here touches the DOM. printing.js consumes `toPrintGeometry()` and
// builds the @media print stylesheet from it; the Settings pages use the same
// function to show an accurate preview.

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

// CSS defines 1in = 96px and 1in = 25.4mm, so this conversion is exact for
// layout purposes regardless of the printer's real dpi. The head's dot pitch
// (printableDots) is a hardware fact we record but never lay out against —
// the browser rasterises, not us.
export const MM_TO_PX = 96 / 25.4;

export const mmToPx = (mm) => Number(mm) * MM_TO_PX;

// ---------------------------------------------------------------------------
// Built-in model catalogue
// ---------------------------------------------------------------------------
//
// Picking a model fills the spec in for you; every field stays editable
// afterwards, because the same model name ships with different firmware
// defaults and margins in practice. `id: "CUSTOM"` is the escape hatch.
//
// Grouped by roll size, which is the only grouping that changes the layout.

export const PRINTER_CATALOGUE = [
  {
    group: "80mm Thermal (Standard 72mm / 576 Dots)",
    models: [
      {
        id: "POSIFLOW_KP307_UEWB",
        label: "Posiflow KP307-UEWB (300mm/s, Auto-Cutter)",
        model: "Posiflow KP307-UEWB",
        paperWidthMm: 80,
        printableWidthMm: 72,
        printableDots: 576,
        columns: 48,
        speedMmPerSec: 300,
        baseFontPx: 10,
      },
      {
        id: "EPSON_TM_T82III",
        label: "Epson TM-T82III / TM-T88VI (ESC/POS 48-Col)",
        model: "Epson TM-T82III",
        paperWidthMm: 80,
        printableWidthMm: 72,
        printableDots: 576,
        columns: 48,
        speedMmPerSec: 250,
        baseFontPx: 10,
      },
      {
        id: "TVS_RP3200",
        label: "TVS Electronics RP-3200 Plus / Star",
        model: "TVS RP-3200 Plus",
        paperWidthMm: 80,
        printableWidthMm: 72,
        printableDots: 576,
        columns: 48,
        speedMmPerSec: 250,
        baseFontPx: 10,
      },
      {
        id: "STAR_TSP143III",
        label: "Star Micronics TSP143III / TSP650II",
        model: "Star TSP143III",
        paperWidthMm: 80,
        printableWidthMm: 72,
        printableDots: 576,
        columns: 48,
        speedMmPerSec: 250,
        baseFontPx: 10,
      },
      {
        id: "BIXOLON_SRP330II",
        label: "Bixolon SRP-330II / SRP-350Plus",
        model: "Bixolon SRP-330II",
        paperWidthMm: 80,
        printableWidthMm: 72,
        printableDots: 576,
        columns: 48,
        speedMmPerSec: 220,
        baseFontPx: 10,
      },
      {
        id: "CITIZEN_CT_S310II",
        label: "Citizen CT-S310II / Sunmi 80mm Cloud",
        model: "Citizen CT-S310II",
        paperWidthMm: 80,
        printableWidthMm: 72,
        printableDots: 576,
        columns: 48,
        speedMmPerSec: 160,
        baseFontPx: 10,
      },
      {
        id: "GENERIC_80",
        label: "Generic 80mm POS-80 / Everycom EC-801",
        model: "Generic 80mm",
        paperWidthMm: 80,
        printableWidthMm: 72,
        printableDots: 576,
        columns: 48,
        speedMmPerSec: 200,
        baseFontPx: 10,
      },
    ],
  },
  {
    group: "70mm Custom Thermal / Narrow Margins",
    models: [
      {
        id: "POSIFLOW_KP307_70",
        label: "Posiflow KP307 (70mm Safe Printable Width)",
        model: "Posiflow KP307",
        paperWidthMm: 80,
        printableWidthMm: 64,
        printableDots: 512,
        columns: 42,
        speedMmPerSec: 300,
        baseFontPx: 10,
      },
      {
        id: "CUSTOM_70",
        label: "70mm Custom Thermal Roll (64mm / 42 Col)",
        model: "70mm Custom",
        paperWidthMm: 70,
        printableWidthMm: 64,
        printableDots: 512,
        columns: 42,
        speedMmPerSec: 200,
        baseFontPx: 10,
      },
      {
        id: "RUGTEK_RP326",
        label: "Rugtek RP326 / RP80 (70mm Narrow Mode)",
        model: "Rugtek RP326",
        paperWidthMm: 70,
        printableWidthMm: 64,
        printableDots: 512,
        columns: 42,
        speedMmPerSec: 200,
        baseFontPx: 10,
      },
    ],
  },
  {
    group: "58mm / 2-Inch Handheld & Pocket POS",
    models: [
      {
        id: "SUNMI_V2",
        label: "Sunmi V2 / V2 Pro Handheld POS (48mm / 32 Col)",
        model: "Sunmi V2",
        paperWidthMm: 58,
        printableWidthMm: 48,
        printableDots: 384,
        columns: 32,
        speedMmPerSec: 70,
        baseFontPx: 9,
      },
      {
        id: "TVS_RP3150",
        label: "TVS RP-3150 / Posiflow KP207 (58mm Roll)",
        model: "TVS RP-3150",
        paperWidthMm: 58,
        printableWidthMm: 48,
        printableDots: 384,
        columns: 32,
        speedMmPerSec: 90,
        baseFontPx: 9,
      },
      {
        id: "GENERIC_58",
        label: "Generic 58mm Mini Bluetooth Thermal Printer",
        model: "Generic 58mm",
        paperWidthMm: 58,
        printableWidthMm: 48,
        printableDots: 384,
        columns: 32,
        speedMmPerSec: 60,
        baseFontPx: 9,
      },
    ],
  },
];

export const CATALOGUE_MODELS = PRINTER_CATALOGUE.flatMap((g) => g.models);

export const findCatalogueModel = (id) =>
  CATALOGUE_MODELS.find((m) => m.id === id) || null;

// Used when an outlet has no profiles configured at all. Deliberately the
// same 80mm geometry the receipts were hard-coded to before this feature
// existed, so nothing changes for a restaurant that never opens the page.
export const FALLBACK_PROFILE = {
  id: null,
  name: "80mm Thermal (default)",
  model: "Generic 80mm",
  paperWidthMm: 80,
  printableWidthMm: 72,
  printableDots: 576,
  columns: 48,
  speedMmPerSec: null,
  baseFontPx: 10,
  extraMarginMm: 0,
  isFallback: true,
};

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

// Below this many characters per line, a two-column block (the invoice's
// bill-meta grid) leaves each column too narrow to hold "Cashier: POS
// Cashier" without breaking it in half — so those blocks stack instead.
// 40 sits between the 42-col (70mm) and 32-col (58mm) tiers.
export const TWO_COLUMN_MIN_COLUMNS = 40;

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Turns a stored profile into everything a stylesheet needs.
//
// The important one is `marginMm`: the gap between the roll width and the
// printable width is the printer's physically unprintable edge. Splitting it
// evenly is what keeps the receipt centred on the paper instead of shifted to
// one side with the far edge clipped.
// The type size the receipts were authored against. A profile at this size
// prints them exactly as designed (scale 1); anything else scales the whole
// slip proportionally. See buildStyles() in printing.js.
export const BASELINE_FONT_PX = 10;

export function toPrintGeometry(profile) {
  const p = profile || FALLBACK_PROFILE;

  const paperWidthMm = num(p.paperWidthMm, 80);
  const printableWidthMm = Math.min(num(p.printableWidthMm, 72), paperWidthMm);
  const extraMarginMm = Math.max(0, Number(p.extraMarginMm) || 0);

  const marginMm = (paperWidthMm - printableWidthMm) / 2 + extraMarginMm;
  // Guard against an extraMargin big enough to leave nothing to print on.
  const contentWidthMm = Math.max(printableWidthMm - extraMarginMm * 2, 20);

  const columns = Math.round(num(p.columns, 48));
  const baseFontPx = Number(p.baseFontPx) || 10;

  return {
    profileId: p.id ?? null,
    profileName: p.name || "Printer",
    model: p.model || null,
    paperWidthMm,
    printableWidthMm,
    printableDots: Math.round(num(p.printableDots, 576)),
    columns,
    speedMmPerSec: p.speedMmPerSec ?? null,
    baseFontPx,
    extraMarginMm,

    // Multiplier applied to the whole receipt on paper. 1 on the standard
    // 80mm profile, so that layout is untouched.
    scale: baseFontPx / BASELINE_FONT_PX,

    marginMm,
    contentWidthMm,
    contentWidthPx: mmToPx(contentWidthMm),

    // Item-table column widths, expressed in `ch`. A `ch` is the advance of
    // "0" in the font actually rendering, so these stay correct whatever
    // monospace face the browser resolves — no guessing at glyph widths.
    // Narrow rolls get tighter columns because 32 characters has to cover the
    // dish name too.
    qtyCh: columns < TWO_COLUMN_MIN_COLUMNS ? 3 : 4,
    amountCh: columns < TWO_COLUMN_MIN_COLUMNS ? 8 : 10,
    stackMeta: columns < TWO_COLUMN_MIN_COLUMNS,
  };
}

// Approximately how many characters of the receipt font fit on one line.
// Advisory only — shown on the Settings screens so someone raising the font
// size can see when they've pushed past what the paper holds. The 0.6em
// advance is the standard monospace ratio; measured against a real printed
// 80mm bill it came out at 0.61–0.65, so this errs slightly optimistic and is
// labelled "approx" everywhere it surfaces.
export const MONO_ADVANCE_EM = 0.6;

export function estimateRenderedColumns(geometry) {
  const g = geometry.contentWidthPx ? geometry : toPrintGeometry(geometry);
  return Math.floor(g.contentWidthPx / (g.baseFontPx * MONO_ADVANCE_EM));
}

// A short human summary — "80mm • 72mm (48 col) • 300mm/s".
export function describeProfile(profile) {
  const g = toPrintGeometry(profile);
  return [
    `${g.paperWidthMm}mm roll`,
    `${g.printableWidthMm}mm printable`,
    `${g.columns} col`,
    g.speedMmPerSec ? `${g.speedMmPerSec}mm/s` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}