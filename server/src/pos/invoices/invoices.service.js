// server/src/pos/invoices/invoices.service.js
import prisma from "../../config/prisma.js";

// FIX: was count()+1 — this one is especially live, since Owner-deleting an
// order (pos.service.js's deleteOrder) explicitly deletes that order's
// Invoice row too. That shrinks the count, so the very next invoice
// generated can collide with an existing invoiceNumber — same bug/fix as
// pos.service.js's generateOrderNumber. Basing it on the highest number
// actually seen removes the collision. Scoped per outlet now too, since
// invoiceNumber is @@unique([outletId, invoiceNumber]).
async function generateInvoiceNumber(outletId) {
  const last = await prisma.invoice.findFirst({
    where: { outletId },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  const lastNum = last
    ? parseInt(last.invoiceNumber.replace("INV-", ""), 10) || 0
    : 0;
  return `INV-${String(lastNum + 1).padStart(6, "0")}`;
}

// cashierId: the employee closing the bill, passed down from completeBilling's
// performedById (which comes from the verified token). Optional so the other
// callers of this function are unaffected.
export async function generateInvoice(
  orderId,
  { gstNumber, cashierId } = {},
  outletId,
) {
  const existing = await prisma.invoice.findFirst({
    where: { orderId, outletId },
  });
  if (existing) return existing;

  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId },
  });
  if (!order) throw new Error("Order not found");

  const invoiceNumber = await generateInvoiceNumber(outletId);

  return prisma.invoice.create({
    data: { outletId, orderId, invoiceNumber, gstNumber, cashierId: cashierId || null },
  });
}


// Resolves the name printed as "Cashier" on the bill.
//
// Invoice.cashierId always stores who ACTUALLY closed the bill (from the
// verified session) — that's the audit trail and it isn't touched here. This
// only decides what to DISPLAY, because on this system an owner or manager
// frequently rings up a sale, and printing "Restaurant Owner" on a customer
// receipt reads as a mistake even though it's technically true.
//
// Order of preference:
//   1. The person who billed it, IF their account role is CASHIER — then the
//      accurate answer and the expected one are the same thing.
//   2. Otherwise the outlet's designated CASHIER account (this is the
//      "fetch the Cashier role from user_accounts, restaurant-wise" rule).
//   3. Otherwise whoever billed it — better a real name than a blank line.
//
// Note on (2): with more than one active cashier at an outlet, the pick is
// the earliest-created account, so at least it's stable rather than random.
// If two cashiers work different shifts, the bill will name the same one for
// both — the true biller is still on Invoice.cashierId if you ever need it.
async function resolveCashierName(cashierId, outletId) {
  if (cashierId) {
    const billedBy = await prisma.userAccount.findFirst({
      where: { employeeId: cashierId, outletId },
      select: { role: true, employee: { select: { fullName: true } } },
    });
    if (billedBy?.role === "CASHIER") return billedBy.employee?.fullName || null;
  }

  const designated = await prisma.userAccount.findFirst({
    where: { outletId, role: "CASHIER", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { employee: { select: { fullName: true } } },
  });
  if (designated?.employee?.fullName) return designated.employee.fullName;

  if (cashierId) {
    const employee = await prisma.employee.findFirst({
      where: { id: cashierId, outletId },
      select: { fullName: true },
    });
    return employee?.fullName || null;
  }
  return null;
}

export async function getInvoiceByOrder(orderId, outletId) {
  const invoice = await prisma.invoice.findFirst({
    where: { orderId, outletId },
    include: {
      // Everything the printed invoice header needs. The outlet carries the
      // restaurant name/address/GSTIN/FSSAI; the waiter is the "Steward"
      // line; kitchenOrders supply the KOT number(s) the kitchen worked
      // from, which is what ties a printed bill back to a physical ticket
      // during a dispute.
      cashier: { select: { fullName: true, employeeCode: true } },
      outlet: {
        select: {
          name: true,
          address: true,
          phone: true,
          gstin: true,
          fssai: true,
          tagline: true,
          // Bill QR / barcode settings — the invoice renders the codes from
          // these, so they have to travel with the bill.
          upiId: true,
          upiPayeeName: true,
          showBillQr: true,
          showBillBarcode: true,
          billFooterNote: true,
        },
      },
      order: {
        include: {
          items: {
            include: { menuItem: true, addOns: { include: { addOn: true } } },
          },
          customer: true,
          table: true,
          waiter: { select: { fullName: true, employeeCode: true } },
          kitchenOrders: {
            select: { kotNumber: true },
            orderBy: { kotNumber: "asc" },
          },
          kitchenBranch: { select: { name: true } },
          payments: true,
          discountsApplied: true,
        },
      },
    },
  });

  if (!invoice) return null;

  // Flattened onto the invoice so the printed bill doesn't have to know any
  // of the resolution rules above.
  return {
    ...invoice,
    cashierName: await resolveCashierName(invoice.cashierId, outletId),
  };
}

export async function markSent(id, channel, outletId) {
  const invoice = await prisma.invoice.findFirst({ where: { id, outletId } });
  if (!invoice) throw new Error("Invoice not found");

  const existing = invoice.sentVia ? invoice.sentVia.split(",") : [];
  const sentVia = Array.from(new Set([...existing, channel])).join(",");

  return prisma.invoice.update({ where: { id }, data: { sentVia } });
}