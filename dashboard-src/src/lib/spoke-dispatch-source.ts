export const SPOKE_DISPATCH_API_BASE_URL = "https://api.getcircuit.com/public/v0.2b" as const;

export type SpokeDispatchTag =
  | "plans"
  | "stops"
  | "unassignedStops"
  | "livePlans"
  | "liveStops"
  | "drivers"
  | "routes"
  | "operations";

export type SpokeDispatchEndpoint = {
  tag: SpokeDispatchTag;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  operationId: string;
  description: string;
  maxPageSize?: number;
  filters?: readonly string[];
  liveOnly?: boolean;
  preferBatchForMany?: boolean;
};

export const SPOKE_DISPATCH_ENDPOINTS = [
  {
    tag: "plans",
    method: "POST",
    path: "/plans",
    operationId: "createPlan",
    description: "Create a writable delivery plan.",
  },
  {
    tag: "plans",
    method: "GET",
    path: "/plans",
    operationId: "listPlans",
    description: "List plans by title or start date range.",
    maxPageSize: 20,
    filters: ["title", "startsGte", "startsLte"],
  },
  {
    tag: "plans",
    method: "GET",
    path: "/plans/{planId}",
    operationId: "getPlan",
    description: "Retrieve a plan.",
  },
  {
    tag: "plans",
    method: "PATCH",
    path: "/plans/{planId}",
    operationId: "updatePlan",
    description: "Sparse-update a writable plan. Use live plan endpoints when writable is false.",
  },
  {
    tag: "plans",
    method: "DELETE",
    path: "/plans/{planId}",
    operationId: "deletePlan",
    description: "Delete a plan and related routes.",
  },
  {
    tag: "plans",
    method: "POST",
    path: "/plans/{planId}:optimize",
    operationId: "optimizePlan",
    description: "Start async plan optimization and poll Operations for the result.",
  },
  {
    tag: "plans",
    method: "POST",
    path: "/plans/{planId}:distribute",
    operationId: "distributePlan",
    description: "Send optimized routes to drivers.",
  },
  {
    tag: "livePlans",
    method: "POST",
    path: "/plans/{planId}:reoptimize",
    operationId: "reoptimizePlan",
    description: "Reoptimize after editing a live plan.",
    liveOnly: true,
  },
  {
    tag: "livePlans",
    method: "POST",
    path: "/plans/{planId}:redistribute",
    operationId: "redistributePlan",
    description: "Save live optimization changes and resend routes.",
    liveOnly: true,
  },
  {
    tag: "livePlans",
    method: "POST",
    path: "/plans/{planId}:save",
    operationId: "savePlan",
    description: "Save live plan changes without redistributing.",
    liveOnly: true,
  },
  {
    tag: "stops",
    method: "POST",
    path: "/plans/{planId}/stops",
    operationId: "createStop",
    description: "Create one stop on a writable plan.",
  },
  {
    tag: "stops",
    method: "POST",
    path: "/plans/{planId}/stops:import",
    operationId: "importStops",
    description: "Batch import stops to a writable plan.",
    preferBatchForMany: true,
  },
  {
    tag: "stops",
    method: "GET",
    path: "/plans/{planId}/stops",
    operationId: "listStops",
    description: "List plan stops.",
    maxPageSize: 10,
    filters: ["externalId"],
  },
  {
    tag: "stops",
    method: "GET",
    path: "/plans/{planId}/stops/{stopId}",
    operationId: "getStop",
    description: "Retrieve one stop.",
  },
  {
    tag: "stops",
    method: "PATCH",
    path: "/plans/{planId}/stops/{stopId}",
    operationId: "updateStop",
    description: "Sparse-update a stop. Location and circuitClientId cannot be changed.",
  },
  {
    tag: "stops",
    method: "DELETE",
    path: "/plans/{planId}/stops/{stopId}",
    operationId: "deleteStop",
    description: "Delete one stop from a writable plan.",
  },
  {
    tag: "liveStops",
    method: "POST",
    path: "/plans/{planId}/stops:liveCreate",
    operationId: "createLiveStop",
    description: "Create one stop on a live plan edit session.",
    liveOnly: true,
  },
  {
    tag: "liveStops",
    method: "POST",
    path: "/plans/{planId}/stops:liveImport",
    operationId: "importLiveStops",
    description: "Batch import stops on a live plan edit session.",
    liveOnly: true,
    preferBatchForMany: true,
  },
  {
    tag: "liveStops",
    method: "POST",
    path: "/plans/{planId}/stops/{stopId}:liveUpdate",
    operationId: "updateLiveStop",
    description: "Update one stop on a live plan edit session.",
    liveOnly: true,
  },
  {
    tag: "liveStops",
    method: "POST",
    path: "/plans/{planId}/stops/{stopId}:liveDelete",
    operationId: "deleteLiveStop",
    description: "Delete one stop on a live plan edit session.",
    liveOnly: true,
  },
  {
    tag: "unassignedStops",
    method: "POST",
    path: "/unassignedStops",
    operationId: "createUnassignedStop",
    description: "Create one stop outside a plan.",
  },
  {
    tag: "unassignedStops",
    method: "POST",
    path: "/unassignedStops:import",
    operationId: "importUnassignedStops",
    description: "Batch import unassigned stops. Depot is shared for the request.",
    preferBatchForMany: true,
  },
  {
    tag: "unassignedStops",
    method: "GET",
    path: "/unassignedStops",
    operationId: "listUnassignedStops",
    description: "List stops that are not assigned to a plan.",
    maxPageSize: 20,
    filters: ["externalId"],
  },
  {
    tag: "unassignedStops",
    method: "GET",
    path: "/unassignedStops/{unassignedStopId}",
    operationId: "getUnassignedStop",
    description: "Retrieve one unassigned stop.",
  },
  {
    tag: "unassignedStops",
    method: "PATCH",
    path: "/unassignedStops/{unassignedStopId}",
    operationId: "updateUnassignedStop",
    description: "Sparse-update one unassigned stop. Location and circuitClientId cannot be changed.",
  },
  {
    tag: "unassignedStops",
    method: "DELETE",
    path: "/unassignedStops/{unassignedStopId}",
    operationId: "deleteUnassignedStop",
    description: "Delete one unassigned stop.",
  },
  {
    tag: "drivers",
    method: "GET",
    path: "/drivers",
    operationId: "listDrivers",
    description: "List team drivers.",
    maxPageSize: 50,
    filters: ["active"],
  },
  {
    tag: "drivers",
    method: "POST",
    path: "/drivers",
    operationId: "createDriver",
    description: "Create one driver. Rate limit is one request per second.",
  },
  {
    tag: "drivers",
    method: "POST",
    path: "/drivers:import",
    operationId: "importDrivers",
    description: "Batch import drivers.",
    preferBatchForMany: true,
  },
  {
    tag: "drivers",
    method: "GET",
    path: "/drivers/{driverId}",
    operationId: "getDriver",
    description: "Retrieve one driver.",
  },
  {
    tag: "drivers",
    method: "PATCH",
    path: "/drivers/{driverId}",
    operationId: "updateDriver",
    description: "Sparse-update one driver.",
  },
  {
    tag: "drivers",
    method: "DELETE",
    path: "/drivers/{driverId}",
    operationId: "deleteDriver",
    description: "Remove the driver role from a team member.",
  },
  {
    tag: "routes",
    method: "GET",
    path: "/routes/{routeId}",
    operationId: "getRoute",
    description: "Retrieve one generated route.",
  },
  {
    tag: "operations",
    method: "GET",
    path: "/operations",
    operationId: "listOperations",
    description: "List async operations.",
    maxPageSize: 20,
    filters: ["done", "type"],
  },
  {
    tag: "operations",
    method: "GET",
    path: "/operations/{operationId}",
    operationId: "getOperation",
    description: "Poll one async operation.",
  },
  {
    tag: "operations",
    method: "POST",
    path: "/operations/{operationId}:cancel",
    operationId: "cancelOperation",
    description: "Cancel an operation that is not done.",
  },
] as const satisfies readonly SpokeDispatchEndpoint[];

export type SpokeDispatchEndpointId = (typeof SPOKE_DISPATCH_ENDPOINTS)[number]["operationId"];

export const SPOKE_DISPATCH_RATE_LIMITS = {
  readRequestsPerSecond: 10,
  writeRequestsPerSecond: 5,
  driverCreateRequestsPerSecond: 1,
} as const;

export const SPOKE_DISPATCH_PAGINATION = {
  responseTokenField: "nextPageToken",
  requestTokenParam: "pageToken",
  keepOriginalFiltersOnNextPage: true,
} as const;

export const SPOKE_DISPATCH_APP_STATUS_MAP = {
  PENDING_INVENTORY: "pending_inventory_check",
  PENDING_ASSIGN: "unassigned_or_not_routed",
  READY_FOR_PICKUP: "ready_for_driver_pickup",
  PICKED_UP: "driver_picked_up",
  OUT_FOR_DELIVERY: "distributed_live_route",
  DELIVERED: "delivery_completed",
  CANCELLED: "stop_failed_or_cancelled",
} as const;

export const SPOKE_DISPATCH_APP_MODEL_MAP = {
  plans: {
    dispatchModel: "Plan",
    appTable: "logistics_delivery_plans",
    vendorIdColumn: "spoke_plan_id",
  },
  stops: {
    dispatchModel: "Stop",
    appTable: "logistics_shipments",
    vendorIdColumn: "spoke_stop_id",
  },
  unassignedStops: {
    dispatchModel: "UnassignedStop",
    appTable: "logistics_shipments",
    vendorIdColumn: "spoke_unassigned_stop_id",
  },
  drivers: {
    dispatchModel: "Driver",
    appTable: "logistics_users",
    vendorIdColumn: "spoke_driver_id",
  },
  routes: {
    dispatchModel: "Route",
    appTable: "logistics_delivery_plans",
    vendorIdColumn: "spoke_route_id",
  },
  operations: {
    dispatchModel: "Operation",
    appTable: "logistics_delivery_plans.route_metadata",
    vendorIdColumn: "spoke_operation_id",
  },
} as const;

export function spokeDispatchEndpoint(operationId: SpokeDispatchEndpointId) {
  return SPOKE_DISPATCH_ENDPOINTS.find((endpoint) => endpoint.operationId === operationId);
}

export function spokeDispatchPath(
  operationId: SpokeDispatchEndpointId,
  pathParams: Record<string, string>,
) {
  const endpoint = spokeDispatchEndpoint(operationId);
  if (!endpoint) {
    throw new Error(`Unknown Spoke Dispatch operation: ${operationId}`);
  }

  return endpoint.path.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = pathParams[key];
    if (!value) {
      throw new Error(`Missing Spoke Dispatch path parameter: ${key}`);
    }
    return encodeURIComponent(value);
  });
}

