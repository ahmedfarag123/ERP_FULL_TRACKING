import assert from "node:assert/strict";
import fs from "node:fs";

const routeMapPreview = fs.readFileSync("src/components/logistics/RouteMapPreview.tsx", "utf8");
const plansPage = fs.readFileSync("src/pages/Admin/LogisticsPlansPage.tsx", "utf8");
const plansHelpers = fs.readFileSync("src/pages/Admin/logistics-plans/helpers.ts", "utf8");
const liveMapPage = fs.readFileSync("src/pages/Admin/LogisticsMapPage.tsx", "utf8");

assert.match(
  routeMapPreview,
  /isValidRoutePoint/,
  "RouteMapPreview must reject invalid and 0,0 route points.",
);

assert.match(
  plansHelpers,
  /const customerPoint = relationCoordinates\(shipment\.customers\) \?\? relationCoordinates\(externalCustomer\)/,
  "Plan shipments must prefer customer-table coordinates over cached shipment coordinates.",
);

assert.match(
  plansPage,
  /fetchCustomersByExternalIds\(externalCustomerIds\)/,
  "Plans page must hydrate shipments by Odoo external customer id when customer_id is missing.",
);

assert.match(
  liveMapPage,
  /batchFetchCustomersByExternalIds\(externalCustomerIds\)/,
  "Live map page must hydrate deliveries by Odoo external customer id when customer_id is missing.",
);

assert.match(
  liveMapPage,
  /function FitMapView/,
  "Live map page must refit after async map data loads.",
);

assert.doesNotMatch(
  routeMapPreview,
  /Number\.isFinite\(shipment\.customer_latitude\)[\s\S]*Number\.isFinite\(shipment\.customer_longitude\)/,
  "RouteMapPreview must not use a loose finite-only coordinate check.",
);

console.log("Logistics map location source regression checks passed.");
