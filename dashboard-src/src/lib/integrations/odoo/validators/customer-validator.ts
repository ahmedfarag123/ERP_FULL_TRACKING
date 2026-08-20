// ============================================================
// Customer Validator
// ============================================================

import type { ValidatorContext, ValidationResult } from "../../../../types/odoo-pending-actions";

export function validateCustomer(ctx: ValidatorContext): ValidationResult {
  const errors: string[] = [];
  const payload = ctx.payload;

  // Required: name
  if (!payload.name || typeof payload.name !== "string" || !payload.name.trim()) {
    errors.push("Customer name is required.");
  }

  // Email format (if provided)
  if (payload.email && typeof payload.email === "string") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email)) {
      errors.push("Invalid email format.");
    }
  }

  // Phone (if provided)
  if (payload.phone && typeof payload.phone !== "string") {
    errors.push("Phone must be a text value.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
