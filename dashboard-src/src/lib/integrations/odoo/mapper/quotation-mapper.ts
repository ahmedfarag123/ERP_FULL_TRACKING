// ============================================================
// Quotation Mapper
// Dashboard Order → Odoo sale.order payload
// ============================================================

import type { MapperInput, MapperResult } from "../../../../types/odoo-pending-actions";

interface DashboardOrder {
  id: string;
  customer_id: string | null;
  customer_odoo_id?: number | null;
  warehouse_odoo_id?: number | null;
  pricelist_odoo_id?: number | null;
  commitment_date?: string | null;
  note?: string | null;
  order_line_items?: DashboardOrderLine[];
}

interface DashboardOrderLine {
  product_id: string;
  product_odoo_id?: number | null;
  product_name?: string;
  quantity: number;
  unit_price: number;
  tax_ids?: number[];
}

export function mapQuotation(input: MapperInput<DashboardOrder>): MapperResult {
  const { entity } = input;

  if (!entity.customer_odoo_id) {
    throw new Error("Customer must be mapped to Odoo before creating a quotation.");
  }

  const orderLines = (entity.order_line_items ?? [])
    .filter((line) => line.product_odoo_id != null)
    .map((line) => ({
      product_id: line.product_odoo_id!,
      name: line.product_name ?? "",
      product_uom_qty: line.quantity,
      price_unit: line.unit_price,
      tax_id: line.tax_ids ?? [],
    }));

  if (orderLines.length === 0) {
    throw new Error("At least one product must be mapped to Odoo.");
  }

  const payload: Record<string, unknown> = {
    partner_id: entity.customer_odoo_id,
    order_line: orderLines.map((line) => [
      [0, 0, {
        product_id: line.product_id,
        name: line.name,
        product_uom_qty: line.product_uom_qty,
        price_unit: line.price_unit,
        ...(line.tax_id.length > 0 ? { tax_id: [[6, 0, line.tax_id]] } : {}),
      }],
    ]),
  };

  if (entity.warehouse_odoo_id) {
    payload.warehouse_id = entity.warehouse_odoo_id;
  }
  if (entity.pricelist_odoo_id) {
    payload.pricelist_id = entity.pricelist_odoo_id;
  }
  if (entity.commitment_date) {
    payload.commitment_date = entity.commitment_date;
  }
  if (entity.note) {
    payload.note = entity.note;
  }

  return {
    payload,
    odooModel: "sale.order",
    odooMethod: "create",
  };
}
