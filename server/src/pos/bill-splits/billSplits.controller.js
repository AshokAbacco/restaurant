// server/src/pos/bill-splits/billSplits.controller.js
import * as billSplitsService from "./billSplits.service.js";

export async function getSplits(req, res) {
  try {
    res.json(
      await billSplitsService.listSplitsForOrder(
        req.params.orderId,
        req.tenant.outletId,
      ),
    );
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bill splits", error: err.message });
  }
}

export async function createSplits(req, res) {
  try {
    const splits = await billSplitsService.createSplits(
      req.params.orderId,
      req.body,
      req.tenant.outletId,
    );
    res.status(201).json(splits);
  } catch (err) {
    res.status(400).json({ message: "Failed to create bill splits", error: err.message });
  }
}

export async function deleteSplit(req, res) {
  try {
    await billSplitsService.deleteSplit(req.params.id, req.tenant.outletId);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: "Failed to delete bill split", error: err.message });
  }
}