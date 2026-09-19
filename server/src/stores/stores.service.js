// server/src/stores/stores.service.js
//
// FIX: this entire module previously called prisma.store.*, which no
// longer exists at all — Store was renamed/replaced by Organization +
// Outlet in section 0.1 (a plain string label became a real multi-tenant
// entity with an owning Organization, active login sessions depending on
// it, and cascading relations to nearly every other table). Every function
// here would have thrown outright, not just leaked data.
//
// This is also a genuine scope change, not just a rename: managing
// "stores" here really means managing every Outlet under the caller's
// Organization — which is a wider scope than req.tenant.outletId (this
// session's ONE current outlet). So every function below takes
// organizationId, not outletId, and the controller reads
// req.tenant.organizationId rather than req.tenant.outletId.
import prisma from "../config/prisma.js";

export const getAllOutlets = (organizationId) =>
  prisma.outlet.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });

export const getOutletById = (id, organizationId) =>
  prisma.outlet.findFirst({ where: { id, organizationId } });

// ==============================================
// PLAN BRANCH LIMIT
// ==============================================
// How many branches this organization may have live at once, and how many
// it is using. Read from Organization.branchLimit, which was stamped at
// registration from the PricingPayment that funded the account (see
// auth.service.js's registerOwner).
//
// Only ACTIVE outlets are counted. Deactivating a branch is a soft delete
// (deleteOutlet below sets isActive: false) and a deactivated branch can't
// be logged into or ordered from, so charging a plan slot for it would mean
// a 2-branch customer who closed and reopened a location could never get
// back to two. The trade-off is that deactivate/reactivate can be used to
// rotate between more than `limit` branch records — but never to operate
// more than `limit` at a time, which is what the plan actually sells.
export const getBranchUsage = async (organizationId) => {
  const [organization, used] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { planId: true, branchLimit: true, planExpiresAt: true },
    }),
    prisma.outlet.count({ where: { organizationId, isActive: true } }),
  ]);

  // Fall back to 1 rather than to unlimited if the organization somehow
  // can't be read: failing closed costs a support ticket, failing open
  // gives away the product.
  const limit = Math.max(1, organization?.branchLimit ?? 1);

  return {
    planId: organization?.planId || null,
    planExpiresAt: organization?.planExpiresAt || null,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    canAddMore: used < limit,
  };
};

// Returns the created outlet, or a { limitReached } marker the controller
// turns into a 403. Deliberately NOT a thrown error: hitting your plan
// limit is an expected, everyday answer to this request, not a fault.
//
// This check is the real enforcement. The Add Branch button disappearing in
// the UI is a courtesy; a POST straight to /api/stores has to be refused
// here or the limit means nothing.
export const createOutlet = async (data, organizationId) => {
  const usage = await getBranchUsage(organizationId);

  if (!usage.canAddMore) {
    return { limitReached: true, usage };
  }

  // The count and the create aren't in a transaction, so two simultaneous
  // creates could in principle both pass the check. That's tolerable here:
  // the worst case is one branch over a plan limit, by an owner who already
  // paid, caught on the next read of this page — whereas a serializable
  // transaction on every branch create would be a real cost for a table
  // that changes a handful of times a year.
  const outlet = await prisma.outlet.create({
    data: {
      organizationId,
      name: data.name,
      address: data.address || null,
      phone: data.phone || null,
      gstin: data.gstin || null,
      timezone: data.timezone || undefined, // let the schema default (Asia/Kolkata) apply if omitted
    },
  });

  return { outlet, usage: await getBranchUsage(organizationId) };
};

export const updateOutlet = async (id, data, organizationId) => {
  const existing = await prisma.outlet.findFirst({ where: { id, organizationId } });
  if (!existing) return null;

  // Restoring a deactivated branch is a second way to add one, so it needs
  // the same limit check as createOutlet. Without this, a 1-branch plan
  // could run two branches by creating one, deactivating it, creating
  // another, then restoring the first.
  //
  // Only checked when this call actually flips isActive false -> true;
  // editing the name or address of a branch that's already active must not
  // be blocked just because the org is at its limit.
  const isReactivating = data.isActive === true && existing.isActive === false;

  if (isReactivating) {
    const usage = await getBranchUsage(organizationId);
    if (!usage.canAddMore) {
      return { limitReached: true, usage };
    }
  }

  return prisma.outlet.update({
    where: { id },
    data: {
      name: data.name,
      address: data.address || null,
      phone: data.phone || null,
      gstin: data.gstin || null,
      fssai: data.fssai || null,
      tagline: data.tagline || null,
      // Without this, deleteOutlet's soft-delete (isActive: false) was a
      // one-way door: getAllOutlets returns inactive outlets too, so a
      // deactivated branch stayed visible in the Branches list forever with
      // no way to bring it back short of editing the database by hand.
      // Only applied when the caller explicitly sends a boolean, so a normal
      // name/address edit leaves isActive exactly as it was.
      ...(typeof data.isActive === "boolean"
        ? { isActive: data.isActive }
        : {}),
    },
  });
};

// Outlets are always deactivated, never hard-deleted, via this endpoint —
// unlike the old Store row (which was just a label), an Outlet has real
// cascading relations to orders, employees, inventory, everything. A hard
// delete here would be catastrophic if triggered by mistake; deactivating
// (isActive: false) removes it from login/outlet-switcher options without
// destroying any history. If a genuine permanent delete is ever needed,
// that should be a deliberate, separate, more heavily-guarded operation —
// not the default behavior of a DELETE call on this route.
export const deleteOutlet = async (id, organizationId) => {
  const outlet = await prisma.outlet.findFirst({ where: { id, organizationId } });
  if (!outlet) return null;

  return prisma.outlet.update({
    where: { id },
    data: { isActive: false },
  });
};