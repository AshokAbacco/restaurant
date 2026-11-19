// ==============================================
// server/src/platform/enquiries.controller.js
// /api/platform/enquiries — submissions from the public Contact page.
// ==============================================

import prisma from "../../prisma/client.js";
import { sendMail, escMultiline } from "../config/mailer.js";
import { getAllSettings } from "./platform.settings.js";
import { audit } from "./platform.audit.js";
import {
  handler,
  ok,
  str,
  optStr,
  paging,
  notFound,
  badRequest,
  oneOf,
  date,
  endOfDay,
  addDays,
  toCsv,
  sendCsv,
  dayKey,
} from "./platform.utils.js";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "CLOSED"];

const buildWhere = (q) => {
  const where = {};
  if (q.status && STATUSES.includes(q.status)) where.status = q.status;
  const from = date(q.from);
  const to = date(q.to);
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: endOfDay(to) } : {}) };
  const search = str(q.q, 100);
  if (search) {
    where.OR = [
      { restaurantName: { contains: search, mode: "insensitive" } },
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { message: { contains: search, mode: "insensitive" } },
    ];
  }
  return where;
};

export const list = handler(async (req, res) => {
  const where = buildWhere(req.query);
  const { page, pageSize, skip, take } = paging(req.query, { defaultSize: 25 });
  const [items, total, grouped] = await Promise.all([
    prisma.contactSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { _count: { select: { followUps: true } } },
    }),
    prisma.contactSubmission.count({ where }),
    prisma.contactSubmission.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const g of grouped) counts[g.status] = g._count._all;
  counts.ALL = Object.values(counts).reduce((a, b) => a + b, 0);
  return ok(res, { items, total, page, pageSize, counts });
});

export const get = handler(async (req, res) => {
  const item = await prisma.contactSubmission.findUnique({
    where: { id: req.params.id },
    include: {
      followUps: {
        orderBy: { dueAt: "desc" },
        include: { assignedTo: { select: { id: true, name: true } }, activities: { orderBy: { createdAt: "desc" }, take: 20 } },
      },
    },
  });
  if (!item) throw notFound("Enquiry not found.");
  // Possible existing customer with the same email
  const existingOrg = await prisma.organization.findFirst({
    where: { ownerEmail: { equals: item.email, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  return ok(res, { item, existingOrg });
});

export const update = handler(async (req, res) => {
  const data = {};
  if (req.body?.status !== undefined) {
    data.status = oneOf(req.body.status, STATUSES, "NEW");
    data.handledAt = new Date();
    data.handledById = req.platformAdmin.id;
  }
  if (req.body?.adminNotes !== undefined) data.adminNotes = optStr(req.body.adminNotes, 5000);
  const item = await prisma.contactSubmission.update({ where: { id: req.params.id }, data });
  audit(req, "ENQUIRY_UPDATED", { entityType: "ContactSubmission", entityId: item.id, metadata: data });
  return ok(res, { item });
});

export const reply = handler(async (req, res) => {
  const item = await prisma.contactSubmission.findUnique({ where: { id: req.params.id } });
  if (!item) throw notFound("Enquiry not found.");
  const body = str(req.body?.body, 10000);
  if (!body) throw badRequest("Write a reply first.");
  const settings = await getAllSettings();
  const subject = str(req.body?.subject, 200) || `Re: your enquiry to ${settings.general.platformName}`;
  const result = await sendMail({
    to: item.email,
    subject,
    text: `${body}\n\n${settings.messaging.signature || ""}`,
    html: `<p>${escMultiline(body)}</p><p style="color:#666">${escMultiline(settings.messaging.signature || "")}</p>`,
    replyTo: settings.general.supportEmail || undefined,
  });
  const notes = [item.adminNotes, `[${new Date().toISOString()}] ${req.platformAdmin.name} replied by email:\n${body}`].filter(Boolean).join("\n\n");
  const updated = await prisma.contactSubmission.update({
    where: { id: item.id },
    data: {
      repliedAt: new Date(),
      status: item.status === "NEW" ? "CONTACTED" : item.status,
      handledAt: new Date(),
      handledById: req.platformAdmin.id,
      adminNotes: notes.slice(0, 20000),
    },
  });
  audit(req, "ENQUIRY_REPLIED", { entityType: "ContactSubmission", entityId: item.id });
  return ok(res, { item: updated, emailSkipped: Boolean(result?.skipped) });
});

export const toFollowUp = handler(async (req, res) => {
  const item = await prisma.contactSubmission.findUnique({ where: { id: req.params.id } });
  if (!item) throw notFound("Enquiry not found.");
  const dueAt = date(req.body?.dueAt) || addDays(new Date(), 1);
  const followUp = await prisma.platformFollowUp.create({
    data: {
      title: str(req.body?.title, 200) || `Call back ${item.fullName} (${item.restaurantName})`,
      notes: optStr(req.body?.notes, 5000) || item.message.slice(0, 2000),
      type: "SALES",
      priority: oneOf(req.body?.priority, ["LOW", "NORMAL", "HIGH", "URGENT"], "NORMAL"),
      channel: "call",
      dueAt,
      enquiryId: item.id,
      contactName: item.fullName,
      contactPhone: item.phone,
      contactEmail: item.email,
      assignedToId: req.body?.assignedToId || req.platformAdmin.id,
      createdById: req.platformAdmin.id,
      activities: { create: { type: "CREATED", note: "Created from website enquiry", adminId: req.platformAdmin.id } },
    },
  });
  if (item.status === "NEW") {
    await prisma.contactSubmission.update({ where: { id: item.id }, data: { status: "QUALIFIED", handledAt: new Date(), handledById: req.platformAdmin.id } });
  }
  audit(req, "ENQUIRY_TO_FOLLOWUP", { entityType: "ContactSubmission", entityId: item.id, metadata: { followUpId: followUp.id } });
  return ok(res, { followUp }, 201);
});

export const remove = handler(async (req, res) => {
  await prisma.contactSubmission.delete({ where: { id: req.params.id } });
  audit(req, "ENQUIRY_DELETED", { entityType: "ContactSubmission", entityId: req.params.id });
  return ok(res, { deleted: true });
});

export const exportCsv = handler(async (req, res) => {
  const items = await prisma.contactSubmission.findMany({ where: buildWhere(req.query), orderBy: { createdAt: "desc" }, take: 20000 });
  const csv = toCsv(items, [
    { label: "Date", key: "createdAt" },
    { label: "Restaurant", key: "restaurantName" },
    { label: "Name", key: "fullName" },
    { label: "Email", key: "email" },
    { label: "Phone", key: "phone" },
    { label: "Address", key: "address" },
    { label: "Message", key: "message" },
    { label: "Status", key: "status" },
    { label: "Replied", key: "repliedAt" },
  ]);
  return sendCsv(res, `enquiries-${dayKey(new Date())}.csv`, csv);
});
