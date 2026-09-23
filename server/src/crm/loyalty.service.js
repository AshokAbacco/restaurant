// server/src/crm/loyalty.service.js
//
// Loyalty programme — points, redemption, reward vouchers, coupons,
// campaigns, tiers, welcome / birthday / anniversary / referral rewards.
//
// Money rules live here and only here. The billing screen previews numbers,
// but every redemption is re-validated server-side against the settings
// (min points, max % of bill, balance, expiry) at the moment of billing.
//
// Balance: Customer.loyaltyPoints is the running balance and every change
// goes through `applyLedger`, which locks the customer row, writes one
// LoyaltyTransaction and moves the balance in the same database
// transaction — so two tills redeeming at once can't overspend.
//
// Expiry: each credit is a "lot" (expiresAt + remainingPoints). Spending
// takes from the oldest lots first; whatever is left in a lot after its
// date is expired by `expireDuePoints`. There is no cron in this project,
// so expiry and birthday/anniversary rewards run lazily and idempotently
// whenever the loyalty dashboard, a customer's loyalty tab or a bill for
// that customer is opened.
//
// Tenancy: every function takes outletId from the token and filters on it.
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import { getLoyaltySettings } from "../settings/outletSettings.service.js";

export class LoyaltyError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}
const bad = (m) => new LoyaltyError(400, m);
const notFound = (m = "Customer not found") => new LoyaltyError(404, m);

const DAY = 86_400_000;
const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;
const CREDIT_TYPES = ["EARN", "WELCOME", "BIRTHDAY", "ANNIVERSARY", "REFERRAL", "BONUS", "ADJUST", "REVERSAL"];

// ── Conversions ─────────────────────────────────────────────────────────
export function pointsToValue(points, cfg) {
  return round2((Number(points) * cfg.redeemValue) / cfg.redeemPoints);
}

export function valueToPoints(value, cfg) {
  return Math.floor((Number(value) * cfg.redeemPoints) / cfg.redeemValue + 1e-9);
}

export function basePointsFor(amount, cfg) {
  if (Number(amount) < cfg.minBillForEarning) return 0;
  return Math.floor((Number(amount) * cfg.earnPoints) / cfg.earnSpendAmount + 1e-9);
}

// Membership level from lifetime spend. Returns null when tiers are off.
export function tierFor(totalSpent, cfg) {
  if (!cfg.tiersEnabled || !cfg.tiers?.length) return null;
  const spent = Number(totalSpent || 0);
  let idx = 0;
  cfg.tiers.forEach((t, i) => {
    if (spent >= t.minSpend) idx = i;
  });
  const tier = cfg.tiers[idx];
  const next = cfg.tiers[idx + 1] || null;
  return {
    name: tier.name,
    color: tier.color,
    multiplier: tier.multiplier,
    minSpend: tier.minSpend,
    next: next ? { name: next.name, minSpend: next.minSpend, remaining: round2(next.minSpend - spent) } : null,
  };
}

function expiryDate(cfg, from = new Date()) {
  return cfg.pointsExpire ? new Date(from.getTime() + cfg.expiryDays * DAY) : null;
}

// ── Settings gate ───────────────────────────────────────────────────────
export async function requireLoyalty(outletId) {
  const s = await getLoyaltySettings(outletId);
  if (!s.enabled) {
    throw new LoyaltyError(
      403,
      s.crmEnabled ? "Loyalty is turned off. Turn it on in Settings → Loyalty." : "Loyalty needs CRM. Turn on Settings → CRM first.",
    );
  }
  return s.config;
}

// ── Ledger ──────────────────────────────────────────────────────────────
// The one place a balance changes. `tx` is an interactive transaction.
async function applyLedger(tx, { outletId, customerId, points, type, reason, orderId, amount, campaignId, expiresAt, actorName, allowPartial = false }) {
  // Row lock: concurrent redemptions for the same customer queue up here.
  const locked = await tx.$queryRaw`
    SELECT "loyaltyPoints" FROM customers WHERE id = ${customerId} AND "outletId" = ${outletId} FOR UPDATE`;
  if (!locked.length) throw notFound();
  const balance = Number(locked[0].loyaltyPoints || 0);

  let delta = Math.trunc(Number(points));
  if (!delta) return null;
  if (delta < 0 && balance + delta < 0) {
    if (!allowPartial) throw bad(`Not enough points — the customer has ${balance}.`);
    delta = -balance;
    if (!delta) return null;
  }

  // EXPIRE rows zero their own lots before calling in, so they must not
  // eat into other, still-valid lots here.
  if (delta < 0 && type !== "EXPIRE") {
    // Spend the oldest points first (soonest expiry, then oldest credit).
    let toConsume = -delta;
    const lots = await tx.loyaltyTransaction.findMany({
      where: { outletId, customerId, remainingPoints: { gt: 0 } },
      orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      select: { id: true, remainingPoints: true },
    });
    for (const lot of lots) {
      if (toConsume <= 0) break;
      const take = Math.min(lot.remainingPoints, toConsume);
      await tx.loyaltyTransaction.update({ where: { id: lot.id }, data: { remainingPoints: { decrement: take } } });
      toConsume -= take;
    }
    // Anything still unconsumed came from points that existed before lots
    // were tracked (legacy balance) — they simply never expire.
  }

  const balanceAfter = balance + delta;
  const row = await tx.loyaltyTransaction.create({
    data: {
      outletId,
      customerId,
      orderId: orderId || null,
      points: delta,
      type,
      reason: reason || null,
      amount: amount != null ? round2(amount) : null,
      campaignId: campaignId || null,
      expiresAt: delta > 0 ? expiresAt || null : null,
      remainingPoints: delta > 0 && type !== "EXPIRE" ? delta : 0,
      balanceAfter,
      createdByName: actorName || null,
    },
  });
  await tx.customer.update({ where: { id: customerId }, data: { loyaltyPoints: balanceAfter } });
  return row;
}

async function credit(outletId, customerId, points, type, extra = {}) {
  if (!points || points <= 0) return null;
  const { config } = await getLoyaltySettings(outletId);
  return prisma.$transaction((tx) =>
    applyLedger(tx, { outletId, customerId, points, type, expiresAt: expiryDate(config), ...extra }),
  );
}

// ── Expiry (lazy, idempotent) ───────────────────────────────────────────
export async function expireDuePoints(outletId, customerId = null) {
  const now = new Date();
  const lots = await prisma.loyaltyTransaction.findMany({
    where: {
      outletId,
      ...(customerId ? { customerId } : {}),
      remainingPoints: { gt: 0 },
      expiresAt: { lt: now },
    },
    select: { customerId: true },
    distinct: ["customerId"],
    take: 300,
  });

  let expiredTotal = 0;
  for (const { customerId: cid } of lots) {
    // eslint-disable-next-line no-await-in-loop
    const n = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM customers WHERE id = ${cid} AND "outletId" = ${outletId} FOR UPDATE`;
      const due = await tx.loyaltyTransaction.findMany({
        where: { outletId, customerId: cid, remainingPoints: { gt: 0 }, expiresAt: { lt: now } },
        select: { id: true, remainingPoints: true },
      });
      const sum = due.reduce((s, l) => s + l.remainingPoints, 0);
      if (!sum) return 0;
      await tx.loyaltyTransaction.updateMany({
        where: { id: { in: due.map((l) => l.id) } },
        data: { remainingPoints: 0 },
      });
      const row = await applyLedger(tx, {
        outletId,
        customerId: cid,
        points: -sum,
        type: "EXPIRE",
        reason: `${sum} points expired`,
        allowPartial: true,
      });
      return row ? -row.points : 0;
    });
    expiredTotal += n;
  }

  // Vouchers past their date
  await prisma.customerVoucher.updateMany({
    where: { outletId, ...(customerId ? { customerId } : {}), status: "ACTIVE", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });
  return expiredTotal;
}

// ── Voucher codes / referral codes ──────────────────────────────────────
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
function randomCode(len) {
  let s = "";
  for (let i = 0; i < len; i += 1) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

async function uniqueVoucherCode(tx, outletId) {
  for (let i = 0; i < 8; i += 1) {
    const code = `RW-${randomCode(6)}`;
    // eslint-disable-next-line no-await-in-loop
    const clash = await tx.customerVoucher.findFirst({ where: { outletId, code }, select: { id: true } });
    if (!clash) return code;
  }
  throw new Error("Could not generate a voucher code, please retry.");
}

export async function ensureReferralCode(outletId, customerId) {
  const c = await prisma.customer.findFirst({ where: { id: customerId, outletId }, select: { referralCode: true, name: true } });
  if (!c) throw notFound();
  if (c.referralCode) return c.referralCode;
  const prefix = (c.name || "REF").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4).padEnd(3, "X");
  for (let i = 0; i < 8; i += 1) {
    const code = `${prefix}${randomCode(4)}`;
    try {
      // eslint-disable-next-line no-await-in-loop
      await prisma.customer.update({ where: { id: customerId }, data: { referralCode: code } });
      return code;
    } catch (err) {
      if (err?.code !== "P2002") throw err;
    }
  }
  throw new Error("Could not generate a referral code, please retry.");
}

// Referral code or mobile number -> the referring customer's id.
export async function resolveReferrer(outletId, codeOrMobile, selfId = null) {
  const raw = String(codeOrMobile || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const found = await prisma.customer.findFirst({
    where: {
      outletId,
      OR: [
        { referralCode: raw.toUpperCase() },
        ...(digits.length >= 7 ? [{ mobile: { endsWith: digits.slice(-10) } }] : []),
      ],
    },
    select: { id: true, name: true },
  });
  if (!found) throw bad("No customer matches that referral code or mobile number.");
  if (selfId && found.id === selfId) throw bad("A customer can't refer themselves.");
  return found;
}

// ── Vouchers ────────────────────────────────────────────────────────────
async function issueVoucher(tx, outletId, customerId, { title, type = "FIXED_AMOUNT", value, maxDiscount, minBillAmount, expiresAt, source, pointsUsed, actorName }) {
  return tx.customerVoucher.create({
    data: {
      outletId,
      customerId,
      code: await uniqueVoucherCode(tx, outletId),
      title,
      type,
      value: round2(value),
      maxDiscount: maxDiscount != null && maxDiscount !== "" ? round2(maxDiscount) : null,
      minBillAmount: minBillAmount != null && minBillAmount !== "" ? round2(minBillAmount) : null,
      expiresAt: expiresAt || null,
      source,
      pointsUsed: pointsUsed || null,
      createdByName: actorName || null,
    },
  });
}

function voucherDiscount(v, subtotal) {
  if (v.type === "PERCENTAGE") {
    const pct = (Number(subtotal) * Number(v.value)) / 100;
    return round2(v.maxDiscount != null ? Math.min(pct, Number(v.maxDiscount)) : pct);
  }
  return round2(v.value);
}

function shapeVoucher(v) {
  return {
    ...v,
    value: Number(v.value),
    maxDiscount: v.maxDiscount != null ? Number(v.maxDiscount) : null,
    minBillAmount: v.minBillAmount != null ? Number(v.minBillAmount) : null,
    discountAmount: v.discountAmount != null ? Number(v.discountAmount) : null,
  };
}

// Points -> voucher (any staff), or a free voucher (managers — see routes).
export async function createVoucher(outletId, customerId, body, actorName) {
  const cfg = await requireLoyalty(outletId);
  const customer = await prisma.customer.findFirst({ where: { id: customerId, outletId }, select: { id: true } });
  if (!customer) throw notFound();
  await expireDuePoints(outletId, customerId);

  if (body?.mode === "POINTS") {
    const points = Math.trunc(Number(body.points));
    if (!Number.isFinite(points) || points < cfg.minRedeemPoints) {
      throw bad(`Convert at least ${cfg.minRedeemPoints} points.`);
    }
    const value = pointsToValue(points, cfg);
    const voucher = await prisma.$transaction(async (tx) => {
      await applyLedger(tx, {
        outletId, customerId, points: -points, type: "VOUCHER",
        reason: `Converted to ₹${value} voucher`, amount: value, actorName,
      });
      return issueVoucher(tx, outletId, customerId, {
        title: `₹${value} reward voucher`,
        value,
        expiresAt: new Date(Date.now() + cfg.voucherValidDays * DAY),
        source: "POINTS",
        pointsUsed: points,
        actorName,
      });
    });
    return shapeVoucher(voucher);
  }

  // MANUAL
  const type = body?.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED_AMOUNT";
  const value = Number(body?.value);
  if (!Number.isFinite(value) || value <= 0) throw bad("Enter the voucher value.");
  if (type === "PERCENTAGE" && value > 100) throw bad("A percentage voucher can't be more than 100%.");
  const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : new Date(Date.now() + cfg.voucherValidDays * DAY);
  if (Number.isNaN(expiresAt.getTime())) throw bad("Invalid expiry date.");
  const title = String(body?.title || "").trim().slice(0, 100) || (type === "PERCENTAGE" ? `${value}% off` : `₹${value} off`);
  const voucher = await prisma.$transaction((tx) =>
    issueVoucher(tx, outletId, customerId, {
      title, type, value, maxDiscount: body?.maxDiscount, minBillAmount: body?.minBillAmount,
      expiresAt, source: "MANUAL", actorName,
    }),
  );
  return shapeVoucher(voucher);
}

export async function cancelVoucher(outletId, voucherId, actorName) {
  const v = await prisma.customerVoucher.findFirst({ where: { id: voucherId, outletId } });
  if (!v) throw notFound("Voucher not found");
  if (v.status !== "ACTIVE") throw bad("Only an unused voucher can be cancelled.");
  const { config } = await getLoyaltySettings(outletId);
  const updated = await prisma.$transaction(async (tx) => {
    // Points that bought the voucher go back to the customer.
    if (v.pointsUsed) {
      await applyLedger(tx, {
        outletId, customerId: v.customerId, points: v.pointsUsed, type: "REVERSAL",
        reason: `Voucher ${v.code} cancelled — points returned`, expiresAt: expiryDate(config), actorName,
      });
    }
    return tx.customerVoucher.update({ where: { id: v.id }, data: { status: "CANCELLED" } });
  });
  return shapeVoucher(updated);
}

export async function listVouchers(outletId, { customerId, status } = {}) {
  await expireDuePoints(outletId, customerId || null);
  const rows = await prisma.customerVoucher.findMany({
    where: {
      outletId,
      ...(customerId ? { customerId } : {}),
      ...(status && ["ACTIVE", "USED", "EXPIRED", "CANCELLED"].includes(status) ? { status } : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      customer: { select: { id: true, name: true, mobile: true } },
      usedOrder: { select: { id: true, orderNumber: true } },
    },
  });
  return rows.map(shapeVoucher);
}

// ── Automatic rewards: birthday & anniversary (lazy, idempotent) ────────
function recentMonthDays(daysBack) {
  const out = [];
  const now = new Date();
  for (let i = 0; i <= daysBack; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push(`${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}

// Awards on the day, or up to a week late if nobody opened the CRM that day.
export async function runOccasionRewards(outletId, customerId = null) {
  const { enabled, config: cfg } = await getLoyaltySettings(outletId);
  if (!enabled) return [];
  const mmdd = recentMonthDays(7);
  const since = new Date(Date.now() - 300 * DAY); // once per year
  const awarded = [];

  for (const kind of ["BIRTHDAY", "ANNIVERSARY"]) {
    const rewardType = kind === "BIRTHDAY" ? cfg.birthdayRewardType : cfg.anniversaryRewardType;
    if (rewardType === "NONE") continue;
    const col = kind === "BIRTHDAY" ? Prisma.raw("birthday") : Prisma.raw("anniversary");
    // eslint-disable-next-line no-await-in-loop
    const due = await prisma.$queryRaw`
      SELECT c.id, c.name FROM customers c
      WHERE c."outletId" = ${outletId}
        ${customerId ? Prisma.sql`AND c.id = ${customerId}` : Prisma.empty}
        AND c.status::text <> 'BLOCKED'
        AND to_char(c.${col}, 'MMDD') IN (${Prisma.join(mmdd)})
        AND NOT EXISTS (SELECT 1 FROM loyalty_transactions t
                        WHERE t."customerId" = c.id AND t.type::text = ${kind} AND t."createdAt" >= ${since})
        AND NOT EXISTS (SELECT 1 FROM customer_vouchers v
                        WHERE v."customerId" = c.id AND v.source::text = ${kind} AND v."createdAt" >= ${since})
      LIMIT 200`;

    for (const c of due) {
      const label = kind === "BIRTHDAY" ? "Birthday" : "Anniversary";
      if (rewardType === "POINTS") {
        const pts = kind === "BIRTHDAY" ? cfg.birthdayPoints : cfg.anniversaryPoints;
        if (pts > 0) {
          // eslint-disable-next-line no-await-in-loop
          await credit(outletId, c.id, pts, kind, { reason: `${label} reward` });
          awarded.push({ customerId: c.id, name: c.name, kind, points: pts });
        }
      } else {
        const value = kind === "BIRTHDAY" ? cfg.birthdayVoucherValue : cfg.anniversaryVoucherValue;
        if (value > 0) {
          // eslint-disable-next-line no-await-in-loop
          const v = await prisma.$transaction((tx) =>
            issueVoucher(tx, outletId, c.id, {
              title: `${label} treat — ₹${value} off`,
              value,
              expiresAt: new Date(Date.now() + cfg.occasionVoucherValidDays * DAY),
              source: kind,
            }),
          );
          awarded.push({ customerId: c.id, name: c.name, kind, voucher: v.code });
        }
      }
    }
  }
  return awarded;
}

// ── Campaigns ───────────────────────────────────────────────────────────
function campaignApplies(c, amount, at = new Date()) {
  if (!c.isActive) return false;
  if (at < c.startsAt || at > c.endsAt) return false;
  if (c.daysOfWeek?.length && !c.daysOfWeek.includes(at.getDay())) return false;
  if (c.minBillAmount != null && Number(amount) < Number(c.minBillAmount)) return false;
  return true;
}

async function activeCampaigns(outletId) {
  const now = new Date();
  return prisma.loyaltyCampaign.findMany({
    where: { outletId, isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { endsAt: "asc" },
  });
}

function shapeCampaign(c) {
  return { ...c, multiplier: Number(c.multiplier), minBillAmount: c.minBillAmount != null ? Number(c.minBillAmount) : null };
}

function campaignData(body, partial) {
  const data = {};
  if (!partial || body.name !== undefined) {
    const name = String(body.name || "").trim().slice(0, 100);
    if (!name) throw bad("Give the campaign a name.");
    data.name = name;
  }
  if (body.description !== undefined) data.description = String(body.description || "").trim().slice(0, 300) || null;
  if (body.multiplier !== undefined) {
    const m = Number(body.multiplier);
    if (!Number.isFinite(m) || m < 1 || m > 10) throw bad("Multiplier must be between 1 and 10.");
    data.multiplier = m;
  }
  if (body.bonusPoints !== undefined) {
    const b = Math.trunc(Number(body.bonusPoints));
    if (!Number.isFinite(b) || b < 0) throw bad("Bonus points can't be negative.");
    data.bonusPoints = b;
  }
  if (body.minBillAmount !== undefined) {
    data.minBillAmount = body.minBillAmount === "" || body.minBillAmount === null ? null : Math.max(0, Number(body.minBillAmount) || 0);
  }
  for (const k of ["startsAt", "endsAt"]) {
    if (!partial || body[k] !== undefined) {
      const d = new Date(body[k]);
      if (Number.isNaN(d.getTime())) throw bad("Pick the campaign start and end dates.");
      data[k] = d;
    }
  }
  if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) throw bad("The campaign must end after it starts.");
  if (body.daysOfWeek !== undefined) {
    data.daysOfWeek = [...new Set((body.daysOfWeek || []).map(Number).filter((d) => d >= 0 && d <= 6))];
  }
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  return data;
}

export async function listCampaigns(outletId) {
  const rows = await prisma.loyaltyCampaign.findMany({
    where: { outletId },
    orderBy: [{ isActive: "desc" }, { endsAt: "desc" }],
    include: { _count: { select: { transactions: true } } },
  });
  return rows.map(({ _count, ...c }) => ({ ...shapeCampaign(c), timesApplied: _count.transactions }));
}

export async function createCampaign(outletId, body) {
  const data = campaignData(body || {}, false);
  if ((data.multiplier ?? 1) <= 1 && !(data.bonusPoints > 0)) {
    throw bad("Set a multiplier above 1 or some bonus points — otherwise the campaign does nothing.");
  }
  return shapeCampaign(await prisma.loyaltyCampaign.create({ data: { ...data, outletId } }));
}

export async function updateCampaign(outletId, id, body) {
  const existing = await prisma.loyaltyCampaign.findFirst({ where: { id, outletId } });
  if (!existing) throw notFound("Campaign not found");
  const data = campaignData(body || {}, true);
  const starts = data.startsAt || existing.startsAt;
  const ends = data.endsAt || existing.endsAt;
  if (ends <= starts) throw bad("The campaign must end after it starts.");
  return shapeCampaign(await prisma.loyaltyCampaign.update({ where: { id }, data }));
}

export async function deleteCampaign(outletId, id) {
  const existing = await prisma.loyaltyCampaign.findFirst({ where: { id, outletId } });
  if (!existing) throw notFound("Campaign not found");
  await prisma.loyaltyCampaign.delete({ where: { id } });
  return { deleted: true };
}

// ── Coupons (shared codes for everyone, on the existing Discount table) ─
function shapeCoupon(d, used = 0) {
  return {
    id: d.id,
    code: d.code,
    type: d.type,
    value: Number(d.value),
    isActive: d.isActive,
    validFrom: d.validFrom,
    validTo: d.validTo,
    usageLimit: d.usageLimit,
    minOrderAmount: d.minOrderAmount != null ? Number(d.minOrderAmount) : null,
    timesUsed: used,
    createdAt: d.createdAt,
  };
}

export async function listCoupons(outletId) {
  const rows = await prisma.discount.findMany({
    where: { outletId, code: { not: null } },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { orderDiscounts: true } } },
  });
  return rows.map((d) => shapeCoupon(d, d._count.orderDiscounts));
}

function couponData(body, partial) {
  const data = {};
  if (!partial || body.code !== undefined) {
    const code = String(body.code || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw bad("Coupon code: 3–30 letters, numbers, - or _.");
    data.code = code;
  }
  if (!partial || body.type !== undefined) {
    data.type = body.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED_AMOUNT";
  }
  if (!partial || body.value !== undefined) {
    const v = Number(body.value);
    if (!Number.isFinite(v) || v <= 0) throw bad("Enter the discount value.");
    if ((data.type || body.type) === "PERCENTAGE" && v > 100) throw bad("A percentage can't be more than 100.");
    data.value = v;
  }
  for (const k of ["validFrom", "validTo"]) {
    if (body[k] !== undefined) {
      if (!body[k]) data[k] = null;
      else {
        const d = new Date(body[k]);
        if (Number.isNaN(d.getTime())) throw bad("Invalid date.");
        data[k] = d;
      }
    }
  }
  if (body.usageLimit !== undefined) {
    data.usageLimit = body.usageLimit === "" || body.usageLimit === null ? null : Math.max(1, Math.trunc(Number(body.usageLimit)) || 1);
  }
  if (body.minOrderAmount !== undefined) {
    data.minOrderAmount = body.minOrderAmount === "" || body.minOrderAmount === null ? null : Math.max(0, Number(body.minOrderAmount) || 0);
  }
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  return data;
}

export async function createCoupon(outletId, body) {
  try {
    return shapeCoupon(await prisma.discount.create({ data: { ...couponData(body || {}, false), outletId } }));
  } catch (err) {
    if (err?.code === "P2002") throw new LoyaltyError(409, "That coupon code already exists.");
    throw err;
  }
}

export async function updateCoupon(outletId, id, body) {
  const existing = await prisma.discount.findFirst({ where: { id, outletId } });
  if (!existing) throw notFound("Coupon not found");
  try {
    return shapeCoupon(await prisma.discount.update({ where: { id }, data: couponData(body || {}, true) }));
  } catch (err) {
    if (err?.code === "P2002") throw new LoyaltyError(409, "That coupon code already exists.");
    throw err;
  }
}

async function validateCoupon(tx, outletId, code, subtotal) {
  const d = await tx.discount.findFirst({ where: { outletId, code: String(code).trim().toUpperCase() } });
  if (!d || !d.isActive) throw bad("Coupon code not found or no longer active.");
  const now = new Date();
  if (d.validFrom && now < d.validFrom) throw bad("This coupon isn't valid yet.");
  if (d.validTo && now > d.validTo) throw bad("This coupon has expired.");
  if (d.usageLimit != null) {
    const used = await tx.orderDiscount.count({ where: { discountId: d.id } });
    if (used >= d.usageLimit) throw bad("This coupon has reached its usage limit.");
  }
  if (d.minOrderAmount != null && Number(subtotal) < Number(d.minOrderAmount)) {
    throw bad(`This coupon needs a bill of at least ₹${Number(d.minOrderAmount)}.`);
  }
  const amount = d.type === "PERCENTAGE" ? (Number(subtotal) * Number(d.value)) / 100 : Number(d.value);
  return { discount: d, amount: round2(amount) };
}

// ── Billing: what can this customer use on this bill? ───────────────────
export async function getBillingLoyalty(outletId, order, balanceDue) {
  const { enabled, config: cfg } = await getLoyaltySettings(outletId);
  if (!enabled) return { enabled: false };
  if (!order.customerId) return { enabled: true, customer: null, coupons: true };

  await expireDuePoints(outletId, order.customerId);
  await runOccasionRewards(outletId, order.customerId);

  const [customer, spend, vouchers, campaigns] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: order.customerId, outletId },
      select: { id: true, name: true, mobile: true, loyaltyPoints: true },
    }),
    prisma.order.aggregate({
      where: { outletId, customerId: order.customerId, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      _sum: { grandTotal: true },
    }),
    prisma.customerVoucher.findMany({
      where: { outletId, customerId: order.customerId, status: "ACTIVE" },
      orderBy: { expiresAt: "asc" },
    }),
    activeCampaigns(outletId),
  ]);
  if (!customer) return { enabled: true, customer: null, coupons: true };

  const balance = customer.loyaltyPoints;
  const due = Number(balanceDue);
  const tier = tierFor(spend._sum.grandTotal, cfg);

  const eligibleBill = due >= cfg.minBillForRedemption;
  const capValue = round2(Math.min((due * cfg.maxRedeemPercent) / 100, pointsToValue(balance, cfg)));
  const maxPoints = eligibleBill ? Math.min(balance, valueToPoints(capValue, cfg)) : 0;
  const canRedeem = maxPoints >= cfg.minRedeemPoints;

  let reason = null;
  if (!canRedeem) {
    if (balance < cfg.minRedeemPoints) reason = `Needs at least ${cfg.minRedeemPoints} points to redeem.`;
    else if (!eligibleBill) reason = `Points can be used on bills of ₹${cfg.minBillForRedemption} or more.`;
    else reason = `Up to ${cfg.maxRedeemPercent}% of a bill can be paid with points.`;
  }

  // Points this bill would earn at today's rates (before any redemption).
  const multiplier = (tier?.multiplier || 1) * Math.max(1, ...campaigns.filter((c) => campaignApplies(c, due)).map((c) => Number(c.multiplier)));
  const estimatedEarn = Math.floor(basePointsFor(due, cfg) * multiplier);

  return {
    enabled: true,
    coupons: true,
    customer: { id: customer.id, name: customer.name, mobile: customer.mobile, points: balance, pointsValue: pointsToValue(balance, cfg) },
    tier,
    redeem: {
      canRedeem,
      reason,
      minPoints: cfg.minRedeemPoints,
      maxPoints: canRedeem ? maxPoints : 0,
      maxValue: canRedeem ? pointsToValue(maxPoints, cfg) : 0,
      redeemPoints: cfg.redeemPoints,
      redeemValue: cfg.redeemValue,
    },
    estimatedEarn,
    vouchers: vouchers.map(shapeVoucher).map((v) => ({
      ...v,
      usable: v.minBillAmount == null || Number(order.subtotal) >= v.minBillAmount,
    })),
    campaigns: campaigns.filter((c) => campaignApplies(c, due)).map(shapeCampaign),
  };
}

// Applies voucher, coupon and points to an order just before payment.
// Returns { applied, undo } — billing calls undo() if anything after this
// fails, so a failed bill never costs the customer points or a voucher.
export async function applyBillingRewards(outletId, orderId, input = {}, actorName) {
  const redeemPoints = Math.trunc(Number(input.redeemPoints || 0));
  const voucherCode = String(input.voucherCode || "").trim();
  const couponCode = String(input.couponCode || "").trim();
  if (!redeemPoints && !voucherCode && !couponCode) return { applied: [], undo: async () => {} };

  const { enabled, config: cfg } = await getLoyaltySettings(outletId);
  if ((redeemPoints || voucherCode) && !enabled) throw bad("Loyalty is turned off in Settings.");
  if (redeemPoints < 0) throw bad("Invalid points.");

  const order0 = await prisma.order.findFirst({ where: { id: orderId, outletId }, select: { customerId: true } });
  if (order0?.customerId) await expireDuePoints(outletId, order0.customerId);

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, outletId }, include: { payments: true } });
    if (!order) throw notFound("Order not found");
    const paid = order.payments.reduce((s, p) => s + Number(p.amount), 0);
    let grandTotal = Number(order.grandTotal);
    let discountTotal = Number(order.discountAmount);
    const subtotal = Number(order.subtotal);
    const applied = [];

    const addDiscount = async (type, amount, reason, discountId = null) => {
      const due = round2(grandTotal - paid);
      const amt = round2(Math.min(amount, due));
      if (amt <= 0) throw bad("There's nothing left on this bill to discount.");
      const od = await tx.orderDiscount.create({
        data: { orderId, type, amountDeducted: amt, reason, discountId },
      });
      grandTotal = round2(grandTotal - amt);
      discountTotal = round2(discountTotal + amt);
      return { od, amt };
    };

    // 1. Customer's reward voucher
    if (voucherCode) {
      if (!order.customerId) throw bad("Add the customer to this order to use their voucher.");
      const v = await tx.customerVoucher.findFirst({ where: { outletId, code: voucherCode.toUpperCase() } });
      if (!v) throw bad("Voucher not found.");
      if (v.customerId !== order.customerId) throw bad("This voucher belongs to a different customer.");
      if (v.status !== "ACTIVE") throw bad(`This voucher is ${v.status.toLowerCase()}.`);
      if (v.expiresAt && v.expiresAt < new Date()) throw bad("This voucher has expired.");
      if (v.minBillAmount != null && subtotal < Number(v.minBillAmount)) {
        throw bad(`This voucher needs a bill of at least ₹${Number(v.minBillAmount)}.`);
      }
      const { od, amt } = await addDiscount("COUPON", voucherDiscount(v, subtotal), `Voucher ${v.code}: ${v.title}`);
      await tx.customerVoucher.update({
        where: { id: v.id },
        data: { status: "USED", usedAt: new Date(), usedOrderId: orderId, discountAmount: amt },
      });
      applied.push({ kind: "VOUCHER", code: v.code, amount: amt, orderDiscountId: od.id, voucherId: v.id });
    }

    // 2. Shared coupon code
    if (couponCode) {
      const { discount, amount } = await validateCoupon(tx, outletId, couponCode, subtotal);
      const { od, amt } = await addDiscount("COUPON", amount, `Coupon ${discount.code}`, discount.id);
      applied.push({ kind: "COUPON", code: discount.code, amount: amt, orderDiscountId: od.id });
    }

    // 3. Points — the cap is worked out on what's still due after 1 and 2.
    if (redeemPoints) {
      if (!order.customerId) throw bad("Add the customer to this order to redeem points.");
      if (redeemPoints < cfg.minRedeemPoints) throw bad(`Redeem at least ${cfg.minRedeemPoints} points.`);
      const due = round2(grandTotal - paid);
      if (due < cfg.minBillForRedemption) throw bad(`Points can be used on bills of ₹${cfg.minBillForRedemption} or more.`);
      const value = pointsToValue(redeemPoints, cfg);
      const cap = round2((due * cfg.maxRedeemPercent) / 100);
      if (value > cap + 0.001) {
        throw bad(`At most ${cfg.maxRedeemPercent}% of this bill (₹${cap}) can be paid with points — that's ${valueToPoints(cap, cfg)} points.`);
      }
      const { od, amt } = await addDiscount("MEMBERSHIP", value, `Loyalty: ${redeemPoints} points`);
      const ledger = await applyLedger(tx, {
        outletId, customerId: order.customerId, points: -redeemPoints, type: "REDEEM",
        reason: `Redeemed on ${order.orderNumber}`, orderId, amount: amt, actorName,
      });
      applied.push({ kind: "POINTS", points: redeemPoints, amount: amt, orderDiscountId: od.id, ledgerId: ledger.id });
    }

    await tx.order.update({ where: { id: orderId }, data: { grandTotal, discountAmount: discountTotal } });
    return { applied, customerId: order.customerId };
  });

  const undo = async () => {
    try {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findFirst({ where: { id: orderId, outletId } });
        let total = 0;
        for (const a of result.applied) {
          total += a.amount;
          await tx.orderDiscount.delete({ where: { id: a.orderDiscountId } }).catch(() => {});
          if (a.voucherId) {
            await tx.customerVoucher.update({
              where: { id: a.voucherId },
              data: { status: "ACTIVE", usedAt: null, usedOrderId: null, discountAmount: null },
            });
          }
          if (a.kind === "POINTS") {
            await applyLedger(tx, {
              outletId, customerId: result.customerId, points: a.points, type: "REVERSAL",
              reason: `Bill ${order?.orderNumber || ""} not completed — points returned`, orderId,
              expiresAt: expiryDate(cfg), actorName,
            });
          }
        }
        if (order && total) {
          await tx.order.update({
            where: { id: orderId },
            data: {
              grandTotal: round2(Number(order.grandTotal) + total),
              discountAmount: round2(Math.max(0, Number(order.discountAmount) - total)),
            },
          });
        }
      });
    } catch (err) {
      console.error("[loyalty] could not undo rewards for order", orderId, err);
    }
  };

  return { applied: result.applied, undo };
}

// ── Earning (called once a bill is COMPLETED) ───────────────────────────
// Idempotent per order: a replayed "complete billing" never earns twice.
export async function earnForOrder(outletId, orderId, actorName) {
  const { enabled, config: cfg } = await getLoyaltySettings(outletId);
  if (!enabled) return null;

  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId },
    select: { id: true, orderNumber: true, customerId: true, grandTotal: true, status: true },
  });
  if (!order?.customerId || order.status !== "COMPLETED") return null;
  const customerId = order.customerId;

  const already = await prisma.loyaltyTransaction.findFirst({
    where: { outletId, orderId, type: { in: ["EARN", "BONUS"] } },
    select: { id: true },
  });
  if (already) return null;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, outletId },
    select: { id: true, name: true, status: true, referredById: true },
  });
  if (!customer || customer.status === "BLOCKED") return null;

  await expireDuePoints(outletId, customerId);

  const amount = Number(order.grandTotal);
  const [spend, campaigns, completedCount, hasWelcome, hasReferral] = await Promise.all([
    prisma.order.aggregate({
      where: { outletId, customerId, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      _sum: { grandTotal: true },
    }),
    activeCampaigns(outletId),
    prisma.order.count({ where: { outletId, customerId, status: "COMPLETED" } }),
    prisma.loyaltyTransaction.findFirst({ where: { outletId, customerId, type: "WELCOME" }, select: { id: true } }),
    prisma.loyaltyTransaction.findFirst({ where: { outletId, customerId, type: "REFERRAL" }, select: { id: true } }),
  ]);

  const tier = tierFor(spend._sum.grandTotal, cfg);
  const matching = campaigns.filter((c) => campaignApplies(c, amount));
  const best = matching.reduce((b, c) => (!b || Number(c.multiplier) > Number(b.multiplier) ? c : b), null);
  const campaignMultiplier = best && Number(best.multiplier) > 1 ? Number(best.multiplier) : 1;
  const base = basePointsFor(amount, cfg);
  const earned = Math.floor(base * (tier?.multiplier || 1) * campaignMultiplier + 1e-9);
  const expiresAt = expiryDate(cfg);

  const summary = { earned: 0, bonus: 0, welcome: 0, referral: 0, tier: tier?.name || null, campaigns: [] };

  await prisma.$transaction(async (tx) => {
    if (earned > 0) {
      const parts = [`${base} pts on ₹${round2(amount)}`];
      if (tier && tier.multiplier !== 1) parts.push(`${tier.name} ×${tier.multiplier}`);
      if (campaignMultiplier > 1) parts.push(`${best.name} ×${campaignMultiplier}`);
      await applyLedger(tx, {
        outletId, customerId, points: earned, type: "EARN", orderId, amount,
        reason: `Earned on ${order.orderNumber} (${parts.join(", ")})`,
        campaignId: campaignMultiplier > 1 ? best.id : null, expiresAt, actorName,
      });
      summary.earned = earned;
      if (campaignMultiplier > 1) summary.campaigns.push(best.name);
    }
    for (const c of matching.filter((m) => m.bonusPoints > 0)) {
      await applyLedger(tx, {
        outletId, customerId, points: c.bonusPoints, type: "BONUS", orderId, campaignId: c.id,
        reason: `${c.name} bonus`, expiresAt, actorName,
      });
      summary.bonus += c.bonusPoints;
      if (!summary.campaigns.includes(c.name)) summary.campaigns.push(c.name);
    }
    // Welcome bonus on the customer's first loyalty bill.
    if (!hasWelcome && cfg.welcomeBonusPoints > 0) {
      await applyLedger(tx, {
        outletId, customerId, points: cfg.welcomeBonusPoints, type: "WELCOME", orderId,
        reason: "Welcome bonus", expiresAt, actorName,
      });
      summary.welcome = cfg.welcomeBonusPoints;
    }
    // Referral: both sides are rewarded on the new customer's first bill.
    if (customer.referredById && !hasReferral && completedCount <= 1) {
      const referrer = await tx.customer.findFirst({
        where: { id: customer.referredById, outletId },
        select: { id: true, name: true, status: true },
      });
      if (cfg.refereePoints > 0) {
        await applyLedger(tx, {
          outletId, customerId, points: cfg.refereePoints, type: "REFERRAL", orderId,
          reason: referrer ? `Joined through ${referrer.name}'s referral` : "Referral reward", expiresAt, actorName,
        });
        summary.referral = cfg.refereePoints;
      }
      if (referrer && referrer.status !== "BLOCKED" && cfg.referrerPoints > 0) {
        await applyLedger(tx, {
          outletId, customerId: referrer.id, points: cfg.referrerPoints, type: "REFERRAL", orderId,
          reason: `Referred ${customer.name}`, expiresAt, actorName,
        });
      }
    }
  });

  await runOccasionRewards(outletId, customerId);

  const after = await prisma.customer.findUnique({ where: { id: customerId }, select: { loyaltyPoints: true } });
  return {
    ...summary,
    totalAdded: summary.earned + summary.bonus + summary.welcome + summary.referral,
    balance: after.loyaltyPoints,
    balanceValue: pointsToValue(after.loyaltyPoints, cfg),
  };
}

// Takes back points earned on an order that was later cancelled/refunded,
// and returns points that were redeemed on it.
export async function reverseForOrder(outletId, orderId, actorName) {
  const rows = await prisma.loyaltyTransaction.findMany({ where: { outletId, orderId } });
  if (!rows.length) return null;
  const alreadyReversed = rows.some((r) => r.type === "REVERSAL" && /cancelled/i.test(r.reason || ""));
  if (alreadyReversed) return null;
  const { config } = await getLoyaltySettings(outletId);
  const byCustomer = new Map();
  for (const r of rows) byCustomer.set(r.customerId, (byCustomer.get(r.customerId) || 0) + r.points);
  await prisma.$transaction(async (tx) => {
    for (const [customerId, net] of byCustomer) {
      if (!net) continue;
      await applyLedger(tx, {
        outletId, customerId, points: -net, type: "REVERSAL", orderId,
        reason: "Order cancelled — loyalty reversed", allowPartial: true,
        expiresAt: expiryDate(config), actorName,
      });
    }
  });
  return true;
}

// ── Manual adjustment (managers) ────────────────────────────────────────
export async function adjustPoints(outletId, customerId, body, actorName) {
  await requireLoyalty(outletId);
  const points = Math.trunc(Number(body?.points));
  if (!Number.isFinite(points) || points === 0) throw bad("Enter the number of points to add or remove.");
  if (Math.abs(points) > 1_000_000) throw bad("That's too many points for one adjustment.");
  const reason = String(body?.reason || "").trim().slice(0, 200);
  if (!reason) throw bad("Add a reason — it's shown in the customer's history.");
  const { config } = await getLoyaltySettings(outletId);
  await expireDuePoints(outletId, customerId);
  const row = await prisma.$transaction((tx) =>
    applyLedger(tx, {
      outletId, customerId, points, type: "ADJUST", reason, actorName,
      expiresAt: points > 0 ? expiryDate(config) : null,
    }),
  );
  return row;
}

// ── Reads ───────────────────────────────────────────────────────────────
export async function getCustomerLoyalty(outletId, customerId) {
  const cfg = await requireLoyalty(outletId);
  const exists = await prisma.customer.findFirst({ where: { id: customerId, outletId }, select: { id: true } });
  if (!exists) throw notFound();

  await expireDuePoints(outletId, customerId);
  await runOccasionRewards(outletId, customerId);
  const referralCode = await ensureReferralCode(outletId, customerId);

  const soon = new Date(Date.now() + 30 * DAY);
  const [customer, spend, sums, expiring, nextExpiry, vouchers, recent, referrals] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      select: { loyaltyPoints: true, referredBy: { select: { id: true, name: true } } },
    }),
    prisma.order.aggregate({
      where: { outletId, customerId, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      _sum: { grandTotal: true },
    }),
    prisma.loyaltyTransaction.groupBy({
      by: ["type"],
      where: { outletId, customerId },
      _sum: { points: true },
    }),
    prisma.loyaltyTransaction.aggregate({
      where: { outletId, customerId, remainingPoints: { gt: 0 }, expiresAt: { gte: new Date(), lte: soon } },
      _sum: { remainingPoints: true },
    }),
    prisma.loyaltyTransaction.findFirst({
      where: { outletId, customerId, remainingPoints: { gt: 0 }, expiresAt: { gte: new Date() } },
      orderBy: { expiresAt: "asc" },
      select: { expiresAt: true, remainingPoints: true },
    }),
    listVouchers(outletId, { customerId }),
    prisma.loyaltyTransaction.findMany({
      where: { outletId, customerId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { order: { select: { id: true, orderNumber: true } } },
    }),
    prisma.customer.findMany({
      where: { outletId, referredById: customerId },
      select: { id: true, name: true, mobile: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const byType = Object.fromEntries(sums.map((s) => [s.type, s._sum.points || 0]));
  const earnedTotal = CREDIT_TYPES.filter((t) => t !== "REVERSAL" && t !== "ADJUST").reduce((s, t) => s + (byType[t] || 0), 0);
  const balance = customer.loyaltyPoints;

  return {
    points: balance,
    pointsValue: pointsToValue(balance, cfg),
    tier: tierFor(spend._sum.grandTotal, cfg),
    totalSpent: round2(spend._sum.grandTotal || 0),
    lifetimeEarned: earnedTotal,
    lifetimeRedeemed: -((byType.REDEEM || 0) + (byType.VOUCHER || 0)),
    lifetimeExpired: -(byType.EXPIRE || 0),
    expiringIn30Days: expiring._sum.remainingPoints || 0,
    nextExpiry: nextExpiry ? { date: nextExpiry.expiresAt, points: nextExpiry.remainingPoints } : null,
    canRedeem: balance >= cfg.minRedeemPoints,
    referralCode,
    referredBy: customer.referredBy,
    referrals,
    vouchers,
    transactions: recent.map((t) => ({ ...t, amount: t.amount != null ? Number(t.amount) : null })),
    rules: {
      earnSpendAmount: cfg.earnSpendAmount,
      earnPoints: cfg.earnPoints,
      redeemPoints: cfg.redeemPoints,
      redeemValue: cfg.redeemValue,
      minRedeemPoints: cfg.minRedeemPoints,
      maxRedeemPercent: cfg.maxRedeemPercent,
      pointsExpire: cfg.pointsExpire,
      expiryDays: cfg.expiryDays,
      referrerPoints: cfg.referrerPoints,
      refereePoints: cfg.refereePoints,
    },
    templates: cfg.templates,
  };
}

export async function listTransactions(outletId, { customerId, type, page, limit } = {}) {
  await requireLoyalty(outletId);
  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * take;
  const TYPES = ["EARN", "REDEEM", "WELCOME", "BIRTHDAY", "ANNIVERSARY", "REFERRAL", "BONUS", "ADJUST", "EXPIRE", "REVERSAL", "VOUCHER"];
  const where = {
    outletId,
    ...(customerId ? { customerId } : {}),
    ...(type && TYPES.includes(type) ? { type } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.loyaltyTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        customer: { select: { id: true, name: true, mobile: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    }),
    prisma.loyaltyTransaction.count({ where }),
  ]);
  return { data: rows.map((t) => ({ ...t, amount: t.amount != null ? Number(t.amount) : null })), total };
}

export async function getLoyaltyOverview(outletId) {
  const cfg = await requireLoyalty(outletId);
  const expired = await expireDuePoints(outletId);
  const awarded = await runOccasionRewards(outletId);

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY);
  const soon = new Date(now.getTime() + 30 * DAY);

  const tierCase = cfg.tiersEnabled
    ? Prisma.join(
        cfg.tiers.map((t, i) => {
          const next = cfg.tiers[i + 1];
          return Prisma.sql`COUNT(*) FILTER (WHERE COALESCE(s.spent,0) >= ${t.minSpend} ${next ? Prisma.sql`AND COALESCE(s.spent,0) < ${next.minSpend}` : Prisma.empty})::int AS ${Prisma.raw(`"t${i}"`)}`;
        }),
        ", ",
      )
    : null;

  const [agg, members, issued, redeemed, expiringSoon, topHolders, recent, activeVouchers, campaigns, tierRow] = await Promise.all([
    prisma.customer.aggregate({ where: { outletId }, _sum: { loyaltyPoints: true } }),
    prisma.customer.count({ where: { outletId, OR: [{ loyaltyPoints: { gt: 0 } }, { loyaltyTransactions: { some: {} } }] } }),
    prisma.loyaltyTransaction.aggregate({ where: { outletId, points: { gt: 0 }, type: { not: "REVERSAL" }, createdAt: { gte: since30 } }, _sum: { points: true } }),
    prisma.loyaltyTransaction.aggregate({ where: { outletId, type: { in: ["REDEEM", "VOUCHER"] }, createdAt: { gte: since30 } }, _sum: { points: true, amount: true } }),
    prisma.loyaltyTransaction.aggregate({ where: { outletId, remainingPoints: { gt: 0 }, expiresAt: { gte: now, lte: soon } }, _sum: { remainingPoints: true } }),
    prisma.customer.findMany({
      where: { outletId, loyaltyPoints: { gt: 0 } },
      orderBy: { loyaltyPoints: "desc" },
      take: 8,
      select: { id: true, name: true, mobile: true, loyaltyPoints: true },
    }),
    prisma.loyaltyTransaction.findMany({
      where: { outletId },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { customer: { select: { id: true, name: true } }, order: { select: { orderNumber: true } } },
    }),
    prisma.customerVoucher.count({ where: { outletId, status: "ACTIVE" } }),
    activeCampaigns(outletId),
    tierCase
      ? prisma.$queryRaw`
          WITH s AS (
            SELECT o."customerId" AS cid, SUM(o."grandTotal")::float8 AS spent
            FROM orders o
            WHERE o."outletId" = ${outletId} AND o."customerId" IS NOT NULL
              AND o.status::text NOT IN ('CANCELLED','REFUNDED')
            GROUP BY o."customerId")
          SELECT ${tierCase}
          FROM customers c LEFT JOIN s ON s.cid = c.id
          WHERE c."outletId" = ${outletId}`
      : Promise.resolve(null),
  ]);

  const outstanding = agg._sum.loyaltyPoints || 0;
  const tierCounts = tierRow
    ? cfg.tiers.map((t, i) => ({ ...t, customers: tierRow[0]?.[`t${i}`] || 0 }))
    : [];

  return {
    config: cfg,
    members,
    outstandingPoints: outstanding,
    outstandingValue: pointsToValue(outstanding, cfg),
    issuedLast30Days: issued._sum.points || 0,
    redeemedLast30Days: -(redeemed._sum.points || 0),
    redeemedValueLast30Days: round2(redeemed._sum.amount || 0),
    expiringIn30Days: expiringSoon._sum.remainingPoints || 0,
    activeVouchers,
    activeCampaigns: campaigns.map(shapeCampaign),
    tiers: tierCounts,
    topHolders: topHolders.map((c) => ({ ...c, pointsValue: pointsToValue(c.loyaltyPoints, cfg) })),
    recent: recent.map((t) => ({ ...t, amount: t.amount != null ? Number(t.amount) : null })),
    justExpired: expired,
    justAwarded: awarded,
  };
}

// Adds points/tier to CRM customer rows (list, search, POS lookup).
export async function decorateCustomers(outletId, rows) {
  const { enabled, config } = await getLoyaltySettings(outletId);
  if (!enabled || !rows?.length) return rows;
  for (const r of rows) {
    r.pointsValue = pointsToValue(r.loyaltyPoints || 0, config);
    const t = tierFor(r.totalSpent, config);
    r.tier = t ? { name: t.name, color: t.color } : null;
  }
  return rows;
}

// Spend range for a tier name — used by the customer list's tier filter.
export async function tierRange(outletId, tierName) {
  const { enabled, config } = await getLoyaltySettings(outletId);
  if (!enabled || !config.tiersEnabled) return null;
  const i = config.tiers.findIndex((t) => t.name === tierName);
  if (i < 0) return null;
  return { min: config.tiers[i].minSpend, max: config.tiers[i + 1]?.minSpend ?? null };
}