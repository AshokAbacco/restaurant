// server/src/contact/contact.mailer.js
//
// The two Contact-form emails. The SMTP transport itself now lives in
// src/config/mailer.js and is shared with the pricing invoices, so
// credentials are read from the environment in exactly one place.
//
// Env used:
//   SMTP_EMAIL            the mailbox we authenticate + send as (e.g. info@abaccotech.com)
//   SMTP_PASS             app password for that mailbox
//   SMTP_HOST             optional, defaults to smtp.gmail.com
//   SMTP_PORT             optional, defaults to 587
//   SMTP_SECURE           optional, "true" for implicit TLS (port 465)
//   SMTP_FROM             optional display name, defaults to "Restaurant ERP <SMTP_EMAIL>"
//   CONTACT_NOTIFY_EMAIL  optional, where internal notifications land; defaults to SMTP_EMAIL
//
// If SMTP_EMAIL/SMTP_PASS are unset we log the mail to the console instead
// of throwing — same dev behaviour as the password-reset mailer.

import { sendMail, esc, escMultiline, COMPANY_EMAIL } from "../config/mailer.js";

const NOTIFY_TO = COMPANY_EMAIL;

/** Thin alias so the rest of this file reads unchanged. */
const send = sendMail;

/** "19 September 2026, 6:42 pm IST" — readable in the internal email. */
export function formatSubmittedAt(date) {
  const formatted = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);

  return `${formatted} IST`;
}

// ==============================================
// 1. Confirmation email → the person who filled the form
// ==============================================
// The body deliberately mirrors the "Message sent" panel on the Contact
// page word for word, so the visitor reads the same sentence on screen and
// in their inbox. If you reword one, reword the other (ContactUs.jsx).
export async function sendContactConfirmation(submission) {
  const firstName = submission.fullName.trim().split(/\s+/)[0] || "there";
  const greeting = `Thanks, ${firstName} — we've got your message and will get back to you within 24 hours.`;

  const text = [greeting, "", "Thank you.", "Restaurant ERP Team"].join("\n");

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#EEF6E9;padding:32px 16px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;padding:40px 32px;text-align:center;">
      <div style="width:48px;height:48px;line-height:48px;margin:0 auto 16px;border-radius:9999px;background:#E4F3DC;font-size:20px;">
        &#9993;
      </div>
      <h1 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#0f172a;">Message sent</h1>
      <p style="margin:0 auto 24px;max-width:360px;font-size:15px;line-height:1.6;color:#64748b;">
        ${esc(greeting)}
      </p>
      <p style="margin:0 0 4px;font-size:15px;color:#334155;">Thank you.</p>
      <p style="margin:0;font-size:14px;font-weight:600;color:#2F6E3B;">Restaurant ERP Team</p>
    </div>
  </div>`;

  return send({
    to: submission.email,
    subject: "Thank You for Contacting Us",
    text,
    html,
  });
}

// ==============================================
// 2. Notification email → our inbox (info@abaccotech.com)
// ==============================================
export async function sendContactNotification(submission) {
  const submittedAt = formatSubmittedAt(submission.createdAt);

  const rows = [
    ["Restaurant Name", submission.restaurantName],
    ["Full Name", submission.fullName],
    ["Email", submission.email],
    ["Phone", submission.phone],
    ["Address", submission.address || "—"],
    ["Message", submission.message],
    ["Submitted At", submittedAt],
  ];

  const text = [
    "New submission from the Restaurant Contact Form.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
  ].join("\n");

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f1f5f9;padding:32px 16px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2F6E3B;">
        Restaurant Contact Form
      </p>
      <h2 style="margin:0 0 20px;font-size:20px;color:#0f172a;">New Restaurant Contact Form Submission</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        This message was submitted through the Restaurant Contact Form on the website.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#0f172a;">
        ${rows
          .map(
            ([label, value]) => `
        <tr>
          <td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;width:170px;vertical-align:top;">${esc(label)}</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;vertical-align:top;">${escMultiline(value)}</td>
        </tr>`,
          )
          .join("")}
      </table>
    </div>
  </div>`;

  return send({
    to: NOTIFY_TO,
    subject: "New Restaurant Contact Form Submission",
    text,
    html,
    // so hitting Reply in the inbox goes straight to the prospect
    replyTo: `${submission.fullName} <${submission.email}>`,
  });
}