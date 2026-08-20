import type {
  DashboardCallSnapshot,
  DashboardOrderPoint,
  DashboardOrderIntentSnapshot,
  DashboardOrderSnapshot,
  DashboardSummary,
  DashboardVisitSnapshot,
} from "../types/admin-dashboard";
import { supabase } from "./supabase";
import { buildOdooToProfileMap, resolveOrderUserId } from "./order-user-resolver";

type DashboardOrderRowDb = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  status: string | null;
  delivery_status: string | null;
  invoice_status: string | null;
  total_amount: number | string | null;
  order_date: string | null;
  created_at: string;
  assigned_user_id: string | null;
  user_id: string | null;
  odoo_order_name: string | null;
  external_order_id: string | null;
  pricelist_id: string | null;
};

type DashboardVisitRow = {
  id: string;
  customer_id: string;
  user_id: string;
  visit_result: string | null;
  checked_in_at: string | null;
  created_at: string;
};

type DashboardCallRow = {
  id: string;
  customer_id: string | null;
  user_id: string;
  call_reason: string | null;
  call_outcome: string | null;
  call_notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type DashboardOrderIntentRow = {
  id: string;
  customer_id: string;
  sales_profile_id: string;
  status: string | null;
  priority: string | null;
  summary: string | null;
  estimated_value: number | string | null;
  requested_delivery_date: string | null;
  created_at: string;
};

type DashboardCustomerRow = {
  id: string;
  customer_name: string;
  lat: number | null;
  lng: number | null;
  google_maps_url: string | null;
  customer_location: string | null;
  district: string | null;
  governorate: string | null;
};

type DashboardProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  odoo_user_id: string | null;
};

const PAGE_SIZE = 500;
const LOOKUP_CHUNK_SIZE = 200;

function monthRange(baseDate: Date, monthOffset: number) {
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth() + monthOffset;

  return {
    start: new Date(Date.UTC(year, month, 1)),
    end: new Date(Date.UTC(year, month + 1, 1)),
  };
}

function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseAmount(value: number | string | null | undefined): number {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function getOrderDate(order: DashboardOrderRowDb) {
  return parseDate(order.order_date ?? order.created_at);
}

function getVisitDate(visit: DashboardVisitRow) {
  return parseDate(visit.checked_in_at ?? visit.created_at);
}

function getCallDate(call: DashboardCallRow) {
  return parseDate(call.completed_at ?? call.started_at ?? call.created_at);
}

function compactOrderLabel(order: DashboardOrderRowDb) {
  const raw = String(order.odoo_order_name ?? order.external_order_id ?? "").trim();
  if (!raw) {
    return order.id.slice(0, 8).toUpperCase();
  }

  const parts = raw
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts[parts.length - 1] ?? raw;
}

function normalizeDeliveryStatus(value: string | boolean | null | undefined): DashboardOrderSnapshot["deliveryKey"] {
  if (value === false || value === null || value === undefined) return "pending";
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "full" || normalized === "done" || normalized === "delivered") {
    return "delivered";
  }
  if (normalized === "partial") {
    return "partial";
  }
  if (normalized === "cancelled" || normalized === "cancel" || normalized === "canceled") {
    return "cancelled";
  }
  return "pending";
}

function inRange(date: Date | null, startMs: number, endMs: number) {
  const timestamp = date?.getTime();
  return Number.isFinite(timestamp) && timestamp! >= startMs && timestamp! <= endMs;
}

function chunkIds(ids: string[]) {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += LOOKUP_CHUNK_SIZE) {
    chunks.push(ids.slice(index, index + LOOKUP_CHUNK_SIZE));
  }
  return chunks;
}

async function fetchPagedOrders(fromIso: string, toIso: string): Promise<DashboardOrderRowDb[]> {
  const rows: DashboardOrderRowDb[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, customer_id, customer_name, status, delivery_status, invoice_status, total_amount, order_date, created_at, assigned_user_id, user_id, odoo_order_name, external_order_id, pricelist_id",
      )
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Orders query failed: ${error.message}`);
    }

    const batch = (data ?? []) as DashboardOrderRowDb[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchPagedVisits(fromIso: string, toIso: string): Promise<DashboardVisitRow[]> {
  const rows: DashboardVisitRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("visits")
      .select("id, customer_id, user_id, visit_result, checked_in_at, created_at")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Visits query failed: ${error.message}`);
    }

    const batch = (data ?? []) as DashboardVisitRow[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchPagedCalls(fromIso: string, toIso: string): Promise<DashboardCallRow[]> {
  const rows: DashboardCallRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("calls")
      .select(
        "id, customer_id, user_id, call_reason, call_outcome, call_notes, started_at, completed_at, created_at",
      )
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Calls query failed: ${error.message}`);
    }

    const batch = (data ?? []) as DashboardCallRow[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchPagedOrderIntents(fromIso: string, toIso: string): Promise<DashboardOrderIntentRow[]> {
  const rows: DashboardOrderIntentRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("order_intents")
      .select(
        "id, customer_id, sales_profile_id, status, priority, summary, estimated_value, requested_delivery_date, created_at",
      )
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Order intents query failed: ${error.message}`);
    }

    const batch = (data ?? []) as DashboardOrderIntentRow[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchCustomersByIds(ids: string[]): Promise<DashboardCustomerRow[]> {
  if (ids.length === 0) return [];

  const chunks = chunkIds(ids);
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, customer_name, lat, lng, google_maps_url, customer_location, district, governorate")
        .in("id", chunk);

      if (error) {
        throw new Error(`Customers query failed: ${error.message}`);
      }

      return (data ?? []) as DashboardCustomerRow[];
    }),
  );

  return results.flat();
}

async function fetchProfilesByIds(ids: string[]): Promise<DashboardProfileRow[]> {
  if (ids.length === 0) return [];

  const chunks = chunkIds(ids);
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, odoo_user_id")
        .in("id", chunk);

      if (error) {
        throw new Error(`Profiles query failed: ${error.message}`);
      }

      return (data ?? []) as DashboardProfileRow[];
    }),
  );

  return results.flat();
}

export async function fetchAdminDashboardSummary({
  rangeStart,
  rangeEnd,
}: {
  rangeStart: Date;
  rangeEnd: Date;
}): Promise<DashboardSummary> {
  const today = new Date();
  const currentMonth = monthRange(today, 0);
  const firstVisibleMonth = monthRange(today, -11).start;
  const spanMs = Math.max(0, rangeEnd.getTime() - rangeStart.getTime());
  const previousEnd = new Date(rangeStart.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - spanMs);

  const queryStart = new Date(
    Math.min(firstVisibleMonth.getTime(), previousStart.getTime()),
  );
  const queryEnd = new Date(
    Math.max(currentMonth.end.getTime(), rangeEnd.getTime()),
  );

  const queryStartIso = queryStart.toISOString();
  const queryEndIso = queryEnd.toISOString();
  const queryStartMs = queryStart.getTime();
  const queryEndMs = queryEnd.getTime();

  const [ordersRaw, visitsRaw, callsRaw, orderIntentsRaw] = await Promise.all([
    fetchPagedOrders(queryStartIso, queryEndIso),
    fetchPagedVisits(queryStartIso, queryEndIso),
    fetchPagedCalls(queryStartIso, queryEndIso),
    fetchPagedOrderIntents(queryStartIso, queryEndIso).catch((error) => {
      if (error instanceof Error && /order_intents/i.test(error.message)) {
        return [] as DashboardOrderIntentRow[];
      }
      throw error;
    }),
  ]);

  const orders = ordersRaw.filter((order) => inRange(getOrderDate(order), queryStartMs, queryEndMs));
  const visits = visitsRaw.filter((visit) => inRange(getVisitDate(visit), queryStartMs, queryEndMs));
  const calls = callsRaw.filter((call) => inRange(getCallDate(call), queryStartMs, queryEndMs));
  const orderIntents = orderIntentsRaw.filter((intent) =>
    inRange(parseDate(intent.created_at), queryStartMs, queryEndMs),
  );

  const customerIds = new Set<string>();
  const profileIds = new Set<string>();

  for (const order of orders) {
    if (order.customer_id) {
      customerIds.add(order.customer_id);
    }
    if (order.assigned_user_id) {
      profileIds.add(order.assigned_user_id);
    }
  }

  for (const visit of visits) {
    customerIds.add(visit.customer_id);
    profileIds.add(visit.user_id);
  }

  for (const call of calls) {
    if (call.customer_id) {
      customerIds.add(call.customer_id);
    }
    profileIds.add(call.user_id);
  }

  for (const intent of orderIntents) {
    customerIds.add(intent.customer_id);
    profileIds.add(intent.sales_profile_id);
  }

  const [customers, profiles] = await Promise.all([
    fetchCustomersByIds(Array.from(customerIds)),
    fetchProfilesByIds(Array.from(profileIds)),
  ]);

  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const odooToProfileId = buildOdooToProfileMap(profiles);
  const revenueByMonth = new Map<string, number>();

  const orderSnapshots: DashboardOrderSnapshot[] = [];
  const orderPoints: DashboardOrderPoint[] = [];

  for (const order of orders) {
    const orderDate = getOrderDate(order);
    if (!orderDate) continue;

    const amount = parseAmount(order.total_amount);
    const timestamp = orderDate.toISOString();

    if (orderDate >= firstVisibleMonth && orderDate < currentMonth.end) {
      const key = monthKey(orderDate);
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + amount);
    }

    orderSnapshots.push({
      id: order.id,
      customerId: order.customer_id,
      customerName:
        order.customer_name ??
        (order.customer_id ? customerById.get(order.customer_id)?.customer_name ?? null : null),
      assignedUserId: resolveOrderUserId(order, odooToProfileId),
      repName: (() => {
        const userId = resolveOrderUserId(order, odooToProfileId);
        if (!userId) return null;
        const profile = profileById.get(userId);
        return profile?.full_name ?? profile?.email ?? null;
      })(),
      orderTimestamp: timestamp,
      amount,
      deliveryKey: normalizeDeliveryStatus(order.delivery_status ?? order.status),
      orderNumber: compactOrderLabel(order),
      invoiceStatus: order.invoice_status,
      pricelistId: order.pricelist_id,
      createdAt: order.created_at,
    });

    orderPoints.push({
      timestamp,
      amount,
    });
  }

  const visitSnapshots: DashboardVisitSnapshot[] = visits
    .map((visit) => {
      const visitedAt = getVisitDate(visit);
      if (!visitedAt) return null;

      return {
        id: visit.id,
        customerId: visit.customer_id,
        customerName: customerById.get(visit.customer_id)?.customer_name ?? null,
        userId: visit.user_id,
        actorName:
          profileById.get(visit.user_id)?.full_name ??
          profileById.get(visit.user_id)?.email ??
          null,
        outcome: visit.visit_result,
        visitedAt: visitedAt.toISOString(),
        createdAt: visit.created_at,
      };
    })
    .filter((snapshot): snapshot is DashboardVisitSnapshot => snapshot !== null);

  const callSnapshots: DashboardCallSnapshot[] = calls
    .map((call) => {
      const occurredAt = getCallDate(call);
      if (!occurredAt) return null;

      return {
        id: call.id,
        customerId: call.customer_id,
        customerName: call.customer_id
          ? customerById.get(call.customer_id)?.customer_name ?? null
          : null,
        userId: call.user_id,
        actorName:
          profileById.get(call.user_id)?.full_name ??
          profileById.get(call.user_id)?.email ??
          null,
        outcome: call.call_outcome,
        reason: call.call_reason,
        notes: call.call_notes,
        occurredAt: occurredAt.toISOString(),
        createdAt: call.created_at,
      };
    })
    .filter((snapshot): snapshot is DashboardCallSnapshot => snapshot !== null);

  const orderIntentSnapshots: DashboardOrderIntentSnapshot[] = orderIntents.map((intent) => ({
    id: intent.id,
    customerId: intent.customer_id,
    customerName: customerById.get(intent.customer_id)?.customer_name ?? null,
    salesProfileId: intent.sales_profile_id,
    salesRepName:
      profileById.get(intent.sales_profile_id)?.full_name ??
      profileById.get(intent.sales_profile_id)?.email ??
      null,
    status: intent.status ?? "pending",
    priority: intent.priority ?? "high",
    summary: intent.summary ?? "Order requested during sales visit",
    estimatedValue: parseAmount(intent.estimated_value),
    requestedDeliveryDate: intent.requested_delivery_date,
    createdAt: intent.created_at,
  }));

  const lastTwelveMonths = Array.from({ length: 12 }, (_, index) =>
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (11 - index), 1)),
  );

  const mapMarkers: Array<{ latLng: [number, number]; name: string }> = [];
  const seenCustomerIds = new Set<string>();
  for (const order of orders) {
    if (!order.customer_id || seenCustomerIds.has(order.customer_id)) continue;
    seenCustomerIds.add(order.customer_id);
    const customer = customerById.get(order.customer_id);
    if (!customer) continue;

    const lat = typeof customer.lat === "number" ? customer.lat : null;
    const lng = typeof customer.lng === "number" ? customer.lng : null;
    if (lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      mapMarkers.push({
        latLng: [lat, lng],
        name: customer.customer_name || order.customer_name || "عميل",
      });
    }
  }

  return {
    metrics: [],
    salesCategories: lastTwelveMonths.map((month) =>
      month.toLocaleString("en-US", { month: "short" }),
    ),
    salesSeries: lastTwelveMonths.map((month) => revenueByMonth.get(monthKey(month)) ?? 0),
    activityCategories: [],
    visitsSeries: [],
    callsSeries: [],
    targetProgress: 0,
    targetValue: 0,
    targetBaselineValue: 0,
    actualValue: 0,
    actualOrders: 0,
    totalOrdersThisMonth: 0,
    totalOrdersLastMonth: 0,
    activeCustomersThisMonth: 0,
    activeCustomersLastMonth: 0,
    pendingDeliveriesThisMonth: 0,
    pendingDeliveriesLastMonth: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    revenueToday: 0,
    topRegions: [],
    mapMarkers,
    recentOrders: [],
    deliveryStatusBreakdown: [],
    topSalesReps: [],
    recentActivity: [],
    orderIntentSnapshots,
    orderPoints,
    orderSnapshots,
    visitSnapshots,
    callSnapshots,
  };
}
