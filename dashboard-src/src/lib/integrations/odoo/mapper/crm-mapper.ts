// ============================================================
// CRM Lead Mapper
// Dashboard CRM Lead → Odoo crm.lead payload
// ============================================================

import type { MapperInput, MapperResult } from "../../../../types/odoo-pending-actions";

interface DashboardCrmLead {
  id: string;
  lead_name: string;
  contact_name?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country_id?: number | null;
  expected_revenue?: number | null;
  priority?: string | null;
  type?: "lead" | "opportunity";
  salesperson_odoo_id?: number | null;
  team_odoo_id?: number | null;
  tag_ids?: number[];
  description?: string | null;
  odoo_lead_id?: number | null;
}

export function mapCrmLead(input: MapperInput<DashboardCrmLead>): MapperResult {
  const { entity } = input;

  const name = entity.lead_name?.trim();
  if (!name) {
    throw new Error("Lead name is required.");
  }

  const payload: Record<string, unknown> = {
    name,
    type: entity.type ?? "lead",
  };

  if (entity.contact_name) {
    payload.contact_name = entity.contact_name.trim();
  }
  if (entity.phone) {
    payload.phone = entity.phone.trim();
  }
  if (entity.mobile) {
    payload.mobile = entity.mobile.trim();
  }
  if (entity.email) {
    payload.email_from = entity.email.trim();
  }
  if (entity.address) {
    payload.street = entity.address.trim();
  }
  if (entity.city) {
    payload.city = entity.city.trim();
  }
  if (entity.country_id) {
    payload.country_id = entity.country_id;
  }
  if (entity.expected_revenue != null) {
    payload.expected_revenue = entity.expected_revenue;
  }
  if (entity.priority) {
    payload.priority = entity.priority;
  }
  if (entity.salesperson_odoo_id) {
    payload.user_id = entity.salesperson_odoo_id;
  }
  if (entity.team_odoo_id) {
    payload.team_id = entity.team_odoo_id;
  }
  if (entity.tag_ids && entity.tag_ids.length > 0) {
    payload.tag_ids = [[6, 0, entity.tag_ids]];
  }
  if (entity.description) {
    payload.description = entity.description;
  }

  const isUpdate = entity.odoo_lead_id != null && entity.odoo_lead_id > 0;

  return {
    payload,
    odooModel: "crm.lead",
    odooMethod: isUpdate ? "write" : "create",
  };
}
