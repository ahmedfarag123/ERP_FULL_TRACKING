import { readFileSync } from "node:fs";

const source = readFileSync("supabase/functions/logistics-shipments-odoo/index.ts", "utf8");

const checks = [
  {
    expected: "function dedupeRowsById",
    message: "shipment sync must define a dedupe helper for combined fetch results.",
  },
  {
    expected: "function dedupeRecordsByKey",
    message: "shipment sync must dedupe shipment item upserts by external move id.",
  },
  {
    expected: "ODOO_SHIPMENTS_UPCOMING_LOOKAHEAD_DAYS",
    message: "shipment upcoming safety window must be configurable.",
  },
  {
    expected: "ODOO_SHIPMENTS_UPCOMING_PAST_GRACE_DAYS",
    message: "shipment upcoming safety window must include a small past grace period.",
  },
  {
    expected: '["scheduled_date", ">=", upcomingStart]',
    message: "shipment safety fetch must filter by scheduled_date lower bound.",
  },
  {
    expected: '["scheduled_date", "<", upcomingEnd]',
    message: "shipment safety fetch must filter by scheduled_date upper bound.",
  },
  {
    expected: "const shipments = dedupeRowsById([...incrementalShipments, ...upcomingShipments])",
    message: "incremental and upcoming shipment results must be deduped before upsert.",
  },
  {
    expected: "id, external_order_id, odoo_order_name, commitment_date",
    message: "shipment sync must fetch order commitment dates with linked order rows.",
  },
  {
    expected: "scheduled_at: toNullableIso(order?.commitment_date ?? shipment.scheduled_date)",
    message: "linked shipment scheduled_at must use the sales order commitment date before the picking date.",
  },
  {
    expected: "upcoming_safety_count",
    message: "shipment sync response must expose safety fetch count for monitoring.",
  },
];

const failures = checks.filter((check) => !source.includes(check.expected));

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure.message);
  }
  process.exit(1);
}

console.log("Shipment sync upcoming safety regression checks passed.");
