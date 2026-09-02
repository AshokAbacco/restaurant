// ==============================================
// src/settings/printer-profiles/PaperPreview.jsx
// ==============================================
// A to-scale mock of what the selected geometry produces, rendered at the
// profile's ACTUAL printable width in CSS pixels with the ACTUAL font size.
//
// This is the honest way to answer "will my bill fit?" — the alternative is
// estimating glyph widths, and a measured 80mm receipt came out anywhere
// between 0.61 and 0.65em per character depending on the font the browser
// resolved. Rendering it and letting the user look is exact.

import React from "react";
import { toPrintGeometry, estimateRenderedColumns } from "../../print/printerProfiles";

const PaperPreview = ({ profile, compact = false }) => {
  const g = toPrintGeometry(profile);
  const approxColumns = estimateRenderedColumns(g);

  // Under-running the printer's own character capacity is fine; over-running
  // it means a line the paper physically can't hold, so it's called out.
  const tooWide = approxColumns < g.columns * 0.8;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
          Paper preview
        </p>
        <span className="text-xs text-[#6B7280] dark:text-[#9CA8A0]">
          {g.printableWidthMm}mm printable · ~{approxColumns} chars per line
        </span>
      </div>

      {/* The grey field stands in for the roll; the white strip is the
          printable area, so the unprintable edge is visible as the gap. */}
      <div
        className="rounded-xl bg-[#F3F5EE] dark:bg-[#12160F] border border-[#E7EAE1] dark:border-[#262B24] py-5 overflow-x-auto"
        style={{ paddingLeft: 12, paddingRight: 12 }}
      >
        <div
          className="mx-auto bg-white text-black font-mono shadow-sm"
          style={{
            width: `${g.contentWidthPx}px`,
            fontSize: `${g.baseFontPx}px`,
            lineHeight: 1.35,
            padding: "10px 0",
          }}
        >
          <div className="text-center font-bold uppercase" style={{ fontSize: "1.4em" }}>
            Mehfil Arabic Restaurant
          </div>
          <div className="text-center" style={{ fontSize: "0.9em" }}>
            Vidyaranyapura, Bengaluru
          </div>

          <div className="my-1.5 border-t border-black" />

          {/* Mirrors the invoice's bill-meta block, including the rule that
              collapses it to one column on narrow rolls. */}
          <div
            className="font-semibold"
            style={{
              display: "grid",
              gridTemplateColumns: g.stackMeta ? "1fr" : "1fr auto",
              columnGap: g.stackMeta ? 0 : 8,
              rowGap: 2,
            }}
          >
            <span>Bill: INV-000019</span>
            <span className={g.stackMeta ? "" : "text-right"}>DELIVERY</span>
            <span>Cashier: POS Cashier</span>
            <span className={g.stackMeta ? "" : "text-right"}>Time: 11:07 pm</span>
            <span>Order: ORD-000023</span>
            <span className={g.stackMeta ? "" : "text-right"}>Date: 01/09/2026</span>
          </div>

          <div className="my-1.5 border-t border-black" />

          <div className="flex justify-between gap-1 font-bold uppercase">
            <span className="flex-1">Item</span>
            <span className="text-center" style={{ flex: `0 0 ${g.qtyCh}ch` }}>
              Qty
            </span>
            <span className="text-right" style={{ flex: `0 0 ${g.amountCh}ch` }}>
              Amount
            </span>
          </div>

          <div className="my-1.5 border-t border-dashed border-black" />

          {[
            ["Mint Lemonade", 1, "₹119.00"],
            ["Chicken Mandi", 1, "₹379.00"],
            ["Mutton Biryani", 1, "₹429.00"],
          ].map(([name, qty, amount]) => (
            <div key={name} className="flex justify-between gap-1">
              <span className="flex-1 font-semibold">{name}</span>
              <span className="text-center" style={{ flex: `0 0 ${g.qtyCh}ch` }}>
                {qty}
              </span>
              <span className="text-right font-semibold" style={{ flex: `0 0 ${g.amountCh}ch` }}>
                {amount}
              </span>
            </div>
          ))}

          <div className="my-1.5 border-t border-black" />

          <div className="flex justify-between gap-2">
            <span>Items: 3 (Qty: 3)</span>
            <span className="whitespace-nowrap">Subtotal: ₹927.00</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>CGST (2.5%) + SGST (2.5%):</span>
            <span className="whitespace-nowrap">+ ₹46.35</span>
          </div>

          <div className="my-1.5 border-t border-black" />

          <div className="flex justify-between font-bold uppercase" style={{ fontSize: "1.3em" }}>
            <span>Net Payable</span>
            <span>₹973.35</span>
          </div>
        </div>
      </div>

      {!compact && (
        <p className="mt-3 text-xs text-[#6B7280] dark:text-[#9CA8A0] leading-6">
          Shown at the real printable width and font size, so any line that
          wraps here will wrap on paper too.
          {tooWide && (
            <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
              The font size fits noticeably fewer characters than this
              printer's {g.columns}-column rating. Lower it if lines are
              breaking in the preview.
            </span>
          )}
        </p>
      )}
    </div>
  );
};

export default PaperPreview;