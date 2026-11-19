// ==============================================
// server/src/platform/platform.bootstrap.js
// Runs once at server start (from server.js):
//   1. creates the first SUPER_ADMIN from PLATFORM_ADMIN_EMAIL /
//      PLATFORM_ADMIN_PASSWORD when no platform admin exists yet
//   2. seeds PlatformPlan from the hardcoded plans, then makes the checkout
//      use the DB plans
//   3. links old signup payments to their organization
//   4. starts the usage tracker, health monitor and the hourly automations
// Every step is wrapped so a missing table (schema not pushed yet) logs a
// clear warning instead of crashing the restaurant app.
// ==============================================

import bcrypt from "bcryptjs";
import prisma from "../../prisma/client.js";
import { syncPlansFromDb } from "../pricing/pricing.plans.js";
import { seedPlansIfEmpty } from "./plans.controller.js";
import { startUsageTracker } from "./usage.tracker.js";
import { startHealthMonitor } from "./health.monitor.js";
import { getAllSettings } from "./platform.settings.js";
import { ensureRenewalFollowUp } from "./followups.controller.js";
import { findOrCreateConversation, postMessage } from "./messages.service.js";
import { recordEvent, getPlanIndex } from "./subscription.js";
import { addDays } from "./platform.utils.js";

const seedSuperAdmin = async () => {
  const count = await prisma.platformAdmin.count();
  if (count > 0) return null;
  const email = (process.env.PLATFORM_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD || "";
  if (!email || !password) {
    console.warn(
      "[platform] No platform admin exists. Set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD " +
        "and restart, or run `npm run platform:admin -- email password`.",
    );
    return null;
  }
  const admin = await prisma.platformAdmin.create({
    data: {
      name: process.env.PLATFORM_ADMIN_NAME || "Super Admin",
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "SUPER_ADMIN",
    },
  });
  console.log(`[platform] Created super admin ${email} — sign in at /platform/login`);
  return admin;
};

export const linkSignupPayments = () =>
  prisma.$executeRawUnsafe(`
    UPDATE "pricing_payments" p
       SET "organizationId" = o."organizationId"
      FROM "owners" o
     WHERE o."pricingPaymentId" = p."id"
       AND p."organizationId" IS NULL
  `);

const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Hourly housekeeping driven by Settings -> Subscriptions / Health:
 *  - renewal follow-ups for plans about to expire
 *  - in-app expiry reminders on the configured days (7/3/1 by default)
 *  - auto-suspend after the grace period (if enabled)
 *  - prune old snapshots / webhook logs / usage beyond retention
 */
export const runAutomations = async () => {
  const settings = await getAllSettings({ fresh: true });
  const sub = settings.subscriptions;
  const now = new Date();
  const result = { followUps: 0, reminders: 0, suspended: 0, pruned: 0 };
  const planIndex = await getPlanIndex();

  if (sub.autoCreateRenewalFollowUps) {
    const lead = Math.max(1, Number(sub.renewalFollowUpLeadDays) || 7);
    const expiring = await prisma.organization.findMany({
      where: { isActive: true, planExpiresAt: { gte: now, lte: addDays(now, lead) } },
      select: { id: true, name: true, planId: true, planExpiresAt: true },
    });
    for (const org of expiring) {
      const due = addDays(org.planExpiresAt, -Math.min(3, lead));
      const fu = await ensureRenewalFollowUp(
        org,
        due < now ? now : due,
        `${planIndex[org.planId]?.name || org.planId} expires on ${fmt(org.planExpiresAt)}.`,
      );
      if (fu) result.followUps += 1;
    }
  }

  if (sub.sendExpiryReminderMessages) {
    const days = (sub.expiryReminderDays || []).map(Number).filter((n) => n > 0);
    for (const d of days) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      const dayEnd = addDays(dayStart, 1);
      const orgs = await prisma.organization.findMany({
        where: { isActive: true, planExpiresAt: { gte: dayStart, lt: dayEnd } },
        select: { id: true, name: true, planId: true, planExpiresAt: true },
      });
      for (const org of orgs) {
        const already = await prisma.platformSubscriptionEvent.count({
          where: { organizationId: org.id, type: "REMINDER_SENT", note: `auto:${d}d`, createdAt: { gte: addDays(now, -2) } },
        });
        if (already) continue;
        const convo = await findOrCreateConversation({ organizationId: org.id, category: "renewal", subject: "Subscription renewal" });
        await postMessage({
          conversationId: convo.id,
          senderType: "SYSTEM",
          senderName: "Billing",
          body: `Reminder: your ${planIndex[org.planId]?.name || "current"} plan expires on ${fmt(org.planExpiresAt)} (${d} day${d === 1 ? "" : "s"} left). Reply here to renew or if you need any help.`,
        });
        await recordEvent({ organizationId: org.id, type: "REMINDER_SENT", note: `auto:${d}d` });
        result.reminders += 1;
      }
    }
  }

  if (sub.autoSuspendExpired) {
    const cutoff = addDays(now, -(Number(sub.gracePeriodDays) || 0));
    const toSuspend = await prisma.organization.findMany({
      where: { isActive: true, planExpiresAt: { lt: cutoff } },
      select: { id: true },
    });
    for (const org of toSuspend) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { isActive: false, suspendedAt: now, suspendedReason: "Plan expired (auto-suspended after grace period)" },
      });
      await recordEvent({ organizationId: org.id, type: "SUSPENDED", note: "auto: plan expired" });
      result.suspended += 1;
    }
  }

  const retention = addDays(now, -Math.max(1, Number(settings.health.retentionDays) || 30));
  const [a, b, c] = await Promise.all([
    prisma.platformHealthSnapshot.deleteMany({ where: { createdAt: { lt: retention } } }),
    prisma.platformWebhookLog.deleteMany({ where: { createdAt: { lt: addDays(now, -180) } } }),
    prisma.platformErrorLog.deleteMany({ where: { resolved: true, createdAt: { lt: retention } } }),
  ]);
  result.pruned = a.count + b.count + c.count;

  await linkSignupPayments().catch(() => 0);
  return result;
};

export const bootstrapPlatform = async () => {
  try {
    await seedSuperAdmin();
    const seeded = await seedPlansIfEmpty();
    if (seeded) console.log(`[platform] Seeded ${seeded} plans from pricing.plans.js`);
    const codes = await syncPlansFromDb(prisma);
    console.log(`[platform] Checkout plans: ${codes.join(", ")}`);
    await linkSignupPayments();
  } catch (err) {
    console.error(
      "[platform] bootstrap failed — has the schema been pushed? (npx prisma db push)\n ",
      err.message,
    );
    return;
  }

  startUsageTracker();
  startHealthMonitor();

  const tick = () =>
    runAutomations()
      .then((r) => {
        if (r.followUps || r.reminders || r.suspended) console.log("[platform] automations:", r);
      })
      .catch((err) => console.error("[platform] automations failed:", err.message));
  setTimeout(tick, 30 * 1000).unref?.();
  setInterval(tick, 60 * 60 * 1000).unref?.();
};
