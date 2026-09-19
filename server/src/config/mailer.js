// server/src/config/mailer.js
//
// One SMTP transport for the whole app, alongside config/razorpay.js.
// Credentials come from the environment only — nothing is hardcoded.
//
//   SMTP_USER (or SMTP_EMAIL)  mailbox we authenticate + send as
//   SMTP_PASS                  app password (spaces are stripped)
//   SMTP_HOST / SMTP_PORT / SMTP_SECURE
//   SMTP_FROM                  optional display name
//   COMPANY_EMAIL              where internal copies go; defaults to SMTP_USER

import nodemailer from "nodemailer";

export const SMTP_EMAIL = (
  process.env.SMTP_EMAIL ||
  process.env.SMTP_USER ||
  ""
).trim();

// Google displays app passwords as four spaced groups ("abcd efgh ijkl mnop");
// the spaces are presentational and cause a 535 if sent as-is.
const SMTP_PASS = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === "true"
  : SMTP_PORT === 465;

export const MAIL_FROM = process.env.SMTP_FROM || `Abacco <${SMTP_EMAIL}>`;

/** Internal recipient for contact enquiries and invoice copies. */
export const COMPANY_EMAIL = (
  process.env.COMPANY_EMAIL ||
  process.env.CONTACT_NOTIFY_EMAIL ||
  SMTP_EMAIL
).trim();

export const mailerConfigured = Boolean(SMTP_EMAIL && SMTP_PASS);

if (!mailerConfigured) {
  console.warn(
    `[mailer] SMTP not configured (user: ${SMTP_EMAIL ? "set" : "MISSING"}, ` +
      `pass: ${SMTP_PASS ? "set" : "MISSING"}) — mail will be logged, not sent.`,
  );
}

let transporter = null;

export function getTransporter() {
  if (transporter) return transporter;
  if (!mailerConfigured) return null;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_EMAIL, pass: SMTP_PASS },
  });

  return transporter;
}

/**
 * Sends mail, or logs it when SMTP isn't configured so local dev doesn't
 * throw. `attachments` is passed straight through to nodemailer, e.g.
 * [{ filename: "invoice.pdf", content: buffer, contentType: "application/pdf" }]
 */
export async function sendMail({
  to,
  subject,
  text,
  html,
  attachments = [],
  replyTo,
}) {
  const tx = getTransporter();

  if (!tx) {
    console.warn(
      `[mailer] not sent → ${to}\n  Subject: ${subject}` +
        (attachments.length
          ? `\n  Attachments: ${attachments.map((a) => a.filename).join(", ")}`
          : ""),
    );
    return { skipped: true };
  }

  const info = await tx.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    text,
    html,
    ...(attachments.length ? { attachments } : {}),
    ...(replyTo ? { replyTo } : {}),
  });

  return { skipped: false, messageId: info.messageId };
}

/** Authenticates without sending. Call at boot to fail loudly and early. */
export async function verifyMailer() {
  const tx = getTransporter();
  if (!tx) return { ok: false, reason: "SMTP credentials missing" };

  try {
    await tx.verify();
    console.log(`[mailer] ready — ${SMTP_EMAIL} via ${SMTP_HOST}:${SMTP_PORT}`);
    return { ok: true };
  } catch (err) {
    console.error(`[mailer] login failed for ${SMTP_EMAIL}: ${err.message}`);
    return { ok: false, reason: err.message };
  }
}

/** Escape user-supplied text before putting it in an HTML email body. */
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escMultiline(value) {
  return esc(value).replace(/\r?\n/g, "<br />");
}