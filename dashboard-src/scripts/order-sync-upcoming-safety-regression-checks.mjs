import { readFileSync } from "node:fs";

const source = readFileSync("supabase/functions/orders-odoo/index.ts", "utf8");

const checks = [
  {
    expected: "fetch-upcoming-orders-safety-window-from-odoo",
    message: "orders sync must run an upcoming commitment-date safety fetch.",
  },
  {
    expected: "ODOO_ORDERS_UPCOMING_LOOKAHEAD_DAYS",
    message: "upcoming safety window must be configurable.",
  },
  {
    expected: "ODOO_ORDERS_UPCOMING_PAST_GRACE_DAYS",
    message: "upcoming safety window must include a small past grace period.",
  },
  {
    expected: "['commitment_date', '>=', upcomingStart]",
    message: "upcoming safety fetch must filter by commitment_date lower bound.",
  },
  {
    expected: "['commitment_date', '<', upcomingEnd]",
    message: "upcoming safety fetch must filter by commitment_date upper bound.",
  },
  {
    expected: "function dedupeRowsById",
    message: "orders sync must define the dedupe helper used by the safety fetch.",
  },
  {
    expected: "orders = dedupeRowsById([...incrementalOrders, ...upcomingOrders])",
    message: "incremental and upcoming safety results must be deduped before upsert.",
  },
  {
    expected: "upcoming_safety_order_count",
    message: "sync response must expose upcoming safety fetch count for monitoring.",
  },
];

const failures = checks.filter((check) => !source.includes(check.expected));

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure.message);
  }
  process.exit(1);
}

console.log("Order sync upcoming safety regression checks passed.");
