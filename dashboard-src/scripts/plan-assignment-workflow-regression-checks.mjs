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

function assertMatches(source, pattern, message) {
  if (!pattern.test(source)) {
    throw new Error(message);
  }
}

const migration = read("supabase/migrations/20260710233407_fix_plan_assignment_workflow.sql");
const logisticsAdmin = read("src/lib/logistics-admin.ts");
const driverShipmentData = read("driver_team/src/services/shipmentData.ts");

assertIncludes(
  migration,
  "p_plan_id uuid default null",
  "admin_assign_order_to_driver must accept an explicit target plan id.",
);

assertIncludes(
  migration,
  "from public.admin_assign_shipment_to_plan(v_shipment_id, v_plan.id, p_scheduled_at, p_notes)",
  "order assignment must materialize/update the shipment and attach it to the selected plan.",
);

assertIncludes(
  migration,
  "perform public.sync_logistics_shipment_items_from_order(v_shipment.id, v_order.id);",
  "order assignment must keep driver-visible shipment items in sync.",
);

assertMatches(
  migration,
  /if new\.plan_status = 'in_progress'[\s\S]*existing\.plan_status = 'in_progress'/,
  "working-plan guard must block only concurrent in-progress plans, not multiple pending plans.",
);

assertIncludes(
  logisticsAdmin,
  "p_plan_id: input.planId",
  "admin logistics must bind every selected order to the plan created by the UI.",
);

assertIncludes(
  driverShipmentData,
  "function chooseActivePlan",
  "driver app must choose a deterministic current plan when multiple pending plans exist.",
);

assertMatches(
  driverShipmentData,
  /planStatusRank\(left\.plan_status\) - planStatusRank\(right\.plan_status\)/,
  "driver app must prioritize in-progress plans over pending plans.",
);

assertIncludes(
  driverShipmentData,
  ".limit(20)",
  "driver app must inspect more than one assigned plan before choosing the active plan.",
);

assertIncludes(
  driverShipmentData,
  "in_progress",
  "driver app must only fetch plans that are in_progress or later (not pending).",
);

console.log("Plan assignment workflow regression checks passed.");
