import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DeliveryPlan, OfflineAction, Shipment, ShipmentItem, ShipmentStatus } from '@/types';
import type { DriverShipment, DriverShipmentDetail, DriverShipmentPhase } from '@/types/driverBackend';
import {
  fetchAssignedShipmentDetails,
  updateShipmentPhase,
  reportDeliveryFailure,
  driverReorderPlanShipments,
  driverStartDeliveryRoute,
  driverFinishDeliveryRoute,
  type PlannedRoutePoint,
  type AssignedPlanRow,
} from '@/services/shipmentData';
import { getCurrentDriverLocation } from '@/services/locationTracking';
import {
  shipmentStatusFromWorkflowToken,
  timelineActionFromWorkflowEvent,
} from '@/services/driverWorkflow';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

type RouteGate = {
  routeShipments: Shipment[];
  nextActionableShipmentId: string | null;
  outOfSequenceShipmentIds: Set<string>;
};

interface DeliveryState {
  shipments: Shipment[];
  allPlans: AssignedPlanRow[];
  pendingPlans: AssignedPlanRow[];
  viewerPlans: AssignedPlanRow[];
  viewerShipments: Shipment[];
  activePlanId: string | null;
  selectedPlanId: string | null;
  statusFilter: ShipmentStatus | 'all';
  searchQuery: string;
  selectedShipmentId: string | null;
  isLoading: boolean;
  isSavingAction: boolean;
  error: string | null;
  attendedToday: boolean;

  setStatusFilter: (filter: ShipmentStatus | 'all') => void;
  setSearchQuery: (query: string) => void;
  selectShipment: (id: string | null) => void;
  selectPlan: (planId: string | null) => void;
  updateShipmentStatus: (id: string, status: ShipmentStatus, note?: string) => Promise<void>;
  addShipmentNote: (id: string, note: string) => Promise<void>;
  setProofOfDelivery: (id: string, photoUrl: string, notes?: string, payload?: Record<string, unknown>) => Promise<void>;
  reportFailure: (id: string, reason: string, note: string, photoUrl?: string, returnType?: 'full' | 'partial', returnItems?: Array<{ itemId: string; productName: string; returnedQuantity: number }>) => Promise<void>;
  startShift: () => Promise<void>;
  markAllPickedUp: () => Promise<void>;
  markShipmentPickedUp: (id: string) => Promise<void>;
  markShipmentPartialLoad: (id: string, items: { name: string; quantity: number; loadedQuantity: number }[]) => Promise<void>;
  startOutForDelivery: () => Promise<void>;
  endRoute: () => Promise<void>;
  reorderPlanShipments: (shipmentIds: string[]) => Promise<void>;
  loadShipments: () => Promise<void>;
  scheduleRealtimeRefresh: () => void;
  getFilteredShipments: () => Shipment[];
  getShipmentById: (id: string) => Shipment | undefined;
  getRouteGate: (planId?: string) => RouteGate;
  getPlans: () => DeliveryPlan[];
  getPlanShipments: (planId: string) => Shipment[];
  getStats: () => { total: number; pending: number; inTransit: number; delivered: number; failed: number; successRate: number };
}

function toNumberOrNull(value: number | string | null | undefined) {
  if (value == null || value === '') return null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`قيمة رقمية غير صالحة من الخادم: ${String(value)}`);
  }
  return parsed;
}

function toBoolean(value: boolean | string | null | undefined) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

function requireBackendValue<T>(value: T | null | undefined, fieldName: string): T {
  if (value == null || value === '') {
    throw new Error(`قيمة مطلوبة مفقودة من الخادم: ${fieldName}`);
  }
  return value;
}

function toShipmentStatus(phase: string): ShipmentStatus {
  return shipmentStatusFromWorkflowToken(phase, 'shipment phase');
}

function toDriverPhase(status: ShipmentStatus, currentPhase?: string): DriverShipmentPhase {
  if (status === 'delivered') return 'delivered';
  if (status === 'failed') return 'failed';
  if (status === 'in_transit') return 'in_transit';
  if (status === 'pending' && currentPhase) {
    if (currentPhase === 'picked_up' || currentPhase === 'arrived_pickup') {
      return currentPhase as DriverShipmentPhase;
    }
  }
  return 'pending';
}

function toDriverStatusFromPhase(phase: DriverShipmentPhase): ShipmentStatus {
  return shipmentStatusFromWorkflowToken(phase, 'driver shipment phase');
}

const DRIVER_PHASE_BY_SHIPMENT_STATUS: Record<string, DriverShipmentPhase> = {
  PENDING_ASSIGN: 'pending',
  ASSIGNED: 'assigned',
  CHECK_IN: 'arrived_pickup',
  PICKUP: 'picked_up',
  OUT_FOR_DELIVERY: 'in_transit',
  ARRIVED: 'arrived_delivery',
  DELIVERED: 'delivered',
  FINISHED: 'finished',
  SETTLED: 'settled',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
  ATTEMPTED: 'attempted',
};

const DRIVER_PHASE_RANK: Record<string, number> = {
  pending: 0,
  ready: 0,
  ready_for_pickup: 0,
  assigned: 1,
  accepted: 1,
  arrived_pickup: 2,
  check_in: 2,
  picked_up: 3,
  in_transit: 4,
  out_for_delivery: 4,
  arrived_delivery: 5,
  delivered: 6,
  finished: 7,
  settled: 8,
  attempted: 9,
  failed: 9,
  cancelled: 9,
};

function normalizeDriverPhase(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return normalized.length > 0 ? normalized : null;
}

function resolveShipmentWorkflowPhase(shipment: DriverShipment) {
  const statusPhase = DRIVER_PHASE_BY_SHIPMENT_STATUS[
    String(shipment.shipment_status ?? '').trim().toUpperCase()
  ];
  const deliveryPhase = normalizeDriverPhase(shipment.delivery_phase);

  if (!statusPhase) {
    return requireBackendValue(
      deliveryPhase ?? shipment.shipment_status,
      'logistics_shipments.delivery_phase or logistics_shipments.shipment_status'
    );
  }

  if (!deliveryPhase) return statusPhase;

  return (DRIVER_PHASE_RANK[statusPhase] ?? 0) >= (DRIVER_PHASE_RANK[deliveryPhase] ?? 0)
    ? statusPhase
    : deliveryPhase;
}

function statusAction(status: ShipmentStatus) {
  const labels: Record<ShipmentStatus, string> = {
    pending: 'معلق',
    in_transit: 'قيد التوصيل',
    delivered: 'تم التسليم',
    failed: 'فشل التسليم',
  };
  return `تم تغيير الحالة إلى "${labels[status]}"`;
}

function isTerminalShipment(status: ShipmentStatus) {
  return status === 'delivered' || status === 'failed';
}

function sortRouteShipments(shipments: Shipment[]) {
  return [...shipments].sort((a, b) => {
    if (a.routeOrder == null && b.routeOrder == null) return 0;
    if (a.routeOrder == null) return 1;
    if (b.routeOrder == null) return -1;
    return a.routeOrder - b.routeOrder;
  });
}

function normalizeStopKeyPart(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
}

function cleanDisplayText(value: string | null | undefined) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function cleanAddressPart(value: string | null | undefined) {
  const text = cleanDisplayText(value);
  if (!text) return null;

  const normalized = text.toLowerCase().replace(/\s+/g, ' ');
  const operationalRefs = [
    'partners/customers',
    'partners/vendors',
    'stock/',
    'delivery orders',
    'receipts',
    'internal transfers',
  ];

  if (operationalRefs.some((ref) => normalized.includes(ref))) return null;
  return text;
}

function uniqueParts(parts: Array<string | null>) {
  const seen = new Set<string>();
  return parts.filter((part): part is string => {
    if (!part) return false;
    const key = normalizeStopKeyPart(part);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function routeStopKey(shipment: Shipment) {
  const customer = normalizeStopKeyPart(shipment.customerName);
  const address = normalizeStopKeyPart(shipment.address);
  const coordinates = shipment.coordinates
    ? `${shipment.coordinates.lat.toFixed(5)},${shipment.coordinates.lng.toFixed(5)}`
    : '';

  return [customer, address, coordinates].join('|');
}

function groupedStopStatus(shipments: Shipment[]): ShipmentStatus {
  if (shipments.some((shipment) => shipment.status === 'in_transit')) return 'in_transit';
  if (shipments.some((shipment) => shipment.status === 'pending')) return 'pending';
  if (shipments.some((shipment) => shipment.status === 'failed')) return 'failed';
  return 'delivered';
}

function groupRouteStops(shipments: Shipment[]) {
  const grouped = new Map<string, Shipment[]>();

  sortRouteShipments(shipments).forEach((shipment) => {
    const key = routeStopKey(shipment);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(shipment);
      return;
    }
    grouped.set(key, [shipment]);
  });

  return Array.from(grouped.values()).map((stopShipments) => {
    const sortedStopShipments = sortRouteShipments(stopShipments);
    const primary =
      sortedStopShipments.find((shipment) => !isTerminalShipment(shipment.status)) ?? sortedStopShipments[0];
    const routeOrder = sortedStopShipments.reduce<number | null>((lowest, shipment) => {
      if (shipment.routeOrder == null) return lowest;
      return lowest == null ? shipment.routeOrder : Math.min(lowest, shipment.routeOrder);
    }, null);

    const groupedItems = sortedStopShipments.flatMap((shipment) => shipment.items);
    const skuCount = sortedStopShipments.reduce(
      (sum, shipment) => sum + (shipment.skuCount ?? shipment.totalItems ?? shipment.items.length),
      0
    );
    const totalQuantity = sortedStopShipments.reduce(
      (sum, shipment) =>
        sum +
        (shipment.totalQuantity ??
          shipment.items.reduce((itemSum, item) => itemSum + (item.quantity ?? 0), 0)),
      0
    );

    return {
      ...primary,
      id: primary.id,
      shipmentIds: sortedStopShipments.map((shipment) => shipment.id),
      shipmentCount: sortedStopShipments.length,
      items: groupedItems,
      totalItems: skuCount,
      skuCount,
      totalQuantity,
      status: groupedStopStatus(sortedStopShipments),
      routeOrder,
      routeLocked: sortedStopShipments.some((shipment) => shipment.routeLocked),
      eventHistory: sortedStopShipments.flatMap((shipment) => shipment.eventHistory),
    };
  });
}

function shipmentIdsInSameStop(shipments: Shipment[], shipmentId: string) {
  const shipment = shipments.find((candidate) => candidate.id === shipmentId);
  if (!shipment) return [shipmentId];

  const key = routeStopKey(shipment);
  return shipments
    .filter((candidate) => routeStopKey(candidate) === key)
    .map((candidate) => candidate.id);
}

function buildAddress(shipment: DriverShipment) {
  const addressLine = cleanAddressPart(shipment.customer?.address_line);
  if (!addressLine) return null;

  const customerParts = uniqueParts([
    addressLine,
    shipment.customer?.place,
    shipment.customer?.district,
    shipment.customer?.governorate,
  ].map(cleanAddressPart));

  if (customerParts.length > 0) return customerParts.join(', ');
  return null;
}

function resolveCustomerName(shipment: DriverShipment) {
  return (
    cleanDisplayText(shipment.customer?.customer_name) ??
    cleanDisplayText(shipment.customer_name) ??
    cleanDisplayText(shipment.external_customer_id) ??
    null
  );
}

function resolveCustomerPhone(shipment: DriverShipment) {
  return (
    cleanDisplayText(shipment.customer?.phone_number) ??
    cleanDisplayText(shipment.customer?.whatsapp_number) ??
    cleanDisplayText(shipment.customer_phone) ??
    null
  );
}

function mapItems(detail: DriverShipmentDetail): ShipmentItem[] {
  return detail.items.map((item) => ({
    id: item.id,
    name: item.product_name ?? item.product_ref ?? item.external_product_id ?? null,
    quantity: toNumberOrNull(item.requested_quantity ?? item.done_quantity ?? item.reserved_quantity),
    productRef: item.product_ref ?? item.external_product_id ?? null,
    requestedQuantity: toNumberOrNull(item.requested_quantity),
    doneQuantity: toNumberOrNull(item.done_quantity),
    reservedQuantity: toNumberOrNull(item.reserved_quantity),
    forecastQuantity: toNumberOrNull(item.forecast_quantity),
    moveState: item.move_state ?? null,
    preparationStatus: item.preparation_status ?? null,
    approvedQuantity: item.approved_quantity != null ? toNumberOrNull(item.approved_quantity) : null,
    shortageReason: item.shortage_reason ?? null,
  }));
}

function mapEvents(detail: DriverShipmentDetail, shipment: DriverShipment, status: ShipmentStatus) {
  if (detail.events.length === 0) {
    const timestamp = requireBackendValue(
      shipment.last_sync_at ?? shipment.scheduled_at,
      'logistics_shipments.last_sync_at or logistics_shipments.scheduled_at'
    );

    return [
      {
        action: statusAction(status),
        timestamp,
        user: shipment.assigned_user_name,
        note: shipment.notes ?? undefined,
      },
    ];
  }

  return [...detail.events].reverse().map((event) => ({
    action: timelineActionFromWorkflowEvent(
      {
        next_phase: requireBackendValue(event.next_phase, 'logistics_shipment_events.next_phase'),
        note: event.note,
      },
      statusAction,
    ),
    timestamp: requireBackendValue(event.created_at, 'logistics_shipment_events.created_at'),
    user: shipment.assigned_user_name,
    note: event.note ?? undefined,
  }));
}

function mapShipment(detail: DriverShipmentDetail): Shipment {
  const shipment = detail.shipment;
  const phase = resolveShipmentWorkflowPhase(shipment);
  const status = toShipmentStatus(phase);
  const items = mapItems(detail);
  const skuCount = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const proofEvent = detail.events.find((event) => event.proof_photo_path);
  const eventHistory = mapEvents(detail, shipment, status);
  const latestFailure = status === 'failed' ? eventHistory[eventHistory.length - 1] : undefined;
  const lat = shipment.customer?.lat ?? toNumberOrNull(shipment.customer_latitude);
  const lng = shipment.customer?.lng ?? toNumberOrNull(shipment.customer_longitude);
  const wLat = toNumberOrNull(shipment.warehouse_latitude);
  const wLng = toNumberOrNull(shipment.warehouse_longitude);

  return {
    id: requireBackendValue(shipment.id, 'logistics_shipments.id'),
    planId: shipment.plan_id ?? null,
    customerName: resolveCustomerName(shipment),
    customerPhone: resolveCustomerPhone(shipment),
    address: buildAddress(shipment),
    coordinates: lat != null && lng != null ? { lat, lng } : null,
    warehouseCoordinates: wLat != null && wLng != null ? { lat: wLat, lng: wLng } : null,
    items,
    totalItems: skuCount,
    skuCount,
    totalQuantity,
    status,
    deliveryPhase: phase,
    notes: shipment.notes,
    failureReason: latestFailure?.note ?? null,
    failureNote: latestFailure?.note ?? null,
    proofOfDelivery: proofEvent?.proof_photo_path
      ? {
          photoUrl: proofEvent.proof_photo_path,
          timestamp: requireBackendValue(proofEvent.created_at, 'logistics_shipment_events.created_at'),
          notes: proofEvent.note ?? undefined,
        }
      : null,
    eventHistory,
    warehouseOrigin: shipment.warehouse_name ?? shipment.source_location_ref ?? shipment.origin_ref ?? null,
    scheduledDate: shipment.scheduled_at ?? shipment.odoo_created_at ?? shipment.last_sync_at ?? null,
    priority: ['high', 'urgent', 'priority'].includes(String(shipment.priority).toLowerCase())
      ? 'high'
      : 'normal',
    routeOrder: toNumberOrNull(shipment.route_sequence),
    routeLocked: toBoolean(shipment.route_locked),
    operationType: shipment.operation_type_name ?? shipment.move_type ?? null,
    shipmentReference: shipment.shipment_reference ?? shipment.external_shipment_id ?? null,
    orderReference: detail.collection?.orderNumber ?? shipment.odoo_order_name ?? shipment.external_order_id ?? null,
    totalWeight: toNumberOrNull(shipment.total_weight),
    collection: detail.collection,
    orders: detail.shipment.orders ?? [],
  };
}

function applyLocalStatus(
  shipment: Shipment,
  status: ShipmentStatus,
  note?: string,
  extra?: Partial<Shipment>
): Shipment {
  return {
    ...shipment,
    ...extra,
    status,
    eventHistory: [
      ...shipment.eventHistory,
      {
        action: statusAction(status),
        timestamp: new Date().toISOString(),
        user: null,
        note,
      },
    ],
  };
}

function applyLocalPhase(shipment: Shipment, phase: DriverShipmentPhase, note?: string): Shipment {
  return {
    ...applyLocalStatus(shipment, toDriverStatusFromPhase(phase), note),
    deliveryPhase: phase,
  };
}

async function persistOrThrow(
  request: Promise<unknown>,
  set: (state: Partial<DeliveryState>) => void,
  reload: () => Promise<void>
) {
  try {
    await request;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    set({
      error: message,
    });
    useUIStore.getState().showToast(message, 'error');
    // Force a fresh fetch on error to revert the optimistic update
    frontendShipmentsPromise = null;
    void reload();
    throw error;
  }
}

function buildPlannedRoute(shipments: Shipment[]): PlannedRoutePoint[] {
  return sortRouteShipments(shipments)
    .filter((shipment) => shipment.coordinates)
    .map((shipment) => ({
      shipmentId: shipment.id,
      lat: shipment.coordinates!.lat,
      lng: shipment.coordinates!.lng,
      sequence: shipment.routeOrder,
    }));
}

type QueuedShipmentPhaseUpdate = {
  actionType: OfflineAction['type'];
  shipmentId: string;
  nextPhase: DriverShipmentPhase;
  note?: string;
  proofPhotoPath?: string | null;
  payload?: Record<string, unknown>;
};

async function sendShipmentPhaseUpdates(updates: QueuedShipmentPhaseUpdate[]) {
  const location = await getCurrentDriverLocation();

  const results = await Promise.allSettled(
    updates.map((update) =>
      updateShipmentPhase({
        shipmentId: update.shipmentId,
        nextPhase: update.nextPhase,
        note: update.note,
        proofPhotoPath: update.proofPhotoPath,
        payload: update.payload,
        location,
      })
    )
  );

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    const firstError = (failures[0] as PromiseRejectedResult).reason;
    throw firstError instanceof Error ? firstError : new Error(String(firstError));
  }
}

async function persistOrQueueShipmentUpdates(
  updates: QueuedShipmentPhaseUpdate[],
  set: (state: Partial<DeliveryState>) => void,
  reload: () => Promise<void>
) {
  try {
    await sendShipmentPhaseUpdates(updates);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    set({ error: message });
    useUIStore.getState().showToast(message, 'error');
    frontendShipmentsPromise = null;
    void reload();
    throw error;
  }
}

type FrontendShipmentsResult = {
  activePlanId: string | null;
  allPlans: AssignedPlanRow[];
  pendingPlans: AssignedPlanRow[];
  shipments: Shipment[];
  viewerPlans: AssignedPlanRow[];
  viewerShipments: Shipment[];
  attendedToday: boolean;
};

let frontendShipmentsPromise: Promise<FrontendShipmentsResult> | null = null;
let pendingShipmentMutationCount = 0;
let queuedRealtimeRefresh = false;
let realtimeRefreshTimer: ReturnType<typeof setTimeout> | null = null;

function fetchFrontendShipments(): Promise<FrontendShipmentsResult> {
  const profileId = requireBackendValue(useAuthStore.getState().user?.id, 'driver auth profile id');
  return fetchAssignedShipmentDetails(profileId).then(({ activePlanId, allPlans, pendingPlans, details, viewerPlans, viewerDetails, attendedToday }) => ({
    activePlanId,
    allPlans,
    pendingPlans,
    attendedToday,
    shipments: details.map((detail) => mapShipment(detail)),
    viewerPlans,
    viewerShipments: viewerDetails.map((detail) => mapShipment(detail)),
  }));
}

function clearRealtimeRefreshTimer() {
  if (realtimeRefreshTimer) {
    clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = null;
  }
}

function queueRealtimeRefresh(
  loadShipments: () => Promise<void>,
  isBusy: () => boolean,
  delayMs = 450
) {
  queuedRealtimeRefresh = true;

  if (realtimeRefreshTimer) return;

  realtimeRefreshTimer = setTimeout(() => {
    realtimeRefreshTimer = null;

    if (pendingShipmentMutationCount > 0 || isBusy()) {
      queueRealtimeRefresh(loadShipments, isBusy, delayMs);
      return;
    }

    if (!queuedRealtimeRefresh) return;

    queuedRealtimeRefresh = false;
    frontendShipmentsPromise = null;
    void loadShipments();
  }, delayMs);
}

async function trackShipmentMutation<T>(
  operation: () => Promise<T>,
  set: (state: Partial<DeliveryState>) => void,
  loadShipments: () => Promise<void>,
  isBusy: () => boolean
) {
  pendingShipmentMutationCount += 1;
  set({ isSavingAction: true });

  try {
    return await operation();
  } finally {
    pendingShipmentMutationCount = Math.max(0, pendingShipmentMutationCount - 1);
    set({ isSavingAction: pendingShipmentMutationCount > 0 });

    if (pendingShipmentMutationCount === 0 && queuedRealtimeRefresh) {
      clearRealtimeRefreshTimer();
      queueRealtimeRefresh(loadShipments, isBusy, 150);
    }
  }
}

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set, get) => ({
      shipments: [],
      allPlans: [],
      pendingPlans: [],
      viewerPlans: [],
      viewerShipments: [],
      activePlanId: null,
      selectedPlanId: null,
      statusFilter: 'all',
      searchQuery: '',
      selectedShipmentId: null,
      isLoading: false,
      isSavingAction: false,
      error: null,
      attendedToday: false,

      setStatusFilter: (filter) => set({ statusFilter: filter }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      selectShipment: (id) => set({ selectedShipmentId: id }),
      selectPlan: (planId) => set({ selectedPlanId: planId }),

      reorderPlanShipments: async (shipmentIds: string[]) => {
        const shipments = get().shipments;
        const planId = shipments.find((s) => shipmentIds.includes(s.id))?.planId;
        if (!planId) return;

        // Optimistic local reorder + update routeOrder to reflect new sequence
        const reordered = [...shipments].sort((a, b) => {
          const aIdx = shipmentIds.indexOf(a.id);
          const bIdx = shipmentIds.indexOf(b.id);
          if (aIdx === -1 && bIdx === -1) return 0;
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        }).map((s) => {
          const idx = shipmentIds.indexOf(s.id);
          if (idx === -1) return s;
          return { ...s, routeOrder: idx + 1 };
        });

        set({ shipments: reordered });

        try {
          await driverReorderPlanShipments(planId, shipmentIds);
      } catch {
        // Revert on error
        void get().loadShipments();
      }
      },

loadShipments: async () => {
        set({ isLoading: true, error: null });

        try {
          // Always fetch fresh data from the server; no cache is used.
          frontendShipmentsPromise = fetchFrontendShipments().finally(() => {
            frontendShipmentsPromise = null;
          });

          const result = await frontendShipmentsPromise;

          set({ shipments: result.shipments, allPlans: result.allPlans, pendingPlans: result.pendingPlans, viewerPlans: result.viewerPlans, viewerShipments: result.viewerShipments, activePlanId: result.activePlanId, attendedToday: result.attendedToday, isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },

      scheduleRealtimeRefresh: () => {
        queueRealtimeRefresh(
          get().loadShipments,
          () => get().isLoading || get().isSavingAction
        );
      },

      updateShipmentStatus: async (id, status, note) => {
        const shipmentIds = shipmentIdsInSameStop(get().shipments, id);

        set((state) => ({
          shipments: state.shipments.map((shipment) =>
            shipmentIds.includes(shipment.id) ? applyLocalStatus(shipment, status, note) : shipment
          ),
        }));

        await trackShipmentMutation(
          () =>
            persistOrQueueShipmentUpdates(
              shipmentIds.map((shipmentId) => ({
                actionType: 'status_update',
                shipmentId,
                nextPhase: toDriverPhase(status),
                note,
                payload: { status },
              })),
              set,
              get().loadShipments
            ),
          set,
          get().loadShipments,
          () => get().isLoading
        );
      },

      addShipmentNote: async (id, note) => {
        const current = get().shipments.find((shipment) => shipment.id === id);
        const shipmentIds = shipmentIdsInSameStop(get().shipments, id);

        set((state) => ({
          shipments: state.shipments.map((shipment) =>
            shipmentIds.includes(shipment.id)
              ? {
                  ...shipment,
                  notes: shipment.notes ? `${shipment.notes}\n${note}` : note,
                  eventHistory: [
                    ...shipment.eventHistory,
                    {
                      action: 'تمت إضافة ملاحظة',
                      timestamp: new Date().toISOString(),
                      user: null,
                      note,
                    },
                  ],
                }
              : shipment
          ),
        }));

        if (!current) return;

        await trackShipmentMutation(
          () =>
            persistOrQueueShipmentUpdates(
              shipmentIds.map((shipmentId) => ({
                actionType: 'note_added',
                shipmentId,
                nextPhase: toDriverPhase(current.status),
                note,
                payload: { action: 'note_added' },
              })),
              set,
              get().loadShipments
            ),
          set,
          get().loadShipments,
          () => get().isLoading
        );
      },

      setProofOfDelivery: async (id, photoUrl, notes, payload) => {
        const allSameStopIds = shipmentIdsInSameStop(get().shipments, id);
        const shipments = get().shipments;

        const deliverableIds = allSameStopIds.filter((shipmentId) => {
          const s = shipments.find((sh) => sh.id === shipmentId);
          if (!s) return false;
          const phase = (s.deliveryPhase ?? '').toLowerCase();
          return ['in_transit', 'arrived_delivery', 'delivered'].includes(phase) || s.status === 'in_transit';
        });

        if (deliverableIds.length === 0) return;

        set((state) => ({
          shipments: state.shipments.map((shipment) =>
            deliverableIds.includes(shipment.id)
              ? applyLocalStatus(shipment, 'delivered', notes, {
                  proofOfDelivery: {
                    photoUrl,
                    timestamp: new Date().toISOString(),
                    notes,
                  },
                })
              : shipment
          ),
        }));

        await trackShipmentMutation(
          () =>
            persistOrQueueShipmentUpdates(
              deliverableIds.map((shipmentId) => ({
                actionType: 'pod_uploaded',
                shipmentId,
                nextPhase: 'delivered',
                note: notes,
                proofPhotoPath: photoUrl,
                payload,
              })),
              set,
              get().loadShipments
            ),
          set,
          get().loadShipments,
          () => get().isLoading
        );
      },

      reportFailure: async (id, reason, note, photoUrl, returnType = 'full', returnItems) => {
        const shipmentIds = shipmentIdsInSameStop(get().shipments, id);

        set((state) => ({
          shipments: state.shipments.map((shipment) =>
            shipmentIds.includes(shipment.id)
              ? applyLocalStatus(shipment, 'failed', `${reason}${note ? ': ' + note : ''}`, {
                  failureReason: reason,
                  failureNote: note,
                  proofOfDelivery: photoUrl
                    ? {
                        photoUrl,
                        timestamp: new Date().toISOString(),
                        notes: note,
                      }
                    : shipment.proofOfDelivery,
                })
              : shipment
          ),
        }));

        await trackShipmentMutation(
          () =>
            reportDeliveryFailure({
              shipmentId: id,
              failureReason: reason,
              note: `${reason}${note ? ': ' + note : ''}`,
              returnType,
              returnItems,
              proofPhotoPath: photoUrl ?? null,
            }).then(() => {
              void get().loadShipments();
            }),
          set,
          get().loadShipments,
          () => get().isLoading
        );
      },

      startShift: async () => {
        const { shipments } = get();
        const pendingShipments = shipments.filter((shipment) => shipment.status === 'pending');
        const shipmentIds = pendingShipments.map((shipment) => shipment.id);

        if (shipmentIds.length === 0) return;

        set((state) => ({
          shipments: state.shipments.map((shipment) =>
            shipmentIds.includes(shipment.id)
              ? applyLocalPhase(shipment, 'arrived_pickup', 'Driver checked in at pickup point')
              : shipment
          ),
        }));

        await trackShipmentMutation(
          () =>
            persistOrQueueShipmentUpdates(
              shipmentIds.map((shipmentId) => ({
                actionType: 'status_update',
                shipmentId,
                nextPhase: 'arrived_pickup',
                note: 'Driver checked in at pickup point',
              })),
              set,
              get().loadShipments
            ),
          set,
          get().loadShipments,
          () => get().isLoading
        );
      },

      markAllPickedUp: async () => {
        const { shipments } = get();
        const shipmentIds = shipments
          .filter((shipment) => shipment.status === 'pending')
          .map((shipment) => shipment.id);

        if (shipmentIds.length === 0) return;

        set((state) => ({
          shipments: state.shipments.map((shipment) =>
            shipmentIds.includes(shipment.id)
              ? applyLocalPhase(shipment, 'picked_up', 'Driver picked up all assigned shipments')
              : shipment
          ),
        }));

        await trackShipmentMutation(
          () =>
            persistOrQueueShipmentUpdates(
              shipmentIds.map((shipmentId) => ({
                actionType: 'status_update',
                shipmentId,
                nextPhase: 'picked_up',
                note: 'Driver picked up all assigned shipments',
              })),
              set,
              get().loadShipments
            ),
          set,
          get().loadShipments,
          () => get().isLoading
        );
      },

      markShipmentPickedUp: async (id: string) => {
        const shipment = get().shipments.find((s) => s.id === id);
        if (!shipment || shipment.status !== 'pending') return;

        set((state) => ({
          shipments: state.shipments.map((s) =>
            s.id === id ? applyLocalPhase(s, 'picked_up', 'Driver confirmed full load') : s
          ),
        }));

        await trackShipmentMutation(
          () =>
            persistOrQueueShipmentUpdates(
              [{
                actionType: 'status_update',
                shipmentId: id,
                nextPhase: 'picked_up',
                note: 'Driver confirmed full load',
              }],
              set,
              get().loadShipments
            ),
          set,
          get().loadShipments,
          () => get().isLoading
        );
      },

      markShipmentPartialLoad: async (
        id: string,
        loadedItems: { name: string; quantity: number; loadedQuantity: number }[]
      ) => {
        const shipment = get().shipments.find((s) => s.id === id);
        if (!shipment || shipment.status !== 'pending') return;

        const adjustedItems = shipment.items.map((item) => {
          const loaded = loadedItems.find((l) => l.name === item.name);
          return loaded ? { ...item, quantity: loaded.loadedQuantity } : item;
        });

        const totalLoaded = adjustedItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
        const loadedSkuCount = adjustedItems.filter((item) => (item.quantity ?? 0) > 0).length;

        set((state) => ({
          shipments: state.shipments.map((s) =>
            s.id === id
              ? {
                  ...applyLocalPhase(s, 'picked_up', `Partial load: ${totalLoaded} items`),
                  items: adjustedItems,
                  totalItems: loadedSkuCount,
                  skuCount: loadedSkuCount,
                  totalQuantity: totalLoaded,
                }
              : s
          ),
        }));

        await trackShipmentMutation(
          () =>
            persistOrQueueShipmentUpdates(
              [{
                actionType: 'status_update',
                shipmentId: id,
                nextPhase: 'picked_up',
                note: `Partial load confirmed. Driver loaded ${totalLoaded} items.`,
                payload: { loadedItems, totalLoaded },
              }],
              set,
              get().loadShipments
            ),
          set,
          get().loadShipments,
          () => get().isLoading
        );
      },

      startOutForDelivery: async () => {
        const { shipments, activePlanId } = get();
        if (!activePlanId) {
          throw new Error('Active delivery plan is required to start the route.');
        }

        const activePlanShipments = shipments.filter((shipment) => shipment.planId === activePlanId);
        const pendingShipments = activePlanShipments.filter((shipment) => shipment.status === 'pending');
        const shipmentIds = pendingShipments.map((shipment) => shipment.id);

        if (shipmentIds.length === 0) return;

        await trackShipmentMutation(
          async () => {
            const location = await getCurrentDriverLocation();

            await persistOrThrow(
              driverStartDeliveryRoute({
                planId: activePlanId,
                plannedRoute: buildPlannedRoute(activePlanShipments),
                location,
              }),
              set,
              get().loadShipments
            );

            set((state) => ({
              shipments: state.shipments.map((shipment) =>
                shipmentIds.includes(shipment.id)
                  ? applyLocalPhase(shipment, 'in_transit', 'Driver started delivery route')
                  : shipment
              ),
            }));

            set((state) => ({
              allPlans: state.allPlans.map((plan) =>
                plan.id === activePlanId ? { ...plan, plan_status: 'in_progress' } : plan
              ),
            }));
          },
          set,
          get().loadShipments,
          () => get().isLoading
        );
      },

      endRoute: async () => {
        const { activePlanId } = get();
        if (!activePlanId) {
          // Never end silently: refresh so newly assigned work can surface,
          // then surface a clear error instead of a no-op.
          await get().loadShipments();
          throw new Error('لا توجد خطة نشطة لإنهاء خط السير');
        }

        await trackShipmentMutation(
          async () => {
            await persistOrThrow(driverFinishDeliveryRoute(activePlanId), set, get().loadShipments);

            set((state) => ({
              allPlans: state.allPlans.map((plan) =>
                plan.id === activePlanId ? { ...plan, plan_status: 'completed' } : plan
              ),
            }));
          },
          set,
          get().loadShipments,
          () => get().isLoading
        );

        // Reflect the finished route server-side immediately; otherwise the UI
        // keeps showing the stale "delivered" state until a realtime event.
        await get().loadShipments();
      },

      getFilteredShipments: () => {
        const { shipments, statusFilter, searchQuery } = get();
        let filtered = shipments;

        if (statusFilter !== 'all') {
          filtered = filtered.filter((shipment) => shipment.status === statusFilter);
        }

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (shipment) =>
              shipment.customerName?.toLowerCase().includes(query) ||
              shipment.address?.toLowerCase().includes(query) ||
              shipment.id.toLowerCase().includes(query)
          );
        }

        return filtered.sort((a, b) => {
          if (a.routeOrder == null && b.routeOrder == null) return 0;
          if (a.routeOrder == null) return 1;
          if (b.routeOrder == null) return -1;
          return a.routeOrder - b.routeOrder;
        });
      },

      getShipmentById: (id) => {
        return get().shipments.find((shipment) => shipment.id === id);
      },

      getPlans: () => {
        const { shipments, allPlans } = get();

        const shipmentsByPlan = new Map<string, Shipment[]>();
        const unassignedShipments: Shipment[] = [];

        for (const shipment of shipments) {
          if (shipment.planId) {
            const existing = shipmentsByPlan.get(shipment.planId) ?? [];
            existing.push(shipment);
            shipmentsByPlan.set(shipment.planId, existing);
          } else {
            unassignedShipments.push(shipment);
          }
        }

        const plans: DeliveryPlan[] = allPlans.map((plan) => {
          const planShipments = shipmentsByPlan.get(plan.id) ?? [];
          const districts = Array.from(
            new Set(
              planShipments
                .map((s) => {
                  const addr = s.address ?? '';
                  const parts = addr.split(',').map((p) => p.trim());
                  return parts.length > 1 ? parts[1] : null;
                })
                .filter((d): d is string => Boolean(d))
            )
          );

          return {
            id: plan.id,
            planReference: plan.plan_reference,
            planStatus: plan.plan_status,
            plannedDate: plan.planned_date,
            startedAt: plan.started_at,
            createdAt: plan.created_at,
            shipments: sortRouteShipments(groupRouteStops(planShipments)),
            totalShipments: planShipments.length,
            deliveredCount: planShipments.filter((s) => s.status === 'delivered').length,
            failedCount: planShipments.filter((s) => s.status === 'failed').length,
            pendingCount: planShipments.filter((s) => s.status === 'pending').length,
            districts,
          };
        });

        if (unassignedShipments.length > 0) {
          const districts = Array.from(
            new Set(
              unassignedShipments
                .map((s) => {
                  const addr = s.address ?? '';
                  const parts = addr.split(',').map((p) => p.trim());
                  return parts.length > 1 ? parts[1] : null;
                })
                .filter((d): d is string => Boolean(d))
            )
          );

          plans.push({
            id: '__unassigned__',
            planReference: null,
            planStatus: 'unassigned',
            plannedDate: null,
            startedAt: null,
            createdAt: null,
            shipments: sortRouteShipments(groupRouteStops(unassignedShipments)),
            totalShipments: unassignedShipments.length,
            deliveredCount: unassignedShipments.filter((s) => s.status === 'delivered').length,
            failedCount: unassignedShipments.filter((s) => s.status === 'failed').length,
            pendingCount: unassignedShipments.filter((s) => s.status === 'pending').length,
            districts,
          });
        }

        return plans.sort((a, b) => {
          if (a.id === '__unassigned__') return 1;
          if (b.id === '__unassigned__') return -1;
          const statusOrder = (s: string | null) => {
            if (s === 'in_progress') return 0;
            if (s === 'pending') return 1;
            return 2;
          };
          return statusOrder(a.planStatus) - statusOrder(b.planStatus);
        });
      },

      getPlanShipments: (planId: string) => {
        const { shipments } = get();
        const planShipments = planId === '__unassigned__'
          ? shipments.filter((s) => !s.planId)
          : shipments.filter((s) => s.planId === planId);
        return sortRouteShipments(groupRouteStops(planShipments));
      },

      getRouteGate: (planId?: string) => {
        const allShipments = get().shipments;
        const planShipments = planId
          ? planId === '__unassigned__'
            ? allShipments.filter((s) => !s.planId)
            : allShipments.filter((s) => s.planId === planId)
          : allShipments;
        const routeShipments = sortRouteShipments(groupRouteStops(planShipments));
        const nextOpenShipment = routeShipments.find((shipment) => !isTerminalShipment(shipment.status));
        const nextActionableShipmentId = nextOpenShipment?.id ?? null;
        const outOfSequenceShipmentIds = new Set<string>();

        return {
          routeShipments,
          nextActionableShipmentId,
          outOfSequenceShipmentIds,
        };
      },

      getStats: () => {
        const { shipments } = get();
        const total = shipments.length;
        const pending = shipments.filter((shipment) => shipment.status === 'pending').length;
        const inTransit = shipments.filter((shipment) => shipment.status === 'in_transit').length;
        const delivered = shipments.filter((shipment) => shipment.status === 'delivered').length;
        const failed = shipments.filter((shipment) => shipment.status === 'failed').length;
        const completed = delivered + failed;
        const successRate = completed > 0 ? Math.round((delivered / completed) * 100) : 0;

        return { total, pending, inTransit, delivered, failed, successRate };
      },
    }),
    {
      name: 'horeca-delivery-storage',
      partialize: (state) => ({
        statusFilter: state.statusFilter,
        searchQuery: state.searchQuery,
      }),
    }
  )
);
