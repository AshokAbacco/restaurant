// server/src/kiosk/kiosk.validation.js

const ORDER_TYPES = ["DINE_IN", "TAKEAWAY", "TAKE_AWAY", "DELIVERY"];
const PAYMENT_METHODS = ["UPI", "CARD", "CASH"];

export function validateOrderInput(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return ["Request body is required"];
  }

  if (!data.orderType || !ORDER_TYPES.includes(data.orderType)) {
    errors.push(`orderType must be one of ${ORDER_TYPES.join(", ")}`);
  }

  // Table selection is optional: this kiosk flow calls customers by order
  // number (see KioskOrderSuccess) rather than assigning a table up front.
  // If a tableId IS sent (e.g. a future "assign my table" step), it's
  // still validated for real existence in kiosk.service.createOrder.

  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.push("items must be a non-empty array");
  } else {
    data.items.forEach((item, idx) => {
      if (!item.menuItemId) {
        errors.push(`items[${idx}].menuItemId is required`);
      }
      if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
        errors.push(`items[${idx}].quantity must be a positive number`);
      }
      if (item.addOnIds !== undefined && !Array.isArray(item.addOnIds)) {
        errors.push(`items[${idx}].addOnIds must be an array`);
      }
    });
  }

  if (data.phone !== undefined && data.phone !== "" && !/^\+?[0-9]{7,15}$/.test(data.phone)) {
    errors.push("phone must be a valid mobile number");
  }

  return errors;
}

export function validatePaymentInput(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return ["Request body is required"];
  }

  if (!data.method || !PAYMENT_METHODS.includes(data.method)) {
    errors.push(`method must be one of ${PAYMENT_METHODS.join(", ")}`);
  }

  return errors;
}

export { ORDER_TYPES, PAYMENT_METHODS };
