import { readFileSync } from "node:fs";

const checks = [
  {
    file: "src/pages/Admin/LogisticsPlansPage.tsx",
    mustInclude: "shipment_reference: `SH-${orderLabel}`",
    mustNotInclude: "shipment_reference: `SHIP-${orderLabel}`",
  },
  {
    file: "src/pages/Admin/LogisticsShipmentsPage.tsx",
    mustInclude: "shipment_reference: `SH-${orderLabel}`",
    mustNotInclude: "shipment_reference: `SHIP-${orderLabel}`",
  },
  {
    file: "supabase/migrations/20260502000003_use_order_based_shipment_references.sql",
    mustInclude: "'SH-' || coalesce",
    mustNotInclude: "'SHIP-' || coalesce",
  },
  {
    file: "supabase/functions/logistics-shipments-odoo/index.ts",
    mustInclude: "shipment_reference: orderReference ? `SH-${orderReference}` : `SH-${shipment.id}`",
    mustNotInclude: "`SHIP-${shipment.id}`",
  },
];

let failed = false;

for (const check of checks) {
  let contents = "";
  try {
    contents = readFileSync(check.file, "utf8");
  } catch (error) {
    failed = true;
    console.error(`Missing expected file: ${check.file}`);
    continue;
  }

  if (!contents.includes(check.mustInclude)) {
    failed = true;
    console.error(`${check.file} must include ${JSON.stringify(check.mustInclude)}`);
  }

  if (contents.includes(check.mustNotInclude)) {
    failed = true;
    console.error(`${check.file} must not include ${JSON.stringify(check.mustNotInclude)}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log("Shipment reference regression checks passed.");
