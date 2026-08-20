// ============================================================
// Customer Mapper
// Dashboard Customer → Odoo res.partner payload
// ============================================================

import type { MapperInput, MapperResult } from "../../../../types/odoo-pending-actions";

interface DashboardCustomer {
  id: string;
  customer_name: string;
  customer_email?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  address_line?: string | null;
  city?: string | null;
  governorate?: string | null;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
  odoo_partner_id?: number | null;
}

export function mapCustomer(input: MapperInput<DashboardCustomer>): MapperResult {
  const { entity } = input;

  const name = entity.customer_name?.trim();
  if (!name) {
    throw new Error("Customer name is required.");
  }

  const payload: Record<string, unknown> = {
    name,
    is_company: false,
    customer_rank: 1,
  };

  if (entity.customer_email) {
    payload.email = entity.customer_email.trim();
  }
  if (entity.phone_number) {
    payload.phone = entity.phone_number.trim();
  }
  if (entity.whatsapp_number) {
    payload.mobile = entity.whatsapp_number.trim();
  }
  if (entity.address_line) {
    payload.street = entity.address_line.trim();
  }
  if (entity.city) {
    payload.city = entity.city.trim();
  }
  if (entity.governorate) {
    payload.state_id = entity.governorate;
  }

  const isUpdate = entity.odoo_partner_id != null && entity.odoo_partner_id > 0;

  return {
    payload,
    odooModel: "res.partner",
    odooMethod: isUpdate ? "write" : "create",
  };
}
