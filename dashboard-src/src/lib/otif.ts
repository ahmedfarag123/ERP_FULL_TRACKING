import { supabase } from "./supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type OtifState = "otif" | "full_late" | "ontime_short" | "short_late" | "unverifiable";

export const OTIF_STATE_LABELS: Record<OtifState, string> = {
  otif: "OTIF (في الموعد وبالكامل)",
  full_late: "كامل ومتأخر",
  ontime_short: "في الموعد وناقص",
  short_late: "ناقص ومتأخر",
  unverifiable: "غير قابل للتحقق",
};

export const OTIF_STATE_COLORS: Record<OtifState, string> = {
  otif: "#10b981",
  full_late: "#f59e0b",
  ontime_short: "#3b82f6",
  short_late: "#ef4444",
  unverifiable: "#9ca3af",
};

export interface OtifKpis {
  delivered: number;
  verifiable: number;
  otif: number;
  in_full: number;
  on_time: number;
  otif_rate: number | null;
  in_full_rate: number | null;
  on_time_rate: number | null;
  prev_otif_rate: number | null;
  prev_in_full_rate: number | null;
  prev_on_time_rate: number | null;
  prev_verifiable: number;
  prev_delivered: number;
  avg_delay_h: number | null;
  avg_late_h: number | null;
  req_qty: number;
  done_qty: number;
}

export interface OtifQuality {
  unverifiable: number;
  unverifiable_pct: number;
  no_driver: number;
  no_driver_pct: number;
  no_governorate: number;
  no_governorate_pct: number;
  test_driver: number;
  no_ref: number;
  no_salesperson: number;
  no_salesperson_pct: number;
  co_driver_shipments: number;
}

/** One selectable value in a filter dropdown, with its all-time shipment count. */
export interface OtifFilterOption {
  value: string;
  shipments: number;
}

/**
 * The filter universe is computed over ALL delivered shipments, ignoring the
 * selected window and every other filter, so a dropdown can never collapse to
 * empty just because another filter is active. Counts are all-time, not
 * in-window, which is why selecting a value can still return zero rows.
 */
export interface OtifFilterOptions {
  drivers: OtifFilterOption[];
  salespersons: OtifFilterOption[];
  governorates: OtifFilterOption[];
  warehouses: OtifFilterOption[];
}

export interface OtifBreakdownRow {
  driver?: string;
  governorate?: string;
  warehouse?: string;
  customer?: string;
  salesperson?: string;
  shipments: number;
  otif: number;
  in_full?: number;
  on_time?: number;
  verifiable: number;
  otif_rate: number | null;
  avg_delay_h?: number | null;
  is_test?: boolean;
}

export interface OtifTrendPoint {
  day: string;
  shipments: number;
  otif: number;
  in_full: number;
  on_time: number;
  verifiable: number;
  otif_rate: number | null;
}

export interface OtifRow {
  id: string;
  shipment_reference: string | null;
  odoo_order_name: string | null;
  customer_name: string | null;
  warehouse_name: string | null;
  driver: string;
  /** Every driver on the shipment, primary first. Co-drivers are NOT counted twice. */
  driver_names: string[];
  co_drivers: number;
  salesperson: string | null;
  governorate: string | null;
  state: OtifState;
  on_time: boolean;
  in_full: boolean;
  verifiable: boolean;
  scheduled_at: string;
  completed_at: string;
  delay_h: number;
  active_lines: number;
  short_lines: number;
  req_qty: number;
  done_qty: number;
}

export interface OtifAnalyticsResult {
  scope: { from: string; to: string; days: number };
  kpis: OtifKpis;
  quality: OtifQuality;
  filter_options: OtifFilterOptions;
  by_state: { state: OtifState; count: number }[];
  by_driver: OtifBreakdownRow[];
  by_governorate: OtifBreakdownRow[];
  by_warehouse: OtifBreakdownRow[];
  by_customer: OtifBreakdownRow[];
  by_salesperson: OtifBreakdownRow[];
  trend: OtifTrendPoint[];
  rows_total: number;
  rows: OtifRow[];
}

export interface OtifFilters {
  from: string;
  to: string;
  warehouse?: string | null;
  governorate?: string | null;
  driver?: string | null;
  state?: string | null;
  salesperson?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const nullableNum = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

const parseOptions = (root: Record<string, unknown>, key: string): OtifFilterOption[] => {
  const bucket = (root?.[key] ?? {}) as Record<string, unknown>;
  const list = Array.isArray(bucket) ? bucket : [];
  return list
    .map((o) => ({ value: str((o as Record<string, unknown>)?.value), shipments: num((o as Record<string, unknown>)?.shipments) }))
    .filter((o) => o.value !== "");
};

// ─── Fetch ───────────────────────────────────────────────────────────────────

export async function fetchOtifAnalytics(filters: OtifFilters): Promise<OtifAnalyticsResult> {
  const { data, error } = await supabase.rpc("otif_analytics", {
    p_from: filters.from,
    p_to: filters.to,
    p_warehouse: filters.warehouse ?? null,
    p_governorate: filters.governorate ?? null,
    p_driver: filters.driver ?? null,
    p_state: filters.state ?? null,
    p_salesperson: filters.salesperson ?? null,
    p_search: filters.search ?? null,
    p_limit: filters.limit ?? 100,
    p_offset: filters.offset ?? 0,
  });
  if (error) throw error;

  const r = (data ?? {}) as Record<string, unknown>;
  const k = (r.kpis ?? {}) as Record<string, unknown>;
  const q = (r.quality ?? {}) as Record<string, unknown>;
  const fo = (r.filter_options ?? {}) as Record<string, unknown>;

  return {
    scope: (r.scope ?? { from: filters.from, to: filters.to, days: 0 }) as OtifAnalyticsResult["scope"],
    kpis: {
      delivered: num(k.delivered),
      verifiable: num(k.verifiable),
      otif: num(k.otif),
      in_full: num(k.in_full),
      on_time: num(k.on_time),
      otif_rate: nullableNum(k.otif_rate),
      in_full_rate: nullableNum(k.in_full_rate),
      on_time_rate: nullableNum(k.on_time_rate),
      prev_otif_rate: nullableNum(k.prev_otif_rate),
      prev_in_full_rate: nullableNum(k.prev_in_full_rate),
      prev_on_time_rate: nullableNum(k.prev_on_time_rate),
      prev_verifiable: num(k.prev_verifiable),
      prev_delivered: num(k.prev_delivered),
      avg_delay_h: nullableNum(k.avg_delay_h),
      avg_late_h: nullableNum(k.avg_late_h),
      req_qty: num(k.req_qty),
      done_qty: num(k.done_qty),
    },
    quality: {
      unverifiable: num(q.unverifiable),
      unverifiable_pct: num(q.unverifiable_pct),
      no_driver: num(q.no_driver),
      no_driver_pct: num(q.no_driver_pct),
      no_governorate: num(q.no_governorate),
      no_governorate_pct: num(q.no_governorate_pct),
      test_driver: num(q.test_driver),
      no_ref: num(q.no_ref),
      no_salesperson: num(q.no_salesperson),
      no_salesperson_pct: num(q.no_salesperson_pct),
      co_driver_shipments: num(q.co_driver_shipments),
    },
    filter_options: {
      drivers: parseOptions(fo, "drivers"),
      salespersons: parseOptions(fo, "salespersons"),
      governorates: parseOptions(fo, "governorates"),
      warehouses: parseOptions(fo, "warehouses"),
    },
    by_state: (r.by_state ?? []) as OtifAnalyticsResult["by_state"],
    by_driver: (r.by_driver ?? []) as OtifAnalyticsResult["by_driver"],
    by_governorate: (r.by_governorate ?? []) as OtifAnalyticsResult["by_governorate"],
    by_warehouse: (r.by_warehouse ?? []) as OtifAnalyticsResult["by_warehouse"],
    by_customer: (r.by_customer ?? []) as OtifAnalyticsResult["by_customer"],
    by_salesperson: (r.by_salesperson ?? []) as OtifAnalyticsResult["by_salesperson"],
    trend: (r.trend ?? []) as OtifAnalyticsResult["trend"],
    rows_total: num(r.rows_total),
    rows: ((r.rows ?? []) as OtifAnalyticsResult["rows"]).map((row) => ({
      ...row,
      customer_name: str(row.customer_name, "—"),
      warehouse_name: str(row.warehouse_name, "—"),
      driver: str(row.driver, "(غير معروف)"),
      driver_names: Array.isArray(row.driver_names) ? (row.driver_names as string[]) : [],
      salesperson: typeof row.salesperson === "string" ? row.salesperson : null,
    })),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * The RPC window is half-open: [from, to). The shared date-range helper returns
 * the end as 23:59:59.999 of the chosen day, so the caller must roll it to the
 * next midnight or the final day gets truncated.
 */
export function toExclusiveEnd(endIso: string): string {
  const d = new Date(endIso);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Line-level quantities only became fully synced in Aug 2026, so a window that
 * reaches into Jun/Jul has a large unverifiable slice. The page surfaces this
 * instead of quietly publishing a rate computed on a fraction of the data.
 */
export const FIRST_FULL_LINE_SYNC = "2026-08-01";

export function coverageWarning(result: OtifAnalyticsResult): string | null {
  const { delivered, verifiable } = result.kpis;
  if (delivered === 0) return null;
  const pct = (verifiable / delivered) * 100;
  if (pct >= 99) return null;
  return `${pct.toFixed(1)}% فقط من الشحنات المسلّمة في هذه الفترة تحتوي أصنافاً قابلة للتحقق — نسبة الـOTIF محسوبة على ${verifiable.toLocaleString("en-US")} شحنة من ${delivered.toLocaleString("en-US")}.`;
}
