import { existsSync, readFileSync } from "node:fs";

const checks = [
  {
    file: "supabase/functions/orders-odoo/index.ts",
    mustInclude: [
      "function isActualSalesOrder",
      "state === 'sale' || state === 'done'",
      "const salesOrderDomain = orderFieldNames.has('state')",
      "['state', 'in', ['sale', 'done']]",
      "['type_name', '=', 'Sales Order']",
      "orders = orders.filter(isActualSalesOrder)",
      "skipped_non_sales_order_count",
    ],
    label: "orders Odoo sync must import confirmed Sales Orders only",
  },
  {
    file: "src/pages/Admin/LogisticsPlansPage.tsx",
    mustInclude: [
      "type_name: string | null;",
      "state: string | null;",
      "order_line_items?: OrderLineItemRelation[] | null;",
      "order_line_items(id, external_product_id, product_ref, unit_price, subtotal_amount, total_amount)",
      ".eq(\"type_name\", \"Sales Order\")",
      ".in(\"state\", [\"sale\", \"done\"])",
      ".or(\"amount_total.gt.0,total_amount.gt.0\")",
      "hasShippableOrderValue(order)",
    ],
    label: "logistics plan shipment candidates must be priced Sales Orders with products",
  },
  {
    file: "src/pages/Admin/LogisticsShipmentsPage.tsx",
    mustInclude: [
      "type_name: string | null;",
      "state: string | null;",
      "order_line_items?: OrderLineItemRelation[] | null;",
      "order_line_items(id, external_product_id, product_ref, unit_price, subtotal_amount, total_amount)",
      ".eq(\"type_name\", \"Sales Order\")",
      ".in(\"state\", [\"sale\", \"done\"])",
      ".or(\"amount_total.gt.0,total_amount.gt.0\")",
      "hasShippableOrderValue(order)",
    ],
    label: "logistics shipment list candidates must be priced Sales Orders with products",
  },
  {
    file: "src/pages/Admin/LogisticsPage.tsx",
    mustInclude: [
      "\"state\"",
      "\"type_name\"",
      "\"order_line_items(id, external_product_id, product_ref, unit_price, subtotal_amount, total_amount)\"",
      "filterShippableSalesOrders",
    ],
    label: "logistics dashboard must pass only shippable orders into alignment",
  },
  {
    file: "src/lib/logistics.ts",
    mustInclude: [
      "order_line_items?: OrderLineItemRelation[] | null;",
      "state: string | null;",
      "type_name: string | null;",
      "export function isConfirmedSalesOrder",
      "export function filterShippableSalesOrders",
      "export function hasPricedProductLine",
      "export function hasShippableOrderValue",
    ],
    label: "logistics alignment helper must require priced Sales Orders with products",
  },
  {
    file: "supabase/migrations/20260502000003_use_order_based_shipment_references.sql",
    mustInclude: [
      "v_priced_product_line_count",
      "Only confirmed Sales Orders can be assigned to shipments.",
      "Sales Orders assigned to shipments must have at least one priced product line.",
      "greatest(coalesce(line.total_amount, 0), coalesce(line.subtotal_amount, 0), coalesce(line.unit_price, 0)) > 0",
    ],
    label: "admin shipment assignment RPC must reject quotations and unpriced orders",
  },
  {
    file: "supabase/migrations/20260502000004_remove_quotation_order_imports.sql",
    mustInclude: [
      "non_sales_odoo_order_cleanup_ids",
      "candidate.odoo_state in ('sale', 'done')",
      "candidate.odoo_state is null and candidate.odoo_type_name = 'sales order'",
      "delete from public.logistics_shipments",
      "delete from public.orders",
      "Quotation",
    ],
    label: "previously imported Odoo quotations must be cleaned up",
  },
];

let failed = false;

for (const check of checks) {
  if (!existsSync(check.file)) {
    failed = true;
    console.error(`${check.label}: missing ${check.file}`);
    continue;
  }

  const contents = readFileSync(check.file, "utf8");
  for (const expected of check.mustInclude) {
    if (!contents.includes(expected)) {
      failed = true;
      console.error(`${check.label}: ${check.file} must include ${JSON.stringify(expected)}`);
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("Order sync regression checks passed.");
