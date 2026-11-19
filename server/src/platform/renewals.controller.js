// ==============================================
// server/src/platform/renewals.controller.js
// /api/platform/renewals — who is expiring, who has lapsed, and the tools
// to renew, upgrade, extend trials and chase payment.
// ==============================================

import prisma from "../../prisma/client.js";
import { priceQuote, PLANS } from "../pricing/pricing.plans.js";
import { loadOrgRows } from "./orgs.data.js";
import { recordEvent, getPlanIndex } from "./subscription.js";
import { findOrCreateConversation, postMessage } from "./messages.service.js";
import { sendMail, escMultiline } from "../config/mailer.js";
import { getAllSettings } from "./platform.settings.js";
import { audit } from "./platform.audit.js";
import {
  handler,
  ok,
  str,
  optStr,
  int,
  bool,
  date,
  notFound,
  badRequest,
  addDays,
  addMonths,
  paging,
} from "./platform.utils.js";

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const list = handler(async (req, res) => {
  const windowDays = Math.min(365, Math.max(1, int(req.query.window, 30)));
  const { rows, planIndex } = await loadOrgRows();
  const now = new Date();
  const horizon = addDays(now, windowDays);

  const buckets = {
    expiring: rows.filter((r) => r.isActive && r.planExpiresAt && new Date(r.planExpiresAt) >= now && new Date(r.planExpiresAt) <= horizon && !r.isTrial),
    trialsEnding: rows.filter((r) => r.isActive && r.isTrial && r.planExpiresAt && new Date(r.planExpiresAt) >= now && new Date(r.planExpiresAt) <= horizon),
    expired: rows.filter((r) => r.status === "EXPIRED" || r.status === "TRIAL_EXPIRED"),
    suspended: rows.filter((r) => r.status === "SUSPENDED"),
  };

  const view = String(req.query.view || "expiring");
  let selected = buckets[view] || [...buckets.expiring, ...buckets.trialsEnding];
  if (req.query.q) {
    const q = String(req.query.q).toLowerCase();
    selected = selected.filter((r) => [r.name, r.ownerEmail, r.owner?.fullName].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }
  selected.sort((a, b) =>
    view === "expired" || view === "suspended"
      ? new Date(b.planExpiresAt || 0) - new Date(a.planExpiresAt || 0)
      : new Date(a.planExpiresAt || 0) - new Date(b.planExpiresAt || 0),
  );
  const { page, pageSize, skip, take } = paging(req.query, { defaultSize: 50 });

  const expectedRevenue = buckets.expiring.reduce((sum, r) => {
    const plan = planIndex[r.planId];
    return sum + (plan && !plan.isTrial ? plan.price * Math.max(1, r.branchLimit) * Math.max(1, plan.months || 1) : 0);
  }, 0);

  const [recentEvents, renewedThisMonth] = await Promise.all([
    prisma.platformSubscriptionEvent.findMany({
      where: { type: { in: ["RENEWED", "UPGRADED", "DOWNGRADED", "TRIAL_EXTENDED", "EXPIRY_CHANGED", "REMINDER_SENT"] } },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { organization: { select: { id: true, name: true } } },
    }),
    prisma.platformSubscriptionEvent.count({
      where: { type: { in: ["RENEWED", "UPGRADED", "DOWNGRADED"] }, createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
    }),
  ]);

  return ok(res, {
    rows: selected.slice(skip, skip + take),
    total: selected.length,
    page,
    pageSize,
    counts: {
      expiring: buckets.expiring.length,
      trialsEnding: buckets.trialsEnding.length,
      expired: buckets.expired.length,
      suspended: buckets.suspended.length,
    },
    expectedRevenue,
    renewedThisMonth,
    recentEvents,
    plans: Object.values(planIndex).filter((p) => p.isActive !== false),
    checkoutPlans: Object.keys(PLANS),
  });
});

export const quote = handler(async (req, res) => {
  const planId = String(req.query.planId || "");
  const branches = int(req.query.branches, 1);
  try {
    return ok(res, { quote: priceQuote({ planId, tierKey: "standard", branches }) });
  } catch (err) {
    throw badRequest(err.message);
  }
});

/**
 * POST /renewals/:orgId/renew
 * { planId, branches, startFrom: "expiry"|"today", months?, amount?, recordPayment, paymentMethod, reference, note, notify, reactivate }
 */
export const renew = handler(async (req, res) => {
  const orgId = req.params.orgId;
  const b = req.body || {};
  const org = await prisma.organization.findUnique({ where: { id: orgId }, include: { owner: true } });
  if (!org) throw notFound("Restaurant not found.");

  const planIndex = await getPlanIndex();
  const planId = str(b.planId, 40) || org.planId;
  const plan = planIndex[planId];
  if (!plan) throw badRequest(`Unknown plan "${planId}".`);
  if (plan.isActive === false) throw badRequest(`Plan "${plan.name}" is deactivated.`);

  let quoteData;
  try {
    quoteData = priceQuote({ planId, tierKey: "standard", branches: int(b.branches, org.branchLimit || 1) });
  } catch (err) {
    throw badRequest(err.message);
  }

  const now = new Date();
  const base =
    b.startFrom === "today" || !org.planExpiresAt || new Date(org.planExpiresAt) < now ? now : new Date(org.planExpiresAt);
  const periods = Math.max(1, int(b.periods, 1));
  const newExpiry = quoteData.isFree
    ? addDays(base, (quoteData.trialDays || 30) * periods)
    : addMonths(base, (quoteData.months || 1) * periods);

  const expectedAmount = quoteData.total * periods;
  const amount = b.amount === undefined || b.amount === "" ? expectedAmount : Math.max(0, int(b.amount, expectedAmount));

  const prevPlan = planIndex[org.planId];
  const type =
    org.planId === planId
      ? "RENEWED"
      : (plan.price || 0) >= (prevPlan?.price || 0)
        ? "UPGRADED"
        : "DOWNGRADED";

  let payment = null;
  if (bool(b.recordPayment, !quoteData.isFree) && amount > 0) {
    const subtotal = Math.round(amount / (1 + (plan.gstRate ?? 0.18)));
    payment = await prisma.pricingPayment.create({
      data: {
        planId,
        tierKey: quoteData.tierKey,
        tierLabel: quoteData.tierLabel,
        billingCycle: quoteData.cycle,
        branches: quoteData.branches,
        unitAmount: quoteData.unit,
        subtotal,
        gst: amount - subtotal,
        amount,
        restaurantName: org.name,
        contactName: org.owner?.fullName || null,
        email: org.ownerEmail,
        phone: org.owner?.phone || null,
        address: org.owner?.address || null,
        notes: optStr(b.note, 1000),
        status: "PAID",
        organizationId: org.id,
        source: "renewal",
        paymentMethod: optStr(b.paymentMethod, 40) || "manual",
        reference: optStr(b.reference, 120),
        recordedById: req.platformAdmin.id,
      },
    });
  }

  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: {
      planId,
      branchLimit: quoteData.branches,
      planExpiresAt: newExpiry,
      ...(bool(b.reactivate, true) && !org.isActive ? { isActive: true, suspendedAt: null, suspendedReason: null } : {}),
    },
  });

  await recordEvent({
    organizationId: org.id,
    type,
    fromPlanId: org.planId,
    toPlanId: planId,
    fromExpiry: org.planExpiresAt,
    toExpiry: newExpiry,
    fromBranches: org.branchLimit,
    toBranches: quoteData.branches,
    amount: payment ? amount : null,
    paymentId: payment?.id || null,
    note: optStr(b.note, 1000),
    performedById: req.platformAdmin.id,
  });

  // Close out any open renewal follow-ups for this restaurant.
  await prisma.platformFollowUp.updateMany({
    where: { organizationId: org.id, type: "RENEWAL", status: { in: ["PENDING", "IN_PROGRESS"] } },
    data: { status: "DONE", completedAt: new Date(), outcome: `${type.toLowerCase()} to ${plan.name} until ${fmt(newExpiry)}` },
  });

  if (bool(b.notify, true)) {
    const convo = await findOrCreateConversation({
      organizationId: org.id,
      category: "renewal",
      subject: "Your subscription",
      assignedToId: req.platformAdmin.id,
    });
    await postMessage({
      conversationId: convo.id,
      senderType: "SYSTEM",
      senderName: "Billing",
      body: `Your subscription has been ${type === "RENEWED" ? "renewed" : type.toLowerCase()} — plan: ${plan.name}, branches: ${quoteData.branches}, valid until ${fmt(newExpiry)}.${payment ? ` Payment of ₹${amount.toLocaleString("en-IN")} recorded.` : ""} Thank you!`,
    });
  }

  audit(req, `SUBSCRIPTION_${type}`, {
    entityType: "Organization",
    entityId: org.id,
    metadata: { planId, newExpiry, amount: payment ? amount : 0 },
  });
  return ok(res, { restaurant: updated, payment, expectedAmount });
});

/** POST /renewals/:orgId/extend { days, note } — trial extension / goodwill days. */
export const extend = handler(async (req, res) => {
  const org = await prisma.organization.findUnique({ where: { id: req.params.orgId } });
  if (!org) throw notFound("Restaurant not found.");
  const days = int(req.body?.days, 0);
  if (!days || Math.abs(days) > 3650) throw badRequest("Enter a number of days (e.g. 7).");
  const now = new Date();
  const base = !org.planExpiresAt || new Date(org.planExpiresAt) < now ? now : new Date(org.planExpiresAt);
  const toExpiry = addDays(base, days);
  const planIndex = await getPlanIndex();
  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: { planExpiresAt: toExpiry, ...(org.isActive ? {} : { isActive: true, suspendedAt: null, suspendedReason: null }) },
  });
  const type = planIndex[org.planId]?.isTrial ? "TRIAL_EXTENDED" : "EXPIRY_CHANGED";
  await recordEvent({
    organizationId: org.id,
    type,
    fromPlanId: org.planId,
    toPlanId: org.planId,
    fromExpiry: org.planExpiresAt,
    toExpiry,
    note: optStr(req.body?.note, 1000) || `${days > 0 ? "+" : ""}${days} days`,
    performedById: req.platformAdmin.id,
  });
  audit(req, type, { entityType: "Organization", entityId: org.id, metadata: { days, toExpiry } });
  return ok(res, { restaurant: updated });
});

/** POST /renewals/:orgId/expiry { date, note } — set an exact expiry date. */
export const setExpiry = handler(async (req, res) => {
  const org = await prisma.organization.findUnique({ where: { id: req.params.orgId } });
  if (!org) throw notFound("Restaurant not found.");
  const toExpiry = date(req.body?.date);
  if (!toExpiry) throw badRequest("Pick a valid date.");
  const updated = await prisma.organization.update({ where: { id: org.id }, data: { planExpiresAt: toExpiry } });
  await recordEvent({
    organizationId: org.id,
    type: "EXPIRY_CHANGED",
    fromPlanId: org.planId,
    toPlanId: org.planId,
    fromExpiry: org.planExpiresAt,
    toExpiry,
    note: optStr(req.body?.note, 1000),
    performedById: req.platformAdmin.id,
  });
  audit(req, "EXPIRY_CHANGED", { entityType: "Organization", entityId: org.id, metadata: { toExpiry } });
  return ok(res, { restaurant: updated });
});

/** POST /renewals/:orgId/remind { message?, channels: ["message","email"] } */
export const remind = handler(async (req, res) => {
  const org = await prisma.organization.findUnique({ where: { id: req.params.orgId }, include: { owner: true } });
  if (!org) throw notFound("Restaurant not found.");
  const settings = await getAllSettings();
  const planIndex = await getPlanIndex();
  const planName = planIndex[org.planId]?.name || org.planId || "your plan";
  const expired = org.planExpiresAt && new Date(org.planExpiresAt) < new Date();
  const body =
    str(req.body?.message, 5000) ||
    `Hi ${org.owner?.fullName || org.name}, your ${planName} subscription ${expired ? "expired" : "expires"} on ${fmt(org.planExpiresAt)}. ` +
      `Renew now to keep billing, KOT and reports running without interruption. Reply here if you have any questions — we're happy to help.`;
  const channels = Array.isArray(req.body?.channels) && req.body.channels.length ? req.body.channels : ["message", "email"];

  const result = { message: false, email: false };
  if (channels.includes("message")) {
    const convo = await findOrCreateConversation({
      organizationId: org.id,
      category: "renewal",
      subject: "Subscription renewal",
      assignedToId: req.platformAdmin.id,
    });
    await postMessage({ conversationId: convo.id, senderType: "ADMIN", body, admin: req.platformAdmin, notify: false });
    result.message = true;
    result.conversationId = convo.id;
  }
  if (channels.includes("email") && org.ownerEmail) {
    const sent = await sendMail({
      to: org.ownerEmail,
      subject: `${settings.general.platformName}: subscription ${expired ? "expired" : "renewal reminder"}`,
      text: `${body}\n\n${settings.messaging.signature || ""}`,
      html: `<p>${escMultiline(body)}</p><p style="color:#666">${escMultiline(settings.messaging.signature || "")}</p>`,
    });
    result.email = !sent.skipped;
    result.emailSkipped = Boolean(sent.skipped);
  }
  await recordEvent({ organizationId: org.id, type: "REMINDER_SENT", note: channels.join(", "), performedById: req.platformAdmin.id });
  audit(req, "RENEWAL_REMINDER_SENT", { entityType: "Organization", entityId: org.id, metadata: result });
  return ok(res, result);
});

export const events = handler(async (req, res) => {
  const { page, pageSize, skip, take } = paging(req.query, { defaultSize: 50 });
  const where = {};
  if (req.query.type) where.type = String(req.query.type);
  if (req.query.organizationId) where.organizationId = String(req.query.organizationId);
  const [items, total] = await Promise.all([
    prisma.platformSubscriptionEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { organization: { select: { id: true, name: true } } },
    }),
    prisma.platformSubscriptionEvent.count({ where }),
  ]);
  return ok(res, { events: items, total, page, pageSize });
});
