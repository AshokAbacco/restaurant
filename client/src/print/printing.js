// src/print/printing.js
//
// One place that owns printing.
//
// ── WHY THE SAME KOT CAME OUT TWICE ────────────────────────────────
// The old rules hid the app with `body * { visibility: hidden }`. `hidden`
// only makes boxes invisible — they still take up their full layout space,
// so the printed document stayed as tall as the whole POS screen and the
// browser paginated it into two (or more) sheets.
//
// KotPrintModal's root is `position: fixed`, and per CSS paged media a
// fixed-position box is REPEATED on every page. Two pages of otherwise
// blank app layout therefore carried two copies of the same ticket — one
// job, one KOT number, printed twice back-to-back with no gap.
//
// The fix is structural: at print time the printable node is cloned into
// #app-print-root, a plain static div that is a direct child of <body>, and
// every other child of <body> is `display: none`. The document then
// contains exactly one receipt, one page tall, with no fixed ancestor left
// to repeat.
//
// ── WHERE THE PAPER SIZE COMES FROM ────────────────────────────────
// The geometry below is no longer hard-coded to an 80mm roll. It is built
// from the active PrinterProfile (see printerConfig.js / printerProfiles.js),
// so an outlet on a 58mm handheld gets a 58mm layout without touching any
// component. The receipts carry semantic hooks — .receipt-sheet,
// .receipt-meta-grid, .receipt-col-qty, .receipt-col-amount — and this file
// sizes them per profile. That keeps paper decisions in one file instead of
// scattered `print:` classes across KotTicket and InvoiceView.

import { getActiveGeometry, subscribeToPrinterProfile } from "./printerConfig";
import { toPrintGeometry } from "./printerProfiles";

// Set only for the duration of a single job (see printOnce's `profile`
// option). Lets Settings test-print a profile the device is NOT using,
// without persisting a selection the operator never asked for.
let geometryOverride = null;

const currentGeometry = () => geometryOverride || getActiveGeometry();

const STYLE_ID = "app-print-styles";
const PRINT_ROOT_ID = "app-print-root";

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------

function buildStyles(g) {
  // Rounded because sub-micron page geometry is noise, and some drivers
  // reject over-precise @page sizes.
  const round = (n) => Math.round(n * 100) / 100;

  // Receipts keep their own type scale (the KOT reads at 12px, the invoice at
  // 10px — different documents, different jobs). What the profile changes is
  // a single multiplier on top, so a narrower roll shrinks the whole slip
  // proportionally without either component knowing about paper sizes.
  //
  // `zoom` rather than `transform: scale()`: zoom participates in layout and
  // pagination, so text still reflows and the page still measures correctly.
  // A transform would scale the pixels and leave the layout box behind.
  //
  // Emitted ONLY when the scale isn't 1. On the standard 80mm profile this
  // block is absent entirely, which is what guarantees the currently-correct
  // 80mm KOT and invoice print byte-identically to before this feature.
  const scale = round(g.scale);
  const scaleRule =
    scale === 1
      ? ""
      : `  #${PRINT_ROOT_ID} .receipt-sheet { zoom: ${scale}; }`;

  return `
/* Never visible on screen — it only ever holds a clone during a print job. */
#${PRINT_ROOT_ID} { display: none; }

@media print {
  /* display:none, NOT visibility:hidden. Collapsing the layout is what keeps
     the job one page long, and what removes the fixed-position modal that
     was being repeated onto every page. */
  body > *:not(#${PRINT_ROOT_ID}) { display: none !important; }

  html, body {
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }

  #${PRINT_ROOT_ID} {
    display: block !important;
    position: static !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* The cloned receipt itself: fill the roll, drop screen-only chrome. */
  #${PRINT_ROOT_ID} > * {
    position: static !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    box-shadow: none !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Paper is white whatever the app theme is doing. */
  #${PRINT_ROOT_ID},
  #${PRINT_ROOT_ID} * {
    visibility: visible !important;
    background: #fff !important;
    color: #000 !important;
    border-color: #000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Screen-only controls inside a receipt (buttons, toolbars). */
  #${PRINT_ROOT_ID} .print\\:hidden { display: none !important; }

  /* ---- Profile-driven receipt layout --------------------------------- */
  /* ${g.profileName}: ${g.paperWidthMm}mm roll, ${g.printableWidthMm}mm
     printable, ${g.columns} columns, ${round(g.baseFontPx)}px. */

  #${PRINT_ROOT_ID} .receipt-sheet {
    width: 100% !important;
    max-width: none !important;
  }
${scaleRule}

  /* Item table columns in ch units — the advance of "0" in the font actually
     rendering, so they stay correct whatever monospace face resolves. */
  #${PRINT_ROOT_ID} .receipt-col-qty {
    width: ${g.qtyCh}ch !important;
    flex: 0 0 ${g.qtyCh}ch !important;
  }
  #${PRINT_ROOT_ID} .receipt-col-amount {
    width: ${g.amountCh}ch !important;
    flex: 0 0 ${g.amountCh}ch !important;
  }

  /* Two-up meta pairs collapse to a single column on narrow rolls, where
     half a line can't hold "Cashier: POS Cashier" without breaking it. */
  #${PRINT_ROOT_ID} .receipt-meta-grid {
    grid-template-columns: ${g.stackMeta ? "1fr" : "1fr auto"} !important;
    column-gap: ${g.stackMeta ? 0 : 8}px !important;
  }
  ${
    g.stackMeta
      ? `#${PRINT_ROOT_ID} .receipt-meta-grid > * { text-align: left !important; }`
      : ""
  }
}

/* The roll itself. The margin is half the difference between the paper and
   the printable area — i.e. the head's physically unprintable edge — which is
   what keeps the receipt centred rather than shifted against one side with
   the far edge clipped. */
@page {
  size: ${round(g.paperWidthMm)}mm auto;
  margin: ${round(g.marginMm)}mm;
}
`;
}

// A cheap identity for "would this produce different CSS?", so a profile
// change re-injects but a no-op refresh doesn't.
function signatureOf(g) {
  return [
    g.paperWidthMm,
    g.printableWidthMm,
    g.marginMm,
    g.baseFontPx,
    g.scale,
    g.columns,
    g.qtyCh,
    g.amountCh,
    g.stackMeta,
  ].join("|");
}

// Injected once, globally, instead of once per mounted component. A second
// component shipping its own `body * { visibility: hidden }` block is what
// used to make the bill and the ticket fight over the same job.
//
// Safe to call on every mount: it rewrites the sheet only when the active
// printer profile actually changes.
export function ensurePrintStyles() {
  if (typeof document === "undefined") return;

  const geometry = currentGeometry();
  const signature = signatureOf(geometry);

  let style = document.getElementById(STYLE_ID);
  if (style && style.dataset.printSignature === signature) return;

  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.dataset.printSignature = signature;
  style.textContent = buildStyles(geometry);
}

// Keep the sheet in step with the device's printer selection without every
// component having to subscribe. Registered once at module load.
subscribeToPrinterProfile(() => ensurePrintStyles());

// ---------------------------------------------------------------------------
// Printing
// ---------------------------------------------------------------------------

function getPrintRoot() {
  let root = document.getElementById(PRINT_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = PRINT_ROOT_ID;
    root.setAttribute("aria-hidden", "true");
    document.body.appendChild(root);
  }
  return root;
}

// Accepts an Element, a React ref, a selector string, or nothing (in which
// case the single [data-print-active="true"] node is used).
function resolvePrintable(target) {
  const el = target && typeof target === "object" && "current" in target
    ? target.current
    : target;

  // nodeType check rather than `instanceof Element` — the latter is false
  // across realms (an iframe/portal document) and undefined outside a browser.
  if (el && el.nodeType === 1) return el;
  if (typeof el === "string") return document.querySelector(el);

  const matches = document.querySelectorAll('[data-print-active="true"]');
  if (matches.length > 1) {
    // Two printables mounted at once used to mean two documents in one job.
    // Refuse to guess rather than putting the wrong paper in the kitchen.
    console.warn(
      `[print] ${matches.length} elements are marked data-print-active — ` +
        "only one may be active at a time. Printing the first.",
    );
  }
  return matches[0] || null;
}

let lastPrintAt = 0;
let printing = false;

// Fires the print dialog at most once, for exactly one document.
//
// Three separate guards, because each covers a different way a duplicate got
// through: `printing` blocks a click while a dialog is already open, the 1s
// window blocks a double-click/fat-finger, and cloning into a single-child
// print root blocks the CSS-level duplication described at the top of this
// file. Returns true only if a job was actually started.
export function printOnce(target, { profile } = {}) {
  if (typeof window === "undefined") return false;

  const now = Date.now();
  if (printing || now - lastPrintAt < 1000) return false;

  // Scoped to this job only, and cleared in cleanup() below.
  geometryOverride = profile ? toPrintGeometry(profile) : null;
  ensurePrintStyles();

  const source = resolvePrintable(target);
  if (!source) {
    console.warn("[print] Nothing to print — no active printable element.");
    geometryOverride = null;
    ensurePrintStyles();
    return false;
  }

  const root = getPrintRoot();
  const clone = source.cloneNode(true);
  // The clone must not itself look like a printable, or the next call would
  // find two candidates.
  clone.removeAttribute?.("data-print-active");
  clone
    .querySelectorAll?.("[data-print-active]")
    .forEach((el) => el.removeAttribute("data-print-active"));

  // replaceChildren, not appendChild — the root holds one receipt or none.
  root.replaceChildren(clone);

  printing = true;
  lastPrintAt = now;

  let fallbackTimer;
  const cleanup = () => {
    if (!printing) return;
    printing = false;
    clearTimeout(fallbackTimer);
    window.removeEventListener("afterprint", cleanup);
    root.replaceChildren();
    if (geometryOverride) {
      geometryOverride = null;
      ensurePrintStyles(); // back to the device's own profile
    }
  };
  window.addEventListener("afterprint", cleanup);

  try {
    window.print();
  } catch (err) {
    console.error("[print] window.print() failed:", err);
    cleanup();
    return false;
  }

  // window.print() blocks until the dialog closes in Chrome/Firefox/Edge, so
  // by now the job is captured. Safari can return early and render after, so
  // hold the clone briefly rather than yanking it out mid-render. Harmless
  // either way — the print root is invisible on screen.
  fallbackTimer = setTimeout(cleanup, 2000);

  return true;
}