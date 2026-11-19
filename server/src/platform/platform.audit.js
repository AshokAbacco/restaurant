// ==============================================
// server/src/platform/platform.audit.js
// Fire-and-forget audit trail of what platform staff did.
// ==============================================

import prisma from "../../prisma/client.js";
import { clientIp } from "./platform.utils.js";

export const audit = (req, action, { entityType, entityId, metadata } = {}) => {
  prisma.platformAuditLog
    .create({
      data: {
        adminId: req?.platformAdmin?.id || null,
        action,
        entityType: entityType || null,
        entityId: entityId ? String(entityId) : null,
        metadata: metadata ?? undefined,
        ip: req ? clientIp(req) : null,
      },
    })
    .catch((err) => console.error("[platform] audit write failed:", err.message));
};
