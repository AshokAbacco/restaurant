// server/src/pos/invoices/invoices.controller.js
import * as invoicesService from "./invoices.service.js";

export async function generateInvoice(req, res) {
  try {
    const invoice = await invoicesService.generateInvoice(
      req.params.orderId,
      req.body,
      req.tenant.outletId,
    );
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ message: "Failed to generate invoice", error: err.message });
  }
}

export async function getInvoice(req, res) {
  try {
    const invoice = await invoicesService.getInvoiceByOrder(
      req.params.orderId,
      req.tenant.outletId,
    );
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch invoice", error: err.message });
  }
}

export async function markSent(req, res) {
  try {
    const invoice = await invoicesService.markSent(
      req.params.id,
      req.body.channel,
      req.tenant.outletId,
    );
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: "Failed to mark invoice as sent", error: err.message });
  }
}