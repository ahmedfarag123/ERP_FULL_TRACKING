// ============================================================
// Product Validator
// ============================================================

import type { ValidatorContext, ValidationResult } from "../../../../types/odoo-pending-actions";

export function validateProduct(ctx: ValidatorContext): ValidationResult {
  const errors: string[] = [];
  const payload = ctx.payload;

  // Required: name
  if (!payload.name || typeof payload.name !== "string" || !payload.name.trim()) {
    errors.push("Product name is required.");
  }

  // Required: list_price
  if (payload.list_price == null || Number(payload.list_price) < 0) {
    errors.push("Sale price is required and must be non-negative.");
  }

  // Barcode uniqueness (if provided) — just format check
  if (payload.barcode && typeof payload.barcode === "string") {
    if (payload.barcode.trim().length < 3) {
      errors.push("Barcode must be at least 3 characters.");
    }
  }

  // Valid product type
  const validTypes = ["consu", "product", "service"];
  if (payload.type && !validTypes.includes(String(payload.type))) {
    errors.push(`Invalid product type. Must be one of: ${validTypes.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
