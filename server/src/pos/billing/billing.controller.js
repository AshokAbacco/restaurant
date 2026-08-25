// server/src/pos/billing/billing.controller.js
import * as billingService from "./billing.service.js";

export async function getBillingSummary(req, res) {
  try {
    const summary = await billingService.getBillingSummary(
      req.params.orderId,
      req.tenant.outletId,
    );
    res.json(summary);
  } catch (err) {
    res.status(400).json({ message: "Failed to fetch billing summary", error: err.message });
  }
}

export async function completeBilling(req, res) {
  try {
    const result = await billingService.completeBilling(
      req.params.orderId,
      // performedById: who's actually completing the bill (for the cash
      // drawer's SALE transaction and the audit trail generally) — the
      // authenticated session, never a client-supplied field.
      { ...req.body, performedById: req.user?.employeeId },
      req.tenant.outletId,
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: "Failed to complete billing", error: err.message });
  }
}