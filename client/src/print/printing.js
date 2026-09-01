// src/print/printing.js
//
// One place that owns printing, because the previous arrangement could put
// two different documents into the same job.
//
// Each printable component used to ship its own <style> block with
// `body * { visibility: hidden }` plus `.its-own-area { visible }`. That works
// alone — but after a takeaway payment, Billings.jsx has BOTH InvoiceView and
// KotPrintModal mounted at once, so both rules applied and a single print job
// emitted the bill AND the kitchen ticket.
//
// Now exactly one element in the document may carry data-print-active="true",
// and only that element prints.

const STYLE_ID = "app-print-styles";

// Injected once, globally, instead of once per mounted component.
export function ensurePrintStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = [
    "@media print {",
    "  body * { visibility: hidden !important; }",
    '  [data-print-active="true"],',
    '  [data-print-active="true"] * { visibility: visible !important; }',
    '  [data-print-active="true"] {',
    "    position: absolute !important;",
    "    top: 0 !important; left: 0 !important; width: 100% !important;",
    "  }",
    "  /* Paper is white whatever the app theme is doing. */",
    '  [data-print-active="true"],',
    '  [data-print-active="true"] * {',
    "    background: #fff !important; color: #000 !important;",
    "    border-color: #000 !important;",
    "  }",
    "}",
    "@page { size: 80mm auto; margin: 4mm; }",
  ].join("\n");
  document.head.appendChild(style);
}

let lastPrintAt = 0;

// Fires the print dialog at most once per second.
//
// Browsers can't print silently, so the dialog always appears — but a
// double-clicked button, or an auto-trigger racing a manual click, would
// otherwise queue two identical jobs. On a continuous thermal roll that comes
// out as the same ticket printed twice with no page break between them, which
// is exactly what the reported paper showed.
export function printOnce() {
  const now = Date.now();
  if (now - lastPrintAt < 1000) return false;
  lastPrintAt = now;
  ensurePrintStyles();
  window.print();
  return true;
}