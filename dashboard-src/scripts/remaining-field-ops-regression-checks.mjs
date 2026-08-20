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

const salesActivity = read("sales_team/lib/salesActivity.ts");
const salesVisits = read("sales_team/components/visits/VisitsPage.tsx");
const activityPersistence = read("sales_team/lib/activityPersistence.ts");
const callsPage = read("src/pages/Admin/CallsPage.tsx");
const salesDashboard = read("sales_team/components/dashboard/DashboardPage.tsx");
const shipmentDetail = read("driver_team/src/screens/ShipmentDetailScreen.tsx");
const routeScreen = read("driver_team/src/screens/RouteScreen.tsx");
const orderDetail = read("src/pages/Admin/OrderDetailPage.tsx");
const salesApp = read("sales_team/App.tsx");
const salesLayout = read("sales_team/components/layout/AppLayout.tsx");
const productCatalog = read("sales_team/components/products/ProductCatalogPage.tsx");

for (const token of [
  "visit_dynamic_answers",
  "dynamicAnswers",
  "dynamic_form_fields",
]) {
  assertIncludes(salesActivity, token, `sales activity feed must include ${token}.`);
}

assertIncludes(salesVisits, "تصدير ملف", "sales visits page must expose visit answer CSV export.");
assertIncludes(salesVisits, "الإجابات الديناميكية", "sales visits page must render dynamic form answers.");
assertIncludes(activityPersistence, "dynamicAnswers", "visit persistence must accept dynamic answers.");

for (const token of [
  "requires_urgent_action",
  "follow_up_sla_status",
  "callback_at",
  "Overdue Callbacks",
  "Urgent Follow-ups",
]) {
  assertIncludes(callsPage, token, `admin calls page must expose ${token}.`);
}

assertIncludes(salesDashboard, "callback_at", "sales dashboard must fetch callback follow-ups.");
assertIncludes(salesDashboard, "متابعات عاجلة", "sales dashboard must render urgent follow-up count.");

for (const token of [
  "partialQuantities",
  "partial_delivery_items",
  "تسليم جزئي",
  "deliveredQuantity",
]) {
  assertIncludes(shipmentDetail, token, `driver shipment detail must support ${token}.`);
}

for (const token of ["وقت الوصول المتوقع", "distanceKm", "دقة الموقع", "خارج الترتيب"]) {
  assertIncludes(routeScreen, token, `driver route page must show ${token}.`);
}

for (const token of [
  "amount_to_invoice",
  "amount_undiscounted",
  "amount_untaxed",
  "margin_percent",
  "planning_initial_date",
  "warehouse_id",
  "Fulfillment Context",
]) {
  assertIncludes(orderDetail, token, `order detail must show ${token}.`);
}

for (const token of [
  ".from('products')",
  "quantity_on_hand",
  "incoming_quantity",
  "outgoing_quantity",
  "average_cost",
  "sales_price",
  "كتالوج المخزون",
]) {
  assertIncludes(productCatalog, token, `sales product catalog must include ${token}.`);
}

assertIncludes(salesApp, "ProductCatalogPage", "sales app must register product catalog route.");
assertIncludes(salesLayout, "/products", "sales layout must link to product catalog.");

console.log("Remaining field ops regression checks passed.");
