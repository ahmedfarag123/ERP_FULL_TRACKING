// ============================================================
// Product Mapper
// Dashboard Product → Odoo product.template payload
// ============================================================

import type { MapperInput, MapperResult } from "../../../../types/odoo-pending-actions";

interface DashboardProduct {
  id: string;
  product_name: string;
  sku?: string | null;
  barcode?: string | null;
  sale_price: number;
  cost_price?: number | null;
  category?: string | null;
  category_odoo_id?: number | null;
  uom_odoo_id?: number | null;
  odoo_product_id?: number | null;
  description?: string | null;
  is_active?: boolean;
}

export function mapProduct(input: MapperInput<DashboardProduct>): MapperResult {
  const { entity } = input;

  const name = entity.product_name?.trim();
  if (!name) {
    throw new Error("Product name is required.");
  }

  const payload: Record<string, unknown> = {
    name,
    type: "consu",
    sale_ok: true,
    purchase_ok: true,
  };

  if (entity.sku) {
    payload.default_code = entity.sku.trim();
  }
  if (entity.barcode) {
    payload.barcode = entity.barcode.trim();
  }
  if (entity.sale_price != null) {
    payload.list_price = entity.sale_price;
  }
  if (entity.cost_price != null) {
    payload.standard_price = entity.cost_price;
  }
  if (entity.category_odoo_id) {
    payload.categ_id = entity.category_odoo_id;
  }
  if (entity.uom_odoo_id) {
    payload.uom_id = entity.uom_odoo_id;
    payload.uom_po_id = entity.uom_odoo_id;
  }
  if (entity.description) {
    payload.description_sale = entity.description;
  }

  const isUpdate = entity.odoo_product_id != null && entity.odoo_product_id > 0;

  return {
    payload,
    odooModel: "product.template",
    odooMethod: isUpdate ? "write" : "create",
  };
}
