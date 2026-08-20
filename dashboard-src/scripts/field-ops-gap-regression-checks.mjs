import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(source, expected, message) {
  if (!source.includes(expected)) {
    throw new Error(message);
  }
}

const customerQueries = read("sales_team/lib/customerQueries.ts");
const customerMapper = read("sales_team/lib/customerMapper.ts");
const customerTypes = read("sales_team/types/index.ts");
const salesActivity = read("sales_team/lib/salesActivity.ts");
const salesDashboard = read("sales_team/components/dashboard/DashboardPage.tsx");
const salesVisits = read("sales_team/components/visits/VisitsPage.tsx");
const customerCard = read("sales_team/components/customers/CustomerCard.tsx");

const driverTypes = read("driver_team/src/types/index.ts");
const deliveryStore = read("driver_team/src/stores/deliveryStore.ts");
const shipmentListItem = read("driver_team/src/components/ShipmentListItem.tsx");
const shipmentDetail = read("driver_team/src/screens/ShipmentDetailScreen.tsx");

for (const field of ["customer_type", "product_interests", "notes"]) {
  assertIncludes(customerQueries, field, `sales customer fetch must include ${field}.`);
  assertIncludes(customerMapper, field, `sales customer mapper must preserve ${field}.`);
  assertIncludes(customerTypes, field, `sales customer type must expose ${field}.`);
}

for (const field of [
  "fraud_status",
  "fraud_score",
  "fraud_signals",
  "within_geofence",
  "customer_distance_meters",
  "visit_mode",
  "override_reason",
]) {
  assertIncludes(salesActivity, field, `sales activity feed must fetch and map ${field}.`);
}

for (const label of ["مراجعة", "نطاق الموقع", "موقع الجهاز", "تجاوز"]) {
  assertIncludes(salesVisits, label, `visits page must render ${label} visit context.`);
}

assertIncludes(salesDashboard, "fraudStatus", "sales dashboard recent feed must expose fraud status.");
assertIncludes(salesDashboard, "geofenceStatus", "sales dashboard recent feed must expose geofence status.");
assertIncludes(customerCard, "اهتمامات المنتجات", "customer card must surface synced product interests.");
assertIncludes(customerCard, "نوع العميل", "customer card must surface synced customer type.");
assertIncludes(customerCard, "نطاق الموقع", "customer card must surface geofence radius.");

for (const field of [
  "collection",
  "operationType",
  "totalWeight",
  "routeLocked",
  "moveState",
  "requestedQuantity",
  "doneQuantity",
  "reservedQuantity",
  "forecastQuantity",
]) {
  assertIncludes(driverTypes, field, `driver shipment type must expose ${field}.`);
  assertIncludes(deliveryStore, field, `driver shipment mapper must preserve ${field}.`);
}

for (const label of ["خط السير #", "الأولوية", "تحصيل نقدي", "العملية", "الوزن"]) {
  assertIncludes(shipmentListItem, label, `delivery list item must render ${label}.`);
}

for (const label of ["التحصيل", "ترتيب الخط", "قفل الخط", "الوزن", "حالة الحركة"]) {
  assertIncludes(shipmentDetail, label, `shipment detail must render ${label}.`);
}

console.log("Field operations gap regression checks passed.");
