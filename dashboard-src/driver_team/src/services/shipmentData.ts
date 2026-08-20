import type { LogisticsShipmentItemRecord } from '@/types/logistics';
import type {
  DriverShipment,
  DriverShipmentCollection,
  DriverShipmentCustomer,
  DriverShipmentDetail,
  DriverShipmentEvent,
} from '@/types/driverBackend';
import { supabase, withSupabaseLockRetry } from '@/lib/supabase';
import { getCurrentDriverLocation, type DriverLocation } from '@/services/locationTracking';

async function getCurrentDriverProfileId() {
  const {
    data: { user },
    error,
  } = await withSupabaseLockRetry(() => supabase.auth.getUser());

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error('جلسة السائق مطلوبة.');
  }

  return user.id;
}

function toNumber(value: number | string | null | undefined) {
  if (value == null || value === '') return null;
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`قيمة رقمية غير صالحة من الخادم: ${String(value)}`);
  }
  return parsed;
}

function toNullableNumber(value: number | string | null | undefined) {
  if (value == null || value === '') return null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchCustomers(customerIds: string[]) {
  if (customerIds.length === 0) {
    return new Map<string, DriverShipmentCustomer>();
  }

  const { data, error } = await supabase
    .from('customers')
    .select('id, customer_name, phone_number, whatsapp_number, address_line, district, governorate, place, google_maps_url, lat, lng')
    .in('id', customerIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((customer) => [
      String(customer.id),
      {
        id: String(customer.id),
        customer_name: customer.customer_name ?? null,
        phone_number: customer.phone_number ?? null,
        whatsapp_number: customer.whatsapp_number ?? null,
        address_line: customer.address_line ?? null,
        district: customer.district ?? null,
        governorate: customer.governorate ?? null,
        place: customer.place ?? null,
        google_maps_url: customer.google_maps_url ?? null,
        lat: toNullableNumber(customer.lat),
        lng: toNullableNumber(customer.lng),
      } satisfies DriverShipmentCustomer,
    ])
  );
}

function resolveShipmentCustomer(
  shipment: DriverShipment,
  customerMap: Map<string, DriverShipmentCustomer>
): DriverShipmentCustomer | null {
  const customer = shipment.customer_id ? customerMap.get(shipment.customer_id) ?? null : null;
  const lat = toNullableNumber(shipment.customer_latitude) ?? customer?.lat ?? null;
  const lng = toNullableNumber(shipment.customer_longitude) ?? customer?.lng ?? null;

  if (!customer && lat == null && lng == null && !shipment.customer_name) {
    return null;
  }

  return {
    id: customer?.id ?? shipment.customer_id ?? shipment.id,
    customer_name: customer?.customer_name ?? shipment.customer_name ?? null,
    phone_number: customer?.phone_number ?? shipment.customer_phone ?? null,
    whatsapp_number: customer?.whatsapp_number ?? null,
    address_line: customer?.address_line ?? null,
    district: customer?.district ?? null,
    governorate: customer?.governorate ?? null,
    place: customer?.place ?? null,
    google_maps_url: customer?.google_maps_url ?? null,
    lat,
    lng,
  };
}

async function fetchCollections(shipments: Pick<DriverShipment, 'id'>[]) {
  if (shipments.length === 0) {
    return new Map<string, DriverShipmentCollection>();
  }

  const shipmentIds = shipments.map((shipment) => shipment.id);
  const collectionsRes = await supabase
    .from('logistics_shipment_collections')
    .select(
      'shipment_id, pending_delivery_amount, collected_from_customer, collected_successfully_amount, collection_status, currency_code, payment_method, driver_debt_amount, accounting_status'
    )
    .in('shipment_id', shipmentIds);

  if (collectionsRes.error) {
    throw new Error(collectionsRes.error.message);
  }

  const collectionMap = new Map(
    (collectionsRes.data ?? []).map((collection) => [String(collection.shipment_id), collection])
  );

  return new Map(
    shipments.map((shipment) => {
      const collection = collectionMap.get(shipment.id);
      if (!collection) return [shipment.id, null];

      const pendingDeliveryAmount = toNumber(collection.pending_delivery_amount);
      const collectedFromCustomer = toNumber(collection.collected_from_customer);
      const collectedSuccessfullyAmount = toNumber(collection.collected_successfully_amount);
      const driverDebtAmount = toNumber(collection.driver_debt_amount);
      const amount =
        driverDebtAmount ??
        pendingDeliveryAmount ??
        collectedFromCustomer ??
        collectedSuccessfullyAmount ??
        null;

      return [
        shipment.id,
        {
          orderId: null,
          orderNumber: null,
          amount,
          pendingDeliveryAmount,
          collectedFromCustomer,
          collectedSuccessfullyAmount,
          collectionStatus: collection.collection_status ?? null,
          currencyCode: collection.currency_code ?? null,
          paymentTerm: null,
          paymentMethod: collection.payment_method ?? null,
          driverDebtAmount,
          accountingStatus: collection.accounting_status ?? null,
        },
      ];
    })
  );
}

async function fetchOrdersForShipments(
  shipments: Pick<DriverShipment, 'id' | 'linked_order_id' | 'odoo_order_name' | 'external_order_id'>[]
): Promise<Map<string, import('@/types').ShipmentOrder[]>> {
  if (shipments.length === 0) {
    return new Map();
  }

  const linkedOrderIds = shipments
    .map((s) => s.linked_order_id)
    .filter((id): id is string => Boolean(id));

  if (linkedOrderIds.length === 0) {
    return new Map(shipments.map((s) => [s.id, []]));
  }

  const { data, error } = await supabase
    .from('orders')
    .select('id, odoo_order_name, external_order_id, total_amount, currency_code, raw_payload')
    .in('id', linkedOrderIds);

  if (error) {
    console.warn('Failed to fetch orders for shipments:', error.message);
    return new Map(shipments.map((s) => [s.id, []]));
  }

  const orderMap = new Map(
    (data ?? []).map((order) => [
      String(order.id),
      {
        orderId: String(order.id),
        orderNumber: order.odoo_order_name ?? order.external_order_id ?? null,
        orderTotal: toNullableNumber(order.total_amount) ?? 0,
        paymentTerm: order.raw_payload?.payment_term_id
          ? String(order.raw_payload.payment_term_id)
          : null,
      } satisfies import('@/types').ShipmentOrder,
    ])
  );

  return new Map(
    shipments.map((shipment) => {
      if (!shipment.linked_order_id) {
        // Fallback: use shipment-level order info
        const fallbackOrder: import('@/types').ShipmentOrder | null = shipment.odoo_order_name || shipment.external_order_id
          ? {
              orderId: shipment.linked_order_id ?? shipment.id,
              orderNumber: shipment.odoo_order_name ?? shipment.external_order_id ?? null,
              orderTotal: 0,
              paymentTerm: null,
            }
          : null;
        return [shipment.id, fallbackOrder ? [fallbackOrder] : []];
      }

      const order = orderMap.get(shipment.linked_order_id);
      return [shipment.id, order ? [order] : []];
    })
  );
}

const shipmentSelect =
  'id, plan_id, external_shipment_id, shipment_reference, origin_ref, external_order_id, odoo_order_name, linked_order_id, customer_id, external_customer_id, customer_name, customer_phone, customer_latitude, customer_longitude, warehouse_id, external_warehouse_id, warehouse_name, warehouse_latitude, warehouse_longitude, estimated_road_distance_km, logistics_user_id, assigned_profile_id, external_user_id, assigned_user_name, assigned_job_title, operation_type_name, operation_type_ref, source_location_ref, destination_location_ref, shipment_state, shipment_status, delivery_phase, route_sequence, route_locked, priority, move_type, scheduled_at, completed_at, odoo_created_at, odoo_updated_at, total_weight, notes, last_sync_at';

export type AssignedShipmentsResult = {
  activePlanId: string | null;
  allPlans: AssignedPlanRow[];
  shipments: DriverShipment[];
};

export type AssignedPlanRow = {
  id: string;
  plan_reference: string | null;
  plan_status: string | null;
  planned_date: string | null;
  started_at: string | null;
  created_at: string | null;
};

function planTimestamp(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function planStatusRank(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized === 'in_progress') return 0;
  if (normalized === 'pending') return 1;
  if (normalized === 'completed') return 2;
  return 3;
}

function chooseActivePlan(plans: AssignedPlanRow[] | null | undefined) {
  return [...(plans ?? [])].sort((left, right) => {
    const statusDelta = planStatusRank(left.plan_status) - planStatusRank(right.plan_status);
    if (statusDelta !== 0) return statusDelta;

    const leftDate = planTimestamp(left.planned_date);
    const rightDate = planTimestamp(right.planned_date);
    if (leftDate !== rightDate) return leftDate - rightDate;

    return (
      planTimestamp(right.started_at ?? right.created_at) -
      planTimestamp(left.started_at ?? left.created_at)
    );
  })[0] ?? null;
}

function isTerminalAssignedShipment(shipment: Pick<DriverShipment, 'delivery_phase' | 'shipment_status'>) {
  const phase = String(shipment.delivery_phase ?? '').trim().toLowerCase();
  const status = String(shipment.shipment_status ?? '').trim().toUpperCase();

  return (
    ['delivered', 'finished', 'settled', 'failed', 'attempted', 'cancelled', 'canceled'].includes(phase) ||
    ['DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED', 'FAILED', 'ATTEMPTED'].includes(status)
  );
}

function chooseActivePlanForShipments(
  plans: AssignedPlanRow[],
  shipments: Pick<DriverShipment, 'plan_id' | 'delivery_phase' | 'shipment_status'>[]
) {
  if (shipments.length === 0) return chooseActivePlan(plans);

  const actionablePlanIds = new Set(
    shipments
      .filter((shipment) => shipment.plan_id && !isTerminalAssignedShipment(shipment))
      .map((shipment) => String(shipment.plan_id))
  );

  if (actionablePlanIds.size === 0) return chooseActivePlan(plans);

  return chooseActivePlan(plans.filter((plan) => actionablePlanIds.has(String(plan.id))));
}

async function fetchAssignedShipmentsForProfile(profileId: string): Promise<AssignedShipmentsResult> {
  const { data: plans, error: plansError } = await withSupabaseLockRetry(() =>
    supabase
      .from('logistics_delivery_plans')
      .select('id, plan_reference, plan_status, planned_date, started_at, created_at')
      .eq('assigned_profile_id', profileId)
      .in('plan_status', ['in_progress', 'completed'])
      .order('planned_date', { ascending: false })
      .order('started_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(20)
  );

  if (plansError) {
    throw new Error(plansError.message);
  }

  const assignedPlans = (plans ?? []) as AssignedPlanRow[];
  const assignedPlanIds = assignedPlans.map((plan) => String(plan.id)).filter(Boolean);

  let query = supabase
    .from('logistics_shipments')
    .select(shipmentSelect)
    .order('route_sequence', { ascending: true, nullsFirst: false })
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .limit(100);

  if (assignedPlanIds.length > 0) {
    query = query.in('plan_id', assignedPlanIds);
  } else {
    query = query
      .eq('assigned_profile_id', profileId)
      .is('plan_id', null);
  }

  const { data, error } = await withSupabaseLockRetry(() => query);

  if (error) {
    throw new Error(error.message);
  }

  const shipments = (data ?? []) as DriverShipment[];
  const activePlan = chooseActivePlanForShipments(assignedPlans, shipments);
  const activePlanId = activePlan?.id ? String(activePlan.id) : null;
  const customerIds = Array.from(
    new Set(
      shipments
        .map((shipment) => shipment.customer_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  const [customerMap, collectionMap, ordersMap] = await Promise.all([
    fetchCustomers(customerIds),
    fetchCollections(shipments),
    fetchOrdersForShipments(shipments),
  ]);

  return {
    activePlanId,
    allPlans: assignedPlans,
    shipments: shipments.map((shipment) => ({
      ...shipment,
      customer: resolveShipmentCustomer(shipment, customerMap),
      collection: collectionMap.get(shipment.id) ?? null,
      orders: ordersMap.get(shipment.id) ?? [],
    })),
  };
}

export async function fetchAssignedShipments(): Promise<AssignedShipmentsResult> {
  const profileId = await getCurrentDriverProfileId();
  return fetchAssignedShipmentsForProfile(profileId);
}

async function fetchShipmentItemsForShipments(
  shipments: Pick<DriverShipment, 'id'>[]
): Promise<Map<string, LogisticsShipmentItemRecord[]>> {
  if (shipments.length === 0) {
    return new Map();
  }

  const shipmentIds = shipments.map((shipment) => shipment.id);
  const shipmentItemsRes = await supabase
    .from('logistics_shipment_items')
    .select(
      'id, shipment_id, external_move_id, product_id, external_product_id, product_name, product_ref, requested_quantity, done_quantity, reserved_quantity, forecast_quantity, move_state, source_location_ref, destination_location_ref, last_sync_at'
    )
    .in('shipment_id', shipmentIds)
    .order('product_name', { ascending: true });

  if (shipmentItemsRes.error) {
    throw new Error(shipmentItemsRes.error.message);
  }

  const itemsByShipment = new Map<string, LogisticsShipmentItemRecord[]>(
    shipmentIds.map((shipmentId) => [shipmentId, []])
  );

  for (const item of (shipmentItemsRes.data ?? []) as LogisticsShipmentItemRecord[]) {
    itemsByShipment.get(item.shipment_id)?.push(item);
  }

  return itemsByShipment;
}

async function fetchShipmentEvents(shipmentIds: string[]) {
  if (shipmentIds.length === 0) {
    return new Map<string, DriverShipmentEvent[]>();
  }

  const eventsRes = await supabase
    .from('logistics_shipment_events')
    .select(
      'id, shipment_id, actor_profile_id, previous_phase, next_phase, note, proof_photo_path, location_lat, location_lng, payload, created_at'
    )
    .in('shipment_id', shipmentIds)
    .order('created_at', { ascending: false });

  if (eventsRes.error) {
    throw new Error(eventsRes.error.message);
  }

  const eventsByShipment = new Map<string, DriverShipmentEvent[]>(
    shipmentIds.map((shipmentId) => [shipmentId, []])
  );

  for (const event of (eventsRes.data ?? []) as DriverShipmentEvent[]) {
    eventsByShipment.get(event.shipment_id)?.push(event);
  }

  return signDeliveryProofEvents(eventsByShipment);
}

async function createSignedUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();

  const externalPaths = paths.filter((p) => /^https?:\/\//i.test(p));
  const storagePaths = paths.filter((p) => !/^https?:\/\//i.test(p));

  const urlMap = new Map(externalPaths.map((p) => [p, p]));

  if (storagePaths.length > 0) {
    const { data, error } = await supabase.storage
      .from('delivery-proofs')
      .createSignedUrls(storagePaths, 60 * 60);

    if (!error && data) {
      for (const item of data) {
        if (item.path && item.signedUrl) {
          urlMap.set(item.path, item.signedUrl);
        }
      }
    } else {
      // Fallback to individual calls on batch failure
      for (const path of storagePaths) {
        const { data: singleData, error: singleError } = await supabase.storage
          .from('delivery-proofs')
          .createSignedUrl(path, 60 * 60);
        if (!singleError && singleData?.signedUrl) {
          urlMap.set(path, singleData.signedUrl);
        } else {
          urlMap.set(path, path);
        }
      }
    }
  }

  return urlMap;
}

async function signDeliveryProofEvents(eventsByShipment: Map<string, DriverShipmentEvent[]>) {
  const proofPaths = Array.from(
    new Set(
      Array.from(eventsByShipment.values())
        .flat()
        .map((event) => event.proof_photo_path)
        .filter((path): path is string => Boolean(path))
    )
  );

  if (proofPaths.length === 0) {
    return eventsByShipment;
  }

  const signedUrls = await createSignedUrls(proofPaths);

  return new Map(
    Array.from(eventsByShipment.entries()).map(([shipmentId, events]) => [
      shipmentId,
      events.map((event) => ({
        ...event,
        proof_photo_path: event.proof_photo_path
          ? signedUrls.get(event.proof_photo_path) ?? event.proof_photo_path
          : null,
      })),
    ])
  );
}

function normalizeProductName(name: string | null | undefined): string {
  return String(name ?? '').trim().toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '').replace(/\s+/g, ' ');
}

type PlanPrepStatus = {
  product_name: string;
  preparation_status: 'pending' | 'ready' | 'partial' | 'unavailable' | null;
  approved_quantity: number | null;
  shortage_reason: string | null;
};

async function fetchPlanPreparationStatus(
  planIds: string[]
): Promise<Map<string, PlanPrepStatus>> {
  const result = new Map<string, PlanPrepStatus>();
  if (planIds.length === 0) return result;

  const { data, error } = await supabase
    .from('dispatcher_plan_item_preparations')
    .select('product_name, status, approved_quantity, shortage_reason')
    .in('plan_id', planIds);

  if (error) return result;

  for (const row of (data ?? []) as { product_name: string; status: string; approved_quantity: number | null; shortage_reason: string | null }[]) {
    const key = normalizeProductName(row.product_name);
    if (key && !result.has(key)) {
      result.set(key, {
        product_name: row.product_name,
        preparation_status: row.status as PlanPrepStatus['preparation_status'],
        approved_quantity: row.approved_quantity,
        shortage_reason: row.shortage_reason,
      });
    }
  }

  return result;
}

function attachPreparationStatus(
  items: LogisticsShipmentItemRecord[],
  prepStatusByProduct: Map<string, PlanPrepStatus>
): LogisticsShipmentItemRecord[] {
  if (prepStatusByProduct.size === 0) return items;

  return items.map((item) => {
    const key = normalizeProductName(item.product_name);
    const prep = prepStatusByProduct.get(key);
    if (!prep) return item;
    return {
      ...item,
      preparation_status: prep.preparation_status,
      approved_quantity: prep.approved_quantity,
      shortage_reason: prep.shortage_reason,
    };
  });
}

export async function fetchAssignedShipmentDetails(profileId: string): Promise<{ activePlanId: string | null; allPlans: AssignedPlanRow[]; details: DriverShipmentDetail[] }> {
  const { activePlanId, allPlans, shipments } = await fetchAssignedShipmentsForProfile(profileId);
  const shipmentIds = shipments.map((shipment) => shipment.id);
  const [itemsByShipment, eventsByShipment, prepStatusByProduct] = await Promise.all([
    fetchShipmentItemsForShipments(shipments),
    fetchShipmentEvents(shipmentIds),
    fetchPlanPreparationStatus(shipments.map((s) => s.plan_id).filter(Boolean) as string[]),
  ]);

  return {
    activePlanId,
    allPlans,
    details: shipments.map((shipment) => ({
      shipment,
      items: attachPreparationStatus(itemsByShipment.get(shipment.id) ?? [], prepStatusByProduct),
      events: eventsByShipment.get(shipment.id) ?? [],
      collection: shipment.collection ?? null,
    })),
  };
}

export async function fetchShipmentDetail(shipmentId: string): Promise<DriverShipmentDetail> {
  const profileId = await getCurrentDriverProfileId();
  const { data: shipmentData, error: shipmentError } = await supabase
    .from('logistics_shipments')
    .select(shipmentSelect)
    .eq('id', shipmentId)
    .eq('assigned_profile_id', profileId)
    .maybeSingle();

  if (shipmentError) {
    throw new Error(shipmentError.message);
  }

  if (!shipmentData) {
    throw new Error('الشحنة غير مسندة للسائق الحالي.');
  }

  const shipment = shipmentData as DriverShipment;
  const customerMap = await fetchCustomers(shipment.customer_id ? [shipment.customer_id] : []);
  const collectionMap = await fetchCollections([shipment]);
  const ordersMap = await fetchOrdersForShipments([shipment]);
  const collection = collectionMap.get(shipment.id) ?? null;

  const [itemsByShipment, eventsByShipment, prepStatusByProduct] = await Promise.all([
    fetchShipmentItemsForShipments([shipment]),
    fetchShipmentEvents([shipment.id]),
    fetchPlanPreparationStatus(shipment.plan_id ? [shipment.plan_id] : []),
  ]);

  return {
    shipment: {
      ...shipment,
      customer: resolveShipmentCustomer(shipment, customerMap),
      collection,
      orders: ordersMap.get(shipment.id) ?? [],
    },
    items: attachPreparationStatus(itemsByShipment.get(shipment.id) ?? [], prepStatusByProduct),
    events: eventsByShipment.get(shipment.id) ?? [],
    collection,
  };
}

export async function updateShipmentPhase(input: {
  shipmentId: string;
  nextPhase: string;
  note?: string;
  proofPhotoPath?: string | null;
  location?: DriverLocation | null;
  payload?: Record<string, unknown>;
}) {
  const location = input.location ?? await getCurrentDriverLocation();
  const idempotencyKey = `${input.shipmentId}:${input.nextPhase}:${Date.now()}`;
  const { data, error } = await supabase.rpc('driver_update_shipment_phase', {
    p_shipment_id: input.shipmentId,
    p_next_phase: input.nextPhase,
    p_note: input.note ?? null,
    p_location_lat: location?.lat ?? null,
    p_location_lng: location?.lng ?? null,
    p_proof_photo_path: input.proofPhotoPath ?? null,
    p_payload: input.payload ?? {},
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function uploadDeliveryProof(profileId: string, file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension) {
    throw new Error('ملف إثبات التسليم يجب أن يحتوي على امتداد.');
  }
  const path = `${profileId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from('delivery-proofs')
    .upload(path, file, { upsert: false });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

export async function driverReorderPlanShipments(planId: string, shipmentIds: string[]) {
  const { error } = await supabase.rpc('driver_reorder_plan_shipments', {
    p_plan_id: planId,
    p_shipment_ids: shipmentIds,
  });
  if (error) throw new Error(error.message);
}

export async function driverUpdateShipmentItems(
  shipmentId: string,
  items: Array<{ itemId: string; doneQuantity: number }>
) {
  const { error } = await supabase.rpc('driver_update_shipment_items', {
    p_shipment_id: shipmentId,
    p_items: items.map((item) => ({
      item_id: item.itemId,
      done_quantity: item.doneQuantity,
    })),
  });
  if (error) throw new Error(error.message);
}

export type PlannedRoutePoint = {
  shipmentId: string;
  lat: number;
  lng: number;
  sequence: number | null;
};

export async function driverStartDeliveryRoute(input: {
  planId: string;
  plannedRoute: PlannedRoutePoint[];
  location: DriverLocation;
}) {
  const { data, error } = await supabase.rpc('driver_start_delivery_route', {
    p_plan_id: input.planId,
    p_planned_route: input.plannedRoute,
    p_location_lat: input.location.lat,
    p_location_lng: input.location.lng,
    p_vehicle_type: 'van',
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function driverFinishDeliveryRoute(planId: string) {
  const { data, error } = await supabase.rpc('driver_finish_delivery_route', {
    p_plan_id: planId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchOrderCollectionsForPlan(
  planId: string,
  profileId: string
): Promise<import('@/types').SettlementBreakdown> {
  const { data: shipments, error: shipmentsError } = await supabase
    .from('logistics_shipments')
    .select('id')
    .eq('plan_id', planId)
    .eq('assigned_profile_id', profileId);

  if (shipmentsError || !shipments || shipments.length === 0) {
    return { cashDebt: 0, transferAmount: 0, chequeAmount: 0, creditAmount: 0, currencyCode: 'EGP' };
  }

  const shipmentIds = shipments.map((s) => String(s.id));

  const { data: collections, error: collectionsError } = await supabase
    .from('logistics_order_collections')
    .select('order_total, payment_method, driver_debt_amount')
    .in('shipment_id', shipmentIds);

  if (collectionsError || !collections || collections.length === 0) {
    return { cashDebt: 0, transferAmount: 0, chequeAmount: 0, creditAmount: 0, currencyCode: 'EGP' };
  }

  let cashDebt = 0;
  let transferAmount = 0;
  let chequeAmount = 0;
  let creditAmount = 0;
  for (const row of collections) {
    const total = toNullableNumber(row.order_total) ?? 0;
    const method = String(row.payment_method ?? '').toLowerCase();
    const debt = toNullableNumber(row.driver_debt_amount) ?? 0;
    if (method === 'cash') {
      cashDebt += debt > 0 ? debt : total;
    } else if (method === 'bank_transfer' || method === 'transfer') {
      transferAmount += total;
    } else if (method === 'cheque') {
      chequeAmount += total;
    } else if (method === 'credit' || method === 'installments') {
      creditAmount += total;
    }
  }

  return { cashDebt, transferAmount, chequeAmount, creditAmount, currencyCode: 'EGP' };
}
