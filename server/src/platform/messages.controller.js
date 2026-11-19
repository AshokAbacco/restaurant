// ==============================================
// server/src/platform/messages.controller.js
// /api/platform/messages — the platform team's inbox.
// ==============================================

import prisma from "../../prisma/client.js";
import { createConversation, postMessage, markRead } from "./messages.service.js";
import { loadOrgRows } from "./orgs.data.js";
import { audit } from "./platform.audit.js";
import { handler, ok, str, paging, notFound, badRequest, oneOf, bool } from "./platform.utils.js";

const STATUSES = ["OPEN", "PENDING", "RESOLVED", "CLOSED"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
const CATEGORIES = ["support", "billing", "renewal", "onboarding", "feedback", "announcement", "other"];

const convoInclude = {
  organization: { select: { id: true, name: true, ownerEmail: true, planId: true, isActive: true } },
  assignedTo: { select: { id: true, name: true } },
};

export const list = handler(async (req, res) => {
  const where = {};
  const status = String(req.query.status || "active");
  if (status === "active") where.status = { in: ["OPEN", "PENDING"] };
  else if (STATUSES.includes(status)) where.status = status;
  if (req.query.organizationId) where.organizationId = String(req.query.organizationId);
  if (req.query.category && CATEGORIES.includes(req.query.category)) where.category = req.query.category;
  if (req.query.assigned === "me") where.assignedToId = req.platformAdmin.id;
  if (req.query.assigned === "unassigned") where.assignedToId = null;
  if (bool(req.query.unread)) where.unreadForAdmin = { gt: 0 };
  const q = str(req.query.q, 100);
  if (q) {
    where.OR = [
      { subject: { contains: q, mode: "insensitive" } },
      { lastMessagePreview: { contains: q, mode: "insensitive" } },
      { organization: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const { page, pageSize, skip, take } = paging(req.query, { defaultSize: 30 });
  const [conversations, total, grouped, unread] = await Promise.all([
    prisma.platformConversation.findMany({
      where,
      include: convoInclude,
      orderBy: [{ unreadForAdmin: "desc" }, { lastMessageAt: "desc" }],
      skip,
      take,
    }),
    prisma.platformConversation.count({ where }),
    prisma.platformConversation.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.platformConversation.aggregate({ _sum: { unreadForAdmin: true } }),
  ]);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const g of grouped) counts[g.status] = g._count._all;
  return ok(res, {
    conversations,
    total,
    page,
    pageSize,
    counts: { ...counts, unread: unread._sum.unreadForAdmin || 0 },
  });
});

export const unreadCount = handler(async (req, res) => {
  const [unread, open] = await Promise.all([
    prisma.platformConversation.aggregate({ _sum: { unreadForAdmin: true } }),
    prisma.platformConversation.count({ where: { status: "OPEN" } }),
  ]);
  return ok(res, { unread: unread._sum.unreadForAdmin || 0, open });
});

export const get = handler(async (req, res) => {
  const conversation = await prisma.platformConversation.findUnique({
    where: { id: req.params.id },
    include: {
      ...convoInclude,
      messages: { orderBy: { createdAt: "asc" }, include: { admin: { select: { id: true, name: true } } } },
      followUps: { orderBy: { dueAt: "asc" }, select: { id: true, title: true, status: true, dueAt: true } },
    },
  });
  if (!conversation) throw notFound("Conversation not found.");
  if (conversation.unreadForAdmin > 0) await markRead(conversation.id, "ADMIN");
  return ok(res, { conversation: { ...conversation, unreadForAdmin: 0 } });
});

export const create = handler(async (req, res) => {
  const organizationId = str(req.body?.organizationId, 64);
  const subject = str(req.body?.subject, 200);
  const body = str(req.body?.body, 10000);
  if (!organizationId) throw badRequest("Pick a restaurant.");
  if (!subject) throw badRequest("Subject is required.");
  if (!body) throw badRequest("Message is required.");
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
  if (!org) throw notFound("Restaurant not found.");

  const conversation = await createConversation({
    organizationId,
    subject,
    category: oneOf(req.body?.category, CATEGORIES, "support"),
    priority: oneOf(req.body?.priority, PRIORITIES, "NORMAL"),
    startedBy: "ADMIN",
    assignedToId: req.body?.assignedToId || req.platformAdmin.id,
  });
  await postMessage({ conversationId: conversation.id, senderType: "ADMIN", body, admin: req.platformAdmin });
  audit(req, "CONVERSATION_STARTED", { entityType: "PlatformConversation", entityId: conversation.id, metadata: { organizationId, subject } });
  return ok(res, { conversation }, 201);
});

export const reply = handler(async (req, res) => {
  const conversation = await prisma.platformConversation.findUnique({ where: { id: req.params.id } });
  if (!conversation) throw notFound("Conversation not found.");
  const { message } = await postMessage({
    conversationId: conversation.id,
    senderType: "ADMIN",
    body: req.body?.body,
    admin: req.platformAdmin,
    isInternal: bool(req.body?.isInternal),
  });
  if (!conversation.assignedToId) {
    await prisma.platformConversation.update({ where: { id: conversation.id }, data: { assignedToId: req.platformAdmin.id } });
  }
  return ok(res, { message }, 201);
});

export const update = handler(async (req, res) => {
  const data = {};
  if (req.body?.status !== undefined) data.status = oneOf(req.body.status, STATUSES, "OPEN");
  if (req.body?.priority !== undefined) data.priority = oneOf(req.body.priority, PRIORITIES, "NORMAL");
  if (req.body?.category !== undefined) data.category = oneOf(req.body.category, CATEGORIES, "support");
  if (req.body?.subject !== undefined) data.subject = str(req.body.subject, 200) || undefined;
  if (req.body?.assignedToId !== undefined) data.assignedToId = req.body.assignedToId || null;
  const conversation = await prisma.platformConversation.update({ where: { id: req.params.id }, data, include: convoInclude });

  if (data.status === "RESOLVED" || data.status === "CLOSED") {
    await postMessage({
      conversationId: conversation.id,
      senderType: "SYSTEM",
      senderName: "System",
      body: `${req.platformAdmin.name} marked this conversation as ${data.status.toLowerCase()}.`,
      isInternal: true,
      notify: false,
    });
  }
  audit(req, "CONVERSATION_UPDATED", { entityType: "PlatformConversation", entityId: conversation.id, metadata: data });
  return ok(res, { conversation });
});

/**
 * Message many restaurants at once — one conversation per restaurant so
 * every reply lands in its own thread.
 * body: { subject, body, audience: "ALL"|"ACTIVE"|"TRIAL"|"EXPIRING"|"EXPIRED"|"SUSPENDED"|"SELECTED", organizationIds?: [] }
 */
export const broadcast = handler(async (req, res) => {
  const subject = str(req.body?.subject, 200);
  const body = str(req.body?.body, 10000);
  if (!subject || !body) throw badRequest("Subject and message are required.");
  const audience = String(req.body?.audience || "SELECTED");

  let ids = [];
  if (audience === "SELECTED") {
    ids = Array.isArray(req.body?.organizationIds) ? req.body.organizationIds.map(String) : [];
  } else {
    const { rows } = await loadOrgRows();
    ids = rows
      .filter((r) => audience === "ALL" || r.status === audience || (audience === "EXPIRED" && r.status === "TRIAL_EXPIRED"))
      .map((r) => r.id);
  }
  if (!ids.length) throw badRequest("No restaurants match that audience.");
  if (ids.length > 1000) throw badRequest("Broadcasts are limited to 1000 restaurants at a time.");

  let sent = 0;
  for (const organizationId of ids) {
    try {
      const conversation = await createConversation({
        organizationId,
        subject,
        category: oneOf(req.body?.category, CATEGORIES, "announcement"),
        startedBy: "ADMIN",
        assignedToId: req.platformAdmin.id,
      });
      await postMessage({ conversationId: conversation.id, senderType: "ADMIN", body, admin: req.platformAdmin });
      sent += 1;
    } catch (err) {
      console.error(`[platform] broadcast to ${organizationId} failed:`, err.message);
    }
  }
  audit(req, "BROADCAST_SENT", { metadata: { subject, audience, sent } });
  return ok(res, { sent, total: ids.length });
});

/** Sidebar badge counts — one cheap call, polled by the layout. */
export const badges = handler(async (req, res) => {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const [unread, followUps, enquiries, webhooks, errors, expiring] = await Promise.all([
    prisma.platformConversation.aggregate({ _sum: { unreadForAdmin: true } }),
    prisma.platformFollowUp.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueAt: { lt: tomorrow } } }),
    prisma.contactSubmission.count({ where: { status: "NEW" } }),
    prisma.platformWebhookLog.count({ where: { success: false, createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    prisma.platformErrorLog.count({ where: { resolved: false } }),
    prisma.organization.count({ where: { isActive: true, planExpiresAt: { gte: now, lte: new Date(Date.now() + 7 * 86400000) } } }),
  ]);
  return ok(res, {
    badges: { unread: unread._sum.unreadForAdmin || 0, followUps, enquiries, webhooks, errors, expiring },
  });
});
