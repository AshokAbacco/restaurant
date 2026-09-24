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

export const DEFAULT_TIERS = Object.freeze([
  { name: "Silver", minSpend: 0, multiplier: 1, color: "#9CA3AF" },
  { name: "Gold", minSpend: 10000, multiplier: 1.25, color: "#D97706" },
  { name: "Platinum", minSpend: 25000, multiplier: 1.5, color: "#6366F1" },
]);

export const LOYALTY_DEFAULTS = Object.freeze({
  // Earning — "₹100 spent = 1 point"
  earnSpendAmount: 100,
  earnPoints: 1,
  minBillForEarning: 0,
  // Redemption — "100 points = ₹100 off"
  redeemPoints: 100,
  redeemValue: 100,
  minRedeemPoints: 100,
  maxRedeemPercent: 50, // at most this % of a bill can be paid with points
  minBillForRedemption: 0,
  // Expiry
  pointsExpire: true,
  expiryDays: 365,
  // Automatic rewards
  welcomeBonusPoints: 50,
  birthdayRewardType: "POINTS", // POINTS | VOUCHER | NONE
  birthdayPoints: 100,
  birthdayVoucherValue: 200,
  anniversaryRewardType: "POINTS",
  anniversaryPoints: 100,
  anniversaryVoucherValue: 200,
  occasionVoucherValidDays: 30,
  referrerPoints: 100, // the customer who shared their code
  refereePoints: 50, // the new customer who used it
  // Vouchers bought with points stay valid this long
  voucherValidDays: 30,
  // Membership levels, by lifetime spend
  // Membership levels were removed: earning is the spend rule plus the
  // minimum bill, with no level multipliers.
  tiersEnabled: false,
  tiers: DEFAULT_TIERS,
  // Customer messages (sent from the CRM with one click)
  templates: {
    earn: "Hi {name}, you earned {earned} points at {restaurant}! Your balance is now {points} points (worth {value}).",
    balance: "Hi {name}, you have {points} loyalty points at {restaurant}, worth {value} on your next visit.",
    voucher: "Hi {name}, here's your reward from {restaurant}: {title}. Use code {code} on your next bill{expiry}.",
    birthday: "Happy birthday {name}! 🎂 {restaurant} has added a birthday reward to your account. See you soon!",
    anniversary: "Happy anniversary {name}! 💐 Celebrate with us — {restaurant} has added a reward to your account.",
    expiry: "Hi {name}, {expiring} of your loyalty points at {restaurant} expire on {date}. Visit us to use them!",
  },
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
  loyalty: { column: "loyalty", defaults: LOYALTY_DEFAULTS },
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

const REWARD_TYPES = ["POINTS", "VOUCHER", "NONE"];

function normalizeTiers(raw) {
  const list = Array.isArray(raw) && raw.length ? raw : DEFAULT_TIERS;
  const tiers = list
    .filter((t) => isPlainObject(t) && String(t.name || "").trim())
    .slice(0, 10)
    .map((t) => ({
      name: String(t.name).trim().slice(0, 30),
      minSpend: toNonNegativeNumber(t.minSpend, 0),
      multiplier: Math.min(10, Math.max(0, toNonNegativeNumber(t.multiplier, 1))),
      color: /^#[0-9a-fA-F]{3,8}$/.test(t.color || "") ? t.color : "#9CA3AF",
    }))
    .sort((a, b) => a.minSpend - b.minSpend);
  if (!tiers.length) return [...DEFAULT_TIERS];
  // The lowest level is where everyone starts.
  tiers[0].minSpend = 0;
  return tiers;
}

// Every number the billing maths depends on is coerced here, so a bad value
// typed into the settings form can never reach a bill.
export function normalizeLoyaltyConfig(raw = {}) {
  const d = LOYALTY_DEFAULTS;
  const b = { ...d, ...(isPlainObject(raw) ? raw : {}) };
  const int = (v, fb, min = 0) => Math.max(min, Math.round(toNonNegativeNumber(v, fb)));
  const templates = { ...d.templates, ...(isPlainObject(b.templates) ? b.templates : {}) };
  for (const k of Object.keys(templates)) templates[k] = String(templates[k] || "").slice(0, 500);
  return {
    earnSpendAmount: Math.max(1, toNonNegativeNumber(b.earnSpendAmount, d.earnSpendAmount)),
    earnPoints: int(b.earnPoints, d.earnPoints, 0),
    minBillForEarning: toNonNegativeNumber(b.minBillForEarning, 0),
    redeemPoints: int(b.redeemPoints, d.redeemPoints, 1),
    redeemValue: Math.max(0.01, toNonNegativeNumber(b.redeemValue, d.redeemValue)),
    minRedeemPoints: int(b.minRedeemPoints, d.minRedeemPoints, 1),
    maxRedeemPercent: Math.min(100, Math.max(1, toNonNegativeNumber(b.maxRedeemPercent, d.maxRedeemPercent))),
    minBillForRedemption: toNonNegativeNumber(b.minBillForRedemption, 0),
    pointsExpire: Boolean(b.pointsExpire),
    expiryDays: int(b.expiryDays, d.expiryDays, 1),
    welcomeBonusPoints: int(b.welcomeBonusPoints, 0),
    birthdayRewardType: REWARD_TYPES.includes(b.birthdayRewardType) ? b.birthdayRewardType : d.birthdayRewardType,
    birthdayPoints: int(b.birthdayPoints, 0),
    birthdayVoucherValue: toNonNegativeNumber(b.birthdayVoucherValue, 0),
    anniversaryRewardType: REWARD_TYPES.includes(b.anniversaryRewardType) ? b.anniversaryRewardType : d.anniversaryRewardType,
    anniversaryPoints: int(b.anniversaryPoints, 0),
    anniversaryVoucherValue: toNonNegativeNumber(b.anniversaryVoucherValue, 0),
    occasionVoucherValidDays: int(b.occasionVoucherValidDays, d.occasionVoucherValidDays, 1),
    referrerPoints: int(b.referrerPoints, 0),
    refereePoints: int(b.refereePoints, 0),
    voucherValidDays: int(b.voucherValidDays, d.voucherValidDays, 1),
    // Forced off, so a config saved before levels were removed can't keep
    // multiplying points.
    tiersEnabled: false,
    tiers: normalizeTiers(b.tiers),
    templates,
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
  loyaltyCache?.delete(outletId);
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

// { enabled, crmEnabled, config } — loyalty only works while CRM is on too.
const loyaltyCache = new Map();
export async function getLoyaltySettings(outletId) {
  const cached = loyaltyCache.get(outletId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const row = await readRow(outletId);
  const value = {
    enabled: Boolean(row?.loyaltyEnabled) && Boolean(row?.crmEnabled),
    loyaltySwitch: Boolean(row?.loyaltyEnabled),
    crmEnabled: Boolean(row?.crmEnabled),
    config: normalizeLoyaltyConfig(row?.loyalty || {}),
  };
  loyaltyCache.set(outletId, { value, expiresAt: Date.now() + CRM_CACHE_TTL_MS });
  return value;
}

export async function getSection(outletId, section) {
  const def = SECTIONS[section];
  if (!def) throw badRequest(`Unknown settings section "${section}".`);

  if (section === "loyalty") {
    const row = await readRow(outletId);
    return {
      section,
      enabled: Boolean(row?.loyaltyEnabled),
      crmEnabled: Boolean(row?.crmEnabled),
      data: normalizeLoyaltyConfig(row?.loyalty || {}),
      updatedAt: row?.updatedAt || null,
    };
  }

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

  if (section === "loyalty") {
    const { enabled, ...rest } = body;
    const existing = await readRow(outletId);
    const config = normalizeLoyaltyConfig({ ...(existing?.loyalty || {}), ...rest });
    const data = {
      loyalty: config,
      ...(enabled !== undefined ? { loyaltyEnabled: Boolean(enabled) } : {}),
    };
    await prisma.outletSetting.upsert({
      where: { outletId },
      create: { outletId, ...data },
      update: data,
    });
    invalidateCrmCache(outletId);
    return getSection(outletId, "loyalty");
  }

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
  const value = { ...def.defaults };
  await prisma.outletSetting.upsert({
    where: { outletId },
    create: { outletId, [def.column]: value },
    update: { [def.column]: value },
  });
  if (section === "crm" || section === "loyalty") invalidateCrmCache(outletId);
  return getSection(outletId, section);
}