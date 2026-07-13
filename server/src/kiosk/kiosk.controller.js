// server/src/kiosk/kiosk.controller.js
import * as service from "./kiosk.service.js";
import { validateOrderInput, validatePaymentInput } from "./kiosk.validation.js";

const handleError = (res, err) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ success: false, message: err.message || "Something went wrong" });
};

// ---------- Menu ----------

export const getMenu = async (req, res) => {
  try {
    const menu = await service.getKioskMenu();
    res.json({ success: true, data: menu });
  } catch (err) {
    handleError(res, err);
  }
};

export const getAddOnsForItem = async (req, res) => {
  try {
    const addOns = await service.getAddOnsForMenuItem(req.params.menuItemId);
    res.json({ success: true, data: addOns });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Tables ----------

export const getTables = async (req, res) => {
  try {
    const tables = await service.getAvailableTables(req.query.store);
    res.json({ success: true, data: tables });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Orders ----------

export const createOrder = async (req, res) => {
  try {
    const errors = validateOrderInput(req.body);
    if (errors.length) return res.status(400).json({ success: false, errors });

    const order = await service.createOrder(req.body);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    handleError(res, err);
  }
};

export const getOrder = async (req, res) => {
  try {
    const order = await service.getOrder(req.params.id);
    res.json({ success: true, data: order });
  } catch (err) {
    handleError(res, err);
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const order = await service.cancelOrder(req.params.id);
    res.json({ success: true, data: order });
  } catch (err) {
    handleError(res, err);
  }
};

// ---------- Payment ----------

export const getUpiQr = async (req, res) => {
  try {
    const qr = await service.getUpiQr(req.params.id);
    res.json({ success: true, data: qr });
  } catch (err) {
    handleError(res, err);
  }
};

export const payOrder = async (req, res) => {
  try {
    const errors = validatePaymentInput(req.body);
    if (errors.length) return res.status(400).json({ success: false, errors });

    const order = await service.confirmPayment(req.params.id, req.body);
    res.json({ success: true, data: order });
  } catch (err) {
    handleError(res, err);
  }
};
