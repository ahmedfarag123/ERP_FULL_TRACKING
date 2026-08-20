// ============================================================
// Odoo Pending Actions — Type Definitions
// ============================================================

export type OdooActionStatus =
  | "draft"
  | "waiting_approval"
  | "approved"
  | "sending"
  | "completed"
  | "failed"
  | "rejected";

export type OdooEntityType = "quotation" | "customer" | "product" | "crm_lead" | "generic";

export type OdooActionType = "create" | "update" | "archive" | "convert" | "delete";

export interface OdooPendingAction {
  id: string;
  entity_type: OdooEntityType;
  action_type: OdooActionType;
  odoo_model: string;
  odoo_method: string;
  entity_id: string | null;
  payload_json: Record<string, unknown>;
  validation_result: OdooValidationResult | null;
  status: OdooActionStatus;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  retry_count: number;
  odoo_record_id: number | null;
  odoo_reference: string | null;
  odoo_response: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface OdooValidationResult {
  valid: boolean;
  errors: string[];
}

export interface OdooActionAuditLogEntry {
  id: string;
  status: OdooActionStatus;
  user_id: string | null;
  user_name: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface OdooPendingActionWithMeta extends OdooPendingAction {
  creator_name?: string;
  approver_name?: string;
}

export interface OdooActionCounts {
  status: OdooActionStatus;
  count: number;
}

// ============================================================
// Entity-specific payload shapes
// ============================================================

export interface QuotationPayload {
  partner_id: number;
  pricelist_id?: number;
  warehouse_id?: number;
  commitment_date?: string;
  note?: string;
  order_line: Array<{
    product_id: number;
    name: string;
    product_uom_qty: number;
    price_unit: number;
    tax_id?: number[];
  }>;
}

export interface CustomerPayload {
  name: string;
  phone?: string;
  mobile?: string;
  email?: string;
  street?: string;
  city?: string;
  state_id?: number;
  country_id?: number;
  zip?: string;
  category_id?: number[];
  customer_rank?: number;
  is_company?: boolean;
  type?: "contact" | "invoice" | "delivery";
}

export interface ProductPayload {
  name: string;
  default_code?: string;
  barcode?: string;
  list_price: number;
  standard_price?: number;
  categ_id?: number;
  uom_id?: number;
  type?: "consu" | "product" | "service";
  sale_ok?: boolean;
  purchase_ok?: boolean;
  description_sale?: string;
}

export interface CrmLeadPayload {
  name: string;
  partner_id?: number;
  contact_name?: string;
  phone?: string;
  mobile?: string;
  email_from?: string;
  street?: string;
  city?: string;
  country_id?: number;
  expected_revenue?: number;
  priority?: string;
  type?: "lead" | "opportunity";
  user_id?: number;
  team_id?: number;
  tag_ids?: number[];
  description?: string;
}

// ============================================================
// Mapper types
// ============================================================

export interface MapperInput<T = Record<string, unknown>> {
  entity: T;
  relatedEntities?: Record<string, unknown>;
}

export interface MapperResult {
  payload: Record<string, unknown>;
  odooModel: string;
  odooMethod: string;
}

// ============================================================
// Validator types
// ============================================================

export interface ValidatorContext {
  odooModel: string;
  actionType: OdooActionType;
  payload: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
