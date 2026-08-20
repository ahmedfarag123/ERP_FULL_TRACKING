// ============================================================
// Quotation Validator
// ============================================================

import type { ValidatorContext, ValidationResult } from "../../../../types/odoo-pending-actions";

export function validateQuotation(ctx: ValidatorContext): ValidationResult {
  const errors: string[] = [];
  const payload = ctx.payload;

  // Required: partner_id
  if (!payload.partner_id || typeof payload.partner_id !== "number") {
    errors.push("Customer (partner_id) is required and must be a valid Odoo ID.");
  }

  // Required: order_line
  const orderLine = payload.order_line as unknown[];
  if (!Array.isArray(orderLine) || orderLine.length === 0) {
    errors.push("At least one order line is required.");
  } else {
    orderLine.forEach((line, index) => {
      const lineData = Array.isArray(line) ? line[1] : line;
      if (lineData && typeof lineData === "object") {
        const data = lineData as Record<string, unknown>;
        if (!data.product_id) {
          errors.push(`Order line ${index + 1}: product_id is required.`);
        }
        if (data.product_uom_qty == null || Number(data.product_uom_qty) <= 0) {
          errors.push(`Order line ${index + 1}: quantity must be greater than 0.`);
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
