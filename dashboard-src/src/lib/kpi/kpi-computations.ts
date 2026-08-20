import { getKpisForDepartment, type KpiDefinition, type KpiDepartmentSlug } from "./kpi-registry";

export type KpiStatus = "exceeded" | "on_track" | "at_risk" | "missed" | "missing";

export interface KpiPeriodFacts {
  current: {
    revenue: number;
    lineItemRevenue?: number;
    orderCount: number;
    orderCustomers?: number;
    activeCustomers: number;
    newCustomers?: number;
    pendingDeliveries: number;
    visits: number;
    calls: number;
    deliveredOrders: number;
    cancelledOrders: number;
    uniqueSalesReps: number;
    reorderedCustomers?: number;
    reorderRate?: number;
    ticketCount?: number;
    resolvedTickets?: number;
    complaintTicketCount?: number;
    resolvedComplaintTickets?: number;
    avgTicketResolutionHours?: number;
    positiveActivities?: number;
    scoredActivities?: number;
  };
  previous: {
    revenue: number;
    lineItemRevenue?: number;
    orderCount: number;
    orderCustomers?: number;
    activeCustomers: number;
    newCustomers?: number;
    pendingDeliveries: number;
    visits: number;
    calls: number;
    deliveredOrders: number;
    cancelledOrders: number;
    uniqueSalesReps: number;
    reorderedCustomers?: number;
    reorderRate?: number;
    ticketCount?: number;
    resolvedTickets?: number;
    complaintTicketCount?: number;
    resolvedComplaintTickets?: number;
    avgTicketResolutionHours?: number;
    positiveActivities?: number;
    scoredActivities?: number;
  };
  operationalSatisfactionScore?: number;
  manualValues: Map<string, ManualKpiValue>;
  systemValues?: Map<string, SystemKpiValue>;
  period: {
    currentStart: Date;
    currentEnd: Date;
    previousStart: Date;
    previousEnd: Date;
  };
}

export interface ManualKpiValue {
  actualValue: number;
  targetValue?: number | null;
  uploadedAt?: string | null;
  notes?: string | null;
}

export interface SystemKpiValue {
  actualValue?: number;
  targetValue?: number | null;
  note?: string | null;
  sourceLabel?: string | null;
}

export interface EvaluatedKpi extends KpiDefinition {
  actualValue?: number;
  targetValue: number;
  status: KpiStatus;
  scorePercent?: number;
  sourceNote: string;
}

function percent(numerator: number, denominator: number) {
  if (!Number.isFinite(denominator) || denominator <= 0) return undefined;
  return (numerator / denominator) * 100;
}

function computeStatus(actual: number | undefined, target: number, direction: KpiDefinition["direction"]): KpiStatus {
  if (actual === undefined || !Number.isFinite(actual)) return "missing";
  if (target === 0) {
    return actual === 0 ? "on_track" : direction === "Lower is Better" ? "missed" : "exceeded";
  }

  const ratio = actual / target;
  if (direction === "Higher is Better") {
    if (ratio >= 1) return "exceeded";
    if (ratio >= 0.9) return "on_track";
    if (ratio >= 0.7) return "at_risk";
    return "missed";
  }

  if (ratio <= 1) return "exceeded";
  if (ratio <= 1.1) return "on_track";
  if (ratio <= 1.3) return "at_risk";
  return "missed";
}

function scorePercent(actual: number | undefined, target: number, direction: KpiDefinition["direction"]) {
  if (actual === undefined || target === 0) return undefined;
  if (direction === "Higher is Better") {
    return Math.min(Math.round((actual / target) * 100), 150);
  }
  if (actual === 0) return 150;
  return Math.min(Math.round((target / actual) * 100), 150);
}

function computeLiveValue(code: string, facts: KpiPeriodFacts) {
  const interactions = facts.current.visits + facts.current.calls;
  const currentRevenue = facts.current.lineItemRevenue ?? facts.current.revenue;
  const previousRevenue = facts.previous.lineItemRevenue ?? facts.previous.revenue;
  switch (code) {
    case "SAL-01":
      return currentRevenue;
    case "SAL-03":
      return percent(facts.current.orderCount, interactions);
    case "SAL-04":
      return facts.current.orderCount > 0 ? currentRevenue / facts.current.orderCount : undefined;
    case "SAL-05":
      return previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : undefined;
    case "SAL-06":
      return facts.current.newCustomers;
    case "SAL-07": {
      const retained = Math.min(facts.current.activeCustomers, facts.previous.activeCustomers);
      return percent(retained, Math.max(facts.previous.activeCustomers, 1));
    }
    case "SAL-09":
    case "QCS-01":
      return facts.operationalSatisfactionScore;
    case "SAL-10":
      return facts.current.uniqueSalesReps > 0 ? currentRevenue / facts.current.uniqueSalesReps : undefined;
    case "QCS-03":
      return facts.current.avgTicketResolutionHours;
    case "QCS-05":
      return percent(facts.current.resolvedComplaintTickets ?? 0, facts.current.complaintTicketCount ?? 0);
    default:
      return undefined;
  }
}

export function evaluateKpisForDepartment(departmentSlug: KpiDepartmentSlug, facts: KpiPeriodFacts): EvaluatedKpi[] {
  return getKpisForDepartment(departmentSlug).map((definition) => {
    const uploaded = facts.manualValues.get(definition.code);
    const liveValue = computeLiveValue(definition.code, facts);
    const systemValue = facts.systemValues?.get(definition.code);
    const actualValue = uploaded?.actualValue ?? liveValue ?? systemValue?.actualValue;
    const targetValue = uploaded?.targetValue ?? definition.target;
    const status = computeStatus(actualValue, targetValue, definition.direction);

    return {
      ...definition,
      actualValue,
      targetValue,
      status,
      scorePercent: scorePercent(actualValue, targetValue, definition.direction),
      sourceNote: uploaded
        ? `Manual upload received${uploaded.uploadedAt ? ` on ${uploaded.uploadedAt.slice(0, 10)}` : ""}.`
        : systemValue?.note ?? definition.source.detail,
    };
  });
}

export function buildKpiSourceSummary(kpis: EvaluatedKpi[] | KpiDefinition[]) {
  return kpis.reduce(
    (summary, kpi) => {
      summary.total += 1;
      summary[kpi.source.mode] += 1;
      if (kpi.source.mode !== "app") summary.missingSource += 1;
      return summary;
    },
    { total: 0, app: 0, odoo: 0, manual: 0, mixed: 0, not_implemented: 0, missingSource: 0 },
  );
}
