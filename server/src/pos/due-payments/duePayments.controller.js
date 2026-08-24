// server/src/pos/due-payments/duePayments.controller.js
import * as duePaymentsService from "./duePayments.service.js";

export async function getDuePayments(req, res) {
  try {
    const { customerId, status } = req.query;
    const duePayments = await duePaymentsService.listDuePayments(
      { customerId, status },
      req.tenant.outletId,
    );
    res.json(duePayments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch due payments", error: err.message });
  }
}

export async function getDuePayment(req, res) {
  try {
    const duePayment = await duePaymentsService.getDuePaymentById(
      req.params.id,
      req.tenant.outletId,
    );
    if (!duePayment) return res.status(404).json({ message: "Due payment not found" });
    res.json(duePayment);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch due payment", error: err.message });
  }
}

export async function getDuePaymentsForCustomer(req, res) {
  try {
    const result = await duePaymentsService.getDuePaymentsForCustomer(
      req.params.customerId,
      req.tenant.outletId,
    );
    res.json(result);
  } catch (err) {
    const notFound = /not found/i.test(err.message);
    res
      .status(notFound ? 404 : 500)
      .json({ message: "Failed to fetch customer's due payments", error: err.message });
  }
}

export async function settleDuePayment(req, res) {
  try {
    const { amount, paymentMethod, notes } = req.body;
    if (!amount) {
      return res.status(400).json({ message: "amount is required" });
    }
    const duePayment = await duePaymentsService.settleDuePayment(
      req.params.id,
      {
        amount,
        paymentMethod,
        notes,
        // Who actually collected the money is the logged-in session, never
        // a client-supplied field — same pattern as every other
        // "who did this" field fixed throughout the multi-tenancy retrofit.
        settledById: req.user?.employeeId,
      },
      req.tenant.outletId,
    );
    res.json(duePayment);
  } catch (err) {
    const notFound = /not found/i.test(err.message);
    res
      .status(notFound ? 404 : 400)
      .json({ message: "Failed to settle due payment", error: err.message });
  }
}