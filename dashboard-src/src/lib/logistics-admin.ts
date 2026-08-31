/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "./supabase";
import type { DateRangeValue } from "./date-range";
import { getDateRangeBounds } from "./date-range";

export type LogisticsPlanStatus = "pending" | "in_progress" | "completed" | "cancelled" | "returned";
export type ShipmentStatus =
  | "PENDING_ASSIGN"
  | "ASSIGNED"
  | "CHECK_IN"
  | "PICKUP"
  | "OUT_FOR_DELIVERY"
  | "ARRIVED"
  | "DELIVERED"
  | "FINISHED"
  | "SETTLED"
  | "CANCELLED";

export interface LogisticsDriver {
  id: string;
  linkedProfileId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  jobTitle: string | null;
  status: string;
  workLocation: string | null;
  vehicleType: string;
  onlineStatus: "online" | "offline";
  currentPlan: string | null;
  workload: number;
  shipments: number;
  todayDeliveries: number;
  successRate: number;
  dueBalance: number;
  codAmount: number;
  collectionAmount: number;
  lastActivity: string | null;
  lastLocation: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface LogisticsPlan {
  id: string;
  reference: string;
  plannedDate: string;
  status: LogisticsPlanStatus;
  returnOfPlanId: string | null;
  driverId: string | null;
  driverName: string | null;
  driverProfileId: string | null;
  district: string | null;
  shipmentCount: number;
  routeDistanceKm: number | null;
  estimatedDurationMinutes: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  preparationStatus: string | null;
  preparationCompletedAt: string | null;
}

export interface LogisticsShipment {
  id: string;
  reference: string;
  orderId: string | null;
  orderName: string | null;
  customerName: string | null;
  warehouseName: string | null;
  status: ShipmentStatus;
  phase: string;
  planId: string | null;
  driverName: string | null;
  scheduledAt: string | null;
  deliveryDate: string | null;
  routeSequence: number | null;
  totalWeight: number | null;
  totalGmv: number | null;
  distanceKm: number | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

export interface LogisticsPlanItem {
  key: string;
  productName: string;
  productRef: string | null;
  requestedQuantity: number;
  reservedQuantity: number;
  doneQuantity: number;
  shipmentCount: number;
}

export interface ShipmentCandidate {
  orderId: string;
  orderName: string;
  customerName: string | null;
  warehouseId: string | null;
  commitmentDate: string | null;
  amount: number;
  currency: string;
  deliveryStatus: string | null;
  existingShipmentId: string | null;
  existingPlanId: string | null;
  shipmentStatus: string | null;
}

export interface LogisticsActivity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone: "blue" | "green" | "yellow" | "red" | "gray";
}

export interface LogisticsDashboardData {
  plans: LogisticsPlan[];
  shipments: LogisticsShipment[];
  drivers: LogisticsDriver[];
  activities: LogisticsActivity[];
}

export interface PlanCompletionRow {
  planId: string;
  planReference: string;
  plannedDate: string;
  planStatus: string;
  driverId: string | null;
  driverName: string | null;
  total: number;
  delivered: number;
  returned: number;
  cancelled: number;
  open: number;
  pct: number;
  complete: boolean;
  overdue: boolean;
}

export interface DriverCompletionStats {
  driverId: string | null;
  driverName: string;
  completedPlans: number;
  incompletePlans: number;
  deliveredOrders: number;
  returnedOrders: number;
  undeliveredOrders: number;
  totalPlans: number;
}

export interface PlanCompletionReport {
  plans: PlanCompletionRow[];
  drivers: DriverCompletionStats[];
  totals: {
    plans: number;
    completedPlans: number;
    incompletePlans: number;
    deliveredOrders: number;
    returnedOrders: number;
    undeliveredOrders: number;
    overallPct: number;
  };
}

const PLAN_SELECT = `
  id,
  plan_reference,
  logistics_user_id,
  assigned_profile_id,
  planned_date,
  plan_status,
  return_of_plan_id,
  district,
  route_total_distance_km,
  route_metadata,
  notes,
  created_by_profile_id,
  created_at,
  updated_at,
  dispatcher_plan_preparations(status, completed_at, started_at),
  logistics_users:logistics_user_id(id, employee_name, job_title, linked_profile_id)
`;

const SHIPMENT_SELECT = `
  id,
  shipment_reference,
  linked_order_id,
  odoo_order_name,
  customer_name,
  warehouse_name,
  shipment_status,
  delivery_phase,
  plan_id,
  logistics_user_id,
  assigned_user_name,
  scheduled_at,
  route_sequence,
  total_weight,
  total_gmv,
  estimated_road_distance_km,
  customer_latitude,
  customer_longitude,
  created_at,
  orders:linked_order_id(commitment_date, amount_total, total_amount, currency_code)
`;

const DRIVER_SELECT = `
  id,
  linked_profile_id,
  employee_name,
  work_phone,
  mobile_phone,
  work_email,
  job_title,
  status,
  work_location,
  activity_state,
  activity_type_name,
  last_sync_at
`;

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function unwrapRpcRecord<T>(value: T | T[] | null | undefined): T | null {
  return unwrapOne(value);
}

function asNumber(value: unknown): number {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

const SALES_ORDER_TYPE_NAMES = new Set(["Sales Order", "\u0623\u0645\u0631 \u0627\u0644\u0628\u064a\u0639"]);

function isSalesOrderTypeName(value: unknown) {
  return SALES_ORDER_TYPE_NAMES.has(String(value ?? "Sales Order").trim());
}

export function tomorrowDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function scheduledAtForDate(value: string): string {
  return new Date(`${value}T09:00:00+02:00`).toISOString();
}

function mapPlan(row: Record<string, any>, shipmentCounts = new Map<string, number>()): LogisticsPlan {
  const driver = unwrapOne(row.logistics_users);
  const preparation = unwrapOne(row.dispatcher_plan_preparations);
  const metadata = typeof row.route_metadata === "object" && row.route_metadata ? row.route_metadata : {};
  return {
    id: String(row.id),
    reference: String(row.plan_reference ?? row.id),
    plannedDate: String(row.planned_date),
    status: String(row.plan_status ?? "pending") as LogisticsPlanStatus,
    returnOfPlanId: row.return_of_plan_id ?? null,
    driverId: row.logistics_user_id ?? null,
    driverName: driver?.employee_name ?? null,
    driverProfileId: row.assigned_profile_id ?? driver?.linked_profile_id ?? null,
    district: row.district ?? null,
    shipmentCount: shipmentCounts.get(String(row.id)) ?? 0,
    routeDistanceKm: row.route_total_distance_km ?? null,
    estimatedDurationMinutes: metadata.estimated_duration_minutes ?? null,
    createdBy: row.created_by_profile_id ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    notes: row.notes ?? null,
    preparationStatus: preparation?.status ?? null,
    preparationCompletedAt: preparation?.completed_at ?? null,
  };
}

function mapShipment(row: Record<string, any>): LogisticsShipment {
  const order = unwrapOne(row.orders);
  return {
    id: String(row.id),
    reference: String(row.shipment_reference ?? row.id),
    orderId: row.linked_order_id ?? null,
    orderName: row.odoo_order_name ?? null,
    customerName: row.customer_name ?? null,
    warehouseName: row.warehouse_name ?? null,
    status: String(row.shipment_status ?? "PENDING_ASSIGN") as ShipmentStatus,
    phase: String(row.delivery_phase ?? "pending"),
    planId: row.plan_id ?? null,
    driverName: row.assigned_user_name ?? null,
    scheduledAt: row.scheduled_at ?? null,
    deliveryDate: dateOnly(order?.commitment_date ?? row.scheduled_at),
    routeSequence: row.route_sequence ?? null,
    totalWeight: row.total_weight ?? null,
    totalGmv: row.total_gmv ?? asNumber(order?.amount_total ?? order?.total_amount),
    distanceKm: row.estimated_road_distance_km ?? null,
    latitude: row.customer_latitude ?? null,
    longitude: row.customer_longitude ?? null,
    createdAt: String(row.created_at),
  };
}

function planShipmentCounts(shipments: LogisticsShipment[]) {
  const counts = new Map<string, number>();
  for (const shipment of shipments) {
    if (!shipment.planId) continue;
    counts.set(shipment.planId, (counts.get(shipment.planId) ?? 0) + 1);
  }
  return counts;
}

async function fetchPlanShipmentCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("logistics_shipments")
    .select("plan_id")
    .not("plan_id", "is", null);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const pid = String((row as Record<string, unknown>).plan_id);
    counts.set(pid, (counts.get(pid) ?? 0) + 1);
  }
  return counts;
}

export async function fetchLogisticsShipments(): Promise<LogisticsShipment[]> {
  const { data, error } = await supabase
    .from("logistics_shipments")
    .select(SHIPMENT_SELECT)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(1500);

  if (error) throw error;
  return (data ?? []).map((row) => mapShipment(row as Record<string, any>));
}

export async function fetchLogisticsPlans(): Promise<LogisticsPlan[]> {
  const counts = await fetchPlanShipmentCounts();
  const { data, error } = await supabase
    .from("logistics_delivery_plans")
    .select(PLAN_SELECT)
    .order("planned_date", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data ?? []).map((row) => mapPlan(row as Record<string, any>, counts));
}

async function fetchLogisticsPlanById(planId: string): Promise<LogisticsPlan | null> {
  const { data: planRow, error } = await supabase
    .from("logistics_delivery_plans")
    .select(PLAN_SELECT)
    .eq("id", planId)
    .maybeSingle();
  if (error) throw error;
  if (!planRow) return null;

  const { count, error: countError } = await supabase
    .from("logistics_shipments")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", planId);
  if (countError) throw countError;

  return mapPlan(planRow as Record<string, any>, new Map([[planId, count ?? 0]]));
}

async function fetchShipmentsForPlan(planId: string): Promise<LogisticsShipment[]> {
  const { data, error } = await supabase
    .from("logistics_shipments")
    .select(SHIPMENT_SELECT)
    .eq("plan_id", planId)
    .order("route_sequence", { ascending: true, nullsFirst: false })
    .order("scheduled_at", { ascending: true, nullsFirst: false });
  if (error) throw error;

  return (data ?? []).map((row) => mapShipment(row as Record<string, any>));
}

export async function fetchPlanDetails(planId: string) {
  const [plan, planShipments, drivers] = await Promise.all([
    fetchLogisticsPlanById(planId),
    fetchShipmentsForPlan(planId),
    fetchLogisticsDrivers(),
  ]);
  const items = await fetchPlanItems(planShipments.map((shipment) => shipment.id));
  return {
    plan,
    shipments: planShipments,
    items,
    drivers,
  };
}

function extractInternalRef(productRef: string | null): string {
  if (!productRef) return "";
  const bracketMatch = productRef.match(/^\[(\w+)\]/);
  if (bracketMatch) return bracketMatch[1];
  return productRef.trim();
}

async function fetchPlanItems(shipmentIds: string[]): Promise<LogisticsPlanItem[]> {
  if (shipmentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("logistics_shipment_items")
    .select("id, shipment_id, product_name, product_ref, requested_quantity, reserved_quantity, done_quantity")
    .in("shipment_id", shipmentIds);
  if (error) throw error;

  const grouped = new Map<string, LogisticsPlanItem>();
  for (const row of data ?? []) {
    if (!row.product_ref || !row.product_ref.trim()) continue;
    const canonicalRef = extractInternalRef(row.product_ref);
    if (!canonicalRef) continue;
    const current = grouped.get(canonicalRef) ?? {
      key: canonicalRef,
      productName: row.product_name,
      productRef: canonicalRef,
      requestedQuantity: 0,
      reservedQuantity: 0,
      doneQuantity: 0,
      shipmentCount: 0,
    };
    current.requestedQuantity += asNumber(row.requested_quantity);
    current.reservedQuantity += asNumber(row.reserved_quantity);
    current.doneQuantity += asNumber(row.done_quantity);
    current.shipmentCount += 1;
    grouped.set(canonicalRef, current);
  }

  return Array.from(grouped.values()).sort((a, b) => a.productName.localeCompare(b.productName, "ar"));
}

export async function fetchLogisticsDrivers(): Promise<LogisticsDriver[]> {
  const [{ data: drivers, error: driverError }, { data: shipments, error: shipmentError }, { data: plans, error: planError }, { data: liveRows }] =
    await Promise.all([
      supabase.from("logistics_users").select(DRIVER_SELECT).order("employee_name"),
      supabase.from("logistics_shipments").select("id, logistics_user_id, shipment_status, scheduled_at, completed_at"),
      supabase.from("logistics_delivery_plans").select("id, plan_reference, logistics_user_id, plan_status, planned_date"),
      supabase.from("active_drivers_view").select("id, latitude, longitude, updated_at"),
    ]);

  if (driverError) throw driverError;
  if (shipmentError) throw shipmentError;
  if (planError) throw planError;

  const liveByProfile = new Map((liveRows ?? []).map((row: any) => [row.id, row]));
  const today = new Date().toISOString().slice(0, 10);

  return (drivers ?? []).map((row: any) => {
    const driverShipments = (shipments ?? []).filter((shipment: any) => shipment.logistics_user_id === row.id);
    const openShipments = driverShipments.filter(
      (shipment: any) => !["DELIVERED", "FINISHED", "SETTLED", "CANCELLED"].includes(String(shipment.shipment_status)),
    );
    const delivered = driverShipments.filter((shipment: any) =>
      ["DELIVERED", "FINISHED", "SETTLED"].includes(String(shipment.shipment_status)),
    ).length;
    const failed = driverShipments.filter((shipment: any) => String(shipment.shipment_status) === "CANCELLED").length;
    const currentPlan = (plans ?? []).find(
      (plan: any) => plan.logistics_user_id === row.id && ["pending", "in_progress"].includes(String(plan.plan_status)),
    );
    const live = row.linked_profile_id ? liveByProfile.get(row.linked_profile_id) : null;
    const liveUpdatedAt = live?.updated_at ? new Date(live.updated_at).getTime() : 0;
    const isOnline = liveUpdatedAt > Date.now() - 1000 * 60 * 15;

    return {
      id: row.id,
      linkedProfileId: row.linked_profile_id ?? null,
      name: row.employee_name ?? "سائق",
      phone: row.mobile_phone ?? row.work_phone ?? null,
      email: row.work_email ?? null,
      jobTitle: row.job_title ?? null,
      status: row.status ?? "active",
      workLocation: row.work_location ?? null,
      vehicleType: row.job_title?.includes("مندوب") ? "مركبة مبيعات" : "سيارة توزيع",
      onlineStatus: isOnline ? "online" : "offline",
      currentPlan: currentPlan?.plan_reference ?? null,
      workload: openShipments.length,
      shipments: driverShipments.length,
      todayDeliveries: driverShipments.filter((shipment: any) => dateOnly(shipment.scheduled_at) === today).length,
      successRate: delivered + failed > 0 ? Math.round((delivered / (delivered + failed)) * 100) : 0,
      dueBalance: 0,
      codAmount: 0,
      collectionAmount: 0,
      lastActivity: row.last_sync_at ?? live?.updated_at ?? null,
      lastLocation: live?.latitude && live?.longitude ? `${Number(live.latitude).toFixed(4)}, ${Number(live.longitude).toFixed(4)}` : row.work_location ?? null,
      latitude: live?.latitude ?? null,
      longitude: live?.longitude ?? null,
    };
  });
}

export async function fetchLogisticsDashboard(): Promise<LogisticsDashboardData> {
  const [plans, shipments, drivers, eventsResponse] = await Promise.all([
    fetchLogisticsPlans(),
    fetchLogisticsShipments(),
    fetchLogisticsDrivers(),
    supabase
      .from("logistics_shipment_events")
      .select("id, shipment_id, previous_phase, next_phase, note, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const activities: LogisticsActivity[] = (eventsResponse.data ?? []).map((event: any) => ({
    id: event.id,
    title: "تحديث شحنة",
    description: `${event.previous_phase ?? "بداية"} ← ${event.next_phase ?? "تحديث"}${event.note ? ` · ${event.note}` : ""}`,
    timestamp: event.created_at,
    tone: event.next_phase === "delivered" ? "green" : event.next_phase === "failed" ? "red" : "blue",
  }));

  return { plans, shipments, drivers, activities };
}

const COMPLETED_SHIPMENT_STATUSES = new Set(["DELIVERED", "FINISHED", "SETTLED"]);
const CANCELLED_SHIPMENT_STATUSES = new Set(["CANCELLED"]);
const OPEN_SHIPMENT_STATUSES = new Set(["PENDING_ASSIGN", "ASSIGNED", "CHECK_IN", "PICKUP", "OUT_FOR_DELIVERY", "ARRIVED"]);

export async function fetchPlanCompletionReport(fromDays = 30): Promise<PlanCompletionReport> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - fromDays, 0, 0, 0, 0).toISOString();
  const today = now.toISOString().slice(0, 10);

  const [{ data: plans, error: plansErr }, { data: shipments, error: shipErr }, { data: profiles }] =
    await Promise.all([
      supabase.from("logistics_delivery_plans").select("id, plan_reference, assigned_profile_id, planned_date, plan_status").gte("planned_date", start.slice(0, 10)),
      supabase.from("logistics_shipments").select("plan_id, shipment_status, is_return_shipment"),
      supabase.from("profiles").select("id, full_name"),
    ]);
  if (plansErr) throw plansErr;
  if (shipErr) throw shipErr;

  const profileNameById = new Map<string, string>(
    (profiles ?? []).map((row: any) => [String(row.id), String(row.full_name ?? "سائق")]),
  );

  const shipmentsByPlan = new Map<string, Array<Record<string, any>>>();
  for (const s of shipments ?? []) {
    if (!s.plan_id) continue;
    const list = shipmentsByPlan.get(s.plan_id) ?? [];
    list.push(s);
    shipmentsByPlan.set(s.plan_id, list);
  }

  const rows: PlanCompletionRow[] = [];
  for (const plan of plans ?? []) {
    const planShipments = shipmentsByPlan.get(plan.id) ?? [];
    let delivered = 0;
    let returned = 0;
    let cancelled = 0;
    let open = 0;
    for (const s of planShipments) {
      const status = String(s.shipment_status ?? "");
      if (s.is_return_shipment) {
        returned += 1;
      } else if (COMPLETED_SHIPMENT_STATUSES.has(status)) {
        delivered += 1;
      } else if (CANCELLED_SHIPMENT_STATUSES.has(status)) {
        cancelled += 1;
      } else if (OPEN_SHIPMENT_STATUSES.has(status)) {
        open += 1;
      } else {
        open += 1;
      }
    }
    const total = planShipments.length;
    if (total === 0) continue;
    const driverId = plan.assigned_profile_id ? String(plan.assigned_profile_id) : null;
    const plannedDate = dateOnly(plan.planned_date);
    const complete = open === 0 && returned === 0;
    const overdue = Boolean(plannedDate && plannedDate < today && !complete);
    rows.push({
      planId: String(plan.id),
      planReference: String(plan.plan_reference ?? plan.id),
      plannedDate: plannedDate ?? "",
      planStatus: String(plan.plan_status ?? ""),
      driverId,
      driverName: driverId ? profileNameById.get(driverId) ?? "سائق" : "غير معين",
      total,
      delivered,
      returned,
      cancelled,
      open,
      pct: Math.round((delivered / total) * 100),
      complete,
      overdue,
    });
  }

  rows.sort((a, b) => b.plannedDate.localeCompare(a.plannedDate) || (a.driverName ?? "").localeCompare(b.driverName ?? "", "ar"));

  const driverAgg = new Map<string, DriverCompletionStats>();
  const addDriver = (driverId: string | null, driverName: string) => {
    const key = driverId ?? `unassigned-${driverName}`;
    let entry = driverAgg.get(key);
    if (!entry) {
      entry = {
        driverId,
        driverName,
        completedPlans: 0,
        incompletePlans: 0,
        deliveredOrders: 0,
        returnedOrders: 0,
        undeliveredOrders: 0,
        totalPlans: 0,
      };
      driverAgg.set(key, entry);
    }
    return entry;
  };

  for (const r of rows) {
    addDriver(r.driverId, r.driverName ?? "سائق");
    const entry = driverAgg.get(r.driverId ?? `unassigned-${r.driverName}`)!;
    entry.totalPlans += 1;
    entry.deliveredOrders += r.delivered;
    entry.returnedOrders += r.returned;
    entry.undeliveredOrders += r.open;
    if (r.complete) entry.completedPlans += 1;
    if (r.overdue) entry.incompletePlans += 1;
  }

  const driversArr = [...driverAgg.values()].sort((a, b) => b.undeliveredOrders - a.undeliveredOrders);

  const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0);
  const totalReturned = rows.reduce((s, r) => s + r.returned, 0);
  const totalUndelivered = rows.reduce((s, r) => s + r.open, 0);
  const totalAll = rows.reduce((s, r) => s + r.total, 0);

  return {
    plans: rows,
    drivers: driversArr,
    totals: {
      plans: rows.length,
      completedPlans: rows.filter((r) => r.complete).length,
      incompletePlans: rows.filter((r) => r.overdue).length,
      deliveredOrders: totalDelivered,
      returnedOrders: totalReturned,
      undeliveredOrders: totalUndelivered,
      overallPct: totalAll ? Math.round((totalDelivered / totalAll) * 100) : 0,
    },
  };
}

export async function fetchShipmentCandidates(range: DateRangeValue): Promise<ShipmentCandidate[]> {
  const { startIso, endIso } = getDateRangeBounds(range);
  let query = supabase
    .from("orders")
    .select("id, odoo_order_name, external_order_id, customer_name, warehouse_id, commitment_date, delivery_status, amount_total, total_amount, currency_code, type_name")
    .not("commitment_date", "is", null)
    .order("commitment_date", { ascending: true })
    .limit(1000);

  if (startIso) query = query.gte("commitment_date", startIso);
  if (endIso) query = query.lte("commitment_date", endIso);

  const [{ data: orders, error }, { data: shipments, error: shipmentError }] = await Promise.all([
    query,
    supabase.from("logistics_shipments").select("id, linked_order_id, plan_id, shipment_status"),
  ]);

  if (error) throw error;
  if (shipmentError) throw shipmentError;

  const shipmentByOrder = new Map((shipments ?? []).map((row: any) => [row.linked_order_id, row]));
  return (orders ?? [])
    .filter((order: any) => isSalesOrderTypeName(order.type_name))
    .map((order: any) => {
      const shipment = shipmentByOrder.get(order.id);
      return {
        orderId: order.id,
        orderName: order.odoo_order_name ?? order.external_order_id ?? order.id.slice(0, 8),
        customerName: order.customer_name ?? null,
        warehouseId: order.warehouse_id ?? null,
        commitmentDate: order.commitment_date ?? null,
        amount: asNumber(order.amount_total ?? order.total_amount),
        currency: order.currency_code ?? "EGP",
        deliveryStatus: order.delivery_status ?? null,
        existingShipmentId: shipment?.id ?? null,
        existingPlanId: shipment?.plan_id ?? null,
        shipmentStatus: shipment?.shipment_status ?? null,
      };
    });
}

export async function createPlanFromOrders(input: {
  driverId: string;
  plannedDate: string;
  candidates: ShipmentCandidate[];
  notes?: string;
  district?: string;
}) {
  if (input.candidates.length === 0) {
    throw new Error("اختر شحنة واحدة على الأقل.");
  }

  const planId = await createForcedDeliveryPlan(input.driverId, input.plannedDate, input.notes ?? null, input.district ?? null);

  const scheduledAt = scheduledAtForDate(input.plannedDate);
  const assignedShipments: Array<{ shipmentId: string; orderId: string }> = [];
  const assignmentErrors: Array<{ orderId: string; error: string }> = [];
  for (const candidate of input.candidates) {
    try {
      const assigned = await assignCandidateToPlan({
        candidate,
        planId,
        driverId: input.driverId,
        plannedDate: input.plannedDate,
        scheduledAt,
        notes: input.notes ?? null,
      });
      if (assigned.shipmentId && assigned.orderId) {
        assignedShipments.push({ shipmentId: assigned.shipmentId, orderId: assigned.orderId });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[createPlanFromOrders] Failed to assign order ${candidate.orderId}:`, message);
      assignmentErrors.push({ orderId: candidate.orderId, error: message });
    }
  }

  for (const shipment of assignedShipments) {
    await syncShipmentItemsFromOrder(shipment.shipmentId, shipment.orderId);
  }

  if (assignedShipments.length === 0) {
    const details = assignmentErrors.length > 0
      ? `\n Errors: ${assignmentErrors.map((e) => `${e.orderId}: ${e.error}`).join("; ")}`
      : "";
    throw new Error(`تم إنشاء الخطة لكن لم يتم ربط أي شحنة بها. راجع صلاحيات أو دوال اللوجستيات.${details}`);
  }

  await tryOptimizeCreatedPlan(planId);

  return planId as string;
}

async function createForcedDeliveryPlan(driverId: string, plannedDate: string, notes: string | null, district: string | null = null) {
  const { data, error } = await supabase.rpc("admin_create_delivery_plan", {
    p_logistics_user_id: driverId,
    p_planned_date: plannedDate,
    p_notes: notes,
    p_force_new: true,
    p_district: district,
  });

  if (!error) {
    const plan = unwrapRpcRecord(data as any);
    const planId = (plan as any)?.id;
    if (planId) return String(planId);
    throw new Error("تم إنشاء الخطة لكن لم يرجع رقم تعريف واضح لها.");
  }

  if (!isRpcSignatureError(error)) throw error;
  return insertDeliveryPlanFallback(driverId, plannedDate, notes, district);
}

async function insertDeliveryPlanFallback(driverId: string, plannedDate: string, notes: string | null, district: string | null = null) {
  const { data: driver, error: driverError } = await supabase
    .from("logistics_users")
    .select("id, linked_profile_id, status")
    .eq("id", driverId)
    .eq("status", "active")
    .single();
  if (driverError) throw driverError;
  if (!driver?.linked_profile_id) {
    throw new Error("يجب ربط السائق بحساب التطبيق قبل إنشاء الخطة.");
  }

  const { data: userResult } = await supabase.auth.getUser();
  const { data: plan, error } = await supabase
    .from("logistics_delivery_plans")
    .insert({
      logistics_user_id: driver.id,
      assigned_profile_id: driver.linked_profile_id,
      planned_date: plannedDate,
      plan_status: "pending",
      notes: notes?.trim() ? notes.trim() : null,
      district: district?.trim() ? district.trim() : null,
      created_by_profile_id: userResult.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  if (!plan?.id) throw new Error("لم يتم إنشاء الخطة.");
  return String(plan.id);
}

function isRpcSignatureError(error: unknown) {
  const value = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const text = [value?.code, value?.message, value?.details, value?.hint].filter(Boolean).join(" ");
  return /PGRST202|Could not find the function|schema cache|argument|parameter/i.test(text);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function requirePlanId(planId: string) {
  if (!isUuid(planId)) {
    throw new Error(`Invalid plan id for dispatcher preparation: ${planId || "(empty)"}`);
  }
}

function formatRpcError(error: { message?: string; code?: string; details?: string | null; hint?: string | null }, context: Record<string, unknown>) {
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  const message = parts.join(" ");
  return `${message || "Supabase RPC failed"} [code=${error.code ?? "unknown"} context=${JSON.stringify(context)}]`;
}

async function assignShipmentIdsToPlan(planId: string, shipmentIds: string[], scheduledAt: string) {
  if (shipmentIds.length === 0) return;
  const { error } = await supabase.rpc("admin_bulk_assign_shipments_to_plan", {
    p_shipment_ids: shipmentIds,
    p_plan_id: planId,
    p_scheduled_at: scheduledAt,
  });
  if (error) throw error;
}

export async function addUnassignedShipmentsToPlan(shipmentIds: string[], planId: string): Promise<number> {
  if (shipmentIds.length === 0) throw new Error("اختر شحنة واحدة على الأقل.");
  const { data, error } = await supabase.rpc("admin_bulk_assign_shipments_to_plan", {
    p_shipment_ids: shipmentIds,
    p_plan_id: planId,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

async function assignCandidateToPlan(input: {
  candidate: ShipmentCandidate;
  planId: string;
  driverId: string;
  plannedDate: string;
  scheduledAt: string;
  notes: string | null;
}) {
  if (input.candidate.existingShipmentId) {
    await assignShipmentIdsToPlan(input.planId, [input.candidate.existingShipmentId], input.scheduledAt);
    return { shipmentId: input.candidate.existingShipmentId, orderId: input.candidate.orderId };
  }

  const legacyArgs = {
    p_order_id: input.candidate.orderId,
    p_logistics_user_id: input.driverId,
    p_scheduled_at: input.scheduledAt,
    p_notes: input.notes,
    p_planned_date: input.plannedDate,
  };
  const { data, error } = await supabase.rpc("admin_assign_order_to_driver", {
    ...legacyArgs,
    p_force_new: false,
    p_plan_id: input.planId,
  });

  if (error) {
    if (!isRpcSignatureError(error)) throw error;

    const { data: legacyData, error: legacyError } = await supabase.rpc("admin_assign_order_to_driver", legacyArgs);
    if (legacyError) throw legacyError;

    const legacyShipmentId = (unwrapRpcRecord(legacyData as any) as any)?.id;
    if (legacyShipmentId) {
      await assignShipmentIdsToPlan(input.planId, [legacyShipmentId], input.scheduledAt);
    }
    return { shipmentId: legacyShipmentId ? String(legacyShipmentId) : await findPlanShipmentId(input.planId, input.candidate.orderId), orderId: input.candidate.orderId };
  }

  const shipmentId = (unwrapRpcRecord(data as any) as any)?.id;
  if (shipmentId) {
    await assignShipmentIdsToPlan(input.planId, [shipmentId], input.scheduledAt);
  }
  return { shipmentId: shipmentId ? String(shipmentId) : await findPlanShipmentId(input.planId, input.candidate.orderId), orderId: input.candidate.orderId };
}

async function findPlanShipmentId(planId: string, orderId: string) {
  const { data, error } = await supabase
    .from("logistics_shipments")
    .select("id")
    .eq("plan_id", planId)
    .eq("linked_order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data?.id ? String(data.id) : null;
}

async function syncShipmentItemsFromOrder(shipmentId: string, orderId: string) {
  const { error } = await supabase.rpc("sync_logistics_shipment_items_from_order", {
    p_shipment_id: shipmentId,
    p_order_id: orderId,
  });
  if (error) throw error;
}

async function verifyCreatedPlanContent(planId: string, orderIds: string[]) {
  const { data: shipments, error: shipmentError } = await supabase
    .from("logistics_shipments")
    .select("id")
    .eq("plan_id", planId);
  if (shipmentError) throw shipmentError;
  if (!shipments || shipments.length === 0) {
    throw new Error("تم إنشاء الخطة لكن لم يتم ربط أي شحنة بها. راجع صلاحيات أو دوال اللوجستيات.");
  }

  const [{ count: orderLineCount, error: orderLineError }, { count: itemCount, error: itemError }] = await Promise.all([
    supabase.from("order_line_items").select("id", { count: "exact", head: true }).in("order_id", orderIds),
    supabase.from("logistics_shipment_items").select("id", { count: "exact", head: true }).in("shipment_id", shipments.map((shipment) => shipment.id)),
  ]);
  if (orderLineError) throw orderLineError;
  if (itemError) throw itemError;
  if ((orderLineCount ?? 0) > 0 && (itemCount ?? 0) === 0) {
    throw new Error("تم ربط الشحنات بالخطة لكن لم يتم تحميل منتجات الطلبات داخل الشحنات.");
  }
}

async function tryOptimizeCreatedPlan(planId: string) {
  try {
    await optimizePlan(planId);
  } catch {
    // Distance stays editable/optimizable from the draft page when coordinates are incomplete.
  }
}

export async function assignPlanDriver(planId: string, driver: LogisticsDriver, shipmentIds: string[], plannedDate: string) {
  const { error } = await supabase
    .from("logistics_delivery_plans")
    .update({
      logistics_user_id: driver.id,
      assigned_profile_id: driver.linkedProfileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);
  if (error) throw error;

  if (shipmentIds.length > 0) {
    const { error: assignError } = await supabase.rpc("admin_bulk_assign_shipments_to_plan", {
      p_shipment_ids: shipmentIds,
      p_plan_id: planId,
      p_scheduled_at: scheduledAtForDate(plannedDate),
    });
    if (assignError) throw assignError;
  }
}

export async function updatePlanDate(planId: string, plannedDate: string, shipmentIds: string[]) {
  const scheduledAt = scheduledAtForDate(plannedDate);
  const { error } = await supabase
    .from("logistics_delivery_plans")
    .update({ planned_date: plannedDate, updated_at: new Date().toISOString() })
    .eq("id", planId);
  if (error) throw error;

  if (shipmentIds.length > 0) {
    const { error: shipmentError } = await supabase
      .from("logistics_shipments")
      .update({ scheduled_at: scheduledAt, updated_at: new Date().toISOString() })
      .in("id", shipmentIds);
    if (shipmentError) throw shipmentError;
  }
}

export async function optimizePlan(planId: string) {
  const { error } = await supabase.rpc("admin_optimize_delivery_plan", { p_plan_id: planId });
  if (error) throw error;
}

export async function startDispatcherPreparation(planId: string) {
  requirePlanId(planId);
  const { error } = await supabase.rpc("dispatcher_start_plan_preparation", { p_plan_id: planId });
  if (error) throw new Error(formatRpcError(error, { rpc: "dispatcher_start_plan_preparation", p_plan_id: planId }));
}

export async function removeShipmentFromPlan(shipmentId: string) {
  const { error } = await supabase.rpc("admin_remove_shipment_from_plan", { p_shipment_id: shipmentId });
  if (error) throw error;
}

export async function setShipmentSequence(planId: string, shipmentId: string, sequence: number) {
  const { error } = await supabase.rpc("admin_set_plan_stop_sequence", {
    p_plan_id: planId,
    p_shipment_id: shipmentId,
    p_route_sequence: sequence,
  });
  if (error) throw error;
}

export async function transferShipmentsBetweenPlans(shipmentIds: string[], targetPlanId: string): Promise<number> {
  if (shipmentIds.length === 0) throw new Error("اختر شحنة واحدة على الأقل.");
  const { data, error } = await supabase.rpc("admin_transfer_shipments_between_plans", {
    p_shipment_ids: shipmentIds,
    p_target_plan_id: targetPlanId,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function fetchUnassignedShipments(): Promise<LogisticsShipment[]> {
  const { data, error } = await supabase
    .from("logistics_shipments")
    .select(SHIPMENT_SELECT)
    .is("plan_id", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((row) => mapShipment(row as Record<string, any>));
}

export async function fetchAllAssignedShipments(): Promise<LogisticsShipment[]> {
  const { data, error } = await supabase
    .from("logistics_shipments")
    .select(SHIPMENT_SELECT)
    .not("plan_id", "is", null)
    .in("shipment_status", ["PENDING_ASSIGN", "ASSIGNED"])
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((row) => mapShipment(row as Record<string, any>));
}

export async function fetchActivePlans(excludePlanId?: string): Promise<LogisticsPlan[]> {
  let query = supabase
    .from("logistics_delivery_plans")
    .select(PLAN_SELECT)
    .in("plan_status", ["pending", "in_progress"])
    .order("planned_date", { ascending: false })
    .limit(100);
  if (excludePlanId) query = query.neq("id", excludePlanId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapPlan(row as Record<string, any>));
}

export async function fetchDistricts(): Promise<string[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("district")
    .not("district", "is", null)
    .not("district", "eq", "");
  if (error) throw error;
  const unique = [...new Set((data ?? []).map((r: Record<string, unknown>) => String(r.district)).filter(Boolean))];
  return unique.sort((a, b) => a.localeCompare(b, "ar"));
}

const ARABIC_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const ARABIC_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export function formatPlanDisplayName(plan: LogisticsPlan, drivers?: LogisticsDriver[]): string {
  const date = new Date(plan.plannedDate + "T00:00:00");
  const dayName = ARABIC_DAYS[date.getDay()];
  const dayNum = date.getDate();
  const monthName = ARABIC_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const datePart = `${dayName} ${dayNum} ${monthName} ${year}`;

  const driverPart = plan.driverName ?? "بدون سائق";

  let vehiclePart = "";
  if (drivers) {
    const driver = drivers.find((d) => d.id === plan.driverId);
    vehiclePart = driver?.vehicleType ?? "";
  }

  return [datePart, driverPart, vehiclePart].filter(Boolean).join(" / ");
}

// ─── Status Management RPCs ──────────────────────────────────────────────────

const VALID_SHIPMENT_STATUSES = [
  "PENDING_ASSIGN", "ASSIGNED", "CHECK_IN", "PICKUP",
  "OUT_FOR_DELIVERY", "ARRIVED", "DELIVERED", "FINISHED", "SETTLED", "CANCELLED",
] as const;

const PLAN_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
};

export async function updatePlanStatus(
  planId: string,
  newStatus: string,
  reason?: string,
): Promise<LogisticsPlan> {
  const { data, error } = await supabase.rpc("admin_update_plan_status", {
    p_plan_id: planId,
    p_new_status: newStatus,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return mapPlan(data as Record<string, any>);
}

export async function updateShipmentStatus(
  shipmentId: string,
  newStatus: string,
  note?: string,
): Promise<LogisticsShipment> {
  if (!VALID_SHIPMENT_STATUSES.includes(newStatus as typeof VALID_SHIPMENT_STATUSES[number])) {
    throw new Error(`Invalid shipment status: ${newStatus}`);
  }
  const { data, error } = await supabase.rpc("admin_update_shipment_status", {
    p_shipment_id: shipmentId,
    p_new_status: newStatus,
    p_note: note ?? null,
  });
  if (error) throw error;
  return mapShipment(data as Record<string, any>);
}

export function getValidNextStatuses(currentStatus: string): string[] {
  const flow: Record<string, string[]> = {
    PENDING_ASSIGN: ["ASSIGNED", "CANCELLED"],
    ASSIGNED: ["CHECK_IN", "CANCELLED"],
    CHECK_IN: ["PICKUP", "CANCELLED"],
    PICKUP: ["OUT_FOR_DELIVERY", "CANCELLED"],
    OUT_FOR_DELIVERY: ["ARRIVED", "DELIVERED", "CANCELLED"],
    ARRIVED: ["DELIVERED", "CANCELLED"],
    DELIVERED: ["FINISHED"],
    FINISHED: ["SETTLED"],
    SETTLED: [],
    CANCELLED: [],
  };
  return flow[currentStatus] ?? [];
}

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  PENDING_ASSIGN: "جاهزة للتخطيط",
  ASSIGNED: "تم الإسناد",
  CHECK_IN: "استلام",
  PICKUP: "تم التقاط",
  OUT_FOR_DELIVERY: "في الطريق",
  ARRIVED: "وصل",
  DELIVERED: "تم التسليم",
  FINISHED: "مكتملة",
  SETTLED: "مسوية",
  CANCELLED: "ملغاة",
};

export const PLAN_STATUS_LABELS: Record<string, string> = {
  pending: "مسودة",
  in_progress: "قيد التنفيذ",
  completed: "مكتملة",
  cancelled: "ملغاة",
  returned: "تم الاستلام",
};
