// ==============================================
// server/src/support/support.routes.js
// Restaurant side of platform messaging (mounted at /api/support).
// The owner / admin / manager of a restaurant reads and answers messages
// from the platform team here, and can open new conversations — the other
// half of /api/platform/messages. Scoped strictly to req.user's
// organization: a restaurant can only ever see its own threads, and
// internal platform notes are never returned.
// ==============================================

import { Router } from "express";
import prisma from "../../prisma/client.js";
import {
  createConversation,
  postMessage,
  markRead,
} from "../platform/messages.service.js";
import { getSettings } from "../platform/platform.settings.js";

const router = Router();

const CATEGORIES = ["support", "billing", "renewal", "onboarding", "feedback", "other"];

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const loadOwnConversation = (req) =>
  prisma.platformConversation.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId },
  });

const senderFor = async (req) => {
  const account = await prisma.userAccount.findUnique({
    where: { id: req.user.id },
    select: { id: true, username: true, employee: { select: { fullName: true } } },
  });
  return {
    userAccount: { id: account?.id, name: account?.employee?.fullName || account?.username },
    senderName: `${account?.employee?.fullName || account?.username || "Restaurant"} (${req.user.role.toLowerCase()})`,
  };
};

// Support contact details (shown in the restaurant's Help page).
router.get("/info", async (req, res) => {
  const general = await getSettings("general");
  return res.json({
    success: true,
    support: {
      platformName: general.platformName,
      email: general.supportEmail,
      phone: general.supportPhone,
      whatsapp: general.supportWhatsapp,
    },
  });
});

router.get("/unread-count", async (req, res) => {
  const agg = await prisma.platformConversation.aggregate({
    where: { organizationId: req.user.organizationId },
    _sum: { unreadForRestaurant: true },
  });
  return res.json({ success: true, unread: agg._sum.unreadForRestaurant || 0 });
});

router.get("/conversations", async (req, res) => {
  const conversations = await prisma.platformConversation.findMany({
    where: { organizationId: req.user.organizationId },
    orderBy: [{ unreadForRestaurant: "desc" }, { lastMessageAt: "desc" }],
    select: {
      id: true,
      subject: true,
      status: true,
      category: true,
      priority: true,
      lastMessageAt: true,
      lastMessagePreview: true,
      lastSenderType: true,
      unreadForRestaurant: true,
      createdAt: true,
    },
    take: 200,
  });
  return res.json({ success: true, conversations });
});

router.get("/conversations/:id", async (req, res) => {
  const conversation = await loadOwnConversation(req);
  if (!conversation) return fail(res, 404, "Conversation not found.");
  const messages = await prisma.platformMessage.findMany({
    where: { conversationId: conversation.id, isInternal: false },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      senderType: true,
      senderName: true,
      body: true,
      createdAt: true,
      readByAdminAt: true,
      readByRestaurantAt: true,
      userAccountId: true,
    },
  });
  if (conversation.unreadForRestaurant > 0) await markRead(conversation.id, "RESTAURANT");
  return res.json({
    success: true,
    conversation: { ...conversation, unreadForRestaurant: 0, unreadForAdmin: undefined, assignedToId: undefined },
    messages,
  });
});

router.post("/conversations", async (req, res) => {
  const subject = String(req.body?.subject || "").trim().slice(0, 200);
  const body = String(req.body?.body || "").trim();
  if (!subject) return fail(res, 400, "Subject is required.");
  if (!body) return fail(res, 400, "Message is required.");
  const category = CATEGORIES.includes(req.body?.category) ? req.body.category : "support";

  const conversation = await createConversation({
    organizationId: req.user.organizationId,
    subject,
    category,
    startedBy: "RESTAURANT",
  });
  const sender = await senderFor(req);
  await postMessage({ conversationId: conversation.id, senderType: "RESTAURANT", body, ...sender });
  return res.status(201).json({ success: true, conversation });
});

router.post("/conversations/:id/messages", async (req, res) => {
  const conversation = await loadOwnConversation(req);
  if (!conversation) return fail(res, 404, "Conversation not found.");
  if (conversation.status === "CLOSED") {
    return fail(res, 400, "This conversation is closed. Start a new one if you need more help.");
  }
  const sender = await senderFor(req);
  try {
    const { message } = await postMessage({
      conversationId: conversation.id,
      senderType: "RESTAURANT",
      body: req.body?.body,
      ...sender,
    });
    return res.status(201).json({ success: true, message });
  } catch (err) {
    if (err.expose) return fail(res, err.status || 400, err.message);
    throw err;
  }
});

router.patch("/conversations/:id", async (req, res) => {
  const conversation = await loadOwnConversation(req);
  if (!conversation) return fail(res, 404, "Conversation not found.");
  const status = req.body?.status === "RESOLVED" ? "RESOLVED" : req.body?.status === "OPEN" ? "OPEN" : null;
  if (!status) return fail(res, 400, "Status can only be RESOLVED or OPEN.");
  const updated = await prisma.platformConversation.update({ where: { id: conversation.id }, data: { status } });
  return res.json({ success: true, conversation: { id: updated.id, status: updated.status } });
});

export default router;
