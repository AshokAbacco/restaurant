// ==============================================
// server/src/platform/webhooks.controller.js
// Logs every inbound webhook (currently Razorpay) and exposes them at
// /api/platform/webhooks. withWebhookLog() wraps the existing handler in
// index.js without touching its logic.
// ==============================================

import prisma from "../../prisma/client.js";
import { notifyTeam } from "./notify.js";
import { handler, ok, paging, notFound, date, endOfDay, addDays, clientIp, str } from "./platform.utils.js";

const SAFE_HEADERS = [
  "content-type",
  "user-agent",
  "x-razorpay-event-id",
  "x-forwarded-for",
  "request-id",
];

export const withWebhookLog = (provider, inner) => async (req, res, next) => {
  const started = Date.now();
  let responseBody = null;
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    let payload = null;
    let event = null;
    const raw = Buffer.isBuffer(req.body) ? req.body : null;
    try {
      payload = raw ? JSON.parse(raw.toString("utf8")) : req.body ?? null;
      event = payload?.event || null;
    } catch {
      payload = raw ? { _unparsed: raw.toString("utf8").slice(0, 5000) } : null;
    }
    const headers = Object.fromEntries(SAFE_HEADERS.filter((h) => req.headers[h]).map((h) => [h, req.headers[h]]));
    headers["x-razorpay-signature"] = req.headers["x-razorpay-signature"] ? "present" : "missing";

    const message = responseBody?.message || null;
    const signatureValid = /signature/i.test(message || "") ? false : res.statusCode < 400 ? true : null;

    prisma.platformWebhookLog
      .create({
        data: {
          provider,
          event,
          path: req.originalUrl,
          headers,
          payload: payload ?? undefined,
          rawSize: raw ? raw.length : null,
          statusCode: res.statusCode,
          success: res.statusCode < 400,
          signatureValid,
          error: res.statusCode >= 400 ? message || `HTTP ${res.statusCode}` : null,
          durationMs: Date.now() - started,
          ip: clientIp(req),
        },
      })
      .catch((err) => console.error("[platform] webhook log failed:", err.message));
    if (res.statusCode >= 400) {
      notifyTeam("onWebhookFailure", `Webhook failed: ${provider} ${event || ""}`, `HTTP ${res.statusCode} — ${message || "no message"}`, { throttleMs: 10 * 60 * 1000 });
    }
  });

  return inner(req, res, next);
};

const buildWhere = (q) => {
  const where = {};
  if (q.provider) where.provider = String(q.provider);
  if (q.success === "true") where.success = true;
  if (q.success === "false") where.success = false;
  if (q.event) where.event = String(q.event);
  const from = date(q.from);
  const to = date(q.to);
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: endOfDay(to) } : {}) };
  const search = str(q.q, 100);
  if (search) where.OR = [{ error: { contains: search, mode: "insensitive" } }, { event: { contains: search, mode: "insensitive" } }];
  return where;
};

export const list = handler(async (req, res) => {
  const where = buildWhere(req.query);
  const { page, pageSize, skip, take } = paging(req.query, { defaultSize: 50 });
  const day = addDays(new Date(), -1);
  const week = addDays(new Date(), -7);
  const [items, total, last24, failed24, week7, weekOk, byEvent, lastReceived] = await Promise.all([
    prisma.platformWebhookLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: { id: true, provider: true, event: true, path: true, statusCode: true, success: true, signatureValid: true, error: true, durationMs: true, createdAt: true, ip: true },
    }),
    prisma.platformWebhookLog.count({ where }),
    prisma.platformWebhookLog.count({ where: { createdAt: { gte: day } } }),
    prisma.platformWebhookLog.count({ where: { createdAt: { gte: day }, success: false } }),
    prisma.platformWebhookLog.count({ where: { createdAt: { gte: week } } }),
    prisma.platformWebhookLog.count({ where: { createdAt: { gte: week }, success: true } }),
    prisma.platformWebhookLog.groupBy({ by: ["event"], _count: { _all: true }, where: { createdAt: { gte: addDays(new Date(), -30) } } }),
    prisma.platformWebhookLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  return ok(res, {
    items,
    total,
    page,
    pageSize,
    stats: {
      last24h: last24,
      failed24h: failed24,
      successRate7d: week7 ? Math.round((weekOk / week7) * 1000) / 10 : null,
      byEvent: byEvent.map((e) => ({ event: e.event || "(none)", count: e._count._all })).sort((a, b) => b.count - a.count),
      lastReceivedAt: lastReceived?.createdAt || null,
      endpoint: "/api/pricing/webhook",
      secretConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
    },
  });
});

export const get = handler(async (req, res) => {
  const item = await prisma.platformWebhookLog.findUnique({ where: { id: req.params.id } });
  if (!item) throw notFound("Webhook not found.");
  return ok(res, { item });
});
