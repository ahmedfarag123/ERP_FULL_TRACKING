// ============================================================
// CRM Lead Validator
// ============================================================

import type { ValidatorContext, ValidationResult } from "../../../../types/odoo-pending-actions";

export function validateCrmLead(ctx: ValidatorContext): ValidationResult {
  const errors: string[] = [];
  const payload = ctx.payload;

  // Required: name
  if (!payload.name || typeof payload.name !== "string" || !payload.name.trim()) {
    errors.push("Lead name is required.");
  }

  // Valid type
  const validTypes = ["lead", "opportunity"];
  if (payload.type && !validTypes.includes(String(payload.type))) {
    errors.push(`Invalid lead type. Must be one of: ${validTypes.join(", ")}`);
  }

  // Email format (if provided)
  if (payload.email_from && typeof payload.email_from === "string") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email_from)) {
      errors.push("Invalid email format.");
    }
  }

  // Expected revenue (if provided)
  if (payload.expected_revenue != null) {
    const revenue = Number(payload.expected_revenue);
    if (Number.isNaN(revenue) || revenue < 0) {
      errors.push("Expected revenue must be a non-negative number.");
    }
  }

  // Valid priority
  const validPriorities = ["0", "1", "2", "3"];
  if (payload.priority && !validPriorities.includes(String(payload.priority))) {
    errors.push(`Invalid priority. Must be one of: ${validPriorities.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
