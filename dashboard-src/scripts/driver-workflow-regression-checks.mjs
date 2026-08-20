import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = await import("../driver_team/src/services/driverWorkflow.ts");
const shipmentDataSource = fs.readFileSync("driver_team/src/services/shipmentData.ts", "utf8");
const deliveryStoreSource = fs.readFileSync("driver_team/src/stores/deliveryStore.ts", "utf8");
const driverAppSource = fs.readFileSync("driver_team/src/App.tsx", "utf8");
const dashboardSource = fs.readFileSync("driver_team/src/screens/DashboardScreen.tsx", "utf8");
const loadConfirmationSource = fs.readFileSync("driver_team/src/screens/LoadConfirmationScreen.tsx", "utf8");
const shipmentDetailSource = fs.readFileSync("driver_team/src/screens/ShipmentDetailScreen.tsx", "utf8");
const loadShipmentsCatchSource = deliveryStoreSource.slice(
  deliveryStoreSource.indexOf("        } catch (error) {", deliveryStoreSource.indexOf("loadShipments: async")),
  deliveryStoreSource.indexOf("      scheduleRealtimeRefresh:")
);
const migrations = fs
  .readdirSync("supabase/migrations")
  .filter((name) => name.endsWith(".sql"))
  .map((name) => [name, fs.readFileSync(`supabase/migrations/${name}`, "utf8")]);

assert.equal(
  workflow.shipmentStatusFromWorkflowToken("READY_FOR_PICKUP"),
  "pending",
  "driver workflow must normalize uppercase backend shipment statuses",
);

assert.equal(
  workflow.shipmentStatusFromWorkflowToken("OUT_FOR_DELIVERY"),
  "in_transit",
  "driver workflow must understand backend shipment_status values as well as delivery_phase values",
);

assert.equal(
  workflow.timelineActionFromWorkflowEvent({ next_phase: "collection_submitted", note: "Order collections submitted" }),
  "Collection submitted",
  "collection timeline events must not be treated as shipment phase transitions",
);

assert.equal(
  workflow.timelineActionFromWorkflowEvent({ next_phase: "custom_audit_marker", note: "Dispatcher scanned extra package" }),
  "Dispatcher scanned extra package",
  "unknown non-delivery workflow events must remain viewable as timeline notes",
);

assert.doesNotThrow(
  () => workflow.timelineActionFromWorkflowEvent({ next_phase: "collection_submitted", note: "Order collections submitted" }),
  "operational workflow events must never hide the assigned plan",
);

assert.doesNotMatch(
  shipmentDataSource,
  /catch\s*\{\s*location\s*=\s*null;\s*\}/,
  "driver status updates must not swallow GPS failure and then call the RPC with null coordinates",
);

assert.match(
  deliveryStoreSource,
  /const location = await getCurrentDriverLocation\(\);[\s\S]*updateShipmentPhase\(\{[\s\S]*location,/,
  "driver workflow batches must read GPS once and send it with each shipment phase update",
);

assert.match(
  deliveryStoreSource,
  /showToast\(message, 'error'\)/,
  "driver workflow failures must surface a single actionable error toast",
);

assert.match(
  dashboardSource,
  /await startShift\(\);[\s\S]*showToast/,
  "dashboard arrival step must show success only after the backend accepts the update",
);

assert.match(
  dashboardSource,
  /const canUseWorkflowAction =[\s\S]*activePhase !== 'no_plan'[\s\S]*activePhase !== 'plan_ready'[\s\S]*Boolean\(activePlanId \|\| activeShipment\)/,
  "dashboard workflow button must require an active actionable plan before it can run",
);

assert.match(
  dashboardSource,
  /disabled=\{!canUseWorkflowAction\}/,
  "dashboard workflow button must use the active-plan guard for its disabled state",
);

assert.match(
  shipmentDataSource,
  /\.in\('plan_id', assignedPlanIds\)/,
  "driver assigned shipments must include every assigned open/approved plan, not only one active plan",
);

assert.doesNotMatch(
  shipmentDataSource,
  /\.eq\('plan_id', activePlanId\)/,
  "driver assigned shipment loading must not hide tomorrow or secondary assigned plans behind one active plan filter",
);

assert.doesNotMatch(
  shipmentDataSource,
  /terminalStatuses[\s\S]*\.filter\(\(s: any\) => !terminalStatuses\.has\(String\(s\.shipment_status \?\? ''\)\)\)/,
  "driver assigned shipment loading must keep delivered/failed shipments visible in plan totals",
);

assert.match(
  shipmentDataSource,
  /\.in\('plan_status', \['pending', 'in_progress', 'completed'\]\)/,
  "driver assigned plan loading must keep assigned pending and completed plans visible for plan totals",
);

assert.doesNotMatch(
  shipmentDataSource,
  /if \(actionablePlanIds\.size === 0\) return null;/,
  "driver active plan selection must keep an all-terminal assigned plan visible instead of dropping it",
);

assert.match(
  deliveryStoreSource,
  /function resolveShipmentWorkflowPhase[\s\S]*shipment\.shipment_status[\s\S]*shipment\.delivery_phase/,
  "driver shipment mapping must prefer the canonical shipment_status when delivery_phase is stale",
);

assert.match(
  deliveryStoreSource,
  /const phase = resolveShipmentWorkflowPhase\(shipment\)/,
  "driver shipment mapping must use the resolved canonical workflow phase",
);

assert.match(
  loadConfirmationSource,
  /await markShipmentPickedUp\(shipment\.id\);[\s\S]*showToast/,
  "load confirmation must show success only after full-load RPC succeeds",
);

assert.match(
  loadConfirmationSource,
  /await startOutForDelivery\(\);[\s\S]*navigate\('\/route'\)/,
  "load confirmation must navigate directly to route after route-start RPC succeeds",
);

assert.match(
  shipmentDetailSource,
  /const handleStartDelivery = async \(\) =>[\s\S]*await updateStatus\(shipment\.id, 'in_transit'/,
  "shipment detail start-delivery action must wait for the backend phase update before showing success",
);

assert.match(
  shipmentDetailSource,
  /await setProofOfDelivery\(shipment\.id, proofPath/,
  "shipment detail delivery confirmation must wait for the backend POD phase update before showing success",
);

assert.match(
  shipmentDetailSource,
  /const handleReportFailure = async \(\) =>[\s\S]*await reportFailure\(shipment\.id, failureReason, failureNotes\)/,
  "shipment detail failure report must wait for the backend phase update before navigating away",
);

assert.match(
  shipmentDetailSource,
  /const handleAddNote = async \(\) =>[\s\S]*await addNote\(shipment\.id, newNote\)/,
  "shipment detail notes must wait for the backend event write before showing success",
);

assert.match(
  deliveryStoreSource,
  /scheduleRealtimeRefresh:\s*\(\)\s*=>\s*void/,
  "driver store must expose a queued realtime refresh API instead of letting realtime overwrite in-flight saves",
);

assert.match(
  deliveryStoreSource,
  /pendingShipmentMutationCount[\s\S]*queuedRealtimeRefresh/,
  "driver store must track in-flight shipment mutations and queue realtime refreshes until saves settle",
);

assert.match(
  deliveryStoreSource,
  /trackShipmentMutation\([\s\S]*persistOrQueueShipmentUpdates/,
  "driver status mutations must be tracked so realtime reloads cannot revert optimistic state mid-save",
);

assert.match(
  driverAppSource,
  /scheduleRealtimeRefresh\(\)/,
  "driver realtime subscription must schedule a guarded refresh instead of immediately loading shipments",
);

assert.doesNotMatch(
  driverAppSource,
  /table:\s*'logistics_shipments'\s*\}/,
  "driver realtime must not subscribe to every logistics shipment in the database",
);

assert.match(
  driverAppSource,
  /table:\s*'logistics_delivery_plans'[\s\S]*filter:\s*`assigned_profile_id=eq\.\$\{profileId\}`/,
  "driver realtime must watch only plans assigned to the current driver",
);

assert.match(
  driverAppSource,
  /table:\s*'logistics_shipments'[\s\S]*filter:\s*`plan_id=eq\.\$\{activePlanId\}`/,
  "driver realtime must watch only shipments in the active assigned plan",
);

assert.doesNotMatch(
  loadShipmentsCatchSource,
  /getCached<FrontendShipmentsResult>\('driver-shipments'\)/,
  "driver online shipment load failures must not restore stale IndexedDB data over newer saves",
);

assert.match(
  deliveryStoreSource,
  /startOutForDelivery: async \(\) => \{[\s\S]*await trackShipmentMutation\([\s\S]*driverStartDeliveryRoute/,
  "driver route-start mutation must be tracked so realtime reloads cannot revert it mid-save",
);

assert.match(
  deliveryStoreSource,
  /endRoute: async \(\) => \{[\s\S]*await trackShipmentMutation\([\s\S]*driverFinishDeliveryRoute/,
  "driver route-finish mutation must be tracked so realtime reloads cannot revert it mid-save",
);

assert.doesNotMatch(
  shipmentDataSource,
  /driver_update_plan_status/,
  "driver frontend must not call plan statuses such as picked_up/out_for_delivery as broad plan_status values",
);

assert.match(
  shipmentDataSource,
  /driver_start_delivery_route/,
  "driver route start must use the backend route lifecycle RPC",
);

assert.match(
  shipmentDataSource,
  /driver_finish_delivery_route/,
  "driver route finish must complete the backend route lifecycle",
);

assert.ok(
  migrations.some(([, source]) =>
    /create or replace function public\.driver_update_shipment_items/i.test(source) &&
    /assigned_profile_id/i.test(source) &&
    /done_quantity/i.test(source) &&
    !/"assignedProfileId"/.test(source) &&
    !/"doneQuantity"/.test(source)
  ),
  "driver_update_shipment_items must be redefined against the current snake_case logistics schema",
);

assert.ok(
  migrations.some(([, source]) =>
    /create or replace function public\.logistics_delivery_phase_from_status/i.test(source) &&
    /create or replace function public\.driver_update_shipment_phase/i.test(source) &&
    /v_current_phase := public\.logistics_canonical_driver_phase/i.test(source)
  ),
  "driver_update_shipment_phase must resolve stale delivery_phase from canonical shipment_status",
);

assert.ok(
  migrations.some(([, source]) =>
    /create or replace function public\.driver_start_delivery_route/i.test(source) &&
    /where shipment\.plan_id::text = p_plan_id::text/i.test(source) &&
    /coalesce\(shipment\.delivery_phase, public\.logistics_delivery_phase_from_status\(shipment\.shipment_status\), 'pending'\)/i.test(source) &&
    !/where plan_id::text = p_plan_id::text\s+and assigned_profile_id::text = auth\.uid\(\)::text/i.test(source)
  ),
  "driver route-start must update plan-owned shipments even when shipment.assigned_profile_id is null",
);

console.log("Driver workflow regression checks passed.");
