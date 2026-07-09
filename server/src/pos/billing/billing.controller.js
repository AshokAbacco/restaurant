// server/src/pos/billing/billing.controller.js
import * as billingService from "./billing.service.js";

export async function getBillingSummary(req, res) {
  try {
    const summary = await billingService.getBillingSummary(req.params.orderId);
    res.json(summary);
  } catch (err) {
    res.status(400).json({ message: "Failed to fetch billing summary", error: err.message });
  }
}

export async function completeBilling(req, res) {
  try {
    const result = await billingService.completeBilling(req.params.orderId, req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: "Failed to complete billing", error: err.message });
  }
}