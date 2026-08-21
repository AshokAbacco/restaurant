// server/src/pos/loyalty/loyalty.controller.js
import * as loyaltyService from "./loyalty.service.js";

export async function getTransactions(req, res) {
  try {
    res.json(
      await loyaltyService.listTransactionsForCustomer(
        req.params.customerId,
        req.tenant.outletId,
      ),
    );
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch loyalty transactions", error: err.message });
  }
}

export async function createTransaction(req, res) {
  try {
    const transaction = await loyaltyService.recordTransaction(
      req.body,
      req.tenant.outletId,
    );
    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ message: "Failed to record loyalty transaction", error: err.message });
  }
}

export async function earnFromOrder(req, res) {
  try {
    const transaction = await loyaltyService.earnFromOrder(
      req.params.orderId,
      req.tenant.outletId,
    );
    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ message: "Failed to award loyalty points", error: err.message });
  }
}