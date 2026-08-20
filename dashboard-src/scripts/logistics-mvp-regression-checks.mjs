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

function assertNotIncludes(source, unexpected, message) {
  if (source.includes(unexpected)) {
    throw new Error(message);
  }
}

function assertMatches(source, pattern, message) {
  if (!pattern.test(source)) {
    throw new Error(message);
  }
}

function assertAllResponsiveContainersHaveInitialDimension(relativePath) {
  const source = read(relativePath);
  const responsiveContainerPattern =
    /<ResponsiveContainer\b(?=[^>]*width="100%")(?=[^>]*height="100%")[^>]*>/g;
  const matches = source.match(responsiveContainerPattern) ?? [];

  for (const match of matches) {
    if (!match.includes("initialDimension=")) {
      throw new Error(
        `${relativePath} has a percentage-based ResponsiveContainer without initialDimension.`,
      );
    }
  }
}

const migration = read("supabase/migrations/20260425000021_logistics_admin_control_room.sql");
const overloadCleanupMigration = read(
  "supabase/migrations/20260425000022_logistics_admin_control_room_overload_cleanup.sql",
);
const failedPlanCompletionMigration = read(
  "supabase/migrations/20260502000005_prevent_failed_shipments_completing_plans.sql",
);
const adminMain = read("src/main.tsx");
const appSidebar = read("src/layout/AppSidebar.tsx");
const authPageLayout = read("src/pages/AuthPages/AuthPageLayout.tsx");
const plansPage = read("src/pages/Admin/LogisticsPlansPage.tsx");
const shipmentsPage = read("src/pages/Admin/LogisticsShipmentsPage.tsx");
const logisticsDispatchStore = read("src/store/logisticsDispatchStore.ts");
const orderDetailPage = read("src/pages/Admin/OrderDetailPage.tsx");
const driverRoutePage = read("driver_team/src/screens/RouteScreen.tsx");
const driverRouteMapViewer = driverRoutePage;
const driverShipmentData = read("driver_team/src/services/shipmentData.ts");
const driverDeliveryStore = read("driver_team/src/stores/deliveryStore.ts");
const driverDetailPage = read("driver_team/src/screens/ShipmentDetailScreen.tsx");
const deliveryTimeline = driverShipmentData;

assertIncludes(
  migration,
  "logistics.manage",
  "logistics_admin_required must enforce the logistics.manage permission, not only broad management roles.",
);

assertNotIncludes(
  migration,
  "v_current_status = 'CANCELLED' and v_next_status not in ('OUT_FOR_DELIVERY', 'DELIVERED')",
  "driver_update_shipment_phase must not allow drivers to revive cancelled shipments.",
);

assertIncludes(
  failedPlanCompletionMigration,
  "Plan has % failed or cancelled shipments",
  "admin_close_delivery_plan must reject failed/cancelled stops instead of completing the plan.",
);

assertNotIncludes(
  failedPlanCompletionMigration,
  "shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED')",
  "plan completion checks must not treat cancelled/failed stops as completed work.",
);

assertNotIncludes(
  driverRoutePage,
  "s.status === 'delivered' || s.status === 'failed'",
  "driver route progress must not count failed shipments as delivered/completed.",
);

assertIncludes(
  driverRoutePage,
  "const delivered = routeShipments.filter((s) => s.status === 'delivered').length;",
  "driver route progress must be based on delivered stops only.",
);

assertMatches(
  migration,
  /coalesce\(shipment\.route_locked,\s*false\)\s*=\s*false/,
  "admin_optimize_delivery_plan must preserve manually locked route stops.",
);

assertMatches(
  migration,
  /v_start_source text := 'shipment_schedule'[\s\S]*warehouse_latitude[\s\S]*warehouse_longitude[\s\S]*into v_start_lat,\s*v_start_lng,\s*v_start_source/,
  "admin_optimize_delivery_plan must seed nearest-neighbor routing from warehouse coordinates when they exist.",
);

assertMatches(
  migration,
  /rn = 1[\s\S]*v_start_lat[\s\S]*v_start_lng[\s\S]*prev_lat[\s\S]*prev_lng/,
  "route_total_distance_km must include the warehouse-to-first-retailer leg when a warehouse start point exists.",
);

assertIncludes(
  migration,
  "'start_source', v_start_source",
  "route_metadata must record whether optimization started from warehouse coordinates or shipment schedule fallback.",
);

assertIncludes(
  plansPage,
  "إنشاء خطة",
  "plans page must expose a clear shipment-first plan builder entry point for dispatchers.",
);

assertIncludes(
  plansPage,
  "filteredUnplannedShipments",
  "plans page must show shipment selection as the first route-planning step.",
);

assertIncludes(
  plansPage,
  "renderDraftTab",
  "plans page must show plan building after shipment selection.",
);

assertIncludes(
  plansPage,
  "اعتماد الخط",
  "plans page must show route optimization and dispatch as the final planning step.",
);

assertIncludes(
  shipmentsPage,
  "fetchOpenUndeliveredOrders",
  "shipments list must include open undelivered orders as pending-assign shipment rows.",
);

assertIncludes(
  plansPage,
  "assignOrderSelectionsToPlan",
  "plan builder must materialize selected open orders into shipments before assignment.",
);

assertIncludes(
  driverDeliveryStore,
  "finished",
  "driver route must exclude finished shipments from active stops.",
);

assertIncludes(
  driverDeliveryStore,
  "settled",
  "driver route must exclude settled shipments from active stops.",
);

assertIncludes(
  driverDeliveryStore,
  "cancelled",
  "driver route must use canonical shipment_status values for terminal states.",
);

assertIncludes(
  driverShipmentData,
  "customer_latitude, customer_longitude",
  "driver shipment fetch must include shipment-level customer coordinates written by route optimization.",
);

assertIncludes(
  driverShipmentData,
  "toNullableNumber(shipment.customer_latitude) ?? customer?.lat",
  "driver shipment mapping must prefer optimized shipment coordinates before falling back to customer coordinates.",
);

assertNotIncludes(
  driverRouteMapViewer,
  "[shipment.customer.lng, shipment.customer.lat]",
  "Leaflet shipment markers must use [lat, lng], not [lng, lat].",
);

assertNotIncludes(
  driverRouteMapViewer,
  "[location.lng, location.lat]",
  "Leaflet driver marker must use [lat, lng], not [lng, lat].",
);

assertIncludes(
  deliveryTimeline,
  "createSignedUrl",
  "delivery proof photos must be rendered through signed storage URLs, not raw bucket paths.",
);

assertNotIncludes(
  deliveryTimeline,
  "href={event.proof_photo_path}",
  "delivery proof timeline must not link directly to raw private storage paths.",
);

assertMatches(
  driverShipmentData,
  /updateShipmentPhase[\s\S]*p_location_lat[\s\S]*p_location_lng/,
  "driver location must be submitted through the shipment RPC instead of a separate blocking location insert.",
);

assertNotIncludes(
  plansPage,
  "window.confirm",
  "plan destructive actions must use TailAdmin modals instead of native browser confirms.",
);

assertNotIncludes(
  plansPage,
  "window.prompt",
  "plan cancellation must use a TailAdmin modal instead of a native browser prompt.",
);

assertIncludes(
  plansPage,
  "CANCEL_REASON_OPTIONS",
  "plan cancellation modal must provide selectable cancellation reasons.",
);

assertIncludes(
  plansPage,
  "ConfirmationModal",
  "plan destructive actions must share an in-app confirmation modal.",
);

assertIncludes(
  plansPage,
  "CancelDeliveryPlanModal",
  "delivery plan cancellation must use an in-app modal with a reason dropdown.",
);

assertIncludes(
  logisticsDispatchStore,
  "useLogisticsDispatchStore",
  "logistics pages must share selected shipment IDs through a dispatch store.",
);

assertIncludes(
  logisticsDispatchStore,
  "persist",
  "dispatch shipment selection must survive route navigation and reloads.",
);

assertIncludes(
  plansPage,
  "غير مخططة",
  "plans page must merge the shipment queue into the dispatch control room.",
);

assertIncludes(
  plansPage,
  "renderDraftTab",
  "plans page must expose a plan builder without requiring a pre-created plan.",
);

assertIncludes(
  plansPage,
  "queueFilters.search",
  "shipment picker must support search by shipment, order, and customer context.",
);

assertIncludes(
  plansPage,
  "queueFilters.zone",
  "shipment picker must support zone filtering.",
);

assertIncludes(
  plansPage,
  "effectiveQueueDateRange",
  "shipment picker must support scheduled-date filtering.",
);

assertIncludes(
  plansPage,
  "optimizationPreview",
  "route optimization must show a preview before committing the optimized route.",
);

assertIncludes(
  plansPage,
  "missingCoordinateShipments",
  "route optimization must validate missing shipment GPS coordinates before running.",
);

assertIncludes(
  shipmentsPage,
  "toggleShipmentSelection",
  "shipments list must be able to contribute selections to the plan builder.",
);

assertIncludes(
  shipmentsPage,
  "/logistics/plans",
  "shipments list must provide a path into the pre-populated plan builder.",
);

assertNotIncludes(
  plansPage,
  "new Date().toISOString().slice(0, 10)",
  "plan default date must use local business date, not UTC ISO date.",
);

assertIncludes(
  orderDetailPage,
  "p_planned_date",
  "single-order assignment must pass an explicit planned date to avoid UTC day drift.",
);

assertIncludes(
  overloadCleanupMigration,
  "drop function if exists public.admin_assign_order_to_driver(uuid, uuid, timestamptz, text);",
  "legacy 4-argument admin_assign_order_to_driver overload must be dropped so callers use the Cairo-date-safe function.",
);

assertNotIncludes(
  appSidebar,
  "ik.imagekit.io/5yvgym2qm",
  "admin sidebar logo must use a local asset so ImageKit rate limits do not break development.",
);

assertNotIncludes(
  authPageLayout,
  "ik.imagekit.io/5yvgym2qm",
  "admin auth layout logo must use a local asset so ImageKit rate limits do not break development.",
);

assertAllResponsiveContainersHaveInitialDimension(
  "src/pages/Dashboard/components/MonthlySalesChart.tsx",
);
assertAllResponsiveContainersHaveInitialDimension(
  "src/pages/Dashboard/components/DeliveryStatusChart.tsx",
);
assertAllResponsiveContainersHaveInitialDimension("src/pages/Admin/LogisticsPage.tsx");

assertIncludes(
  adminMain,
  "Receiving end does not exist",
  "admin dev bootstrap should filter the known Chrome extension messaging rejection from the app console.",
);

assertIncludes(
  adminMain,
  "event.preventDefault()",
  "known extension messaging rejections must be handled without hiding unrelated app errors.",
);

console.log("Logistics MVP regression checks passed.");
