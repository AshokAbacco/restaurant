// ==============================================
// server/src/platform/platform.settings.js
// Key/value platform settings with typed defaults. Each top-level section
// is one PlatformSetting row; reads merge the stored value over the
// defaults so a newly-added option always has a sane value. Cached in
// memory for 60s because health/usage code reads these on hot paths.
// ==============================================

import prisma from "../../prisma/client.js";

export const SETTINGS_DEFAULTS = {
  general: {
    platformName: "Restaurant ERP",
    companyName: "",
    supportEmail: "",
    supportPhone: "",
    supportWhatsapp: "",
    timezone: "Asia/Kolkata",
    currency: "INR",
    dateFormat: "DD MMM YYYY",
  },
  subscriptions: {
    expiryReminderDays: [7, 3, 1],
    gracePeriodDays: 3,
    autoSuspendExpired: false,
    autoCreateRenewalFollowUps: true,
    renewalFollowUpLeadDays: 7,
    sendExpiryReminderMessages: true,
  },
  messaging: {
    autoReplyEnabled: false,
    autoReplyText:
      "Thanks for reaching out! Our support team has received your message and will reply shortly.",
    emailRestaurantOnReply: true,
    notifyTeamOnNewMessage: true,
    signature: "— Platform Support",
  },
  notifications: {
    notifyEmail: "",
    onNewSignup: true,
    onPayment: true,
    onFailedPayment: true,
    // The contact module already emails COMPANY_EMAIL; enable this only when
    // notifyEmail points somewhere else.
    onEnquiry: false,
    onWebhookFailure: true,
    onServerError: false,
  },
  activity: {
    inactiveAfterDays: 7,
    churnRiskAfterDays: 14,
    trackUsage: true,
  },
  health: {
    slowResponseMs: 1500,
    dbLatencyWarnMs: 800,
    errorRateWarnPct: 5,
    snapshotIntervalMin: 5,
    retentionDays: 30,
  },
  security: {
    sessionHours: 12,
    maxFailedLogins: 5,
    lockMinutes: 15,
    minPasswordLength: 8,
  },
  maintenance: {
    enabled: false,
    message: "We're doing scheduled maintenance. We'll be back shortly.",
  },
};

let cache = null;
let cacheAt = 0;
const TTL = 60 * 1000;

const merge = (defaults, stored) => {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return { ...defaults };
  const out = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (stored[key] !== undefined) out[key] = stored[key];
  }
  return out;
};

export const getAllSettings = async ({ fresh = false } = {}) => {
  if (!fresh && cache && Date.now() - cacheAt < TTL) return cache;
  let rows = [];
  try {
    rows = await prisma.platformSetting.findMany();
  } catch (err) {
    // Table missing (schema not pushed yet) — run on defaults.
    if (!cache) console.warn("[platform] settings unavailable, using defaults:", err.message);
  }
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const result = {};
  for (const [section, defaults] of Object.entries(SETTINGS_DEFAULTS)) {
    result[section] = merge(defaults, byKey[section]);
  }
  cache = result;
  cacheAt = Date.now();
  return result;
};

export const getSettings = async (section) => (await getAllSettings())[section];

// Coerce incoming values to the type of the default, so a form that posts
// "30" for a number or "true" for a boolean is stored correctly.
const coerce = (defaultValue, value) => {
  if (typeof defaultValue === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : defaultValue;
  }
  if (typeof defaultValue === "boolean") {
    if (typeof value === "boolean") return value;
    return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
  }
  if (Array.isArray(defaultValue)) {
    const arr = Array.isArray(value)
      ? value
      : String(value || "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
    return typeof defaultValue[0] === "number"
      ? arr.map(Number).filter((n) => Number.isFinite(n))
      : arr.map(String);
  }
  return value == null ? "" : String(value).slice(0, 2000);
};

export const updateSettings = async (section, patch, adminId) => {
  const defaults = SETTINGS_DEFAULTS[section];
  if (!defaults) {
    const err = new Error(`Unknown settings section "${section}".`);
    err.status = 400;
    err.expose = true;
    throw err;
  }
  const current = (await getAllSettings({ fresh: true }))[section];
  const next = { ...current };
  for (const [key, value] of Object.entries(patch || {})) {
    if (!(key in defaults)) continue;
    next[key] = coerce(defaults[key], value);
  }
  await prisma.platformSetting.upsert({
    where: { key: section },
    create: { key: section, value: next, updatedById: adminId || null },
    update: { value: next, updatedById: adminId || null },
  });
  cache = null;
  return next;
};
