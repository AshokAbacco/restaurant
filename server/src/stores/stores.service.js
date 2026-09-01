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

export const createOutlet = (data, organizationId) =>
  prisma.outlet.create({
    data: {
      organizationId,
      name: data.name,
      address: data.address || null,
      phone: data.phone || null,
      gstin: data.gstin || null,
      timezone: data.timezone || undefined, // let the schema default (Asia/Kolkata) apply if omitted
    },
  });

export const updateOutlet = async (id, data, organizationId) => {
  const existing = await prisma.outlet.findFirst({ where: { id, organizationId } });
  if (!existing) return null;

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