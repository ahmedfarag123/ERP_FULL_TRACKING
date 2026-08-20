import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source, expected, message) {
  if (!source.includes(expected)) {
    throw new Error(message);
  }
}

const dashboard = read("sales_team/components/dashboard/DashboardPage.tsx");

assertIncludes(
  dashboard,
  "loadPerformanceMetrics",
  "sales dashboard must load live-safe table-level performance metrics.",
);

assertIncludes(
  dashboard,
  ".from('sales_targets')",
  "sales dashboard must load sales target fields.",
);

assertIncludes(
  dashboard,
  ".from('calls')",
  "sales dashboard must load call metrics.",
);

assertIncludes(
  dashboard,
  ".from('quotations')",
  "sales dashboard must load quotation metrics.",
);

assertIncludes(
  dashboard,
  ".from('orders')",
  "sales dashboard must load GMV from orders.",
);

for (const field of [
  "target_calls",
  "actual_calls",
  "target_quotations",
  "actual_quotations",
  "target_gmv",
  "actual_gmv",
  "target_reachability",
  "actual_reachability",
]) {
  assertIncludes(dashboard, field, `sales dashboard must include ${field}.`);
}

for (const label of ["المكالمات", "عروض الأسعار", "إجمالي المبيعات", "الوصول"]) {
  assertIncludes(dashboard, label, `sales dashboard must render a ${label} KPI.`);
}

assertIncludes(
  dashboard,
  "formatCurrencyCompact",
  "sales dashboard must format GMV as currency instead of a raw number.",
);

console.log("Sales dashboard metrics regression checks passed.");
