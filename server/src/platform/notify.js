// ==============================================
// server/src/platform/notify.js
// Emails the platform team about events, per Settings -> Team notifications.
// notifyOnSuccess() is a tiny middleware mounted in front of existing
// public routes (signup, checkout verification, contact form) so those
// modules don't need to know the platform exists.
// ==============================================

import { sendMail, esc, COMPANY_EMAIL } from "../config/mailer.js";
import { getAllSettings } from "./platform.settings.js";

const lastSent = new Map();

/** kind: onNewSignup | onPayment | onFailedPayment | onEnquiry | onWebhookFailure | onServerError */
export const notifyTeam = async (kind, subject, text, { throttleMs = 0 } = {}) => {
  try {
    if (throttleMs) {
      const last = lastSent.get(kind) || 0;
      if (Date.now() - last < throttleMs) return;
      lastSent.set(kind, Date.now());
    }
    const settings = await getAllSettings();
    if (!settings.notifications[kind]) return;
    const to = settings.notifications.notifyEmail || COMPANY_EMAIL;
    if (!to) return;
    await sendMail({
      to,
      subject: `[${settings.general.platformName}] ${subject}`,
      text,
      html: `<pre style="font-family:inherit;white-space:pre-wrap">${esc(text)}</pre>`,
    });
  } catch (err) {
    console.error("[platform] team notification failed:", err.message);
  }
};

export const notifyOnSuccess = (kind, describe) => (req, res, next) => {
  res.on("finish", () => {
    const ok = res.statusCode < 400;
    if (kind === "payment") {
      if (ok) notifyTeam("onPayment", "Payment received", describe(req, true));
      else if (res.statusCode >= 400) notifyTeam("onFailedPayment", "Payment verification failed", describe(req, false));
      return;
    }
    if (ok) notifyTeam(kind, describe.subject || "Platform event", describe(req, true));
  });
  next();
};
