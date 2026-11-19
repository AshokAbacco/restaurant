// ==============================================
// server/src/platform/settings.controller.js
// /api/platform/settings
// ==============================================

import { mailerConfigured, SMTP_EMAIL } from "../config/mailer.js";
import { getAllSettings, updateSettings, SETTINGS_DEFAULTS } from "./platform.settings.js";
import { runAutomations } from "./platform.bootstrap.js";
import { audit } from "./platform.audit.js";
import { handler, ok } from "./platform.utils.js";

export const get = handler(async (req, res) => {
  const settings = await getAllSettings({ fresh: true });
  return ok(res, {
    settings,
    defaults: SETTINGS_DEFAULTS,
    environment: {
      emailConfigured: mailerConfigured,
      emailSender: SMTP_EMAIL ? SMTP_EMAIL.replace(/(.{2}).*(@.*)/, "$1***$2") : null,
      razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      webhookSecretConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
      platformJwtSecret: Boolean(process.env.PLATFORM_JWT_SECRET),
      clientOrigin: process.env.CLIENT_ORIGIN || null,
      nodeEnv: process.env.NODE_ENV || "development",
    },
  });
});

export const update = handler(async (req, res) => {
  const section = req.params.section;
  const value = await updateSettings(section, req.body || {}, req.platformAdmin.id);
  audit(req, "SETTINGS_UPDATED", { entityType: "PlatformSetting", entityId: section, metadata: value });
  return ok(res, { section, value });
});

export const runNow = handler(async (req, res) => {
  const result = await runAutomations();
  audit(req, "AUTOMATIONS_RUN", { metadata: result });
  return ok(res, { result });
});
