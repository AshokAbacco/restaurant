// ==============================================
// server/src/platform/health.monitor.js
// In-process observability for the Health page:
//   - requestMetrics(): global middleware timing every API request
//   - a DB ping every minute (latency + up/down)
//   - a PlatformHealthSnapshot row every few minutes (graphs survive restarts)
//   - logServerError(): persists 5xx errors to PlatformErrorLog
// Everything here is best-effort: a failure to record a metric is logged
// and swallowed, never surfaced to the request being measured.
// ==============================================

import os from "os";
import prisma from "../../prisma/client.js";
import { getSettings } from "./platform.settings.js";
import { notifyTeam } from "./notify.js";

const MAX_SAMPLES = 20000;
const samples = []; // { t, ms, status, method, route }
const dbPings = []; // { t, ms, ok, error }
let windowStats = { requests: 0, e5: 0, e4: 0, durations: [] };
let lastSnapshotAt = Date.now();
export const startedAt = new Date();

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
export const normalizeRoute = (url) =>
  String(url || "")
    .split("?")[0]
    .replace(UUID_RE, ":id")
    .replace(/\/\d+(?=\/|$)/g, "/:n");

export const percentile = (arr, p) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

export const requestMetrics = (req, res, next) => {
  if (!req.path.startsWith("/api/") || req.path.startsWith("/api/platform/health")) return next();
  const start = process.hrtime.bigint();
  let body = null;
  const originalJson = res.json.bind(res);
  res.json = (b) => {
    body = b;
    return originalJson(b);
  };
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const status = res.statusCode;
    samples.push({ t: Date.now(), ms, status, method: req.method, route: normalizeRoute(req.originalUrl) });
    if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
    windowStats.requests += 1;
    windowStats.durations.push(ms);
    if (status >= 500) windowStats.e5 += 1;
    else if (status >= 400) windowStats.e4 += 1;

    // 5xx answered by a controller's own try/catch never reaches the
    // global error handler — record those too.
    if (status >= 500 && !req._platformErrorLogged) {
      logServerError(new Error(body?.message || `HTTP ${status}`), req, status);
    }
  });
  return next();
};

export const logServerError = (err, req, status = 500) => {
  if (req) req._platformErrorLogged = true;
  prisma.platformErrorLog
    .create({
      data: {
        method: req?.method || "-",
        path: (req?.originalUrl || "-").slice(0, 500),
        statusCode: status,
        message: String(err?.message || err || "Unknown error").slice(0, 2000),
        stack: err?.stack ? String(err.stack).slice(0, 8000) : null,
        organizationId: req?.user?.organizationId || null,
        userId: req?.user?.id || req?.platformAdmin?.id || null,
      },
    })
    .catch((e) => console.error("[platform] error log write failed:", e.message));
  notifyTeam("onServerError", `Server error on ${req?.method || ""} ${req?.originalUrl || ""}`, String(err?.stack || err?.message || err), {
    throttleMs: 10 * 60 * 1000,
  });
};

export const pingDb = async () => {
  const t = Date.now();
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    const ms = Date.now() - t;
    dbPings.push({ t, ms, ok: true });
    if (dbPings.length > 720) dbPings.shift();
    return { ok: true, ms };
  } catch (err) {
    dbPings.push({ t, ms: Date.now() - t, ok: false, error: err.message });
    if (dbPings.length > 720) dbPings.shift();
    return { ok: false, ms: Date.now() - t, error: err.message };
  }
};

export const cpuLoadPct = () => {
  const load = os.loadavg()[0];
  return Math.round((load / Math.max(1, os.cpus().length)) * 1000) / 10;
};

const writeSnapshot = async () => {
  const w = windowStats;
  windowStats = { requests: 0, e5: 0, e4: 0, durations: [] };
  lastSnapshotAt = Date.now();
  const lastPing = dbPings[dbPings.length - 1];
  const avg = w.durations.length ? w.durations.reduce((a, b) => a + b, 0) / w.durations.length : 0;
  await prisma.platformHealthSnapshot.create({
    data: {
      requests: w.requests,
      errors5xx: w.e5,
      errors4xx: w.e4,
      avgResponseMs: Math.round(avg),
      p95ResponseMs: Math.round(percentile(w.durations, 95)),
      maxResponseMs: Math.round(w.durations.length ? Math.max(...w.durations) : 0),
      dbLatencyMs: lastPing ? Math.round(lastPing.ms) : null,
      dbOk: lastPing ? lastPing.ok : true,
      memoryMb: Math.round(process.memoryUsage().rss / 1048576),
      cpuLoad: cpuLoadPct(),
    },
  });
};

export const startHealthMonitor = () => {
  pingDb();
  const pingTimer = setInterval(pingDb, 60 * 1000);
  pingTimer.unref?.();

  const snapTimer = setInterval(async () => {
    try {
      const { snapshotIntervalMin } = await getSettings("health");
      const every = Math.max(1, Number(snapshotIntervalMin) || 5) * 60 * 1000;
      if (Date.now() - lastSnapshotAt >= every) await writeSnapshot();
    } catch (err) {
      console.error("[platform] health snapshot failed:", err.message);
    }
  }, 60 * 1000);
  snapTimer.unref?.();

  process.on("unhandledRejection", (reason) => {
    logServerError(reason instanceof Error ? reason : new Error(String(reason)), null, 500);
  });
};

/** Live view from memory: last `minutes` of traffic, bucketed per minute. */
export const liveMetrics = (minutes = 60) => {
  const since = Date.now() - minutes * 60000;
  const recent = samples.filter((s) => s.t >= since);
  const buckets = new Map();
  for (let i = minutes - 1; i >= 0; i -= 1) {
    const key = Math.floor((Date.now() - i * 60000) / 60000);
    buckets.set(key, { t: key * 60000, requests: 0, errors: 0, durations: [] });
  }
  for (const s of recent) {
    const b = buckets.get(Math.floor(s.t / 60000));
    if (!b) continue;
    b.requests += 1;
    if (s.status >= 500) b.errors += 1;
    b.durations.push(s.ms);
  }
  const series = [...buckets.values()].map((b) => ({
    t: b.t,
    requests: b.requests,
    errors: b.errors,
    avgMs: b.durations.length ? Math.round(b.durations.reduce((a, c) => a + c, 0) / b.durations.length) : 0,
    p95Ms: Math.round(percentile(b.durations, 95)),
  }));

  const durations = recent.map((s) => s.ms);
  const byRoute = new Map();
  for (const s of recent) {
    const k = `${s.method} ${s.route}`;
    const r = byRoute.get(k) || { route: k, count: 0, total: 0, max: 0, errors: 0 };
    r.count += 1;
    r.total += s.ms;
    r.max = Math.max(r.max, s.ms);
    if (s.status >= 500) r.errors += 1;
    byRoute.set(k, r);
  }
  const routes = [...byRoute.values()].map((r) => ({ ...r, avg: Math.round(r.total / r.count), max: Math.round(r.max) }));
  const statusMix = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
  for (const s of recent) statusMix[`${String(s.status)[0]}xx`] = (statusMix[`${String(s.status)[0]}xx`] || 0) + 1;

  return {
    series,
    summary: {
      requests: recent.length,
      rpm: Math.round((recent.length / minutes) * 10) / 10,
      avgMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      p95Ms: Math.round(percentile(durations, 95)),
      p99Ms: Math.round(percentile(durations, 99)),
      errors5xx: recent.filter((s) => s.status >= 500).length,
      errors4xx: recent.filter((s) => s.status >= 400 && s.status < 500).length,
      errorRatePct: recent.length ? Math.round((recent.filter((s) => s.status >= 500).length / recent.length) * 1000) / 10 : 0,
    },
    slowest: routes.sort((a, b) => b.avg - a.avg).slice(0, 10),
    busiest: [...routes].sort((a, b) => b.count - a.count).slice(0, 10),
    statusMix,
    dbPings: dbPings.slice(-minutes).map((p) => ({ t: p.t, ms: Math.round(p.ms), ok: p.ok })),
  };
};
