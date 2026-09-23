// server/src/crm/crm.service.js
//
// CRM — Customer Relationship Management.
//
// Tenancy: every function takes outletId from req.tenant (the access token),
// never from the request body or URL, and every read and write is filtered
// on it. A customer id from another outlet is indistinguishable from one
// that doesn't exist — both 404.
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import { getCrmSettings, getLoyaltySettings } from "../settings/outletSettings.service.js";
import { decorateCustomers, tierRange, resolveReferrer } from "./loyalty.service.js";
import {
  upcomingMonthDays,
  queryCustomers,
  getStatsForCustomer,
  favoriteItemsFor,
  overviewNumbers,
  monthlySpend,
  preferredOrderType,
  SEGMENT_LABELS,
} from "./crm.stats.js";

// ── Errors ──────────────────────────────────────────────────────────────
export class CrmError extends Error {
  constructor(statusCode, message, extra = {}) {
    super(message);
    this.statusCode = statusCode;
    Object.assign(this, extra);
  }
}
const notFound = (what = "Customer") => new CrmError(404, `${what} not found`);
const bad = (msg) => new CrmError(400, msg);

// ── Field helpers ───────────────────────────────────────────────────────
const CUSTOMER_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"];
const CHANNELS = ["CALL", "SMS", "WHATSAPP", "EMAIL", "IN_PERSON", "OTHER"];
const DIRECTIONS = ["OUTBOUND", "INBOUND"];
const FEEDBACK_TYPES = ["FEEDBACK", "COMPLAINT", "SUGGESTION", "COMPLIMENT"];
const FEEDBACK_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const REMINDER_STATUSES = ["PENDING", "DONE", "CANCELLED"];

function trimOrNull(v, max = 500) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

// Keeps a leading "+" and digits only: "98765 43210" -> "9876543210".
export function normalizeMobile(v) {
  if (v === undefined || v === null) return v;
  const raw = String(v).trim();
  const plus = raw.startsWith("+") ? "+" : "";
  return plus + raw.replace(/\D/g, "");
}

function validateMobile(mobile, field = "Mobile number") {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    throw bad(`${field} must have 7–15 digits.`);
  }
}

function validateEmail(email) {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad("Email address is not valid.");
}

// "YYYY-MM-DD" -> Date for a @db.Date column. Built at 12:00 UTC, not
// midnight, so no timezone conversion on the way to Postgres (server TZ,
// driver, or client) can push a birthday onto the previous or next day.
function parseDateOnly(v, field) {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)) : new Date(v);
  if (Number.isNaN(d.getTime())) throw bad(`${field} is not a valid date.`);
  return d;
}

function toDateOnly(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : null;
}

// Who did it — snapshotted as a name so history still reads correctly after
// the staff account is gone.
export async function resolveActor(user) {
  if (!user) return { id: null, name: null };
  let name = null;
  if (user.employeeId) {
    const emp = await prisma.employee
      .findUnique({ where: { id: user.employeeId }, select: { fullName: true } })
      .catch(() => null);
    name = emp?.fullName || null;
  }
  return { id: user.id || null, name: name || user.role || null };
}

async function logHistory(outletId, customerId, action, description, actor, meta) {
  try {
    await prisma.customerHistory.create({
      data: {
        outletId,
        customerId,
        action,
        description,
        meta: meta ?? undefined,
        performedById: actor?.id || null,
        performedByName: actor?.name || null,
      },
    });
  } catch (err) {
    // History is an audit convenience; it must never fail the real action.
    console.error("CRM history write failed:", err.message);
  }
}

async function findCustomerOrThrow(id, outletId, select) {
  const customer = await prisma.customer.findFirst({
    where: { id, outletId },
    ...(select ? { select } : {}),
  });
  if (!customer) throw notFound();
  return customer;
}

// Builds the Prisma data object for create/update from an untrusted body.
// Only the fields listed here can ever be written.
function customerDataFromBody(body, { partial }) {
  const data = {};

  if (!partial || body.name !== undefined) {
    const name = trimOrNull(body.name, 120);
    if (!name) throw bad("Customer name is required.");
    data.name = name;
  }
  if (!partial || body.mobile !== undefined) {
    const mobile = normalizeMobile(body.mobile || "");
    if (!mobile) throw bad("Mobile number is required.");
    validateMobile(mobile);
    data.mobile = mobile;
  }
  if (body.alternateMobile !== undefined) {
    const alt = body.alternateMobile ? normalizeMobile(body.alternateMobile) : null;
    if (alt) validateMobile(alt, "Alternate mobile");
    data.alternateMobile = alt || null;
  }
  if (body.email !== undefined) {
    const email = trimOrNull(body.email, 160);
    validateEmail(email);
    data.email = email ? email.toLowerCase() : null;
  }
  for (const [key, max] of [
    ["address", 500],
    ["landmark", 200],
    ["city", 100],
    ["pincode", 12],
    ["gender", 20],
    ["source", 30],
  ]) {
    if (body[key] !== undefined) data[key] = trimOrNull(body[key], max);
  }
  if (body.birthday !== undefined) data.birthday = parseDateOnly(body.birthday, "Birthday");
  if (body.anniversary !== undefined) data.anniversary = parseDateOnly(body.anniversary, "Anniversary");
  if (body.status !== undefined) {
    if (!CUSTOMER_STATUSES.includes(body.status)) throw bad("Invalid customer status.");
    data.status = body.status;
  }
  if (body.creditLimit !== undefined) {
    if (body.creditLimit === null || body.creditLimit === "") data.creditLimit = null;
    else {
      const n = Number(body.creditLimit);
      if (!Number.isFinite(n) || n < 0) throw bad("Credit limit must be 0 or more.");
      data.creditLimit = n;
    }
  }
  if (body.marketingOptIn !== undefined) data.marketingOptIn = Boolean(body.marketingOptIn);

  return data;
}

async function assertTagsBelongToOutlet(tagIds, outletId) {
  const unique = [...new Set((tagIds || []).filter(Boolean).map(String))];
  if (!unique.length) return [];
  const found = await prisma.customerTag.findMany({
    where: { id: { in: unique }, outletId },
    select: { id: true, name: true },
  });
  if (found.length !== unique.length) throw bad("One or more tags don't exist.");
  return found;
}

function isUniqueViolation(err) {
  return err?.code === "P2002";
}

// ── Config ──────────────────────────────────────────────────────────────
// CRM switch + thresholds, plus the loyalty switch and the parts of the
// loyalty rules the POS/billing screens need to show.
export async function getConfig(outletId) {
  const [crm, loyalty] = await Promise.all([getCrmSettings(outletId), getLoyaltySettings(outletId)]);
  return {
    ...crm,
    loyalty: {
      enabled: loyalty.enabled,
      tiers: loyalty.config.tiersEnabled ? loyalty.config.tiers : [],
      redeemPoints: loyalty.config.redeemPoints,
      redeemValue: loyalty.config.redeemValue,
      templates: loyalty.config.templates,
    },
  };
}

// ── Customers: list / search / lookup ───────────────────────────────────
export async function listCustomers(outletId, query) {
  const { config } = await getCrmSettings(outletId);
  const filters = { ...query };
  if (query.tier) {
    const range = await tierRange(outletId, query.tier);
    if (range) Object.assign(filters, { tierMin: range.min, tierMax: range.max });
  }
  const result = await queryCustomers(outletId, filters, config);
  await decorateCustomers(outletId, result.data);
  return { ...result, segments: SEGMENT_LABELS };
}

// POS quick search by mobile or name. Recent visitors first.
export async function searchCustomers(outletId, q) {
  const term = String(q || "").trim();
  if (!term) return [];
  const { config } = await getCrmSettings(outletId);
  const { data } = await queryCustomers(
    outletId,
    { search: term, limit: 8, sortBy: "lastVisitAt", sortDir: "desc" },
    config,
  );
  return decorateCustomers(outletId, data);
}

// Exact mobile match — the POS "who is this?" check.
export async function lookupByMobile(outletId, mobile) {
  const normalized = normalizeMobile(mobile || "");
  if (!normalized) return null;
  const digits = normalized.replace(/\D/g, "");
  const customer = await prisma.customer.findFirst({
    where: {
      outletId,
      OR: [{ mobile: normalized }, { mobile: digits }, { mobile: { endsWith: digits.slice(-10) } }],
    },
    select: { id: true },
  });
  if (!customer) return null;
  const { config } = await getCrmSettings(outletId);
  const row = await getStatsForCustomer(outletId, customer.id, config);
  await decorateCustomers(outletId, row ? [row] : []);
  return row;
}

// ── Customers: profile ──────────────────────────────────────────────────
export async function getCustomerProfile(outletId, id) {
  const customer = await prisma.customer.findFirst({
    where: { id, outletId },
    include: {
      tagAssignments: { include: { tag: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!customer) throw notFound();

  const { config } = await getCrmSettings(outletId);

  const [stats, favorites, spendByMonth, orderType, dues, counts, pinnedNotes, nextReminder] =
    await Promise.all([
      getStatsForCustomer(outletId, id, config),
      favoriteItemsFor(outletId, [id], 8),
      monthlySpend(outletId, id, 6),
      preferredOrderType(outletId, id),
      prisma.duePayment.findMany({
        where: { outletId, customerId: id, status: { not: "SETTLED" } },
        include: { order: { select: { id: true, orderNumber: true, createdAt: true } } },
        orderBy: { createdAt: "desc" },
      }),
      Promise.all([
        prisma.customerNote.count({ where: { outletId, customerId: id } }),
        prisma.customerCommunication.count({ where: { outletId, customerId: id } }),
        prisma.customerFeedback.count({ where: { outletId, customerId: id } }),
        prisma.customerFeedback.count({
          where: { outletId, customerId: id, status: { in: ["OPEN", "IN_PROGRESS"] } },
        }),
        prisma.customerReminder.count({ where: { outletId, customerId: id, status: "PENDING" } }),
      ]),
      prisma.customerNote.findMany({
        where: { outletId, customerId: id, isPinned: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.customerReminder.findFirst({
        where: { outletId, customerId: id, status: "PENDING" },
        orderBy: { dueAt: "asc" },
      }),
    ]);

  const [notes, communications, feedback, openFeedback, pendingReminders] = counts;
  if (stats) await decorateCustomers(outletId, [stats]);

  return {
    ...stats,
    landmark: customer.landmark,
    pincode: customer.pincode,
    gender: customer.gender,
    source: customer.source,
    marketingOptIn: customer.marketingOptIn,
    updatedAt: customer.updatedAt,
    tags: customer.tagAssignments.map((a) => ({ id: a.tag.id, name: a.tag.name, color: a.tag.color })),
    favoriteItems: favorites.get(id) || [],
    monthlySpend: spendByMonth,
    preferredOrderType: orderType,
    daysSinceLastVisit: stats?.lastVisitAt
      ? Math.floor((Date.now() - new Date(stats.lastVisitAt).getTime()) / 86_400_000)
      : null,
    duePayments: dues.map((d) => ({
      id: d.id,
      orderId: d.orderId,
      orderNumber: d.order?.orderNumber,
      createdAt: d.createdAt,
      originalAmount: Number(d.originalAmount),
      amountPaid: Number(d.amountPaid),
      remaining: Math.round((Number(d.originalAmount) - Number(d.amountPaid)) * 100) / 100,
      status: d.status,
    })),
    pinnedNotes,
    nextReminder,
    counts: { notes, communications, feedback, openFeedback, pendingReminders },
  };
}

// ── Customers: create / update / delete ─────────────────────────────────
export async function createCustomer(outletId, body, user) {
  const data = customerDataFromBody(body || {}, { partial: false });
  const tags = await assertTagsBelongToOutlet(body?.tagIds, outletId);
  const actor = await resolveActor(user);
  // Referral: "referred by" accepts the referrer's code or mobile number.
  const referrer = body?.referredBy ? await resolveReferrer(outletId, body.referredBy) : null;
  if (referrer) data.referredById = referrer.id;

  let customer;
  try {
    customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: { ...data, source: data.source || "CRM", outletId },
      });
      if (tags.length) {
        await tx.customerTagAssignment.createMany({
          data: tags.map((t) => ({ customerId: created.id, tagId: t.id, outletId })),
        });
      }
      const initialNote = trimOrNull(body?.note, 2000);
      if (initialNote) {
        await tx.customerNote.create({
          data: {
            outletId,
            customerId: created.id,
            note: initialNote,
            createdById: actor.id,
            createdByName: actor.name,
          },
        });
      }
      return created;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      const existing = await prisma.customer.findFirst({
        where: { outletId, mobile: data.mobile },
        select: { id: true, name: true },
      });
      throw new CrmError(409, "A customer with this mobile number already exists.", {
        existingCustomer: existing,
      });
    }
    throw err;
  }

  await logHistory(outletId, customer.id, "CREATED", `Customer added (${customer.source || "CRM"})`, actor, {
    tags: tags.map((t) => t.name),
  });
  if (referrer) {
    await logHistory(outletId, customer.id, "REFERRED", `Referred by ${referrer.name}`, actor, { referrerId: referrer.id });
    await logHistory(outletId, referrer.id, "REFERRAL_MADE", `Referred ${customer.name}`, actor, { customerId: customer.id });
  }

  const { config } = await getCrmSettings(outletId);
  const created = await getStatsForCustomer(outletId, customer.id, config);
  await decorateCustomers(outletId, created ? [created] : []);
  return created;
}

const TRACKED_FIELDS = {
  name: "Name",
  mobile: "Mobile",
  alternateMobile: "Alternate mobile",
  email: "Email",
  address: "Address",
  landmark: "Landmark",
  city: "City",
  pincode: "Pincode",
  gender: "Gender",
  birthday: "Birthday",
  anniversary: "Anniversary",
  status: "Status",
  creditLimit: "Credit limit",
  marketingOptIn: "Marketing opt-in",
};

function comparable(v) {
  if (v instanceof Date) return toDateOnly(v);
  if (v === undefined) return null;
  if (v !== null && typeof v === "object" && typeof v.toString === "function") return String(Number(v));
  if (typeof v === "number") return String(v);
  return v;
}

export async function updateCustomer(outletId, id, body, user) {
  const existing = await findCustomerOrThrow(id, outletId);
  const data = customerDataFromBody(body || {}, { partial: true });
  const actor = await resolveActor(user);

  const changed = Object.keys(data).filter(
    (k) => TRACKED_FIELDS[k] && comparable(existing[k]) !== comparable(data[k]),
  );

  let tagsChanged = null;
  if (body?.tagIds !== undefined) {
    const tags = await assertTagsBelongToOutlet(body.tagIds, outletId);
    const current = await prisma.customerTagAssignment.findMany({
      where: { outletId, customerId: id },
      include: { tag: { select: { name: true } } },
    });
    const before = current.map((a) => a.tagId).sort().join(",");
    const after = tags.map((t) => t.id).sort().join(",");
    if (before !== after) {
      tagsChanged = { from: current.map((a) => a.tag.name), to: tags.map((t) => t.name), tags };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length) {
        await tx.customer.update({ where: { id }, data });
      }
      if (tagsChanged) {
        await tx.customerTagAssignment.deleteMany({ where: { outletId, customerId: id } });
        if (tagsChanged.tags.length) {
          await tx.customerTagAssignment.createMany({
            data: tagsChanged.tags.map((t) => ({ customerId: id, tagId: t.id, outletId })),
          });
        }
      }
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new CrmError(409, "Another customer already uses this mobile number.");
    }
    throw err;
  }

  if (changed.includes("status")) {
    await logHistory(outletId, id, "STATUS_CHANGED", `Status changed from ${existing.status} to ${data.status}`, actor);
  }
  const otherChanges = changed.filter((k) => k !== "status");
  if (otherChanges.length) {
    await logHistory(
      outletId,
      id,
      "UPDATED",
      `Updated ${otherChanges.map((k) => TRACKED_FIELDS[k]).join(", ")}`,
      actor,
      { fields: otherChanges },
    );
  }
  if (tagsChanged) {
    await logHistory(
      outletId,
      id,
      "TAGS_CHANGED",
      tagsChanged.to.length ? `Groups set to ${tagsChanged.to.join(", ")}` : "All groups removed",
      actor,
      { from: tagsChanged.from, to: tagsChanged.to },
    );
  }

  return getCustomerProfile(outletId, id);
}

// Hard delete is only allowed for customers with no orders or dues — those
// rows are part of the sales record. Everyone else should be set INACTIVE.
export async function deleteCustomer(outletId, id) {
  await findCustomerOrThrow(id, outletId);
  const [orders, dues] = await Promise.all([
    prisma.order.count({ where: { outletId, customerId: id } }),
    prisma.duePayment.count({ where: { outletId, customerId: id } }),
  ]);
  if (orders || dues) {
    throw new CrmError(
      409,
      "This customer has order history, so they can't be deleted. Set their status to Inactive instead.",
    );
  }
  await prisma.$transaction([
    prisma.loyaltyTransaction.deleteMany({ where: { outletId, customerId: id } }),
    prisma.customer.delete({ where: { id } }),
  ]);
  return { deleted: true };
}

// ── Purchase history ────────────────────────────────────────────────────
export async function listCustomerOrders(outletId, customerId, query = {}) {
  await findCustomerOrThrow(customerId, outletId, { id: true });
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const where = { outletId, customerId };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        subtotal: true,
        discountAmount: true,
        gstAmount: true,
        grandTotal: true,
        createdAt: true,
        table: { select: { name: true } },
        onlinePlatform: { select: { name: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
        payments: { select: { method: true, amount: true, status: true } },
        duePayment: { select: { status: true, originalAmount: true, amountPaid: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            notes: true,
            menuItem: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: orders.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      discountAmount: Number(o.discountAmount),
      gstAmount: Number(o.gstAmount),
      grandTotal: Number(o.grandTotal),
      payments: o.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
      duePayment: o.duePayment
        ? {
            status: o.duePayment.status,
            remaining: Number(o.duePayment.originalAmount) - Number(o.duePayment.amountPaid),
          }
        : null,
      items: o.items.map((i) => ({
        id: i.id,
        name: i.menuItem?.name,
        menuItemId: i.menuItem?.id,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
        notes: i.notes,
      })),
    })),
    total,
    page,
    limit,
  };
}

// ── Link a POS order to a customer ──────────────────────────────────────
// Used when the customer is picked AFTER the order was placed (a table's
// running order, or a takeaway at the billing screen). Passing null unlinks.
export async function linkOrderCustomer(outletId, orderId, customerId, user) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId },
    select: {
      id: true,
      orderNumber: true,
      customerId: true,
      duePayment: { select: { id: true } },
    },
  });
  if (!order) throw notFound("Order");

  const nextId = customerId || null;
  if (order.customerId === nextId) {
    return { orderId: order.id, customerId: nextId, unchanged: true };
  }
  if (order.duePayment) {
    throw new CrmError(
      409,
      "This order already has a due balance recorded against a customer, so its customer can't be changed.",
    );
  }
  if (nextId) await findCustomerOrThrow(nextId, outletId, { id: true });

  await prisma.order.update({ where: { id: order.id }, data: { customerId: nextId } });

  const actor = await resolveActor(user);
  if (order.customerId) {
    await logHistory(outletId, order.customerId, "ORDER_UNLINKED", `Order ${order.orderNumber} unlinked`, actor, {
      orderId: order.id,
    });
  }
  if (nextId) {
    await logHistory(outletId, nextId, "ORDER_LINKED", `Order ${order.orderNumber} linked`, actor, {
      orderId: order.id,
    });
  }

  const { config } = await getCrmSettings(outletId);
  return {
    orderId: order.id,
    customerId: nextId,
    customer: nextId ? await getStatsForCustomer(outletId, nextId, config) : null,
  };
}

// ── Tags / groups ───────────────────────────────────────────────────────
export async function listTags(outletId) {
  const tags = await prisma.customerTag.findMany({
    where: { outletId },
    orderBy: { name: "asc" },
    include: { _count: { select: { assignments: true } } },
  });
  return tags.map(({ _count, ...t }) => ({ ...t, customerCount: _count.assignments }));
}

function tagData(body, partial) {
  const data = {};
  if (!partial || body.name !== undefined) {
    const name = trimOrNull(body.name, 60);
    if (!name) throw bad("Group name is required.");
    data.name = name;
  }
  if (body.color !== undefined) {
    const color = trimOrNull(body.color, 20);
    if (color && !/^#[0-9a-fA-F]{3,8}$/.test(color)) throw bad("Colour must be a hex value like #3FA34D.");
    data.color = color;
  }
  if (body.description !== undefined) data.description = trimOrNull(body.description, 300);
  return data;
}

export async function createTag(outletId, body) {
  try {
    return await prisma.customerTag.create({ data: { ...tagData(body || {}, false), outletId } });
  } catch (err) {
    if (isUniqueViolation(err)) throw new CrmError(409, "A group with this name already exists.");
    throw err;
  }
}

export async function updateTag(outletId, id, body) {
  const tag = await prisma.customerTag.findFirst({ where: { id, outletId } });
  if (!tag) throw notFound("Group");
  try {
    return await prisma.customerTag.update({ where: { id }, data: tagData(body || {}, true) });
  } catch (err) {
    if (isUniqueViolation(err)) throw new CrmError(409, "A group with this name already exists.");
    throw err;
  }
}

export async function deleteTag(outletId, id) {
  const tag = await prisma.customerTag.findFirst({ where: { id, outletId } });
  if (!tag) throw notFound("Group");
  await prisma.customerTag.delete({ where: { id } }); // assignments cascade
  return { deleted: true };
}

// ── Notes ───────────────────────────────────────────────────────────────
export async function listNotes(outletId, customerId) {
  await findCustomerOrThrow(customerId, outletId, { id: true });
  return prisma.customerNote.findMany({
    where: { outletId, customerId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
}

export async function addNote(outletId, customerId, body, user) {
  await findCustomerOrThrow(customerId, outletId, { id: true });
  const note = trimOrNull(body?.note, 2000);
  if (!note) throw bad("Note can't be empty.");
  const actor = await resolveActor(user);
  return prisma.customerNote.create({
    data: {
      outletId,
      customerId,
      note,
      isPinned: Boolean(body?.isPinned),
      createdById: actor.id,
      createdByName: actor.name,
    },
  });
}

export async function updateNote(outletId, customerId, noteId, body) {
  const existing = await prisma.customerNote.findFirst({ where: { id: noteId, outletId, customerId } });
  if (!existing) throw notFound("Note");
  const data = {};
  if (body?.note !== undefined) {
    const note = trimOrNull(body.note, 2000);
    if (!note) throw bad("Note can't be empty.");
    data.note = note;
  }
  if (body?.isPinned !== undefined) data.isPinned = Boolean(body.isPinned);
  return prisma.customerNote.update({ where: { id: noteId }, data });
}

export async function deleteNote(outletId, customerId, noteId) {
  const existing = await prisma.customerNote.findFirst({ where: { id: noteId, outletId, customerId } });
  if (!existing) throw notFound("Note");
  await prisma.customerNote.delete({ where: { id: noteId } });
  return { deleted: true };
}

// ── Communication history ───────────────────────────────────────────────
export async function listCommunications(outletId, customerId) {
  await findCustomerOrThrow(customerId, outletId, { id: true });
  return prisma.customerCommunication.findMany({
    where: { outletId, customerId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function addCommunication(outletId, customerId, body, user) {
  await findCustomerOrThrow(customerId, outletId, { id: true });
  if (!CHANNELS.includes(body?.channel)) throw bad("Choose how you contacted the customer.");
  const message = trimOrNull(body?.message, 4000);
  if (!message) throw bad("Add a short summary of the conversation.");
  const direction = body?.direction && DIRECTIONS.includes(body.direction) ? body.direction : "OUTBOUND";
  const actor = await resolveActor(user);
  return prisma.customerCommunication.create({
    data: {
      outletId,
      customerId,
      channel: body.channel,
      direction,
      subject: trimOrNull(body.subject, 200),
      message,
      outcome: trimOrNull(body.outcome, 200),
      createdById: actor.id,
      createdByName: actor.name,
    },
  });
}

// ── Feedback & complaints ───────────────────────────────────────────────
export async function listFeedback(outletId, { customerId, status, type, page, limit } = {}) {
  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * take;
  const where = {
    outletId,
    ...(customerId ? { customerId } : {}),
    ...(status && FEEDBACK_STATUSES.includes(status) ? { status } : {}),
    ...(type && FEEDBACK_TYPES.includes(type) ? { type } : {}),
  };
  const [data, total] = await Promise.all([
    prisma.customerFeedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        customer: { select: { id: true, name: true, mobile: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    }),
    prisma.customerFeedback.count({ where }),
  ]);
  return { data, total };
}

export async function addFeedback(outletId, customerId, body, user) {
  await findCustomerOrThrow(customerId, outletId, { id: true });
  const message = trimOrNull(body?.message, 4000);
  if (!message) throw bad("Feedback text is required.");
  const type = FEEDBACK_TYPES.includes(body?.type) ? body.type : "FEEDBACK";
  let rating = null;
  if (body?.rating !== undefined && body.rating !== null && body.rating !== "") {
    rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw bad("Rating must be between 1 and 5.");
  }
  let orderId = null;
  if (body?.orderId) {
    const order = await prisma.order.findFirst({
      where: { id: body.orderId, outletId, customerId },
      select: { id: true },
    });
    if (!order) throw bad("That order doesn't belong to this customer.");
    orderId = order.id;
  }
  const actor = await resolveActor(user);
  return prisma.customerFeedback.create({
    data: {
      outletId,
      customerId,
      orderId,
      type,
      rating,
      message,
      // Praise doesn't need follow-up; everything else starts open.
      status: type === "COMPLIMENT" ? "CLOSED" : "OPEN",
      createdById: actor.id,
      createdByName: actor.name,
    },
    include: { order: { select: { id: true, orderNumber: true } } },
  });
}

export async function updateFeedback(outletId, feedbackId, body, user) {
  const existing = await prisma.customerFeedback.findFirst({ where: { id: feedbackId, outletId } });
  if (!existing) throw notFound("Feedback");
  const data = {};
  if (body?.status !== undefined) {
    if (!FEEDBACK_STATUSES.includes(body.status)) throw bad("Invalid feedback status.");
    data.status = body.status;
    const closing = ["RESOLVED", "CLOSED"].includes(body.status);
    data.resolvedAt = closing ? existing.resolvedAt || new Date() : null;
  }
  if (body?.resolution !== undefined) data.resolution = trimOrNull(body.resolution, 2000);

  const updated = await prisma.customerFeedback.update({
    where: { id: feedbackId },
    data,
    include: { order: { select: { id: true, orderNumber: true } } },
  });

  if (data.status && data.status !== existing.status) {
    const actor = await resolveActor(user);
    await logHistory(
      outletId,
      existing.customerId,
      "FEEDBACK_STATUS",
      `${existing.type === "COMPLAINT" ? "Complaint" : "Feedback"} marked ${data.status.replace("_", " ").toLowerCase()}`,
      actor,
      { feedbackId },
    );
  }
  return updated;
}

// ── Follow-up reminders ─────────────────────────────────────────────────
export async function listReminders(outletId, { customerId, status, due } = {}) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86_400_000);

  const where = {
    outletId,
    ...(customerId ? { customerId } : {}),
    ...(status && REMINDER_STATUSES.includes(status) ? { status } : {}),
  };
  if (due === "overdue") Object.assign(where, { status: "PENDING", dueAt: { lt: startOfToday } });
  if (due === "today") Object.assign(where, { status: "PENDING", dueAt: { gte: startOfToday, lt: endOfToday } });
  if (due === "upcoming") Object.assign(where, { status: "PENDING", dueAt: { gte: endOfToday } });
  if (due === "open") Object.assign(where, { status: "PENDING", dueAt: { lt: endOfToday } });

  return prisma.customerReminder.findMany({
    where,
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 200,
    include: { customer: { select: { id: true, name: true, mobile: true } } },
  });
}

export async function addReminder(outletId, customerId, body, user) {
  await findCustomerOrThrow(customerId, outletId, { id: true });
  const title = trimOrNull(body?.title, 200);
  if (!title) throw bad("What should the follow-up be about?");
  const dueAt = body?.dueAt ? new Date(body.dueAt) : null;
  if (!dueAt || Number.isNaN(dueAt.getTime())) throw bad("Pick a date for the follow-up.");
  if (body?.channel && !CHANNELS.includes(body.channel)) throw bad("Invalid channel.");
  const actor = await resolveActor(user);
  return prisma.customerReminder.create({
    data: {
      outletId,
      customerId,
      title,
      notes: trimOrNull(body.notes, 2000),
      dueAt,
      channel: body.channel || null,
      createdById: actor.id,
      createdByName: actor.name,
    },
    include: { customer: { select: { id: true, name: true, mobile: true } } },
  });
}

export async function updateReminder(outletId, reminderId, body) {
  const existing = await prisma.customerReminder.findFirst({ where: { id: reminderId, outletId } });
  if (!existing) throw notFound("Reminder");
  const data = {};
  if (body?.status !== undefined) {
    if (!REMINDER_STATUSES.includes(body.status)) throw bad("Invalid reminder status.");
    data.status = body.status;
    data.completedAt = body.status === "DONE" ? new Date() : null;
  }
  if (body?.title !== undefined) {
    const title = trimOrNull(body.title, 200);
    if (!title) throw bad("Title can't be empty.");
    data.title = title;
  }
  if (body?.notes !== undefined) data.notes = trimOrNull(body.notes, 2000);
  if (body?.dueAt !== undefined) {
    const dueAt = new Date(body.dueAt);
    if (Number.isNaN(dueAt.getTime())) throw bad("Invalid date.");
    data.dueAt = dueAt;
  }
  return prisma.customerReminder.update({
    where: { id: reminderId },
    data,
    include: { customer: { select: { id: true, name: true, mobile: true } } },
  });
}

// ── Timeline (customer history) ─────────────────────────────────────────
// Orders, notes, calls, feedback, reminders and record changes merged into
// one reverse-chronological feed for the profile page.
export async function getTimeline(outletId, customerId, { limit } = {}) {
  await findCustomerOrThrow(customerId, outletId, { id: true });
  const take = Math.min(200, Math.max(10, parseInt(limit, 10) || 60));
  const scope = { outletId, customerId };

  const [orders, notes, comms, feedback, reminders, history] = await Promise.all([
    prisma.order.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        grandTotal: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.customerNote.findMany({ where: scope, orderBy: { createdAt: "desc" }, take }),
    prisma.customerCommunication.findMany({ where: scope, orderBy: { createdAt: "desc" }, take }),
    prisma.customerFeedback.findMany({ where: scope, orderBy: { createdAt: "desc" }, take }),
    prisma.customerReminder.findMany({ where: scope, orderBy: { createdAt: "desc" }, take }),
    prisma.customerHistory.findMany({ where: scope, orderBy: { createdAt: "desc" }, take }),
  ]);

  const events = [
    ...orders.map((o) => ({
      id: `order-${o.id}`,
      type: "ORDER",
      at: o.createdAt,
      title: `Order ${o.orderNumber}`,
      detail: `${o._count.items} item${o._count.items === 1 ? "" : "s"} · ${o.orderType.replace("_", " ").toLowerCase()} · ${o.status.replace(/_/g, " ").toLowerCase()}`,
      amount: Number(o.grandTotal),
      ref: { orderId: o.id },
    })),
    ...notes.map((n) => ({
      id: `note-${n.id}`,
      type: "NOTE",
      at: n.createdAt,
      title: n.isPinned ? "Pinned note" : "Note",
      detail: n.note,
      by: n.createdByName,
    })),
    ...comms.map((c) => ({
      id: `comm-${c.id}`,
      type: "COMMUNICATION",
      at: c.createdAt,
      title: `${c.direction === "INBOUND" ? "From customer" : "Contacted"} via ${c.channel.replace("_", " ").toLowerCase()}`,
      detail: [c.subject, c.message, c.outcome ? `Outcome: ${c.outcome}` : null].filter(Boolean).join(" — "),
      by: c.createdByName,
    })),
    ...feedback.map((f) => ({
      id: `fb-${f.id}`,
      type: f.type === "COMPLAINT" ? "COMPLAINT" : "FEEDBACK",
      at: f.createdAt,
      title: `${f.type.charAt(0)}${f.type.slice(1).toLowerCase()}${f.rating ? ` · ${f.rating}/5` : ""}`,
      detail: f.message,
      status: f.status,
      by: f.createdByName,
    })),
    ...reminders.map((r) => ({
      id: `rem-${r.id}`,
      type: "REMINDER",
      at: r.createdAt,
      title: `Follow-up scheduled for ${new Date(r.dueAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
      detail: r.title,
      status: r.status,
      by: r.createdByName,
    })),
    ...history.map((h) => ({
      id: `hist-${h.id}`,
      type: "HISTORY",
      at: h.createdAt,
      title: h.description,
      detail: null,
      by: h.performedByName,
    })),
  ];

  events.sort((a, b) => new Date(b.at) - new Date(a.at));
  return events.slice(0, take);
}

// ── Overview (CRM dashboard) ────────────────────────────────────────────
export async function getOverview(outletId) {
  const { config } = await getCrmSettings(outletId);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86_400_000);
  const mmddList = upcomingMonthDays(config.occasionLookaheadDays);
  const mmdd = { list: mmddList, sql: Prisma.join(mmddList) };

  const [numbers, topCustomers, atRisk, dueReminders, overdueCount, openFeedback, openComplaints, occasions] =
    await Promise.all([
      overviewNumbers(outletId, config),
      queryCustomers(outletId, { sortBy: "totalSpent", sortDir: "desc", limit: 5, minOrders: 1 }, config),
      queryCustomers(outletId, { segment: "at_risk", sortBy: "totalSpent", sortDir: "desc", limit: 5 }, config),
      prisma.customerReminder.findMany({
        where: { outletId, status: "PENDING", dueAt: { lt: endOfToday } },
        orderBy: { dueAt: "asc" },
        take: 10,
        include: { customer: { select: { id: true, name: true, mobile: true } } },
      }),
      prisma.customerReminder.count({ where: { outletId, status: "PENDING", dueAt: { lt: startOfToday } } }),
      prisma.customerFeedback.findMany({
        where: { outletId, status: { in: ["OPEN", "IN_PROGRESS"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { customer: { select: { id: true, name: true, mobile: true } } },
      }),
      prisma.customerFeedback.count({
        where: { outletId, type: "COMPLAINT", status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
      prisma.$queryRaw`
        SELECT id, name, mobile, birthday, anniversary
        FROM customers
        WHERE "outletId" = ${outletId}
          AND status::text <> 'BLOCKED'
          AND (to_char(birthday, 'MMDD') IN (${mmdd.sql}) OR to_char(anniversary, 'MMDD') IN (${mmdd.sql}))
        LIMIT 200`,
    ]);

  // Order occasions by how soon they come round.
  const order = new Map(mmdd.list.map((d, i) => [d, i]));
  const upcomingOccasions = [];
  for (const c of occasions) {
    for (const [kind, value] of [
      ["BIRTHDAY", c.birthday],
      ["ANNIVERSARY", c.anniversary],
    ]) {
      if (!value) continue;
      const iso = toDateOnly(value);
      const key = iso.slice(5, 7) + iso.slice(8, 10);
      if (order.has(key)) {
        upcomingOccasions.push({
          customerId: c.id,
          name: c.name,
          mobile: c.mobile,
          kind,
          date: iso,
          inDays: order.get(key),
        });
      }
    }
  }
  upcomingOccasions.sort((a, b) => a.inDays - b.inDays || a.name.localeCompare(b.name));

  return {
    ...numbers,
    config,
    topCustomers: topCustomers.data,
    atRiskCustomers: atRisk.data,
    dueReminders,
    overdueReminders: overdueCount,
    openFeedback,
    openComplaints,
    upcomingOccasions: upcomingOccasions.slice(0, 20),
  };
}