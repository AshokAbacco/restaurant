// ==============================================
// server/src/platform/followups.controller.js
// /api/platform/follow-ups — scheduled follow-ups with a full activity log.
// A follow-up can be tied to a restaurant, a website enquiry, or just a
// contact. When tied to a restaurant, "Send message" posts into a real
// two-way conversation (messages.service.js); the restaurant's replies
// show up on the follow-up itself.
// ==============================================

import prisma from "../../prisma/client.js";
import { createConversation, postMessage } from "./messages.service.js";
import { sendMail, escMultiline } from "../config/mailer.js";
import { audit } from "./platform.audit.js";
import { hasPerm } from "./platform.auth.js";
import {
  handler,
  ok,
  str,
  optStr,
  paging,
  notFound,
  badRequest,
  forbidden,
  oneOf,
  date,
  startOfDay,
  addDays,
} from "./platform.utils.js";

const TYPES = ["RENEWAL", "PAYMENT", "ONBOARDING", "SUPPORT", "SALES", "FEEDBACK", "OTHER"];
const STATUSES = ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
const CHANNELS = ["call", "email", "message", "whatsapp", "meeting"];
const ACTIVITY_TYPES = ["NOTE", "CALL", "EMAIL", "MESSAGE", "WHATSAPP", "MEETING"];

const include = {
  organization: { select: { id: true, name: true, ownerEmail: true, planId: true, planExpiresAt: true } },
  enquiry: { select: { id: true, restaurantName: true, fullName: true, email: true, phone: true, status: true } },
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
};

const OPEN = ["PENDING", "IN_PROGRESS"];

const tabWhere = (tab) => {
  const today = startOfDay();
  const tomorrow = addDays(today, 1);
  switch (tab) {
    case "today":
      return { status: { in: OPEN }, dueAt: { gte: today, lt: tomorrow } };
    case "overdue":
      return { status: { in: OPEN }, dueAt: { lt: today } };
    case "upcoming":
      return { status: { in: OPEN }, dueAt: { gte: tomorrow } };
    case "open":
      return { status: { in: OPEN } };
    case "completed":
      return { status: { in: ["DONE", "CANCELLED"] } };
    default:
      return {};
  }
};

const addActivity = (followUpId, type, note, adminId) =>
  prisma.platformFollowUpActivity.create({ data: { followUpId, type, note: note || null, adminId: adminId || null } });

export const list = handler(async (req, res) => {
  const tab = String(req.query.tab || "open");
  const base = {};
  if (req.query.assigned === "me") base.assignedToId = req.platformAdmin.id;
  else if (req.query.assigned && req.query.assigned !== "all") base.assignedToId = String(req.query.assigned);
  if (req.query.type && TYPES.includes(req.query.type)) base.type = req.query.type;
  if (req.query.priority && PRIORITIES.includes(req.query.priority)) base.priority = req.query.priority;
  if (req.query.organizationId) base.organizationId = String(req.query.organizationId);
  if (req.query.enquiryId) base.enquiryId = String(req.query.enquiryId);
  const q = str(req.query.q, 100);
  if (q) {
    base.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
      { organization: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  const where = { ...base, ...tabWhere(tab) };
  const { page, pageSize, skip, take } = paging(req.query, { defaultSize: 50 });

  const [followUps, total, today, overdue, upcoming, completed, open] = await Promise.all([
    prisma.platformFollowUp.findMany({
      where,
      include: { ...include, _count: { select: { activities: true } } },
      orderBy: tab === "completed" ? { completedAt: "desc" } : [{ dueAt: "asc" }],
      skip,
      take,
    }),
    prisma.platformFollowUp.count({ where }),
    prisma.platformFollowUp.count({ where: { ...base, ...tabWhere("today") } }),
    prisma.platformFollowUp.count({ where: { ...base, ...tabWhere("overdue") } }),
    prisma.platformFollowUp.count({ where: { ...base, ...tabWhere("upcoming") } }),
    prisma.platformFollowUp.count({ where: { ...base, ...tabWhere("completed") } }),
    prisma.platformFollowUp.count({ where: { ...base, ...tabWhere("open") } }),
  ]);

  return ok(res, { followUps, total, page, pageSize, counts: { today, overdue, upcoming, completed, open } });
});

export const get = handler(async (req, res) => {
  const followUp = await prisma.platformFollowUp.findUnique({
    where: { id: req.params.id },
    include: {
      ...include,
      activities: { orderBy: { createdAt: "desc" }, include: { admin: { select: { id: true, name: true } } } },
      conversation: {
        include: { messages: { orderBy: { createdAt: "asc" }, take: 200 } },
      },
    },
  });
  if (!followUp) throw notFound("Follow-up not found.");
  return ok(res, { followUp });
});

export const create = handler(async (req, res) => {
  const b = req.body || {};
  const title = str(b.title, 200);
  if (!title) throw badRequest("Title is required.");
  const dueAt = date(b.dueAt);
  if (!dueAt) throw badRequest("Pick a due date.");

  const followUp = await prisma.platformFollowUp.create({
    data: {
      title,
      notes: optStr(b.notes, 5000),
      type: oneOf(b.type, TYPES, "OTHER"),
      priority: oneOf(b.priority, PRIORITIES, "NORMAL"),
      channel: CHANNELS.includes(b.channel) ? b.channel : null,
      status: "PENDING",
      dueAt,
      organizationId: b.organizationId || null,
      enquiryId: b.enquiryId || null,
      conversationId: b.conversationId || null,
      contactName: optStr(b.contactName, 120),
      contactPhone: optStr(b.contactPhone, 30),
      contactEmail: optStr(b.contactEmail, 160),
      assignedToId: b.assignedToId || req.platformAdmin.id,
      createdById: req.platformAdmin.id,
    },
    include,
  });
  await addActivity(followUp.id, "CREATED", `Follow-up created, due ${dueAt.toDateString()}`, req.platformAdmin.id);
  audit(req, "FOLLOWUP_CREATED", { entityType: "PlatformFollowUp", entityId: followUp.id, metadata: { title } });
  return ok(res, { followUp }, 201);
});

export const update = handler(async (req, res) => {
  const existing = await prisma.platformFollowUp.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Follow-up not found.");
  const b = req.body || {};
  const data = {};
  if (b.title !== undefined) data.title = str(b.title, 200) || existing.title;
  if (b.notes !== undefined) data.notes = optStr(b.notes, 5000);
  if (b.type !== undefined) data.type = oneOf(b.type, TYPES, existing.type);
  if (b.priority !== undefined) data.priority = oneOf(b.priority, PRIORITIES, existing.priority);
  if (b.channel !== undefined) data.channel = CHANNELS.includes(b.channel) ? b.channel : null;
  if (b.assignedToId !== undefined) data.assignedToId = b.assignedToId || null;
  if (b.organizationId !== undefined) data.organizationId = b.organizationId || null;
  if (b.contactName !== undefined) data.contactName = optStr(b.contactName, 120);
  if (b.contactPhone !== undefined) data.contactPhone = optStr(b.contactPhone, 30);
  if (b.contactEmail !== undefined) data.contactEmail = optStr(b.contactEmail, 160);
  if (b.outcome !== undefined) data.outcome = optStr(b.outcome, 2000);

  const activities = [];
  if (b.dueAt !== undefined) {
    const d = date(b.dueAt);
    if (!d) throw badRequest("Invalid due date.");
    if (d.getTime() !== existing.dueAt.getTime()) {
      data.dueAt = d;
      activities.push(["RESCHEDULED", `Rescheduled from ${existing.dueAt.toDateString()} to ${d.toDateString()}${b.reason ? ` — ${str(b.reason, 300)}` : ""}`]);
    }
  }
  if (b.status !== undefined && b.status !== existing.status) {
    data.status = oneOf(b.status, STATUSES, existing.status);
    data.completedAt = data.status === "DONE" || data.status === "CANCELLED" ? new Date() : null;
    activities.push(["STATUS", `Status changed: ${existing.status} → ${data.status}${data.outcome ? ` — ${data.outcome}` : ""}`]);
  }
  if (data.assignedToId !== undefined && data.assignedToId !== existing.assignedToId) {
    activities.push(["NOTE", "Reassigned"]);
  }

  const followUp = await prisma.platformFollowUp.update({ where: { id: existing.id }, data, include });
  for (const [type, note] of activities) await addActivity(existing.id, type, note, req.platformAdmin.id);
  return ok(res, { followUp });
});

/** Mark done, optionally scheduling the next follow-up in the chain. */
export const complete = handler(async (req, res) => {
  const existing = await prisma.platformFollowUp.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Follow-up not found.");
  const outcome = optStr(req.body?.outcome, 2000);
  const followUp = await prisma.platformFollowUp.update({
    where: { id: existing.id },
    data: { status: "DONE", completedAt: new Date(), outcome },
    include,
  });
  await addActivity(existing.id, "STATUS", `Completed${outcome ? ` — ${outcome}` : ""}`, req.platformAdmin.id);

  let next = null;
  const nextDue = date(req.body?.nextDueAt);
  if (nextDue) {
    next = await prisma.platformFollowUp.create({
      data: {
        title: str(req.body?.nextTitle, 200) || existing.title,
        notes: outcome ? `Previous outcome: ${outcome}` : existing.notes,
        type: existing.type,
        priority: existing.priority,
        channel: existing.channel,
        dueAt: nextDue,
        organizationId: existing.organizationId,
        enquiryId: existing.enquiryId,
        conversationId: existing.conversationId,
        contactName: existing.contactName,
        contactPhone: existing.contactPhone,
        contactEmail: existing.contactEmail,
        assignedToId: existing.assignedToId,
        createdById: req.platformAdmin.id,
      },
    });
    await addActivity(next.id, "CREATED", "Scheduled as the next step of a completed follow-up", req.platformAdmin.id);
  }
  audit(req, "FOLLOWUP_COMPLETED", { entityType: "PlatformFollowUp", entityId: existing.id, metadata: { outcome } });
  return ok(res, { followUp, next });
});

export const logActivity = handler(async (req, res) => {
  const existing = await prisma.platformFollowUp.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Follow-up not found.");
  const type = oneOf(req.body?.type, ACTIVITY_TYPES, "NOTE");
  const note = str(req.body?.note, 5000);
  if (!note) throw badRequest("Add a note describing what happened.");
  const activity = await addActivity(existing.id, type, note, req.platformAdmin.id);
  if (existing.status === "PENDING") {
    await prisma.platformFollowUp.update({ where: { id: existing.id }, data: { status: "IN_PROGRESS" } });
  }
  return ok(res, { activity }, 201);
});

/**
 * Two-way message from a follow-up. Restaurant follow-ups post into the
 * in-app conversation (replies come back into the same thread); contacts
 * without a restaurant (enquiries / prospects) get an email instead.
 */
export const sendMessage = handler(async (req, res) => {
  if (!hasPerm(req, "messages.write")) throw forbidden("You need permission to message restaurants.");
  const followUp = await prisma.platformFollowUp.findUnique({ where: { id: req.params.id }, include });
  if (!followUp) throw notFound("Follow-up not found.");
  const body = str(req.body?.body, 10000);
  if (!body) throw badRequest("Message is required.");

  if (followUp.organizationId) {
    let conversationId = followUp.conversationId;
    if (conversationId) {
      const convo = await prisma.platformConversation.findUnique({ where: { id: conversationId } });
      if (!convo || convo.status === "CLOSED") conversationId = null;
    }
    if (!conversationId) {
      const category = { RENEWAL: "renewal", PAYMENT: "billing", ONBOARDING: "onboarding", FEEDBACK: "feedback" }[followUp.type] || "support";
      // A follow-up gets its own thread (subject = follow-up title), so the
      // restaurant's replies to it never mix with an unrelated conversation.
      const convo = await createConversation({
        organizationId: followUp.organizationId,
        category,
        subject: str(req.body?.subject, 200) || followUp.title,
        startedBy: "ADMIN",
        assignedToId: req.platformAdmin.id,
      });
      conversationId = convo.id;
      await prisma.platformFollowUp.update({ where: { id: followUp.id }, data: { conversationId } });
    }
    const { message } = await postMessage({ conversationId, senderType: "ADMIN", body, admin: req.platformAdmin });
    await addActivity(followUp.id, "MESSAGE", body.slice(0, 1000), req.platformAdmin.id);
    if (followUp.status === "PENDING") {
      await prisma.platformFollowUp.update({ where: { id: followUp.id }, data: { status: "IN_PROGRESS" } });
    }
    return ok(res, { channel: "in-app", conversationId, message }, 201);
  }

  const email = followUp.contactEmail || followUp.enquiry?.email;
  if (!email) throw badRequest("This follow-up has no restaurant or email address to message.");
  const subject = str(req.body?.subject, 200) || followUp.title;
  const result = await sendMail({ to: email, subject, text: body, html: `<p>${escMultiline(body)}</p>` });
  await addActivity(followUp.id, "EMAIL", `To ${email}: ${body.slice(0, 1000)}`, req.platformAdmin.id);
  if (followUp.status === "PENDING") {
    await prisma.platformFollowUp.update({ where: { id: followUp.id }, data: { status: "IN_PROGRESS" } });
  }
  return ok(res, { channel: "email", to: email, skipped: Boolean(result?.skipped) }, 201);
});

export const remove = handler(async (req, res) => {
  await prisma.platformFollowUp.delete({ where: { id: req.params.id } });
  audit(req, "FOLLOWUP_DELETED", { entityType: "PlatformFollowUp", entityId: req.params.id });
  return ok(res, { deleted: true });
});

// Exported for the automation job (renewal follow-ups).
export const ensureRenewalFollowUp = async (org, dueAt, note) => {
  const existing = await prisma.platformFollowUp.findFirst({
    where: { organizationId: org.id, type: "RENEWAL", status: { in: OPEN } },
  });
  if (existing) return null;
  const fu = await prisma.platformFollowUp.create({
    data: {
      title: `Renewal: ${org.name}`,
      notes: note,
      type: "RENEWAL",
      priority: "HIGH",
      channel: "call",
      dueAt,
      organizationId: org.id,
    },
  });
  await addActivity(fu.id, "CREATED", "Created automatically — plan is close to expiry.", null);
  return fu;
};

