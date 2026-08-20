import { computeDashboardRangeMetrics, dashboardPreviousWindow } from "../dashboard-range-metrics";
import { fetchAdminDashboardSummary } from "../admin-dashboard-data";
import { supabase } from "../supabase";
import {
  buildKpiSourceSummary,
  evaluateKpisForDepartment,
  type EvaluatedKpi,
  type KpiPeriodFacts,
  type ManualKpiValue,
  type SystemKpiValue,
} from "./kpi-computations";
import { KPI_DEPARTMENTS, KPI_REGISTRY, type KpiDepartmentSlug } from "./kpi-registry";
import type { ParsedManualKpiRow } from "./kpi-manual-upload";
import type { DashboardCallSnapshot, DashboardOrderSnapshot, DashboardVisitSnapshot } from "../../types/admin-dashboard";

export interface KpiDashboardData {
  facts: KpiPeriodFacts;
  departments: typeof KPI_DEPARTMENTS;
  departmentCards: Record<KpiDepartmentSlug, EvaluatedKpi[]>;
  summary: ReturnType<typeof buildKpiSourceSummary>;
  latestUploads: KpiUploadBatch[];
}

export interface OdooKpiSourceBundle {
  success: boolean;
  authenticated?: boolean;
  authMode?: "supabase_function_secrets";
  period?: { start: string; end: string };
  limit?: number;
  values?: Array<{
    code: string;
    actualValue: number | string | null;
    note?: string | null;
  }>;
  results?: Array<{
    code: string;
    status: "ready" | "partial" | "unsupported";
    actualValue?: number | string | null;
    note?: string | null;
    formula?: string;
    substitutions?: string[];
    missing?: string[];
    error?: string;
    sources?: Array<{
      model: string;
      role: string;
      status: "readable" | "access_denied_or_unavailable";
      fields?: string[];
      rowCount?: number;
      rows?: Record<string, unknown>[];
      error?: string;
    }>;
  }>;
  error?: string;
}

export interface KpiUploadBatch {
  id: string;
  departmentSlug: string;
  periodStart: string;
  periodEnd: string;
  fileName: string | null;
  rowCount: number;
  uploadedAt: string;
}

type ManualValueRow = {
  kpi_code: string;
  actual_value: number | string;
  target_value: number | string | null;
  notes: string | null;
  uploaded_at: string | null;
};

type UploadBatchRow = {
  id: string;
  department_slug: string;
  period_start: string;
  period_end: string;
  file_name: string | null;
  row_count: number;
  uploaded_at: string;
};

type LineItemRevenueRow = {
  order_id: string;
  ordered_quantity: number | string | null;
  total_amount: number | string | null;
  subtotal_amount: number | string | null;
  display_type?: string | null;
};

type TicketMetricRow = {
  id: string;
  status: string | null;
  category: string | null;
  created_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  updated_at: string | null;
};

function timestampInRange(iso: string, start: Date, end: Date) {
  const timestamp = new Date(iso).getTime();
  return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp <= end.getTime();
}

function dateInRange(value: string | null | undefined, start: Date, end: Date) {
  if (!value) return false;
  return timestampInRange(value, start, end);
}

function countUniqueSalesReps(orders: DashboardOrderSnapshot[], start: Date, end: Date) {
  return new Set(
    orders
      .filter((order) => order.assignedUserId && timestampInRange(order.orderTimestamp, start, end))
      .map((order) => order.assignedUserId),
  ).size;
}

function countVisits(visits: DashboardVisitSnapshot[], start: Date, end: Date) {
  return visits.filter((visit) => timestampInRange(visit.visitedAt, start, end)).length;
}

function countCalls(calls: DashboardCallSnapshot[], start: Date, end: Date) {
  return calls.filter((call) => timestampInRange(call.occurredAt, start, end)).length;
}

function countReorderedCustomers(orders: DashboardOrderSnapshot[], start: Date, end: Date) {
  const counts = new Map<string, number>();
  for (const order of orders) {
    if (!order.customerId || !timestampInRange(order.orderTimestamp, start, end)) continue;
    counts.set(order.customerId, (counts.get(order.customerId) ?? 0) + 1);
  }
  return Array.from(counts.values()).filter((count) => count >= 2).length;
}

function countOrderCustomers(orders: DashboardOrderSnapshot[], start: Date, end: Date) {
  return new Set(
    orders
      .filter((order) => order.customerId && timestampInRange(order.orderTimestamp, start, end))
      .map((order) => order.customerId),
  ).size;
}

const POSITIVE_VISIT_OUTCOMES = new Set([
  "meeting_completed",
  "quotation_requested",
  "order_expected",
  "ordered",
  "order_created",
  "sale_completed",
]);

const NEGATIVE_VISIT_OUTCOMES = new Set([
  "customer_unavailable",
  "not_interested",
  "cancelled",
  "rejected",
]);

const POSITIVE_CALL_OUTCOMES = new Set([
  "connected",
  "answered",
  "reached",
  "requested_callback",
  "interested",
  "order_expected",
  "quotation_requested",
]);

const NEGATIVE_CALL_OUTCOMES = new Set([
  "not_interested",
  "wrong_number",
  "no_answer",
  "busy",
  "failed",
  "cancelled",
]);

function normalizeSignal(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function countScoredActivities(
  visits: DashboardVisitSnapshot[],
  calls: DashboardCallSnapshot[],
  start: Date,
  end: Date,
) {
  let positiveActivities = 0;
  let scoredActivities = 0;

  for (const visit of visits) {
    if (!timestampInRange(visit.visitedAt, start, end)) continue;
    const outcome = normalizeSignal(visit.outcome);
    if (!outcome) continue;
    if (POSITIVE_VISIT_OUTCOMES.has(outcome) || NEGATIVE_VISIT_OUTCOMES.has(outcome)) {
      scoredActivities += 1;
      if (POSITIVE_VISIT_OUTCOMES.has(outcome)) positiveActivities += 1;
    }
  }

  for (const call of calls) {
    if (!timestampInRange(call.occurredAt, start, end)) continue;
    const outcome = normalizeSignal(call.outcome);
    if (!outcome) continue;
    if (POSITIVE_CALL_OUTCOMES.has(outcome) || NEGATIVE_CALL_OUTCOMES.has(outcome)) {
      scoredActivities += 1;
      if (POSITIVE_CALL_OUTCOMES.has(outcome)) positiveActivities += 1;
    }
  }

  return { positiveActivities, scoredActivities };
}

function toFactsBucket(
  metrics: ReturnType<typeof computeDashboardRangeMetrics>,
  snapshots: {
    orders: DashboardOrderSnapshot[];
    visits: DashboardVisitSnapshot[];
    calls: DashboardCallSnapshot[];
  },
  start: Date,
  end: Date,
) {
  const deliveredOrders = metrics.deliveryBreakdown.find((item) => item.key === "delivered")?.count ?? 0;
  const cancelledOrders = metrics.deliveryBreakdown.find((item) => item.key === "cancelled")?.count ?? 0;
  const reorderedCustomers = countReorderedCustomers(snapshots.orders, start, end);
  const orderCustomers = countOrderCustomers(snapshots.orders, start, end);
  const scoredActivity = countScoredActivities(snapshots.visits, snapshots.calls, start, end);
  return {
    revenue: metrics.revenue,
    orderCount: metrics.orderCount,
    orderCustomers,
    activeCustomers: metrics.activeCustomers,
    reorderedCustomers,
    reorderRate: orderCustomers > 0 ? (reorderedCustomers / orderCustomers) * 100 : undefined,
    pendingDeliveries: metrics.pendingDeliveries,
    visits: countVisits(snapshots.visits, start, end),
    calls: countCalls(snapshots.calls, start, end),
    deliveredOrders,
    cancelledOrders,
    uniqueSalesReps: countUniqueSalesReps(snapshots.orders, start, end),
    positiveActivities: scoredActivity.positiveActivities,
    scoredActivities: scoredActivity.scoredActivities,
  };
}

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const ODOO_KPI_CODES = KPI_REGISTRY
  .filter((kpi) => kpi.source.mode === "odoo" || kpi.source.mode === "mixed")
  .map((kpi) => kpi.code);

function chunkValues<T>(values: T[], size = 200) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function fetchLineItemRevenueForOrders(orderIds: string[]) {
  const uniqueIds = Array.from(new Set(orderIds));
  if (uniqueIds.length === 0) return 0;

  let revenue = 0;
  for (const chunk of chunkValues(uniqueIds)) {
    const { data, error } = await supabase
      .from("order_line_items")
      .select("order_id, ordered_quantity, total_amount, subtotal_amount, display_type")
      .in("order_id", chunk);

    if (error) {
      throw new Error(`Order line item revenue query failed: ${error.message}`);
    }

    for (const row of (data ?? []) as LineItemRevenueRow[]) {
      const displayType = String(row.display_type ?? "").trim();
      if (displayType && displayType !== "product") continue;
      if (numberValue(row.ordered_quantity) <= 0) continue;
      const lineTotal = numberValue(row.total_amount) || numberValue(row.subtotal_amount);
      revenue += lineTotal;
    }
  }

  return revenue;
}

async function fetchNewCustomerCount(rangeStart: Date, rangeEnd: Date) {
  const { count, error } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .gte("created_at", rangeStart.toISOString())
    .lte("created_at", rangeEnd.toISOString());

  if (error) {
    throw new Error(`New customer acquisition query failed: ${error.message}`);
  }

  return count ?? 0;
}

function isResolvedTicket(row: Pick<TicketMetricRow, "status" | "resolved_at" | "closed_at">) {
  const status = normalizeSignal(row.status);
  return status === "resolved" || status === "closed" || Boolean(row.resolved_at || row.closed_at);
}

function isComplaintTicket(row: Pick<TicketMetricRow, "category">) {
  const category = normalizeSignal(row.category);
  return category === "customer_complaint" || category === "complaint" || category.includes("complaint");
}

function hoursBetween(startIso: string, endIso: string | null | undefined) {
  if (!endIso) return undefined;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return undefined;
  return (end - start) / 3_600_000;
}

async function fetchTicketMetrics(rangeStart: Date, rangeEnd: Date) {
  const { data, error } = await supabase
    .from("order_tickets")
    .select("id, status, category, created_at, resolved_at, closed_at, updated_at")
    .lte("created_at", rangeEnd.toISOString())
    .or(`resolved_at.gte.${rangeStart.toISOString()},closed_at.gte.${rangeStart.toISOString()},created_at.gte.${rangeStart.toISOString()}`)
    .limit(5000);

  if (error) {
    if (/order_tickets/i.test(error.message)) {
      return {
        ticketCount: 0,
        resolvedTickets: 0,
        complaintTicketCount: 0,
        resolvedComplaintTickets: 0,
        avgTicketResolutionHours: undefined,
      };
    }
    throw new Error(`Ticket metrics query failed: ${error.message}`);
  }

  const rows = ((data ?? []) as TicketMetricRow[]).filter(
    (row) =>
      dateInRange(row.created_at, rangeStart, rangeEnd) ||
      dateInRange(row.resolved_at, rangeStart, rangeEnd) ||
      dateInRange(row.closed_at, rangeStart, rangeEnd),
  );
  const createdInRange = rows.filter((row) => dateInRange(row.created_at, rangeStart, rangeEnd));
  const resolvedInRange = rows.filter(
    (row) => isResolvedTicket(row) && (dateInRange(row.resolved_at, rangeStart, rangeEnd) || dateInRange(row.closed_at, rangeStart, rangeEnd)),
  );
  const complaintTickets = createdInRange.filter(isComplaintTicket);
  const resolvedComplaintTickets = complaintTickets.filter(isResolvedTicket);
  const resolutionHours = resolvedInRange
    .map((row) => hoursBetween(row.created_at, row.resolved_at ?? row.closed_at ?? row.updated_at))
    .filter((value): value is number => value !== undefined);

  return {
    ticketCount: createdInRange.length,
    resolvedTickets: resolvedInRange.length,
    complaintTicketCount: complaintTickets.length,
    resolvedComplaintTickets: resolvedComplaintTickets.length,
    avgTicketResolutionHours: resolutionHours.length > 0
      ? resolutionHours.reduce((sum, value) => sum + value, 0) / resolutionHours.length
      : undefined,
  };
}

function computeOperationalSatisfactionScore(facts: KpiPeriodFacts["current"]) {
  const components: Array<{ value: number; weight: number }> = [];
  if (facts.reorderRate !== undefined) {
    components.push({ value: facts.reorderRate / 100, weight: 0.4 });
  }
  if ((facts.ticketCount ?? 0) > 0) {
    components.push({ value: (facts.resolvedTickets ?? 0) / (facts.ticketCount ?? 1), weight: 0.35 });
  }
  if ((facts.scoredActivities ?? 0) > 0) {
    components.push({ value: (facts.positiveActivities ?? 0) / (facts.scoredActivities ?? 1), weight: 0.25 });
  }
  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  if (totalWeight <= 0) return undefined;

  const normalized = components.reduce((sum, component) => sum + component.value * component.weight, 0) / totalWeight;
  return Math.round(Math.max(0, Math.min(5, normalized * 5)) * 10) / 10;
}

async function fetchManualValues(rangeStart: Date, rangeEnd: Date) {
  const { data, error } = await supabase
    .schema("kpi")
    .from("manual_values")
    .select("kpi_code, actual_value, target_value, notes, uploaded_at")
    .lte("period_start", rangeEnd.toISOString().slice(0, 10))
    .gte("period_end", rangeStart.toISOString().slice(0, 10))
    .order("uploaded_at", { ascending: false });

  if (error) {
    if (/manual_values/i.test(error.message)) {
      return new Map<string, ManualKpiValue>();
    }
    throw new Error(`Manual KPI values query failed: ${error.message}`);
  }

  const values = new Map<string, ManualKpiValue>();
  for (const row of (data ?? []) as ManualValueRow[]) {
    if (values.has(row.kpi_code)) continue;
    values.set(row.kpi_code, {
      actualValue: numberValue(row.actual_value),
      targetValue: row.target_value == null ? null : numberValue(row.target_value),
      notes: row.notes,
      uploadedAt: row.uploaded_at,
    });
  }
  return values;
}

async function fetchLatestUploads() {
  const { data, error } = await supabase
    .schema("kpi")
    .from("manual_upload_batches")
    .select("id, department_slug, period_start, period_end, file_name, row_count, uploaded_at")
    .order("uploaded_at", { ascending: false })
    .limit(8);

  if (error) {
    if (/manual_upload_batches/i.test(error.message)) return [];
    throw new Error(`Manual KPI upload batch query failed: ${error.message}`);
  }

  return ((data ?? []) as UploadBatchRow[]).map((row) => ({
    id: row.id,
    departmentSlug: row.department_slug,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    fileName: row.file_name,
    rowCount: row.row_count,
    uploadedAt: row.uploaded_at,
  }));
}

async function fetchOdooKpiValues(rangeStart: Date, rangeEnd: Date) {
  if (ODOO_KPI_CODES.length === 0) return new Map<string, SystemKpiValue>();

  try {
    const bundle = await fetchOdooKpiSourceBundle({
      kpiCodes: ODOO_KPI_CODES,
      rangeStart,
      rangeEnd,
    });
    const values = new Map<string, SystemKpiValue>();
    for (const value of bundle.values ?? []) {
      const actualValue = Number(value.actualValue);
      values.set(value.code, {
        actualValue: Number.isFinite(actualValue) ? actualValue : undefined,
        note: value.note ?? "Calculated from the configured Odoo integration.",
        sourceLabel: "Odoo integration",
      });
    }
    return values;
  } catch (error) {
    console.warn("Odoo KPI values could not be loaded.", error);
    return new Map<string, SystemKpiValue>();
  }
}

export async function fetchKpiDashboardData(rangeStart: Date, rangeEnd: Date): Promise<KpiDashboardData> {
  const previousWindow = dashboardPreviousWindow(rangeStart, rangeEnd);
  const [dashboard, manualValues, systemValues, latestUploads, currentNewCustomers, previousNewCustomers, currentTickets, previousTickets] = await Promise.all([
    fetchAdminDashboardSummary({ rangeStart, rangeEnd }),
    fetchManualValues(rangeStart, rangeEnd),
    fetchOdooKpiValues(rangeStart, rangeEnd),
    fetchLatestUploads(),
    fetchNewCustomerCount(rangeStart, rangeEnd),
    fetchNewCustomerCount(previousWindow.start, previousWindow.end),
    fetchTicketMetrics(rangeStart, rangeEnd),
    fetchTicketMetrics(previousWindow.start, previousWindow.end),
  ]);
  const currentMetrics = computeDashboardRangeMetrics(
    rangeStart,
    rangeEnd,
    dashboard.orderSnapshots,
    dashboard.visitSnapshots,
    dashboard.callSnapshots,
    dashboard.orderIntentSnapshots,
  );
  const previousMetrics = computeDashboardRangeMetrics(
    previousWindow.start,
    previousWindow.end,
    dashboard.orderSnapshots,
    dashboard.visitSnapshots,
    dashboard.callSnapshots,
    dashboard.orderIntentSnapshots,
  );
  const currentOrderIds = dashboard.orderSnapshots
    .filter((order) => timestampInRange(order.orderTimestamp, rangeStart, rangeEnd))
    .map((order) => order.id);
  const previousOrderIds = dashboard.orderSnapshots
    .filter((order) => timestampInRange(order.orderTimestamp, previousWindow.start, previousWindow.end))
    .map((order) => order.id);
  const [currentLineItemRevenue, previousLineItemRevenue] = await Promise.all([
    fetchLineItemRevenueForOrders(currentOrderIds),
    fetchLineItemRevenueForOrders(previousOrderIds),
  ]);

  const facts: KpiPeriodFacts = {
    current: toFactsBucket(
      currentMetrics,
      { orders: dashboard.orderSnapshots, visits: dashboard.visitSnapshots, calls: dashboard.callSnapshots },
      rangeStart,
      rangeEnd,
    ),
    previous: toFactsBucket(
      previousMetrics,
      { orders: dashboard.orderSnapshots, visits: dashboard.visitSnapshots, calls: dashboard.callSnapshots },
      previousWindow.start,
      previousWindow.end,
    ),
    manualValues,
    systemValues,
    period: {
      currentStart: rangeStart,
      currentEnd: rangeEnd,
      previousStart: previousWindow.start,
      previousEnd: previousWindow.end,
    },
  };
  facts.current.lineItemRevenue = currentLineItemRevenue;
  facts.previous.lineItemRevenue = previousLineItemRevenue;
  facts.current.newCustomers = currentNewCustomers;
  facts.previous.newCustomers = previousNewCustomers;
  Object.assign(facts.current, currentTickets);
  Object.assign(facts.previous, previousTickets);
  facts.operationalSatisfactionScore = computeOperationalSatisfactionScore(facts.current);

  const departmentCards = Object.fromEntries(
    KPI_DEPARTMENTS.map((department) => [department.slug, evaluateKpisForDepartment(department.slug, facts)]),
  ) as Record<KpiDepartmentSlug, EvaluatedKpi[]>;

  return {
    facts,
    departments: KPI_DEPARTMENTS,
    departmentCards,
    summary: buildKpiSourceSummary(KPI_REGISTRY),
    latestUploads,
  };
}

export async function uploadManualKpiRows(rows: ParsedManualKpiRow[], fileName: string | null) {
  if (rows.length === 0) {
    throw new Error("No valid KPI rows to upload.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(userError?.message ?? "You must be signed in to upload KPIs.");
  }

  const first = rows[0];
  const { data: batch, error: batchError } = await supabase
    .schema("kpi")
    .from("manual_upload_batches")
    .insert({
      department_slug: first.departmentSlug,
      period_start: first.periodStart,
      period_end: first.periodEnd,
      file_name: fileName,
      row_count: rows.length,
      uploaded_by: user.id,
      status: "completed",
    })
    .select("id")
    .single();

  if (batchError) {
    throw new Error(`KPI upload batch failed: ${batchError.message}`);
  }

  const { error: valuesError } = await supabase.schema("kpi").from("manual_values").insert(
    rows.map((row) => ({
      batch_id: batch.id,
      department_slug: row.departmentSlug,
      kpi_code: row.kpiCode,
      period_start: row.periodStart,
      period_end: row.periodEnd,
      actual_value: row.actualValue,
      target_value: row.targetValue,
      notes: row.notes,
      uploaded_by: user.id,
    })),
  );

  if (valuesError) {
    throw new Error(`KPI values upload failed: ${valuesError.message}`);
  }

  return batch.id as string;
}

export async function fetchOdooKpiSourceBundle({
  kpiCodes,
  rangeStart,
  rangeEnd,
}: {
  kpiCodes: string[];
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const { data, error } = await supabase.functions.invoke<OdooKpiSourceBundle>("kpi-odoo-query", {
    body: {
      kpiCodes,
      periodStart: rangeStart.toISOString(),
      periodEnd: rangeEnd.toISOString(),
      limit: 50,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
  if (!data?.success) {
    throw new Error(data?.error ?? "Odoo KPI request failed.");
  }

  return data;
}
