// server/src/crm/crm.middleware.js
import { getCrmSettings } from "../settings/outletSettings.service.js";

// Every CRM endpoint except /config sits behind this. When Settings -> CRM
// is switched off the whole module is closed at the API, not just hidden in
// the UI, so a stale POS tab can't keep writing customer data.
export async function requireCrmEnabled(req, res, next) {
  try {
    const { enabled } = await getCrmSettings(req.tenant.outletId);
    if (!enabled) {
      return res.status(403).json({
        code: "CRM_DISABLED",
        message: "CRM is turned off",
        error: "Turn it on in Settings → CRM to manage customers.",
      });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}