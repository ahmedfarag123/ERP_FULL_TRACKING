// ============================================================
// Validators — re-exports
// ============================================================

export { validateQuotation } from "./quotation-validator";
export { validateCustomer } from "./customer-validator";
export { validateProduct } from "./product-validator";
export { validateCrmLead } from "./crm-validator";

// Generic dispatcher
import type {
  ValidatorContext,
  ValidationResult,
  OdooEntityType,
} from "../../../../types/odoo-pending-actions";
import { validateQuotation } from "./quotation-validator";
import { validateCustomer } from "./customer-validator";
import { validateProduct } from "./product-validator";
import { validateCrmLead } from "./crm-validator";

const validatorMap: Record<
  OdooEntityType,
  (ctx: ValidatorContext) => ValidationResult
> = {
  quotation: validateQuotation,
  customer: validateCustomer,
  product: validateProduct,
  crm_lead: validateCrmLead,
  generic: () => ({ valid: true, errors: [] }),
};

export function validateOdooAction(
  entityType: OdooEntityType,
  ctx: ValidatorContext
): ValidationResult {
  const validator = validatorMap[entityType];
  if (!validator) {
    return { valid: false, errors: [`Unknown entity type: ${entityType}`] };
  }
  return validator(ctx);
}
