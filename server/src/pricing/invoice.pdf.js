// server/src/pricing/invoice.pdf.js
//
// Renders the tax invoice as a PDF and returns it as a Buffer — nothing is
// written to disk. The buffer is both attached to the emails and uploaded
// to R2 by invoice.service.js.
//
// PDFKit is used rather than a headless browser so this stays a plain
// dependency with no Chromium to install on the server.

import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

// ---- logo ----------------------------------------------------------------
// The file lives in the client repo (client/public/Logo/icon.png), which
// won't exist if the API is deployed on its own — so copy it to
// server/src/assets/invoice-logo.png as well, or point INVOICE_LOGO_PATH at
// it. Paths are tried in order and the first that reads wins; if none do,
// the invoice simply renders without the mark rather than failing.
const LOGO_CANDIDATES = [
  process.env.INVOICE_LOGO_PATH,
  path.resolve(process.cwd(), "src/assets/invoice-logo.png"),
  path.resolve(process.cwd(), "assets/invoice-logo.png"),
  path.resolve(process.cwd(), "../client/public/Logo/icon.png"),
].filter(Boolean);

let logoBuffer;

function getLogo() {
  if (logoBuffer !== undefined) return logoBuffer; // cached, including null

  for (const candidate of LOGO_CANDIDATES) {
    try {
      logoBuffer = fs.readFileSync(candidate);
      console.log(`[invoice] logo loaded from ${candidate}`);
      return logoBuffer;
    } catch {
      // try the next one
    }
  }

  console.warn(
    "[invoice] no logo found — set INVOICE_LOGO_PATH or copy icon.png to server/src/assets/invoice-logo.png",
  );
  logoBuffer = null;
  return logoBuffer;
}

// ---- palette -------------------------------------------------------------
const FOREST = "#0E3B22"; // header band, total bar
const GREEN = "#1FA84F"; // brand accent
const MINT = "#EAF7EF"; // tinted panel
const PALE = "#A9D6BC"; // text on the dark band
const INK = "#0B1B12"; // primary text
const BODY = "#334155"; // secondary text
const MUTED = "#8A9AA3"; // labels
const HAIR = "#E4EAE6"; // rules
const ORANGE = "#F0761E"; // header counterpart to the green
const CREAM = "#FFE6CE"; // small text on the orange field

const COMPANY = {
  name: "Restaurant Billing By Abacco",
  tagline: "Restaurant ERP",
  email: "info@abaccotech.com",
  site : "www.restaurantsbilling.com",
};

export const inr = (rupees) =>
  `Rs. ${Number(rupees || 0).toLocaleString("en-IN")}`;

export const formatDateTime = (date) =>
  `${new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(date))} IST`;

export const formatDate = (date) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(date));

const CYCLE_LABEL = {
  month: "Monthly",
  year: "Yearly",
  trial: "Free trial",
};

/**
 * Human description of what was bought, used in the PDF and both emails.
 */
export function describePlan(payment) {
  const cycle = CYCLE_LABEL[payment.billingCycle] || payment.billingCycle;
  const tier = payment.tierLabel ? ` · ${payment.tierLabel}` : "";
  return `${cycle}${tier}`;
}

/**
 * @param {object} payment  a PricingPayment row
 * @param {object} opts     { invoiceNumber }
 * @returns {Promise<Buffer>}
 */
export function buildInvoicePdf(payment, { invoiceNumber } = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 44 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const L = doc.page.margins.left;
    const R = doc.page.width - doc.page.margins.right;
    const W = R - L;
    const PW = doc.page.width;

    // ---- helpers ----------------------------------------------------------
    const label = (text, x, y, w) =>
      doc
        .fillColor(MUTED)
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text(text.toUpperCase(), x, y, { width: w, characterSpacing: 0.8 });

    const rule = (yy, color = HAIR) =>
      doc.moveTo(L, yy).lineTo(R, yy).lineWidth(0.8).strokeColor(color).stroke();

    // =========================================================
    // HEADER BAND
    // =========================================================
    const BAND_H = 118;

    // Green field on the left, orange on the right, divided by an S-curve
    // with a white ribbon tracing the seam. The two bezier edges are drawn
    // as one closed shape so the ribbon keeps an even width along the curve.
    doc.rect(0, 0, PW, BAND_H).fillColor(FOREST).fill();

    doc
      .moveTo(PW * 0.46, BAND_H)
      .bezierCurveTo(PW * 0.6, BAND_H * 0.72, PW * 0.6, BAND_H * 0.32, PW * 0.78, 0)
      .lineTo(PW, 0)
      .lineTo(PW, BAND_H)
      .closePath()
      .fillColor(ORANGE)
      .fill();

    doc
      .moveTo(PW * 0.41, BAND_H)
      .bezierCurveTo(PW * 0.55, BAND_H * 0.72, PW * 0.55, BAND_H * 0.32, PW * 0.73, 0)
      .lineTo(PW * 0.775, 0)
      .bezierCurveTo(PW * 0.595, BAND_H * 0.32, PW * 0.595, BAND_H * 0.72, PW * 0.455, BAND_H)
      .closePath()
      .fillColor("#FFFFFF")
      .fill();

    doc.rect(0, BAND_H, PW, 3).fillColor(GREEN).fill();

    // The mark sits on a white tile so it reads cleanly against the dark
    // band whatever colours the logo itself uses.
    const logo = getLogo();
    let textX = L;

    if (logo) {
      const TILE = 46;
      doc.roundedRect(L, 32, TILE, TILE, 10).fillColor("#FFFFFF").fill();
      try {
        doc.image(logo, L + 7, 39, { fit: [TILE - 14, TILE - 14], align: "center", valign: "center" });
      } catch (err) {
        console.error("[invoice] logo could not be drawn:", err.message);
      }
      textX = L + TILE + 14;
    }

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(15)
      .text(COMPANY.name, textX, 38, { width: W * 0.46 });

    doc
      .fillColor(PALE)
      .font("Helvetica")
      .fontSize(8.5)
      .text(COMPANY.tagline, textX, doc.y + 4, { width: W * 0.46 })
      .text(COMPANY.email, textX, doc.y + 3, { width: W * 0.46 });

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(19)
      .text("TAX INVOICE", L, 36, {
        width: W,
        align: "right",
        characterSpacing: 1,
      });

    doc
      .fillColor(CREAM)
      .font("Helvetica")
      .fontSize(8.5)
      .text(`No.  ${invoiceNumber}`, L, 66, { width: W, align: "right" })
      .text(`Date  ${formatDate(payment.createdAt)}`, L, 80, {
        width: W,
        align: "right",
      });

    // =========================================================
    // AMOUNT STRIP — the one loud element on the page
    // =========================================================
    let y = BAND_H + 30;
    const STRIP_H = 64;

    doc.rect(L, y, W, STRIP_H).fillColor(MINT).fill();
    doc.rect(L, y, 3.5, STRIP_H).fillColor(GREEN).fill();

    label("Amount paid", L + 18, y + 15, 200);
    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(23)
      .text(inr(payment.amount), L + 18, y + 28, { width: 260 });

    const paid = payment.status === "PAID";
    const pillW = 64;
    const pillX = R - 18 - pillW;
    doc
      .roundedRect(pillX, y + 21, pillW, 22, 11)
      .fillColor(paid ? GREEN : "#DC2626")
      .fill();
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .text(paid ? "PAID" : payment.status, pillX, y + 28, {
        width: pillW,
        align: "center",
        characterSpacing: 0.6,
      });

    // =========================================================
    // BILLED TO  ·  PAYMENT DETAILS
    // =========================================================
    y += STRIP_H + 30;
    const colW = W / 2 - 16;
    const rightX = L + W / 2 + 16;
    const topY = y;

    label("Billed to", L, y, colW);
    y += 16;

    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(12.5)
      .text(payment.restaurantName || "—", L, y, { width: colW });

    y = doc.y + 6;
    doc.font("Helvetica").fontSize(9.5).fillColor(BODY);

    for (const line of [
      payment.contactName,
      payment.email,
      payment.phone,
      payment.address || payment.city,
      payment.gstin ? `GSTIN  ${payment.gstin}` : null,
    ].filter(Boolean)) {
      doc.text(line, L, y, { width: colW, lineGap: 1.5 });
      y = doc.y + 3;
    }

    const leftBottom = y;

    let ry = topY;
    label("Payment details", rightX, ry, colW);
    ry += 16;

    const paymentRows = [
      ["Payment date", formatDateTime(payment.createdAt)],
      ["Payment status", payment.status],
      ["Payment ID", payment.razorpayPaymentId || "—"],
      ["Order ID", payment.razorpayOrderId || "—"],
      ["Method", payment.razorpayPaymentId ? "Razorpay" : "Not applicable"],
    ];

    for (const [k, v] of paymentRows) {
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(MUTED)
        .text(k, rightX, ry, { width: 76 });

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(INK)
        .text(String(v), rightX + 82, ry - 0.5, { width: colW - 82 });

      ry = Math.max(doc.y, ry + 12) + 6;
    }

    // =========================================================
    // LINE ITEM
    // =========================================================
    y = Math.max(leftBottom, ry) + 26;

    const cBranch = R - 214;
    const cRate = R - 142;
    const cAmount = R - 72;

    doc
      .fillColor(MUTED)
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .text("DESCRIPTION", L, y, { width: W - 230, characterSpacing: 0.8 })
      .text("BRANCHES", cBranch, y, {
        width: 62,
        align: "right",
        characterSpacing: 0.8,
      })
      .text("RATE", cRate, y, {
        width: 62,
        align: "right",
        characterSpacing: 0.8,
      })
      .text("AMOUNT", cAmount, y, {
        width: 72,
        align: "right",
        characterSpacing: 0.8,
      });

    y += 15;
    rule(y, INK);
    y += 15;

    const months = payment.billingCycle === "year" ? 12 : 1;

    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(`${describePlan(payment)} plan`, L, y, { width: W - 240 });

    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(8.5)
      .text(
        payment.unitAmount > 0
          ? `${inr(payment.unitAmount)} per branch / month × ${months} month${months > 1 ? "s" : ""}`
          : "Included",
        L,
        doc.y + 3,
        { width: W - 240 },
      );

    doc
      .fillColor(BODY)
      .font("Helvetica")
      .fontSize(10)
      .text(String(payment.branches), cBranch, y + 1, {
        width: 62,
        align: "right",
      })
      .text(inr(payment.unitAmount), cRate, y + 1, {
        width: 62,
        align: "right",
      })
      .fillColor(INK)
      .font("Helvetica-Bold")
      .text(inr(payment.subtotal), cAmount, y + 1, {
        width: 72,
        align: "right",
      });

    y = Math.max(doc.y, y + 26) + 14;
    rule(y);

    // =========================================================
    // TOTALS
    // =========================================================
    y += 16;
    const tLabelX = R - 260;
    const tValueX = R - 100;

    for (const [k, v] of [
      ["Subtotal", inr(payment.subtotal)],
      ["GST (18%)", inr(payment.gst)],
    ]) {
      doc
        .fillColor(BODY)
        .font("Helvetica")
        .fontSize(9.5)
        .text(k, tLabelX, y, { width: 150, align: "right" })
        .fillColor(INK)
        .text(v, tValueX, y, { width: 100, align: "right" });
      y += 17;
    }

    y += 3;
    doc.rect(tLabelX, y, 260, 34).fillColor(FOREST).fill();
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("TOTAL PAID", tLabelX + 14, y + 13, {
        width: 120,
        characterSpacing: 0.8,
      })
      .fontSize(13)
      .text(inr(payment.amount), tLabelX + 128, y + 10.5, {
        width: 118,
        align: "right",
      });

    y += 34 + 36;

    // =========================================================
    // PLAN SUMMARY
    // =========================================================
    label("Plan summary", L, y, W);
    y += 17;

    const summary = [
      ["Selected plan", describePlan(payment)],
      [
        "Billing cycle",
        CYCLE_LABEL[payment.billingCycle] || payment.billingCycle,
      ],
      [
        "Branches included",
        `${payment.branches} ${payment.branches === 1 ? "branch" : "branches"}`,
      ],
      ["Plan price", `${inr(payment.unitAmount)} per branch / month`],
      payment.extraNeeds ? ["Requested add-ons", payment.extraNeeds] : null,
      payment.notes ? ["Customer notes", payment.notes] : null,
    ].filter(Boolean);

    summary.forEach(([k, v], i) => {
      if (i) rule(y - 8, HAIR);

      doc
        .fillColor(MUTED)
        .font("Helvetica")
        .fontSize(9)
        .text(k, L, y, { width: 150 });

      doc
        .fillColor(INK)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(String(v), L + 160, y, { width: W - 160 });

      y = doc.y + 14;
    });

    // =========================================================
    // FOOTER
    // =========================================================
    // Text drawn this close to the bottom would otherwise push PDFKit into
    // an automatic page break (and produce two blank pages after this one),
    // so the bottom margin is dropped for the footer only.
    doc.page.margins.bottom = 0;

    const footerY = doc.page.height - 72;
    doc.rect(0, footerY, PW, 72).fillColor("#F7FAF8").fill();
    doc.rect(0, footerY, PW, 2).fillColor(GREEN).fill();

    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .text("Thank you for your business.", L, footerY + 22, {
        width: W,
        align: "center",
      });

    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(7.5)
      .text(
        `This is a computer-generated invoice and does not require a signature.  ·  Questions? Write to ${COMPANY.email}`,
        L,
        footerY + 38,
        { width: W, align: "center" },
      );

    doc.end();
  });
}