// server/src/pricing/invoice.service.js
//
// Runs once per successful payment: build the PDF, store it in Cloudflare
// R2, email it to the customer and to info@abaccotech.com, and record what
// happened on the PricingPayment row.
//
// WHY IT'S SAFE TO CALL TWICE
// ---------------------------
// A captured payment reaches us from two independent directions — the
// browser returning with a signature (/verify-payment) and Razorpay's
// server-to-server webhook — and either may arrive first, or both. The
// claim below is an atomic updateMany gated on `invoiceSentAt: null`, so
// exactly one caller wins and the loser returns without sending. If the
// work then fails, the claim is released so the next attempt (a webhook
// retry, or the resend endpoint) can pick it up again.
//
// NOTHING here runs for a failed, cancelled or abandoned checkout: by
// design pricing.service.js writes no row at all in those cases, and this
// function additionally refuses anything that isn't status PAID.

import prisma from "../../prisma/client.js";
import { uploadToR2 } from "../config/r2.js";
import { buildInvoicePdf } from "./invoice.pdf.js";
import { planFeatures } from "./pricing.plans.js";
import {
  sendInvoiceToClient,
  sendInvoiceToCompany,
} from "./invoice.mailer.js";

// A free trial takes no money, so there is nothing to invoice. Flip this to
// true if you'd rather send a ₹0 invoice for trial signups too.
const INVOICE_FREE_PLANS = false;

/**
 * INV-YYYYMM-XXXXXX — derived from the row id, so retries reuse the same
 * number instead of minting a new one for the same payment.
 */
function invoiceNumberFor(payment) {
  const d = new Date(payment.createdAt);
  const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const suffix = payment.id.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `INV-${stamp}-${suffix}`;
}

/**
 * @param {object|string} paymentOrId  a PricingPayment row, or its id
 * @param {object} [opts]
 * @param {boolean} [opts.force]  re-send even if already sent
 */
export async function sendInvoiceForPayment(paymentOrId, { force = false } = {}) {
  const payment =
    typeof paymentOrId === "string"
      ? await prisma.pricingPayment.findUnique({ where: { id: paymentOrId } })
      : paymentOrId;

  if (!payment) {
    return { sent: false, reason: "no such payment" };
  }

  // Guard rail: only a captured payment gets an invoice.
  if (payment.status !== "PAID") {
    return { sent: false, reason: `status is ${payment.status}` };
  }

  if (!INVOICE_FREE_PLANS && (payment.planId === "free" || payment.amount <= 0)) {
    return { sent: false, reason: "free plan — no payment to invoice" };
  }

  if (!payment.email) {
    console.error(`[invoice] payment ${payment.id} has no email — cannot send.`);
    return { sent: false, reason: "no email on record" };
  }

  const invoiceNumber = payment.invoiceNumber || invoiceNumberFor(payment);

  // ---- Claim the send, atomically ----
  if (!force) {
    const claim = await prisma.pricingPayment.updateMany({
      where: { id: payment.id, invoiceSentAt: null },
      data: { invoiceSentAt: new Date(), invoiceNumber },
    });

    if (claim.count === 0) {
      return { sent: false, reason: "invoice already sent" };
    }
  }

  try {
    // ---- 1. PDF, in memory only ----
    const pdf = await buildInvoicePdf(payment, {
      invoiceNumber,
      features: planFeatures(payment.planId),
    });

    // ---- 2. Store it in R2 (never on local disk) ----
    // Reuses the same uploader as menu images (src/config/r2.js), which
    // names the object with a random UUID under the folder given — so the
    // invoice URL is unguessable even though the bucket is public.
    let invoiceUrl = null;
    try {
      const stored = await uploadToR2(
        pdf,
        `${invoiceNumber}.pdf`,
        "application/pdf",
        "invoices",
      );
      invoiceUrl = stored.url;
    } catch (err) {
      // The attachment is what the customer actually needs, so a storage
      // outage must not cost them their invoice. Log and carry on.
      console.error(`[invoice] R2 upload failed for ${invoiceNumber}:`, err.message);
    }

    // ---- 3. Both emails ----
    const [toClient, toCompany] = await Promise.allSettled([
      sendInvoiceToClient(payment, { pdf, invoiceNumber }),
      sendInvoiceToCompany(payment, { pdf, invoiceNumber, invoiceUrl }),
    ]);

    if (toClient.status === "rejected") {
      console.error(
        `[invoice] client email failed for ${invoiceNumber}:`,
        toClient.reason?.message || toClient.reason,
      );
    }
    if (toCompany.status === "rejected") {
      console.error(
        `[invoice] company email failed for ${invoiceNumber}:`,
        toCompany.reason?.message || toCompany.reason,
      );
    }

    // If neither email left the building, release the claim so a webhook
    // retry can try again rather than the invoice being lost silently.
    if (toClient.status === "rejected" && toCompany.status === "rejected") {
      await prisma.pricingPayment.update({
        where: { id: payment.id },
        data: { invoiceSentAt: null },
      });
      return { sent: false, reason: "both emails failed", invoiceNumber };
    }

    await prisma.pricingPayment.update({
      where: { id: payment.id },
      data: { invoiceNumber, invoiceUrl, invoiceSentAt: new Date() },
    });

    console.log(
      `[invoice] ${invoiceNumber} sent to ${payment.email}` +
        (invoiceUrl ? ` · stored at ${invoiceUrl}` : ""),
    );

    return { sent: true, invoiceNumber, invoiceUrl };
  } catch (err) {
    // Release the claim so this payment can be retried.
    await prisma.pricingPayment
      .update({ where: { id: payment.id }, data: { invoiceSentAt: null } })
      .catch(() => {});

    console.error(`[invoice] failed for payment ${payment.id}:`, err);
    return { sent: false, reason: err.message };
  }
}