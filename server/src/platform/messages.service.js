// ==============================================
// server/src/platform/messages.service.js
// Two-way conversations between the platform team and a restaurant.
// Used by BOTH sides:
//   - /api/platform/messages  (platform staff)
//   - /api/support            (restaurant owner/admin/manager, in-app)
// Unread counters are kept per side on the conversation row so both
// inboxes can show badges with a single cheap query.
// ==============================================

import prisma from "../../prisma/client.js";
import { sendMail, esc, escMultiline, COMPANY_EMAIL } from "../config/mailer.js";
import { getAllSettings } from "./platform.settings.js";

const preview = (body) => String(body || "").replace(/\s+/g, " ").trim().slice(0, 140);

export const createConversation = async ({
  organizationId,
  subject,
  category = "support",
  priority = "NORMAL",
  startedBy = "ADMIN",
  assignedToId = null,
}) =>
  prisma.platformConversation.create({
    data: {
      organizationId,
      subject: String(subject || "Conversation").slice(0, 200),
      category,
      priority,
      startedBy,
      assignedToId,
      status: "OPEN",
    },
  });

/** Find the open conversation for a category, or start one. */
export const findOrCreateConversation = async ({ organizationId, category, subject, assignedToId }) => {
  const existing = await prisma.platformConversation.findFirst({
    where: { organizationId, category, status: { in: ["OPEN", "PENDING"] } },
    orderBy: { lastMessageAt: "desc" },
  });
  if (existing) return existing;
  return createConversation({ organizationId, subject, category, assignedToId });
};

/**
 * Appends a message and updates the conversation's counters/status.
 * senderType: "ADMIN" | "RESTAURANT" | "SYSTEM"
 */
export const postMessage = async ({
  conversationId,
  senderType,
  body,
  admin = null,
  userAccount = null,
  senderName,
  isInternal = false,
  notify = true,
}) => {
  const text = String(body || "").trim();
  if (!text) {
    const err = new Error("Message can't be empty.");
    err.status = 400;
    err.expose = true;
    throw err;
  }

  const fromAdmin = senderType === "ADMIN" || senderType === "SYSTEM";
  const now = new Date();

  const [message, conversation] = await prisma.$transaction([
    prisma.platformMessage.create({
      data: {
        conversationId,
        senderType,
        adminId: admin?.id || null,
        userAccountId: userAccount?.id || null,
        senderName: senderName || admin?.name || userAccount?.name || (fromAdmin ? "Platform team" : "Restaurant"),
        body: text.slice(0, 10000),
        isInternal,
        readByAdminAt: fromAdmin ? now : null,
        readByRestaurantAt: fromAdmin ? null : now,
      },
    }),
    prisma.platformConversation.update({
      where: { id: conversationId },
      data: isInternal
        ? { updatedAt: now }
        : {
            lastMessageAt: now,
            lastMessagePreview: preview(text),
            lastSenderType: senderType,
            // Admin replied -> waiting on the restaurant; restaurant wrote -> open for us.
            status: fromAdmin ? "PENDING" : "OPEN",
            ...(fromAdmin
              ? { unreadForRestaurant: { increment: 1 } }
              : { unreadForAdmin: { increment: 1 } }),
          },
      include: { organization: { select: { id: true, name: true, ownerEmail: true } } },
    }),
  ]);

  if (notify && !isInternal) {
    notifyOtherSide({ conversation, message, fromAdmin }).catch((err) =>
      console.error("[platform] message notification failed:", err.message),
    );
  }

  return { message, conversation };
};

const notifyOtherSide = async ({ conversation, message, fromAdmin }) => {
  const settings = await getAllSettings();
  const platformName = settings.general.platformName || "Platform";

  if (fromAdmin && settings.messaging.emailRestaurantOnReply && conversation.organization?.ownerEmail) {
    await sendMail({
      to: conversation.organization.ownerEmail,
      subject: `[${platformName}] ${conversation.subject}`,
      text: `${message.body}\n\n${settings.messaging.signature || ""}\n\nReply from your dashboard: Help & Support → Messages.`,
      html: `<p>${escMultiline(message.body)}</p><p style="color:#666">${esc(settings.messaging.signature || "")}</p><p style="color:#999;font-size:12px">Reply from your dashboard: Help &amp; Support → Messages.</p>`,
    });
  }

  if (!fromAdmin) {
    if (settings.messaging.notifyTeamOnNewMessage) {
      const to = settings.notifications.notifyEmail || COMPANY_EMAIL;
      if (to) {
        await sendMail({
          to,
          subject: `New message from ${conversation.organization?.name}: ${conversation.subject}`,
          text: `${message.senderName} wrote:\n\n${message.body}`,
          html: `<p><b>${esc(message.senderName)}</b> (${esc(conversation.organization?.name)}) wrote:</p><p>${escMultiline(message.body)}</p>`,
        });
      }
    }
    if (settings.messaging.autoReplyEnabled && settings.messaging.autoReplyText) {
      // Only auto-reply to the first restaurant message in a quiet thread.
      const recentAdmin = await prisma.platformMessage.count({
        where: {
          conversationId: conversation.id,
          senderType: { in: ["ADMIN", "SYSTEM"] },
          createdAt: { gte: new Date(Date.now() - 6 * 3600 * 1000) },
        },
      });
      if (!recentAdmin) {
        await postMessage({
          conversationId: conversation.id,
          senderType: "SYSTEM",
          senderName: `${platformName} (auto-reply)`,
          body: settings.messaging.autoReplyText,
          notify: false,
        });
      }
    }
  }
};

export const markRead = async (conversationId, side) => {
  const now = new Date();
  if (side === "ADMIN") {
    await prisma.$transaction([
      prisma.platformMessage.updateMany({
        where: { conversationId, readByAdminAt: null },
        data: { readByAdminAt: now },
      }),
      prisma.platformConversation.update({ where: { id: conversationId }, data: { unreadForAdmin: 0 } }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.platformMessage.updateMany({
        where: { conversationId, readByRestaurantAt: null, isInternal: false },
        data: { readByRestaurantAt: now },
      }),
      prisma.platformConversation.update({ where: { id: conversationId }, data: { unreadForRestaurant: 0 } }),
    ]);
  }
};
