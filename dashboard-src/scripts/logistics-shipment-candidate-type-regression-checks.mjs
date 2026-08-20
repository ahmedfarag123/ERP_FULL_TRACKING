import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assertIncludes(source, expected, message) {
  if (!source.includes(expected)) {
    throw new Error(message);
  }
}

function assertMatches(source, pattern, message) {
  if (!pattern.test(source)) {
    throw new Error(message);
  }
}

const logisticsAdmin = read("src/lib/logistics-admin.ts");

assertIncludes(
  logisticsAdmin,
  "function isSalesOrderTypeName",
  "shipment candidate filtering must use a shared order-type normalizer.",
);

assertMatches(
  logisticsAdmin,
  /SALES_ORDER_TYPE_NAMES[\s\S]*"Sales Order"[\s\S]*"\\u0623\\u0645\\u0631 \\u0627\\u0644\\u0628\\u064a\\u0639"/,
  "shipment candidates must include Arabic Odoo sale order labels.",
);

assertIncludes(
  logisticsAdmin,
  ".filter((order: any) => isSalesOrderTypeName(order.type_name))",
  "shipment candidate filtering must use the normalized sale-order check.",
);

console.log("Logistics shipment candidate type regression checks passed.");
