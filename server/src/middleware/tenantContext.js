// ==============================================
// src/middleware/tenantContext.js
// ==============================================
//
// Must run AFTER requireAuth (see auth.middleware.js), which decodes the
// access token and puts { id, employeeId, organizationId, outletId, role }
// on req.user.
//
// requireAuth alone tells you WHO is making the request. This middleware
// enforces that they also have an outlet selected for THIS request, and
// gives every downstream controller/service a single, consistent place to
// read it from (req.tenant) instead of re-reading req.user.outletId
// everywhere by hand — which is exactly the kind of copy-pasted detail
// that eventually gets forgotten on one route and causes a cross-outlet
// leak.
//
// req.user.outletId can legitimately be missing for an OWNER/ADMIN account
// on a multi-outlet organization who is mid-login (see auth.service.js —
// login() returns requiresOutletSelection: true and does NOT issue a real
// access token yet in that case). In practice that means requireAuth
// itself will already reject those requests, since there's no access
// token to verify. This middleware's missing-outlet check mainly guards
// against future bugs — a bad/hand-crafted token, or a route wired up
// without going through the real login flow — rather than a case that
// happens in normal use today.

export const requireOutletContext = (req, res, next) => {
  if (!req.user) {
    // Should never happen if requireAuth ran first — fail closed rather
    // than assume.
    return res
      .status(401)
      .json({ success: false, message: "Authentication required." });
  }

  if (!req.user.outletId || !req.user.organizationId) {
    return res.status(403).json({
      success: false,
      message: "No outlet selected for this session. Please log in again.",
    });
  }

  req.tenant = {
    organizationId: req.user.organizationId,
    outletId: req.user.outletId,
  };

  return next();
};