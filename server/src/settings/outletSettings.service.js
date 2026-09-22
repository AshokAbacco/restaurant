// server/src/settings/outletSettings.service.js
//
// Per-outlet module settings — Settings -> CRM, Payment Gateway, Self Order
// Kiosk and Tax & Billing. One OutletSetting row per outlet, created lazily
// on first save; until then every section simply returns its defaults, so
// an outlet that has never opened these pages behaves exactly as before
// (CRM off, nothing else changed).
//
// The outlet is ALWAYS the one on the access token (req.tenant.outletId).
// Nothing here accepts an outlet id from the request, so one restaurant can
// never read or change another's settings.
import prisma from "../config/prisma.js";

// ── Defaults ────────────────────────────────────────────────────────────
export const CRM_DEFAULTS = Object.freeze({
  // Segmentation thresholds. A customer is VIP once they cross EITHER the
  // spend or the order-count threshold.
  vipSpendThreshold: 10000,
  vipOrderThreshold: 15,
  regularOrderThreshold: 3,
  // No visit for this many days -> "At risk" (lapsed regular).
  inactiveDays: 45,
  // Window for the "upcoming birthdays / anniversaries" list.
  occasionLookaheadDays: 7,
  // POS behaviour
  requireCustomerForTakeaway: false,
  requireCustomerForDelivery: false,
  showInsightsOnPos: true,
});

const PAYMENT_DEFAULTS = Object.freeze({
  paymentEnabled: true,
  mode: "Test",
  gateway: "Razorpay",
  defaultPayment: "UPI",
});

const KIOSK_DEFAULTS = Object.freeze({
  kioskEnabled: true,
  restaurantName: "My Restaurant",
  welcomeTitle: "Welcome!",
  welcomeSubtitle: "Tap anywhere to begin your order",
  autoResetTime: 60,
  theme: "Light",
});

const TAX_DEFAULTS = Object.freeze({
  gstEnabled: true,
  gstNumber: "",
  cgst: 9,
  sgst: 9,
  igst: 18,
  taxType: "Inclusive",
});

// URL segment -> { column, defaults }
const SECTIONS = {
  crm: { column: "crm", defaults: CRM_DEFAULTS },
  payment: { column: "payment", defaults: PAYMENT_DEFAULTS },
  kiosk: { column: "kiosk", defaults: KIOSK_DEFAULTS },
  tax: { column: "taxBilling", defaults: TAX_DEFAULTS },
};

export const SECTION_NAMES = Object.keys(SECTIONS);

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// Settings forms are small; anything bigger is a bug or abuse.
const MAX_SECTION_BYTES = 20_000;

function sanitizeSectionPayload(payload) {
  if (!isPlainObject(payload)) throw badRequest("Settings must be an object.");
  const json = JSON.stringify(payload);
  if (json.length > MAX_SECTION_BYTES) throw badRequest("Settings payload is too large.");
  // Round-trip drops functions/undefined and guarantees plain JSON for the Json column.
  return JSON.parse(json);
}

function toNonNegativeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// CRM config is read by the segmentation SQL, so every field is coerced to
// the type the queries expect rather than stored as whatever the form sent.
function normalizeCrmConfig(raw = {}) {
  const base = { ...CRM_DEFAULTS, ...(isPlainObject(raw) ? raw : {}) };
  return {
    vipSpendThreshold: toNonNegativeNumber(base.vipSpendThreshold, CRM_DEFAULTS.vipSpendThreshold),
    vipOrderThreshold: Math.max(1, Math.round(toNonNegativeNumber(base.vipOrderThreshold, CRM_DEFAULTS.vipOrderThreshold))),
    regularOrderThreshold: Math.max(2, Math.round(toNonNegativeNumber(base.regularOrderThreshold, CRM_DEFAULTS.regularOrderThreshold))),
    inactiveDays: Math.max(1, Math.round(toNonNegativeNumber(base.inactiveDays, CRM_DEFAULTS.inactiveDays))),
    occasionLookaheadDays: Math.min(60, Math.max(1, Math.round(toNonNegativeNumber(base.occasionLookaheadDays, CRM_DEFAULTS.occasionLookaheadDays)))),
    requireCustomerForTakeaway: Boolean(base.requireCustomerForTakeaway),
    requireCustomerForDelivery: Boolean(base.requireCustomerForDelivery),
    showInsightsOnPos: Boolean(base.showInsightsOnPos),
  };
}

// ── Small in-process cache for the CRM flag ─────────────────────────────
// The POS and every /api/crm request check whether CRM is on. The database
// is a long network hop away from the app (see config/prisma.js), so the
// answer is cached briefly and dropped the moment the setting is saved.
const CRM_CACHE_TTL_MS = 15_000;
const crmCache = new Map(); // outletId -> { value, expiresAt }

export function invalidateCrmCache(outletId) {
  crmCache.delete(outletId);
}

async function readRow(outletId) {
  return prisma.outletSetting.findUnique({ where: { outletId } });
}

// { enabled, config } — the shape the POS and CRM pages consume.
export async function getCrmSettings(outletId) {
  const cached = crmCache.get(outletId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const row = await readRow(outletId);
  const value = {
    enabled: Boolean(row?.crmEnabled),
    config: normalizeCrmConfig(row?.crm || {}),
  };
  crmCache.set(outletId, { value, expiresAt: Date.now() + CRM_CACHE_TTL_MS });
  return value;
}

export async function getSection(outletId, section) {
  const def = SECTIONS[section];
  if (!def) throw badRequest(`Unknown settings section "${section}".`);

  if (section === "crm") {
    const row = await readRow(outletId);
    return {
      section,
      enabled: Boolean(row?.crmEnabled),
      data: normalizeCrmConfig(row?.crm || {}),
      updatedAt: row?.updatedAt || null,
    };
  }

  const row = await readRow(outletId);
  const saved = row?.[def.column];
  return {
    section,
    data: { ...def.defaults, ...(isPlainObject(saved) ? saved : {}) },
    updatedAt: row?.updatedAt || null,
  };
}

export async function getAllSections(outletId) {
  const entries = await Promise.all(
    SECTION_NAMES.map(async (name) => [name, await getSection(outletId, name)]),
  );
  return Object.fromEntries(entries);
}

// Saves one section. For CRM the body may carry { enabled, ...config }.
export async function updateSection(outletId, section, payload) {
  const def = SECTIONS[section];
  if (!def) throw badRequest(`Unknown settings section "${section}".`);

  const body = sanitizeSectionPayload(payload || {});

  if (section === "crm") {
    const { enabled, ...rest } = body;
    const existing = await readRow(outletId);
    const config = normalizeCrmConfig({ ...(existing?.crm || {}), ...rest });
    const data = {
      crm: config,
      ...(enabled !== undefined ? { crmEnabled: Boolean(enabled) } : {}),
    };
    await prisma.outletSetting.upsert({
      where: { outletId },
      create: { outletId, ...data },
      update: data,
    });
    invalidateCrmCache(outletId);
    return getSection(outletId, "crm");
  }

  const existing = await readRow(outletId);
  const merged = {
    ...def.defaults,
    ...(isPlainObject(existing?.[def.column]) ? existing[def.column] : {}),
    ...body,
  };
  await prisma.outletSetting.upsert({
    where: { outletId },
    create: { outletId, [def.column]: merged },
    update: { [def.column]: merged },
  });
  return getSection(outletId, section);
}

// Restores a section to its shipped defaults. For CRM this resets the
// thresholds but deliberately leaves the on/off switch alone.
export async function resetSection(outletId, section) {
  const def = SECTIONS[section];
  if (!def) throw badRequest(`Unknown settings section "${section}".`);
  const value = section === "crm" ? { ...CRM_DEFAULTS } : { ...def.defaults };
  await prisma.outletSetting.upsert({
    where: { outletId },
    create: { outletId, [def.column]: value },
    update: { [def.column]: value },
  });
  if (section === "crm") invalidateCrmCache(outletId);
  return getSection(outletId, section);
}