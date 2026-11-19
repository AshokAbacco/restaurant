// ==============================================
// server/src/platform/health.controller.js
// /api/platform/health — server, database and business-process health,
// plus a computed list of pending issues that need someone's attention.
// ==============================================

import os from "os";
import prisma from "../../prisma/client.js";
import { mailerConfigured } from "../config/mailer.js";
import { liveMetrics, pingDb, cpuLoadPct, startedAt } from "./health.monitor.js";
import { getAllSettings } from "./platform.settings.js";
import { audit } from "./platform.audit.js";
import { handler, ok, int, paging, addDays, bool, startOfDay } from "./platform.utils.js";

const RANGES = { "6h": 6 / 24, "24h": 1, "7d": 7, "30d": 30 };

const computeIssues = async ({ settings, db, live }) => {
  const now = new Date();
  const issues = [];
  const push = (severity, title, detail, count, link) => issues.push({ severity, title, detail, count, link });

  const [
    unresolvedErrors,
    failedWebhooks,
    stuckPayments,
    failedPayments,
    staleConversations,
    overdueFollowUps,
    staleEnquiries,
    expiredActive,
  ] = await Promise.all([
    prisma.platformErrorLog.count({ where: { resolved: false } }),
    prisma.platformWebhookLog.count({ where: { success: false, createdAt: { gte: addDays(now, -1) } } }),
    prisma.pricingPayment.count({ where: { status: "CREATED", createdAt: { lt: new Date(now.getTime() - 3600000), gte: addDays(now, -7) } } }),
    prisma.pricingPayment.count({ where: { status: { in: ["FAILED", "VERIFICATION_FAILED"] }, createdAt: { gte: addDays(now, -7) } } }),
    prisma.platformConversation.count({ where: { status: "OPEN", unreadForAdmin: { gt: 0 }, lastMessageAt: { lt: addDays(now, -1) } } }),
    prisma.platformFollowUp.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueAt: { lt: startOfDay() } } }),
    prisma.contactSubmission.count({ where: { status: "NEW", createdAt: { lt: addDays(new Date(), -2) } } }),
    prisma.organization.count({ where: { isActive: true, planExpiresAt: { lt: addDays(new Date(), -(Number(settings.subscriptions.gracePeriodDays) || 0)) } } }),
  ]);

  if (!db.ok) push("critical", "Database unreachable", db.error || "The database did not answer a ping.", 1, "/platform/health");
  else if (db.ms > settings.health.dbLatencyWarnMs)
    push("warning", "Slow database", `Ping took ${db.ms} ms (threshold ${settings.health.dbLatencyWarnMs} ms).`, 1, "/platform/health");
  if (live.summary.errorRatePct > settings.health.errorRateWarnPct)
    push("critical", "High server error rate", `${live.summary.errorRatePct}% of requests in the last hour returned 5xx.`, live.summary.errors5xx, "/platform/health");
  if (live.summary.p95Ms > settings.health.slowResponseMs)
    push("warning", "Slow API responses", `p95 response time is ${live.summary.p95Ms} ms (threshold ${settings.health.slowResponseMs} ms).`, 1, "/platform/health");
  if (unresolvedErrors) push("warning", "Unresolved server errors", "Server errors waiting to be reviewed.", unresolvedErrors, "/platform/health#errors");
  if (failedWebhooks) push("critical", "Failed webhooks (24h)", "Payment webhooks were rejected or errored.", failedWebhooks, "/platform/webhooks?success=false");
  if (failedPayments) push("warning", "Failed payments (7d)", "Checkouts that failed or didn't verify.", failedPayments, "/platform/payments?status=FAILED");
  if (stuckPayments) push("info", "Abandoned checkouts", "Orders created over an hour ago and never paid.", stuckPayments, "/platform/payments?status=CREATED");
  if (staleConversations) push("warning", "Unanswered messages > 24h", "Restaurants waiting on a reply.", staleConversations, "/platform/messages?unread=true");
  if (overdueFollowUps) push("warning", "Overdue follow-ups", "Follow-ups past their due date.", overdueFollowUps, "/platform/follow-ups?tab=overdue");
  if (staleEnquiries) push("info", "Untouched enquiries > 48h", "Website enquiries still marked NEW.", staleEnquiries, "/platform/enquiries?status=NEW");
  if (expiredActive && !settings.subscriptions.autoSuspendExpired)
    push("info", "Expired but still active", "Restaurants past expiry + grace period that still have access.", expiredActive, "/platform/renewals?view=expired");
  if (!mailerConfigured) push("warning", "Email not configured", "SMTP_USER / SMTP_PASS are missing — emails are only logged.", 1, "/platform/settings");
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) push("warning", "Webhook secret missing", "RAZORPAY_WEBHOOK_SECRET is not set; webhooks will be rejected.", 1, "/platform/webhooks");
  if (!process.env.PLATFORM_JWT_SECRET) push("info", "Platform JWT secret not set", "Set PLATFORM_JWT_SECRET to sign platform sessions with their own key.", 1, "/platform/settings");

  const order = { critical: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => order[a.severity] - order[b.severity]);
};

export const overview = handler(async (req, res) => {
  const range = RANGES[req.query.range] ? req.query.range : "24h";
  const since = new Date(Date.now() - RANGES[range] * 86400000);
  const settings = await getAllSettings();
  const [db, snapshots, recentErrors, dbSize, counts] = await Promise.all([
    pingDb(),
    prisma.platformHealthSnapshot.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "asc" } }),
    prisma.platformErrorLog.findMany({ where: { resolved: false }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.$queryRawUnsafe("SELECT pg_database_size(current_database())::bigint AS size").catch(() => null),
    Promise.all([
      prisma.organization.count(),
      prisma.outlet.count(),
      prisma.userAccount.count(),
      prisma.order.count(),
    ]).catch(() => [null, null, null, null]),
  ]);
  const live = liveMetrics(60);
  const issues = await computeIssues({ settings, db, live });
  const mem = process.memoryUsage();

  const overall = issues.some((i) => i.severity === "critical") ? "down" : issues.some((i) => i.severity === "warning") ? "degraded" : "healthy";

  return ok(res, {
    status: overall,
    checkedAt: new Date(),
    server: {
      uptimeSec: Math.round(process.uptime()),
      startedAt,
      node: process.version,
      platform: `${os.type()} ${os.release()}`,
      env: process.env.NODE_ENV || "development",
      cpuCount: os.cpus().length,
      cpuLoadPct: cpuLoadPct(),
      loadAvg: os.loadavg().map((n) => Math.round(n * 100) / 100),
      memory: {
        rssMb: Math.round(mem.rss / 1048576),
        heapUsedMb: Math.round(mem.heapUsed / 1048576),
        heapTotalMb: Math.round(mem.heapTotal / 1048576),
        systemFreeMb: Math.round(os.freemem() / 1048576),
        systemTotalMb: Math.round(os.totalmem() / 1048576),
      },
    },
    database: {
      ok: db.ok,
      latencyMs: db.ms,
      error: db.error || null,
      sizeMb: dbSize?.[0]?.size ? Math.round(Number(dbSize[0].size) / 1048576) : null,
      rows: { organizations: counts[0], outlets: counts[1], users: counts[2], orders: counts[3] },
    },
    services: {
      email: mailerConfigured,
      razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      webhookSecret: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
      storage: Boolean(process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || process.env.R2_ACCOUNT_ID),
    },
    live,
    history: snapshots.map((s) => ({
      t: s.createdAt,
      requests: s.requests,
      errors: s.errors5xx,
      avgMs: s.avgResponseMs,
      p95Ms: s.p95ResponseMs,
      dbMs: s.dbLatencyMs,
      memoryMb: s.memoryMb,
      cpu: s.cpuLoad,
    })),
    range,
    thresholds: settings.health,
    issues,
    recentErrors,
  });
});

export const errors = handler(async (req, res) => {
  const { page, pageSize, skip, take } = paging(req.query, { defaultSize: 50 });
  const where = {};
  if (req.query.resolved !== undefined) where.resolved = bool(req.query.resolved);
  const [items, total] = await Promise.all([
    prisma.platformErrorLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.platformErrorLog.count({ where }),
  ]);
  return ok(res, { items, total, page, pageSize });
});

export const resolveError = handler(async (req, res) => {
  const item = await prisma.platformErrorLog.update({
    where: { id: req.params.id },
    data: { resolved: true, resolvedAt: new Date(), resolvedById: req.platformAdmin.id },
  });
  return ok(res, { item });
});

export const resolveAll = handler(async (req, res) => {
  const r = await prisma.platformErrorLog.updateMany({
    where: { resolved: false },
    data: { resolved: true, resolvedAt: new Date(), resolvedById: req.platformAdmin.id },
  });
  audit(req, "ERRORS_RESOLVED", { metadata: { count: r.count } });
  return ok(res, { resolved: r.count });
});

export const ping = handler(async (req, res) => ok(res, { db: await pingDb(), at: new Date(), uptimeSec: int(process.uptime()) }));
