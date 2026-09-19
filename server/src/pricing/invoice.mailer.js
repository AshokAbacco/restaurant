// server/src/pricing/invoice.mailer.js
//
// The two emails that go out after a payment is confirmed. Both carry the
// same PDF attachment; neither is ever sent for a failed, cancelled or
// abandoned checkout — see invoice.service.js for where they're triggered.

import { sendMail, esc, escMultiline, COMPANY_EMAIL } from "../config/mailer.js";
import { inr, formatDateTime, describePlan } from "./invoice.pdf.js";

const GREEN = "#1FA84F";

const row = (label, value) => `
  <tr>
    <td style="padding:9px 12px;background:#F8FAFC;border:1px solid #E2E8F0;font-weight:600;width:190px;vertical-align:top;color:#334155;">${esc(label)}</td>
    <td style="padding:9px 12px;border:1px solid #E2E8F0;vertical-align:top;color:#0F172A;">${escMultiline(value)}</td>
  </tr>`;

/** Rows shared by both emails, so the client and our copy can't drift. */
function detailRows(payment) {
  return [
    ["Restaurant Name", payment.restaurantName || "—"],
    ["Full Name", payment.contactName || "—"],
    ["Email", payment.email || "—"],
    ["Phone", payment.phone || "—"],
    ["Address", payment.address || payment.city || "—"],
    ["Selected Plan", describePlan(payment)],
    [
      "Branches Included",
      `${payment.branches} ${payment.branches === 1 ? "branch" : "branches"}`,
    ],
    ["Plan Price", `${inr(payment.unitAmount)} per branch / month`],
    ["Subtotal", inr(payment.subtotal)],
    ["GST (18%)", inr(payment.gst)],
    ["Amount Paid", inr(payment.amount)],
    ["Payment Date", formatDateTime(payment.createdAt)],
    ["Payment Status", payment.status],
    ["Transaction / Payment ID", payment.razorpayPaymentId || "—"],
    ["Order ID", payment.razorpayOrderId || "—"],
  ];
}

/**
 * The customer's email body is deliberately short — just enough to confirm
 * who and what, since the amount is already in the sentence above it and
 * the full breakdown (address, price, subtotal, GST, dates, payment and
 * order ids) is on the attached PDF. The internal copy keeps everything.
 */
function clientRows(payment) {
  return [
    ["Restaurant Name", payment.restaurantName || "—"],
    ["Full Name", payment.contactName || "—"],
    ["Email", payment.email || "—"],
    ["Phone", payment.phone || "—"],
    ["Selected Plan", describePlan(payment)],
    [
      "Branches Included",
      `${payment.branches} ${payment.branches === 1 ? "branch" : "branches"}`,
    ],
    ["Payment Status", payment.status],
  ];
}

const asText = (rows) => rows.map(([l, v]) => `${l}: ${v}`).join("\n");

// ==============================================
// 1. Invoice → the customer who paid
// ==============================================
export async function sendInvoiceToClient(payment, { pdf, invoiceNumber }) {
  const firstName = (payment.contactName || "").trim().split(/\s+/)[0] || "there";
  const rows = clientRows(payment);

  const text = [
    `Hi ${firstName},`,
    "",
    `Thank you for your payment of ${inr(payment.amount)}. Your ${describePlan(payment)} plan is active and your invoice (${invoiceNumber}) is attached to this email.`,
    "",
    asText(rows),
    "",
    "Thank you.",
    "Abacco Technology",
  ].join("\n");

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#F1F5F9;padding:32px 16px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;padding:36px 32px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${GREEN};">Payment received</p>
      <h1 style="margin:0 0 8px;font-size:22px;color:#0F172A;">Your invoice ${esc(invoiceNumber)}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
        Hi ${esc(firstName)}, thank you for your payment of <strong>${esc(inr(payment.amount))}</strong>.
        Your ${esc(describePlan(payment))} plan is active. The full invoice is attached as a PDF.
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:13.5px;">
        ${rows.map(([l, v]) => row(l, v)).join("")}
      </table>

      <p style="margin:24px 0 0;font-size:14px;color:#475569;">Thank you.</p>
      <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:${GREEN};">Abacco Technology</p>
    </div>
  </div>`;

  return sendMail({
    to: payment.email,
    subject: `Abacco Restaurant invoice ${invoiceNumber} — payment received`,
    text,
    html,
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: pdf,
        contentType: "application/pdf",
      },
    ],
  });
}

// ==============================================
// 2. The same invoice → info@abaccotech.com
// ==============================================
export async function sendInvoiceToCompany(payment, { pdf, invoiceNumber, invoiceUrl }) {
  const rows = detailRows(payment);
  if (payment.gstin) rows.push(["GSTIN", payment.gstin]);
  if (payment.extraNeeds) rows.push(["Requested Add-ons", payment.extraNeeds]);
  if (payment.notes) rows.push(["Customer Notes", payment.notes]);
  if (invoiceUrl) rows.push(["Stored Invoice", invoiceUrl]);
  rows.push(["Payment Reference", payment.id]);

  const text = [
    "A payment was completed through the Pricing page.",
    "",
    asText(rows),
  ].join("\n");

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#F1F5F9;padding:32px 16px;">
    <div style="max-width:660px;margin:0 auto;background:#ffffff;border-radius:20px;padding:36px 32px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.06em;color:${GREEN};">
        RESTAURANT PRICING CHECKOUT
      </p>
      <h1 style="margin:0 0 8px;font-size:21px;color:#0F172A;">New paid signup — ${esc(inr(payment.amount))}</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#64748B;">
        Payment confirmed through the Pricing page. Invoice ${esc(invoiceNumber)} is attached.
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:13.5px;">
        ${rows.map(([l, v]) => row(l, v)).join("")}
      </table>
    </div>
  </div>`;

  return sendMail({
    to: COMPANY_EMAIL,
    subject: `New Restaurant Payment — ${payment.restaurantName || "Unknown"} (${invoiceNumber})`,
    text,
    html,
    replyTo: payment.email
      ? `${payment.contactName || payment.email} <${payment.email}>`
      : undefined,
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: pdf,
        contentType: "application/pdf",
      },
    ],
  });
}