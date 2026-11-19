// ==============================================
// server/src/platform/platform.utils.js
// Small helpers shared by every platform controller.
// ==============================================

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.expose = true;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details);
export const notFound = (msg = "Not found.") => new HttpError(404, msg);
export const forbidden = (msg = "You don't have permission to do that.") =>
  new HttpError(403, msg);

// Express 5 already forwards rejected promises to the error handler; this
// wrapper exists so HttpErrors are answered with their own status/message
// right here instead of relying on the global handler's shape.
export const handler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    if (err instanceof HttpError) {
      return res
        .status(err.status)
        .json({ success: false, message: err.message, details: err.details });
    }
    if (err?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: `A record with this ${err.meta?.target?.join?.(", ") || "value"} already exists.`,
      });
    }
    if (err?.code === "P2025") {
      return res.status(404).json({ success: false, message: "Record not found." });
    }
    return next(err);
  }
};

export const ok = (res, data = {}, status = 200) =>
  res.status(status).json({ success: true, ...data });

export const str = (v, max = 5000) =>
  typeof v === "string" ? v.trim().slice(0, max) : v == null ? "" : String(v).trim().slice(0, max);

export const optStr = (v, max = 5000) => {
  const s = str(v, max);
  return s ? s : null;
};

export const int = (v, fallback = 0) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const bool = (v, fallback = false) => {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v === "boolean") return v;
  return ["true", "1", "yes", "on"].includes(String(v).toLowerCase());
};

export const date = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const oneOf = (v, list, fallback) =>
  list.includes(v) ? v : fallback;

export const paging = (query, { defaultSize = 25, maxSize = 200 } = {}) => {
  const page = Math.max(1, int(query.page, 1));
  const pageSize = Math.min(maxSize, Math.max(1, int(query.pageSize, defaultSize)));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
};

export const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const endOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const addMonths = (d, n) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
};

export const daysBetween = (a, b) =>
  Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export const monthKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
};

export const lastNMonths = (n) => {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    out.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return out;
};

export const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export const lastNDays = (n) => {
  const out = [];
  const today = startOfDay();
  for (let i = n - 1; i >= 0; i -= 1) out.push(dayKey(addDays(today, -i)));
  return out;
};

export const toNumber = (decimal) => {
  if (decimal == null) return 0;
  if (typeof decimal === "number") return decimal;
  if (typeof decimal === "bigint") return Number(decimal);
  if (typeof decimal.toNumber === "function") return decimal.toNumber();
  return Number(decimal) || 0;
};

export const clientIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.socket?.remoteAddress ||
  null;

/** Very small CSV writer — values are quoted when they need to be. */
export const toCsv = (rows, columns) => {
  const esc = (v) => {
    if (v == null) return "";
    const s = v instanceof Date ? v.toISOString() : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => esc(typeof c.value === "function" ? c.value(r) : r[c.key])).join(","))
    .join("\n");
  return `${head}\n${body}`;
};

export const sendCsv = (res, filename, csv) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
};
