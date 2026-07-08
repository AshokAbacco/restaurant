// server/src/menu/menu.validation.js

export function validateCategoryInput(data, { isUpdate = false } = {}) {
  const errors = [];

  if (!isUpdate || data.name !== undefined) {
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      errors.push("Category name is required");
    }
  }

  if (data.displayOrder !== undefined && isNaN(Number(data.displayOrder))) {
    errors.push("Display order must be a number");
  }

  return errors;
}

export function validateMenuItemInput(data, { isUpdate = false } = {}) {
  const errors = [];
  const required = ["name", "sku", "categoryId", "sellingPrice"];

  if (!isUpdate) {
    for (const field of required) {
      if (data[field] === undefined || data[field] === null || data[field] === "") {
        errors.push(`${field} is required`);
      }
    }
  }

  if (data.sellingPrice !== undefined && isNaN(Number(data.sellingPrice))) {
    errors.push("sellingPrice must be a number");
  }

  if (data.costPrice !== undefined && data.costPrice !== null && isNaN(Number(data.costPrice))) {
    errors.push("costPrice must be a number");
  }

  if (data.gstPercent !== undefined && isNaN(Number(data.gstPercent))) {
    errors.push("gstPercent must be a number");
  }

  if (data.targetServeMinutes !== undefined && data.targetServeMinutes !== null && isNaN(Number(data.targetServeMinutes))) {
    errors.push("targetServeMinutes must be a number");
  }

  if (data.foodType !== undefined && !["VEG", "NON_VEG", "EGG"].includes(data.foodType)) {
    errors.push("foodType must be one of VEG, NON_VEG, EGG");
  }

  if (data.status !== undefined && !["ACTIVE", "INACTIVE", "OUT_OF_STOCK", "DELETED"].includes(data.status)) {
    errors.push("status must be one of ACTIVE, INACTIVE, OUT_OF_STOCK, DELETED");
  }

  return errors;
}