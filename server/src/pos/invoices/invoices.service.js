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

export async function generateInvoice(orderId, { gstNumber } = {}, outletId) {
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
    data: { outletId, orderId, invoiceNumber, gstNumber },
  });
}

export async function getInvoiceByOrder(orderId, outletId) {
  return prisma.invoice.findFirst({
    where: { orderId, outletId },
    include: {
      order: {
        include: {
          items: {
            include: { menuItem: true, addOns: { include: { addOn: true } } },
          },
          customer: true,
          table: true,
          payments: true,
          discountsApplied: true,
        },
      },
    },
  });
}

export async function markSent(id, channel, outletId) {
  const invoice = await prisma.invoice.findFirst({ where: { id, outletId } });
  if (!invoice) throw new Error("Invoice not found");

  const existing = invoice.sentVia ? invoice.sentVia.split(",") : [];
  const sentVia = Array.from(new Set([...existing, channel])).join(",");

  return prisma.invoice.update({ where: { id }, data: { sentVia } });
}