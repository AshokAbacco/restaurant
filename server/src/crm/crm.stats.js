// server/src/crm/crm.stats.js
//
// Purchase statistics for CRM — total orders, total spent, average bill,
// first/last visit, outstanding dues, favourite items and segment.
//
// Why computed and not stored: the POS changes an order's value from many
// places (add items, void a line, discounts at billing, cancel, refund).
// Keeping denormalised counters on Customer in step with every one of
// those paths is exactly the kind of thing that silently drifts. Computing
// from `orders` on read means the CRM list and profile always match the
// latest POS data, with no sync job and nothing to backfill.
//
// Every query here is filtered by outletId FIRST. The only other inputs are
// validated values bound as parameters (Prisma.sql), never string-built SQL.
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";

// Orders that never became a sale don't count as a visit or as spend.
// Written as literals (not parameters) because they're compared against the
// enum cast to text and are fixed, never user input.
const EXCLUDED_ORDER_STATUSES = Prisma.raw(`('CANCELLED','REFUNDED')`);

export const SEGMENTS = ["vip", "regular", "new", "at_risk", "no_orders"];

export const SEGMENT_LABELS = {
  vip: "VIP",
  regular: "Regular",
  new: "New",
  at_risk: "At risk",
  no_orders: "No orders yet",
};

// ── CTEs ────────────────────────────────────────────────────────────────
function statsCte(outletId) {
  return Prisma.sql`
    WITH order_stats AS (
      SELECT o."customerId"                           AS cid,
             COUNT(*)::int                            AS total_orders,
             COALESCE(SUM(o."grandTotal"), 0)::float8 AS total_spent,
             MAX(o."createdAt")                       AS last_visit_at,
             MIN(o."createdAt")                       AS first_visit_at
      FROM orders o
      WHERE o."outletId" = ${outletId}
        AND o."customerId" IS NOT NULL
        AND o.status::text NOT IN ${EXCLUDED_ORDER_STATUSES}
      GROUP BY o."customerId"
    ),
    due_stats AS (
      SELECT d."customerId"                                         AS cid,
             COALESCE(SUM(d."originalAmount" - d."amountPaid"), 0)::float8 AS outstanding
      FROM due_payments d
      WHERE d."outletId" = ${outletId}
        AND d.status::text <> 'SETTLED'
      GROUP BY d."customerId"
    )`;
}

const ORDERS = Prisma.sql`COALESCE(s.total_orders, 0)`;
const SPENT = Prisma.sql`COALESCE(s.total_spent, 0)`;

function inactiveCutoff(config) {
  return new Date(Date.now() - config.inactiveDays * 24 * 60 * 60 * 1000);
}

// SQL predicates for each segment. Precedence (mirrored in computeSegment):
// VIP > At risk > Regular > New > No orders — so every customer lands in
// exactly one segment and the segment counts always add up.
function segmentPredicates(config) {
  const vip = Prisma.sql`(${SPENT} >= ${config.vipSpendThreshold} OR ${ORDERS} >= ${config.vipOrderThreshold})`;
  const lapsed = Prisma.sql`(${ORDERS} > 0 AND s.last_visit_at < ${inactiveCutoff(config)})`;
  return {
    vip,
    at_risk: Prisma.sql`(NOT ${vip} AND ${lapsed})`,
    regular: Prisma.sql`(NOT ${vip} AND NOT ${lapsed} AND ${ORDERS} >= ${config.regularOrderThreshold})`,
    new: Prisma.sql`(NOT ${vip} AND NOT ${lapsed} AND ${ORDERS} >= 1 AND ${ORDERS} < ${config.regularOrderThreshold})`,
    no_orders: Prisma.sql`(${ORDERS} = 0)`,
  };
}

export function computeSegment(row, config) {
  const orders = Number(row.totalOrders || 0);
  const spent = Number(row.totalSpent || 0);
  if (orders === 0) return "no_orders";
  if (spent >= config.vipSpendThreshold || orders >= config.vipOrderThreshold) return "vip";
  const last = row.lastVisitAt ? new Date(row.lastVisitAt) : null;
  if (last && last < inactiveCutoff(config)) return "at_risk";
  if (orders >= config.regularOrderThreshold) return "regular";
  return "new";
}

// "MMDD" strings for today .. today+days, used to match birthdays and
// anniversaries regardless of year (and across the Dec -> Jan wrap).
export function upcomingMonthDays(days) {
  const out = [];
  const now = new Date();
  for (let i = 0; i <= days; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push(`${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}

// ── Filters ─────────────────────────────────────────────────────────────
const SORTS = {
  name: Prisma.raw(`lower(c.name)`),
  createdAt: Prisma.raw(`c."createdAt"`),
  totalSpent: Prisma.raw(`COALESCE(s.total_spent, 0)`),
  totalOrders: Prisma.raw(`COALESCE(s.total_orders, 0)`),
  avgBill: Prisma.raw(`(CASE WHEN COALESCE(s.total_orders,0) > 0 THEN s.total_spent / s.total_orders ELSE 0 END)`),
  lastVisitAt: Prisma.raw(`s.last_visit_at`),
  outstanding: Prisma.raw(`COALESCE(d.outstanding, 0)`),
};

const STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"];

function num(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function date(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Builds the WHERE clause. outletId is always the first condition.
function buildWhere(outletId, filters, config) {
  const parts = [Prisma.sql`c."outletId" = ${outletId}`];

  if (filters.ids) {
    if (filters.ids.length === 0) parts.push(Prisma.sql`FALSE`);
    else parts.push(Prisma.sql`c.id IN (${Prisma.join(filters.ids)})`);
  }

  const search = String(filters.search || "").trim();
  if (search) {
    const like = `%${search}%`;
    const digits = search.replace(/\D/g, "");
    parts.push(
      digits.length >= 3
        ? Prisma.sql`(c.name ILIKE ${like} OR c.email ILIKE ${like} OR c.mobile LIKE ${`%${digits}%`} OR c."alternateMobile" LIKE ${`%${digits}%`})`
        : Prisma.sql`(c.name ILIKE ${like} OR c.email ILIKE ${like} OR c.mobile LIKE ${like})`,
    );
  }

  if (filters.status && STATUSES.includes(filters.status)) {
    parts.push(Prisma.sql`c.status::text = ${filters.status}`);
  }

  if (filters.segment && SEGMENTS.includes(filters.segment)) {
    parts.push(segmentPredicates(config)[filters.segment]);
  }

  if (filters.tagId) {
    parts.push(Prisma.sql`EXISTS (
      SELECT 1 FROM customer_tag_assignments ta
      WHERE ta."customerId" = c.id AND ta."tagId" = ${String(filters.tagId)} AND ta."outletId" = ${outletId}
    )`);
  }

  if (filters.hasDues === "true" || filters.hasDues === true) {
    parts.push(Prisma.sql`COALESCE(d.outstanding, 0) > 0.009`);
  }

  const minSpent = num(filters.minSpent);
  if (minSpent !== null) parts.push(Prisma.sql`${SPENT} >= ${minSpent}`);
  const maxSpent = num(filters.maxSpent);
  if (maxSpent !== null) parts.push(Prisma.sql`${SPENT} <= ${maxSpent}`);
  const minOrders = num(filters.minOrders);
  if (minOrders !== null) parts.push(Prisma.sql`${ORDERS} >= ${minOrders}`);

  const lastFrom = date(filters.lastVisitFrom);
  if (lastFrom) parts.push(Prisma.sql`s.last_visit_at >= ${lastFrom}`);
  const lastTo = date(filters.lastVisitTo);
  if (lastTo) {
    // Inclusive of the whole "to" day.
    const end = new Date(lastTo.getTime() + 24 * 60 * 60 * 1000);
    parts.push(Prisma.sql`s.last_visit_at < ${end}`);
  }

  if (filters.occasion === "birthday_month" || filters.occasion === "anniversary_month") {
    const col = filters.occasion === "birthday_month" ? Prisma.raw(`c.birthday`) : Prisma.raw(`c.anniversary`);
    parts.push(Prisma.sql`EXTRACT(MONTH FROM ${col}) = ${new Date().getMonth() + 1}`);
  }
  if (filters.occasion === "upcoming") {
    const mmdd = upcomingMonthDays(config.occasionLookaheadDays);
    parts.push(Prisma.sql`(to_char(c.birthday, 'MMDD') IN (${Prisma.join(mmdd)}) OR to_char(c.anniversary, 'MMDD') IN (${Prisma.join(mmdd)}))`);
  }

  return Prisma.join(parts, " AND ");
}

function toDateOnly(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function shapeRow(r, config) {
  const totalOrders = Number(r.totalOrders || 0);
  const totalSpent = Number(r.totalSpent || 0);
  const row = {
    id: r.id,
    name: r.name,
    mobile: r.mobile,
    alternateMobile: r.alternateMobile,
    email: r.email,
    address: r.address,
    city: r.city,
    status: r.status,
    birthday: toDateOnly(r.birthday),
    anniversary: toDateOnly(r.anniversary),
    loyaltyPoints: r.loyaltyPoints,
    creditLimit: r.creditLimit === null ? null : Number(r.creditLimit),
    createdAt: r.createdAt,
    totalOrders,
    totalSpent: Math.round(totalSpent * 100) / 100,
    avgBill: totalOrders ? Math.round((totalSpent / totalOrders) * 100) / 100 : 0,
    lastVisitAt: r.lastVisitAt,
    firstVisitAt: r.firstVisitAt,
    outstanding: Math.round(Number(r.outstanding || 0) * 100) / 100,
    latestNote: r.latestNote || null,
  };
  row.segment = computeSegment(row, config);
  row.segmentLabel = SEGMENT_LABELS[row.segment];
  return row;
}

// ── Queries ─────────────────────────────────────────────────────────────

// Paged, filtered, sorted customer list with stats. Returns
// { data, total, page, limit }.
export async function queryCustomers(outletId, filters, config) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const sortKey = SORTS[filters.sortBy] ? filters.sortBy : "lastVisitAt";
  const dir = String(filters.sortDir || "").toLowerCase() === "asc" ? Prisma.raw("ASC") : Prisma.raw("DESC");
  const orderBy = Prisma.sql`${SORTS[sortKey]} ${dir} NULLS LAST, c."createdAt" DESC, c.id`;

  const where = buildWhere(outletId, filters, config);

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw`
      ${statsCte(outletId)}
      SELECT c.id, c.name, c.mobile, c."alternateMobile", c.email, c.address, c.city,
             c.status::text AS status, c.birthday, c.anniversary, c."loyaltyPoints",
             c."creditLimit"::float8 AS "creditLimit", c."createdAt",
             ${ORDERS} AS "totalOrders", ${SPENT} AS "totalSpent",
             s.last_visit_at AS "lastVisitAt", s.first_visit_at AS "firstVisitAt",
             COALESCE(d.outstanding, 0) AS outstanding,
             (SELECT n.note FROM customer_notes n
               WHERE n."customerId" = c.id AND n."outletId" = ${outletId}
               ORDER BY n."isPinned" DESC, n."createdAt" DESC LIMIT 1) AS "latestNote"
      FROM customers c
      LEFT JOIN order_stats s ON s.cid = c.id
      LEFT JOIN due_stats d ON d.cid = c.id
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}`,
    prisma.$queryRaw`
      ${statsCte(outletId)}
      SELECT COUNT(*)::int AS total
      FROM customers c
      LEFT JOIN order_stats s ON s.cid = c.id
      LEFT JOIN due_stats d ON d.cid = c.id
      WHERE ${where}`,
  ]);

  const data = rows.map((r) => shapeRow(r, config));
  await attachFavoritesAndTags(outletId, data);

  return { data, total: countRows[0]?.total || 0, page, limit };
}

export async function getStatsForCustomer(outletId, customerId, config) {
  const { data } = await queryCustomers(outletId, { ids: [customerId], limit: 1 }, config);
  return data[0] || null;
}

// Top-N items per customer, by quantity, for a page of customers.
export async function favoriteItemsFor(outletId, customerIds, perCustomer = 3) {
  if (!customerIds.length) return new Map();
  const rows = await prisma.$queryRaw`
    SELECT cid, "menuItemId", name, quantity, orders, spent FROM (
      SELECT o."customerId" AS cid, oi."menuItemId", mi.name,
             SUM(oi.quantity)::int                  AS quantity,
             COUNT(DISTINCT o.id)::int              AS orders,
             COALESCE(SUM(oi."totalPrice"),0)::float8 AS spent,
             ROW_NUMBER() OVER (PARTITION BY o."customerId"
                                ORDER BY SUM(oi.quantity) DESC, COUNT(DISTINCT o.id) DESC, mi.name) AS rn
      FROM order_items oi
      JOIN orders o      ON o.id = oi."orderId"
      JOIN menu_items mi ON mi.id = oi."menuItemId"
      WHERE o."outletId" = ${outletId}
        AND o."customerId" IN (${Prisma.join(customerIds)})
        AND o.status::text NOT IN ${EXCLUDED_ORDER_STATUSES}
      GROUP BY o."customerId", oi."menuItemId", mi.name
    ) t
    WHERE rn <= ${perCustomer}
    ORDER BY cid, rn`;

  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.cid)) map.set(r.cid, []);
    map.get(r.cid).push({
      menuItemId: r.menuItemId,
      name: r.name,
      quantity: r.quantity,
      orders: r.orders,
      spent: Math.round(Number(r.spent) * 100) / 100,
    });
  }
  return map;
}

async function attachFavoritesAndTags(outletId, rows) {
  if (!rows.length) return;
  const ids = rows.map((r) => r.id);
  const [favorites, assignments] = await Promise.all([
    favoriteItemsFor(outletId, ids, 3),
    prisma.customerTagAssignment.findMany({
      where: { outletId, customerId: { in: ids } },
      include: { tag: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const tagsBy = new Map();
  for (const a of assignments) {
    if (!tagsBy.has(a.customerId)) tagsBy.set(a.customerId, []);
    tagsBy.get(a.customerId).push(a.tag);
  }
  for (const r of rows) {
    r.favoriteItems = favorites.get(r.id) || [];
    r.tags = tagsBy.get(r.id) || [];
  }
}

// Outlet-wide numbers for the CRM overview page — one pass over the stats.
export async function overviewNumbers(outletId, config) {
  const seg = segmentPredicates(config);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [row] = await prisma.$queryRaw`
    ${statsCte(outletId)}
    SELECT COUNT(*)::int AS "totalCustomers",
           COUNT(*) FILTER (WHERE c."createdAt" >= ${monthStart})::int AS "newThisMonth",
           COUNT(*) FILTER (WHERE s.last_visit_at >= ${thirtyDaysAgo})::int AS "activeLast30Days",
           COUNT(*) FILTER (WHERE ${ORDERS} >= 1)::int AS "withOrders",
           COUNT(*) FILTER (WHERE ${ORDERS} >= 2)::int AS "repeatCustomers",
           COUNT(*) FILTER (WHERE COALESCE(d.outstanding,0) > 0.009)::int AS "customersWithDues",
           COALESCE(SUM(d.outstanding), 0)::float8 AS "totalOutstanding",
           COALESCE(SUM(s.total_spent), 0)::float8 AS "lifetimeRevenue",
           COALESCE(SUM(s.total_orders), 0)::int AS "linkedOrders",
           COUNT(*) FILTER (WHERE ${seg.vip})::int       AS vip,
           COUNT(*) FILTER (WHERE ${seg.regular})::int   AS regular,
           COUNT(*) FILTER (WHERE ${seg.new})::int       AS "new",
           COUNT(*) FILTER (WHERE ${seg.at_risk})::int   AS at_risk,
           COUNT(*) FILTER (WHERE ${seg.no_orders})::int AS no_orders
    FROM customers c
    LEFT JOIN order_stats s ON s.cid = c.id
    LEFT JOIN due_stats d ON d.cid = c.id
    WHERE c."outletId" = ${outletId}`;

  const withOrders = row?.withOrders || 0;
  return {
    totalCustomers: row?.totalCustomers || 0,
    newThisMonth: row?.newThisMonth || 0,
    activeLast30Days: row?.activeLast30Days || 0,
    repeatCustomers: row?.repeatCustomers || 0,
    repeatRate: withOrders ? Math.round(((row.repeatCustomers || 0) / withOrders) * 1000) / 10 : 0,
    customersWithDues: row?.customersWithDues || 0,
    totalOutstanding: Math.round(Number(row?.totalOutstanding || 0) * 100) / 100,
    lifetimeRevenue: Math.round(Number(row?.lifetimeRevenue || 0) * 100) / 100,
    avgSpendPerCustomer: withOrders ? Math.round((Number(row.lifetimeRevenue) / withOrders) * 100) / 100 : 0,
    avgBill: row?.linkedOrders ? Math.round((Number(row.lifetimeRevenue) / row.linkedOrders) * 100) / 100 : 0,
    segments: {
      vip: row?.vip || 0,
      regular: row?.regular || 0,
      new: row?.new || 0,
      at_risk: row?.at_risk || 0,
      no_orders: row?.no_orders || 0,
    },
  };
}

// Spend per month for the last `months` months, for the profile chart.
export async function monthlySpend(outletId, customerId, months = 6) {
  const start = new Date(new Date().getFullYear(), new Date().getMonth() - (months - 1), 1);
  const rows = await prisma.$queryRaw`
    SELECT to_char(date_trunc('month', o."createdAt"), 'YYYY-MM') AS month,
           COUNT(*)::int AS orders,
           COALESCE(SUM(o."grandTotal"), 0)::float8 AS spent
    FROM orders o
    WHERE o."outletId" = ${outletId}
      AND o."customerId" = ${customerId}
      AND o.status::text NOT IN ${EXCLUDED_ORDER_STATUSES}
      AND o."createdAt" >= ${start}
    GROUP BY 1
    ORDER BY 1`;
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  const out = [];
  for (let i = 0; i < months; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const r = byMonth.get(key);
    out.push({ month: key, orders: r?.orders || 0, spent: Math.round(Number(r?.spent || 0) * 100) / 100 });
  }
  return out;
}

// Most common order type for a customer (Dine In / Takeaway / Delivery).
export async function preferredOrderType(outletId, customerId) {
  const rows = await prisma.order.groupBy({
    by: ["orderType"],
    where: { outletId, customerId, status: { notIn: ["CANCELLED", "REFUNDED"] } },
    _count: { _all: true },
  });
  if (!rows.length) return null;
  rows.sort((a, b) => b._count._all - a._count._all);
  return rows[0].orderType;
}