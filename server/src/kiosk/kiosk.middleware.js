// server/src/kiosk/kiosk.middleware.js
import prisma from "../config/prisma.js";

const getValidKeys = () =>
  (process.env.KIOSK_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

export const requireKioskAuth = (req, res, next) => {
  const validKeys = getValidKeys();
  const key = req.header("x-kiosk-key");

  if (validKeys.length === 0) {
    console.log("⚠️ No kiosk keys configured, allowing request");
    return next();
  }

  if (!key || !validKeys.includes(key)) {
    console.log("❌ Kiosk key rejected");

    return res.status(401).json({
      success: false,
      message: "Invalid or missing kiosk device key",
    });
  }

  console.log("✅ Kiosk key accepted");

  next();
};

// ==================================================
// resolveKioskOutlet
// ==================================================
// FIX: this whole module previously had NO outlet resolution at all —
// requireKioskAuth only checks a shared device key, which is the same
// across every outlet (there's no staff login/JWT here to carry
// organizationId/outletId the way requireOutletContext does elsewhere).
// Every kiosk query was therefore unscoped: getKioskMenu() returned every
// outlet's menu items mixed together, getAvailableTables() showed every
// outlet's free tables, etc.
//
// The kiosk flow's real-world equivalent of "being logged into an outlet"
// is the QR code physically stuck to a specific table — it encodes which
// outlet (and usually which table) the customer is ordering at. Until the
// frontend passes that through, every kiosk request must explicitly carry
// outletId (query param on GET, body field on POST/writes) and this
// middleware validates it against a real, active Outlet before attaching
// req.tenant — same shape (`req.tenant.outletId`) as the staff-side
// requireOutletContext, so kiosk services can reuse the exact same
// "outletId, no exceptions" pattern as the rest of the app.
export const resolveKioskOutlet = async (req, res, next) => {
  const outletId = req.query.outletId || req.body?.outletId;

  if (!outletId) {
    return res.status(400).json({
      success: false,
      message: "outletId is required (from the table's QR code).",
    });
  }

  const outlet = await prisma.outlet.findFirst({
    where: { id: outletId, isActive: true },
    select: { id: true },
  });

  if (!outlet) {
    return res.status(404).json({
      success: false,
      message: "This outlet is not available.",
    });
  }

  req.tenant = { outletId: outlet.id };
  next();
};