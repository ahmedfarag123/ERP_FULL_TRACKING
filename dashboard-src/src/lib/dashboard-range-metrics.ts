import type {
  DashboardActivityItem,
  DashboardCallSnapshot,
  DashboardDeliveryStatusStat,
  DashboardOrderIntentSnapshot,
  DashboardOrderRow,
  DashboardOrderSnapshot,
  DashboardSalesRepStat,
  DashboardVisitSnapshot,
} from "../types/admin-dashboard";

const currencyFormatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

function timestampInRange(iso: string, startMs: number, endMs: number) {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t >= startMs && t <= endMs;
}

function deliveryDisplayLabel(key: DashboardDeliveryStatusStat["key"]) {
  switch (key) {
    case "delivered":
      return "Full";
    case "partial":
      return "Partial";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

export function dashboardPreviousWindow(start: Date, end: Date) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const span = Math.max(0, endMs - startMs);
  const prevEnd = new Date(startMs - 1);
  const prevStart = new Date(prevEnd.getTime() - span);
  return { start: prevStart, end: prevEnd };
}

export interface DashboardRangeMetrics {
  revenue: number;
  orderCount: number;
  activeCustomers: number;
  pendingDeliveries: number;
  pendingOrderIntents: number;
  deliveryBreakdown: DashboardDeliveryStatusStat[];
  topSalesReps: DashboardSalesRepStat[];
  recentOrders: DashboardOrderRow[];
  recentActivity: DashboardActivityItem[];
}

function compactText(value: string | null | undefined, fallback: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return fallback;
  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
}

export function computeDashboardRangeMetrics(
  start: Date,
  end: Date,
  orderSnapshots: DashboardOrderSnapshot[],
  visitSnapshots: DashboardVisitSnapshot[],
  callSnapshots: DashboardCallSnapshot[],
  orderIntentSnapshots: DashboardOrderIntentSnapshot[] = [],
): DashboardRangeMetrics {
  const startMs = start.getTime();
  const endMs = end.getTime();

  const customerIds = new Set<string>();
  const ordersInRange: DashboardOrderSnapshot[] = [];
  const visitsInRange: DashboardVisitSnapshot[] = [];
  const callsInRange: DashboardCallSnapshot[] = [];
  const orderIntentsInRange: DashboardOrderIntentSnapshot[] = [];
  const deliveryCounts: Record<DashboardDeliveryStatusStat["key"], number> = {
    pending: 0,
    partial: 0,
    delivered: 0,
    cancelled: 0,
  };
  let revenue = 0;
  let pendingDeliveries = 0;

  for (const order of orderSnapshots) {
    if (!timestampInRange(order.orderTimestamp, startMs, endMs)) continue;

    ordersInRange.push(order);
    revenue += order.amount;
    deliveryCounts[order.deliveryKey] += 1;

    if (order.deliveryKey === "pending" || order.deliveryKey === "partial") {
      pendingDeliveries += 1;
    }

    if (order.customerId) {
      customerIds.add(order.customerId);
    }
  }

  for (const visit of visitSnapshots) {
    if (!timestampInRange(visit.visitedAt, startMs, endMs)) continue;
    visitsInRange.push(visit);
    customerIds.add(visit.customerId);
  }

  for (const call of callSnapshots) {
    if (!timestampInRange(call.occurredAt, startMs, endMs)) continue;
    callsInRange.push(call);
    if (call.customerId) {
      customerIds.add(call.customerId);
    }
  }

  for (const intent of orderIntentSnapshots) {
    if (!timestampInRange(intent.createdAt, startMs, endMs)) continue;
    orderIntentsInRange.push(intent);
    customerIds.add(intent.customerId);
  }

  const orderCount = ordersInRange.length;
  const activeCustomers = customerIds.size;
  const keys = ["pending", "partial", "delivered", "cancelled"] as const;
  const deliveryBreakdown: DashboardDeliveryStatusStat[] = keys.map((key) => ({
    key,
    label: deliveryDisplayLabel(key),
    count: deliveryCounts[key],
  }));

  const repAccumulator = new Map<string, DashboardSalesRepStat>();
  ordersInRange.forEach((order) => {
    if (!order.assignedUserId) return;
    const name = order.repName ?? "Unknown rep";
    const current = repAccumulator.get(order.assignedUserId);
    if (current) {
      current.orderCount += 1;
      current.revenue += order.amount;
      return;
    }

    repAccumulator.set(order.assignedUserId, {
      id: order.assignedUserId,
      name,
      orderCount: 1,
      revenue: order.amount,
    });
  });

  const topSalesReps = Array.from(repAccumulator.values())
    .sort((left, right) => right.orderCount - left.orderCount || right.revenue - left.revenue)
    .slice(0, 5);

  const recentOrders: DashboardOrderRow[] = [...ordersInRange]
    .sort(
      (left, right) =>
        new Date(right.orderTimestamp).getTime() - new Date(left.orderTimestamp).getTime(),
    )
    .slice(0, 5)
    .map((order) => ({
      id: order.id,
      customerId: order.customerId,
      orderNumber: order.orderNumber,
      customerName: order.customerName ?? "Unknown customer",
      repName: order.repName ?? "Unassigned",
      amount: currencyFormatter.format(order.amount),
      status: deliveryDisplayLabel(order.deliveryKey),
      createdAt: new Date(order.orderTimestamp).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      syncedAt: order.createdAt,
      invoiceStatus: order.invoiceStatus,
    }));

  const recentActivity: DashboardActivityItem[] = [
    ...ordersInRange.map((order) => ({
      id: `order-${order.id}`,
      kind: "order" as const,
      actorName: order.repName ?? "Odoo sync",
      title: `${order.repName ?? "Odoo sync"} added order ${order.orderNumber}`,
      description: `${order.customerName ?? "Unknown customer"} · ${currencyFormatter.format(order.amount)}`,
      occurredAt: order.orderTimestamp,
      href: `/orders/${order.id}`,
    })),
    ...visitsInRange.map((visit) => ({
      id: `visit-${visit.id}`,
      kind: "visit" as const,
      actorName: visit.actorName ?? "Unknown rep",
      title: `${visit.actorName ?? "Unknown rep"} logged a visit`,
      description: `${visit.customerName ?? "Unknown customer"} · ${compactText(visit.outcome, "Visit recorded")}`,
      occurredAt: visit.visitedAt,
      href: `/customers/${visit.customerId}`,
    })),
    ...callsInRange.map((call) => ({
      id: `call-${call.id}`,
      kind: "call" as const,
      actorName: call.actorName ?? "Unknown rep",
      title: `${call.actorName ?? "Unknown rep"} logged a call`,
      description: `${call.customerName ?? "General follow-up"} · ${compactText(call.outcome ?? call.reason ?? call.notes, "Call recorded")}`,
      occurredAt: call.occurredAt,
      href: call.customerId ? `/customers/${call.customerId}` : undefined,
    })),
    ...orderIntentsInRange.map((intent) => ({
      id: `order-intent-${intent.id}`,
      kind: "order_intent" as const,
      actorName: intent.salesRepName ?? "Sales rep",
      title: `${intent.salesRepName ?? "Sales rep"} requested an order`,
      description: `${intent.customerName ?? "Unknown customer"} · ${compactText(intent.summary, "Order intent")}`,
      occurredAt: intent.createdAt,
      href: "/orders/intents",
    })),
  ]
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    )
    .slice(0, 8);

  return {
    revenue,
    orderCount,
    activeCustomers,
    pendingDeliveries,
    pendingOrderIntents: orderIntentsInRange.filter((intent) => intent.status === "pending").length,
    deliveryBreakdown,
    topSalesReps,
    recentOrders,
    recentActivity,
  };
}
