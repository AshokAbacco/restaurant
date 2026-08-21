// server/src/pos/payments/payments.controller.js
import * as paymentsService from "./payments.service.js";

export async function getPayments(req, res) {
  try {
    res.json(
      await paymentsService.listPaymentsForOrder(
        req.params.orderId,
        req.tenant.outletId,
      ),
    );
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch payments", error: err.message });
  }
}

export async function createPayment(req, res) {
  try {
    const payment = await paymentsService.createPayment(
      req.params.orderId,
      req.body,
      req.tenant.outletId,
    );
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ message: "Failed to record payment", error: err.message });
  }
}

export async function deletePayment(req, res) {
  try {
    const result = await paymentsService.deletePayment(
      req.params.id,
      req.tenant.outletId,
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: "Failed to delete payment", error: err.message });
  }
}