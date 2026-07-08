// server/src/inventory/consumption/consumption.controller.js
import * as consumptionService from "./consumption.service.js";

// This endpoint exists so you can test recipe-based consumption right now,
// by hand, before the Orders module is built. Once Orders exists, its
// order-completion code should call consumptionService.consumeForSale(...)
// directly (as a function call, not an HTTP round-trip) — this route can
// stay for manual corrections/testing, or be removed later.
export const consume = async (req, res) => {
  try {
    const { items, orderId } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items must be a non-empty array" });
    }
    const missing = items.some((i) => !i.menuItemId || i.quantity == null);
    if (missing) {
      return res.status(400).json({ message: "Each item requires menuItemId and quantity" });
    }

    const movements = await consumptionService.consumeForSale({
      items,
      orderId,
      userId: req.body.userId,
      store: req.body.store,
    });

    res.status(201).json({
      message: `${movements.length} stock movement(s) created`,
      movements,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to process sale consumption", error: err.message });
  }
};