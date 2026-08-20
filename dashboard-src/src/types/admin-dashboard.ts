export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  detail: string;
  deltaPercentage: number | null;
  trend: "up" | "down" | "flat";
  tone: "success" | "error" | "info" | "warning";
}

export interface DashboardOrderRow {
  /** Route id (full UUID). */
  id: string;
  customerId: string | null;
  /** Display label e.g. Odoo order name. */
  orderNumber: string;
  customerName: string;
  repName: string;
  amount: string;
  status: string;
  createdAt: string;
  /** ISO timestamp for Odoo/sync metadata (relative "Synced …"). */
  syncedAt: string;
  invoiceStatus: string | null;
}

export interface DashboardRegionStat {
  name: string;
  count: number;
  percentage: number;
}

export interface DashboardMapMarker {
  latLng: [number, number];
  name: string;
}

export interface DashboardDeliveryStatusStat {
  key: "pending" | "partial" | "delivered" | "cancelled";
  label: string;
  count: number;
}

/** Minimal order rows for client-side range aggregation on the dashboard. */
export interface DashboardOrderSnapshot {
  id: string;
  customerId: string | null;
  customerName: string | null;
  assignedUserId: string | null;
  repName: string | null;
  orderTimestamp: string;
  amount: number;
  deliveryKey: DashboardDeliveryStatusStat["key"];
  orderNumber: string;
  invoiceStatus: string | null;
  pricelistId: string | null;
  createdAt: string;
}

export interface DashboardVisitSnapshot {
  id: string;
  customerId: string;
  customerName: string | null;
  userId: string;
  actorName: string | null;
  outcome: string | null;
  visitedAt: string;
  createdAt: string;
}

export interface DashboardCallSnapshot {
  id: string;
  customerId: string | null;
  customerName: string | null;
  userId: string;
  actorName: string | null;
  outcome: string | null;
  reason: string | null;
  notes: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface DashboardSalesRepStat {
  id: string;
  name: string;
  orderCount: number;
  revenue: number;
}

export interface DashboardOrderPoint {
  timestamp: string;
  amount: number;
}

export interface DashboardActivityItem {
  id: string;
  kind: "order" | "call" | "visit" | "order_intent";
  actorName: string;
  title: string;
  description: string;
  occurredAt: string;
  href?: string;
}

export interface DashboardOrderIntentSnapshot {
  id: string;
  customerId: string;
  customerName: string | null;
  salesProfileId: string;
  salesRepName: string | null;
  status: string;
  priority: string;
  summary: string;
  estimatedValue: number;
  requestedDeliveryDate: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  metrics: DashboardMetric[];
  salesCategories: string[];
  salesSeries: number[];
  activityCategories: string[];
  visitsSeries: number[];
  callsSeries: number[];
  targetProgress: number;
  targetValue: number;
  targetBaselineValue: number;
  actualValue: number;
  actualOrders: number;
  totalOrdersThisMonth: number;
  totalOrdersLastMonth: number;
  activeCustomersThisMonth: number;
  activeCustomersLastMonth: number;
  pendingDeliveriesThisMonth: number;
  pendingDeliveriesLastMonth: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueToday: number;
  topRegions: DashboardRegionStat[];
  mapMarkers: DashboardMapMarker[];
  recentOrders: DashboardOrderRow[];
  deliveryStatusBreakdown: DashboardDeliveryStatusStat[];
  topSalesReps: DashboardSalesRepStat[];
  recentActivity: DashboardActivityItem[];
  orderIntentSnapshots: DashboardOrderIntentSnapshot[];
  orderPoints: DashboardOrderPoint[];
  orderSnapshots: DashboardOrderSnapshot[];
  visitSnapshots: DashboardVisitSnapshot[];
  callSnapshots: DashboardCallSnapshot[];
}
