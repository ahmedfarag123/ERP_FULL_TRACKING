import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../../../components/common/PageMeta";
import { AdminPageFrame } from "../../../components/admin/AdminPageElements";
import StatusBadge, { type StatusBadgeTone } from "../../../components/ui/StatusBadge";
import { SectionCard, MetricCard } from "../admin-shared";
import { supabase } from "../../../lib/supabase";
import DateRangePicker from "../../../components/form/date-range-picker";
import type { DateRangeValue } from "../../../lib/date-range";
import AdminLiveTrackingMap, {
  type MapDriverLocation,
  type MapPlanRoute,
  type MapShipmentStop,
} from "../../../components/admin/AdminLiveTrackingMap";

function formatEGP(value: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function rangeToISO(range: DateRangeValue): { startISO: string; endISO: string } {
  const now = new Date();
  const start = range[0] ?? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
  const end = range[1] ?? now;
  return {
    startISO: new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0).toISOString(),
    endISO: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).toISOString(),
  };
}

type DateRangeProps = {
  range: DateRangeValue;
};

function planStatusLabel(status: string): { label: string; tone: StatusBadgeTone } {
  switch (status) {
    case "pending":
      return { label: "مسودة", tone: "yellow" };
    case "in_progress":
      return { label: "قيد التنفيذ", tone: "blue" };
    case "completed":
      return { label: "مكتملة", tone: "green" };
    case "cancelled":
      return { label: "ملغاة", tone: "gray" };
    default:
      return { label: "غير محددة", tone: "gray" };
  }
}

function shipmentStatusLabel(status: string): { label: string; tone: StatusBadgeTone } {
  switch (status) {
    case "PENDING_ASSIGN":
      return { label: "جاهزة للتخطيط", tone: "yellow" };
    case "ASSIGNED":
      return { label: "تم الإسناد", tone: "blue" };
    case "CHECK_IN":
    case "PICKUP":
      return { label: "استلام", tone: "indigo" };
    case "OUT_FOR_DELIVERY":
    case "ARRIVED":
      return { label: "في الطريق", tone: "orange" };
    case "DELIVERED":
    case "FINISHED":
    case "SETTLED":
      return { label: "تم التسليم", tone: "green" };
    case "CANCELLED":
      return { label: "ملغي", tone: "red" };
    default:
      return { label: "غير محدد", tone: "gray" };
  }
}

function settlementStatusLabel(status: string): { label: string; tone: StatusBadgeTone } {
  switch (status) {
    case "pending":
      return { label: "قيد المراجعة", tone: "yellow" };
    case "approved":
      return { label: "معتمدة", tone: "green" };
    case "paid":
      return { label: "مدفوعة", tone: "blue" };
    case "rejected":
      return { label: "مرفوضة", tone: "red" };
    default:
      return { label: status, tone: "gray" };
  }
}

const STATUS_BAR_COLORS: Record<string, string> = {
  PENDING_ASSIGN: "bg-yellow-400",
  ASSIGNED: "bg-blue-400",
  CHECK_IN: "bg-indigo-400",
  PICKUP: "bg-indigo-400",
  OUT_FOR_DELIVERY: "bg-orange-400",
  ARRIVED: "bg-orange-400",
  DELIVERED: "bg-green-400",
  FINISHED: "bg-green-400",
  SETTLED: "bg-green-400",
  CANCELLED: "bg-red-400",
};

// ─── KPI Queries ─────────────────────────────────────────────────────────────

function useActivePlans() {
  return useQuery({
    queryKey: ["logistics", "dashboard", "active-plans"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("logistics_delivery_plans")
        .select("id", { count: "exact", head: true })
        .in("plan_status", ["pending", "in_progress"]);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function useTotalShipmentsToday({ range }: DateRangeProps) {
  const { startISO, endISO } = rangeToISO(range);
  return useQuery({
    queryKey: ["logistics", "dashboard", "total-shipments", startISO, endISO],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("logistics_shipments")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", startISO)
        .lte("scheduled_at", endISO);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function useDeliveredToday({ range }: DateRangeProps) {
  const { startISO, endISO } = rangeToISO(range);
  return useQuery({
    queryKey: ["logistics", "dashboard", "delivered", startISO, endISO],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("logistics_shipments")
        .select("id", { count: "exact", head: true })
        .in("shipment_status", ["DELIVERED", "FINISHED", "SETTLED"])
        .gte("scheduled_at", startISO)
        .lte("scheduled_at", endISO);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function useFailedToday({ range }: DateRangeProps) {
  const { startISO, endISO } = rangeToISO(range);
  return useQuery({
    queryKey: ["logistics", "dashboard", "failed", startISO, endISO],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("logistics_shipments")
        .select("id", { count: "exact", head: true })
        .eq("shipment_status", "CANCELLED")
        .gte("scheduled_at", startISO)
        .lte("scheduled_at", endISO);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
function useActiveDrivers({ range }: DateRangeProps) {
  const { startISO, endISO } = rangeToISO(range);
  return useQuery({
    queryKey: ["logistics", "dashboard", "active-drivers", startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logistics_shipments")
        .select("assigned_profile_id")
        .not("assigned_profile_id", "is", null)
        .not("shipment_status", "in", "(DELIVERED,FINISHED,SETTLED,CANCELLED)")
        .gte("scheduled_at", startISO)
        .lte("scheduled_at", endISO);

      if (error) throw error;
      const unique = new Set(data.map((r) => r.assigned_profile_id));
      return unique.size;
    },
  });
}

// ─── Section Queries ─────────────────────────────────────────────────────────

interface DriverPlanRow {
  id: string;
  plan_reference: string;
  assigned_profile_id: string | null;
  planned_date: string | null;
  plan_status: string;
  district: string | null;
  route_total_distance_km: number | null;
  driver_name: string;
  total_shipments: number;
  delivered_count: number;
  in_progress_count: number;
  pending_count: number;
  last_seen_at: string | null;
  last_seen_label: string;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return "الآن";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
}

function useLiveDriverStatus({ range }: DateRangeProps) {
  const { startISO, endISO } = rangeToISO(range);
  return useQuery({
    queryKey: ["logistics", "dashboard", "live-driver-status", startISO, endISO],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: plans, error: plansErr } = await supabase
        .from("logistics_delivery_plans")
        .select("id, plan_reference, assigned_profile_id, planned_date, plan_status, district, route_total_distance_km")
        .in("plan_status", ["pending", "in_progress"])
        .gte("planned_date", startISO.slice(0, 10))
        .lte("planned_date", endISO.slice(0, 10))
        .order("planned_date", { ascending: false });
      if (plansErr) throw plansErr;
      if (!plans || plans.length === 0) return [] as DriverPlanRow[];

      const driverIds = [...new Set(plans.map((p) => p.assigned_profile_id).filter(Boolean))] as string[];
      let driverMap: Record<string, string> = {};
      if (driverIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", driverIds);
        if (profiles) {
          for (const p of profiles) driverMap[p.id] = p.full_name ?? "بدون اسم";
        }
      }

      // Fetch last seen for each driver
      const lastSeenMap: Record<string, string | null> = {};
      if (driverIds.length > 0) {
        const { data: lastLocations } = await supabase
          .from("location_tracking")
          .select("user_id, captured_at")
          .in("user_id", driverIds)
          .order("captured_at", { ascending: false })
          .limit(driverIds.length * 5);
        if (lastLocations) {
          for (const loc of lastLocations) {
            if (!lastSeenMap[loc.user_id]) {
              lastSeenMap[loc.user_id] = loc.captured_at;
            }
          }
        }
      }

      const planIds = plans.map((p) => p.id);
      const { data: shipments } = await supabase
        .from("logistics_shipments")
        .select("plan_id, shipment_status")
        .in("plan_id", planIds);

      return plans.map((plan) => {
        const planShipments = shipments?.filter((s) => s.plan_id === plan.id) ?? [];
        const lastSeen = plan.assigned_profile_id ? lastSeenMap[plan.assigned_profile_id] ?? null : null;
        return {
          id: plan.id,
          plan_reference: plan.plan_reference,
          assigned_profile_id: plan.assigned_profile_id,
          planned_date: plan.planned_date,
          plan_status: plan.plan_status,
          district: plan.district,
          route_total_distance_km: plan.route_total_distance_km,
          driver_name: plan.assigned_profile_id ? driverMap[plan.assigned_profile_id] ?? "غير معروف" : "بدون سائق",
          total_shipments: planShipments.length,
          delivered_count: planShipments.filter((s) => ["DELIVERED", "FINISHED", "SETTLED"].includes(s.shipment_status)).length,
          in_progress_count: planShipments.filter((s) => ["OUT_FOR_DELIVERY", "ARRIVED", "CHECK_IN", "PICKUP"].includes(s.shipment_status)).length,
          pending_count: planShipments.filter((s) => ["PENDING_ASSIGN", "ASSIGNED"].includes(s.shipment_status)).length,
          last_seen_at: lastSeen,
          last_seen_label: timeAgo(lastSeen),
        } satisfies DriverPlanRow;
      });
    },
  });
}

function useShipmentsByStatus({ range }: DateRangeProps) {
  const { startISO, endISO } = rangeToISO(range);
  return useQuery({
    queryKey: ["logistics", "dashboard", "shipments-by-status", startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logistics_shipments")
        .select("shipment_status")
        .gte("scheduled_at", startISO)
        .lte("scheduled_at", endISO);
      if (error) throw error;

      const grouped: Record<string, number> = {};
      for (const row of data ?? []) {
        grouped[row.shipment_status] = (grouped[row.shipment_status] ?? 0) + 1;
      }
      return grouped;
    },
  });
}

function usePlansOverview() {
  return useQuery({
    queryKey: ["logistics", "dashboard", "plans-overview"],
    queryFn: async () => {
      const { data: plans, error } = await supabase
        .from("logistics_delivery_plans")
        .select("id, plan_reference, assigned_profile_id, planned_date, plan_status, district, route_total_distance_km")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      if (!plans || plans.length === 0) return [];

      const driverIds = [...new Set(plans.map((p) => p.assigned_profile_id).filter(Boolean))] as string[];
      let driverMap: Record<string, string> = {};
      if (driverIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", driverIds);
        if (profiles) {
          for (const p of profiles) driverMap[p.id] = p.full_name ?? "بدون اسم";
        }
      }

      const planIds = plans.map((p) => p.id);
      const { data: shipments } = await supabase
        .from("logistics_shipments")
        .select("plan_id")
        .in("plan_id", planIds);

      const shipmentCounts: Record<string, number> = {};
      for (const s of shipments ?? []) {
        shipmentCounts[s.plan_id] = (shipmentCounts[s.plan_id] ?? 0) + 1;
      }

      return plans.map((plan) => ({
        id: plan.id,
        plan_reference: plan.plan_reference,
        driver_name: plan.assigned_profile_id ? driverMap[plan.assigned_profile_id] ?? "غير معروف" : "بدون سائق",
        planned_date: plan.planned_date,
        plan_status: plan.plan_status,
        district: plan.district,
        route_total_distance_km: plan.route_total_distance_km,
        shipment_count: shipmentCounts[plan.id] ?? 0,
      }));
    },
  });
}

function useMapData({ range }: DateRangeProps) {
  const { startISO, endISO } = rangeToISO(range);
  return useQuery({
    queryKey: ["logistics", "dashboard", "map-data", startISO, endISO],
    queryFn: async () => {
      const startDay = startISO.slice(0, 10);
      const endDay = endISO.slice(0, 10);

      // 1. Active plans today
      const { data: plans, error: plansErr } = await supabase
        .from("logistics_delivery_plans")
        .select("id, plan_reference, assigned_profile_id, planned_date, plan_status")
        .in("plan_status", ["pending", "in_progress"])
        .gte("planned_date", startDay)
        .lte("planned_date", endDay);
      if (plansErr) throw plansErr;

      // 2. Driver profiles for plans
      const planDriverIds = [...new Set((plans ?? []).map((p) => p.assigned_profile_id).filter(Boolean))] as string[];

      // 3. Live driver locations
      const { data: liveRows } = await supabase
        .from("active_drivers_view")
        .select("id, full_name, latitude, longitude, updated_at");

      const liveDriverMap = new Map<string, MapDriverLocation>();
      for (const row of liveRows ?? []) {
        if (row.latitude && row.longitude) {
          liveDriverMap.set(row.id, {
            driverId: row.id,
            driverName: row.full_name ?? "سائق",
            latitude: row.latitude,
            longitude: row.longitude,
            updatedAt: row.updated_at ?? "",
          });
        }
      }

      // 3b. Merge latest heading (direction) for drivers from location_tracking
      const headingDriverIds = [...planDriverIds, ...liveDriverMap.keys()];
      if (headingDriverIds.length > 0) {
        const { data: headings } = await supabase
          .from("location_tracking")
          .select("user_id, heading_degrees")
          .in("user_id", headingDriverIds)
          .not("heading_degrees", "is", null)
          .order("captured_at", { ascending: false })
          .limit(headingDriverIds.length * 4);
        const seen = new Set<string>();
        for (const h of headings ?? []) {
          if (seen.has(h.user_id)) continue;
          seen.add(h.user_id);
          const existing = liveDriverMap.get(h.user_id);
          if (existing) {
            liveDriverMap.set(h.user_id, { ...existing, headingDegrees: h.heading_degrees });
          }
        }
      }

      // 4. Also fetch driver profiles for all plan drivers (even if not live yet)
      const fetchDriverIds = planDriverIds.filter((id) => !liveDriverMap.has(id));
      if (fetchDriverIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", fetchDriverIds);
        for (const p of profiles ?? []) {
          if (!liveDriverMap.has(p.id)) {
            liveDriverMap.set(p.id, {
              driverId: p.id,
              driverName: p.full_name ?? "سائق",
              latitude: 0,
              longitude: 0,
              updatedAt: "",
            });
          }
        }
      }

      // 5. Fetch shipments for each active plan
      const planIds = (plans ?? []).map((p) => p.id);
      let shipmentsByPlan = new Map<string, MapShipmentStop[]>();
      const warehouseByPlan = new Map<string, string>();
      if (planIds.length > 0) {
        const { data: shipments, error: shipErr } = await supabase
          .from("logistics_shipments")
          .select("id, plan_id, customer_name, shipment_status, customer_latitude, customer_longitude, warehouse_name")
          .in("plan_id", planIds)
          .not("customer_latitude", "is", null)
          .not("customer_longitude", "is", null);
        if (shipErr) throw shipErr;

        for (const s of shipments ?? []) {
          const lat = Number(s.customer_latitude);
          const lng = Number(s.customer_longitude);
          if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
          const existing = shipmentsByPlan.get(s.plan_id) ?? [];
          existing.push({
            id: s.id,
            customerName: s.customer_name,
            shipmentStatus: s.shipment_status,
            latitude: lat,
            longitude: lng,
          });
          shipmentsByPlan.set(s.plan_id, existing);

          // Track warehouse name per plan
          if (!warehouseByPlan.has(s.plan_id) && s.warehouse_name) {
            warehouseByPlan.set(s.plan_id, s.warehouse_name);
          }
        }
      }

      // 6. Build map drivers (merge live + plan drivers)
      const driverSet = new Set<string>();
      for (const id of planDriverIds) driverSet.add(id);
      for (const id of liveDriverMap.keys()) driverSet.add(id);

      const drivers: MapDriverLocation[] = [];
      for (const id of driverSet) {
        const live = liveDriverMap.get(id);
        if (live && live.latitude !== 0) {
          drivers.push(live);
        }
      }

      // 7. Build plan routes
      const planRoutes: MapPlanRoute[] = [];
      for (const plan of plans ?? []) {
        const stops = shipmentsByPlan.get(plan.id) ?? [];
        if (stops.length === 0) continue;
        const driver = liveDriverMap.get(plan.assigned_profile_id ?? "");

        // Compute centroid of all customer locations as warehouse proxy
        let centroidLat = 0;
        let centroidLng = 0;
        if (stops.length > 0) {
          centroidLat = stops.reduce((sum, s) => sum + s.latitude, 0) / stops.length;
          centroidLng = stops.reduce((sum, s) => sum + s.longitude, 0) / stops.length;
        }

        planRoutes.push({
          planId: plan.id,
          planReference: plan.plan_reference ?? plan.id,
          driverId: plan.assigned_profile_id ?? "",
          driverName: driver?.driverName ?? "سائق",
          warehouseName: warehouseByPlan.get(plan.id) ?? "",
          warehouseLatitude: centroidLat,
          warehouseLongitude: centroidLng,
          stops,
        });
      }

      return { drivers, planRoutes };
    },
    refetchInterval: 3000,
  });
}

function useSettlementSummary() {
  return useQuery({
    queryKey: ["logistics", "dashboard", "settlement-summary"],
    queryFn: async () => {
      const { data: all, error } = await supabase
        .from("driver_plan_settlement_requests")
        .select("id, driver_profile_id, plan_id, total_debt_amount, currency_code, status, created_at");
      if (error) throw error;

      const grouped: Record<string, { count: number; totalAmount: number }> = {};
      for (const row of all ?? []) {
        const key = row.status ?? "unknown";
        if (!grouped[key]) grouped[key] = { count: 0, totalAmount: 0 };
        grouped[key].count += 1;
        grouped[key].totalAmount += Number(row.total_debt_amount ?? 0);
      }

      const driverIds = [...new Set((all ?? []).map((r) => r.driver_profile_id).filter(Boolean))] as string[];
      let driverMap: Record<string, string> = {};
      if (driverIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", driverIds);
        if (profiles) {
          for (const p of profiles) driverMap[p.id] = p.full_name ?? "غير معروف";
        }
      }

      const recent = (all ?? [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map((r) => ({
          id: r.id,
          driver_name: r.driver_profile_id ? driverMap[r.driver_profile_id] ?? "غير معروف" : "--",
          amount: Number(r.total_debt_amount ?? 0),
          status: r.status,
          currency_code: r.currency_code ?? "EGP",
          created_at: r.created_at,
        }));

      return { grouped, recent };
    },
  });
}

function useTopDriver({ range }: DateRangeProps) {
  const { startISO, endISO } = rangeToISO(range);
  return useQuery({
    queryKey: ["logistics", "dashboard", "top-driver", startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logistics_shipments")
        .select("assigned_profile_id, shipment_status")
        .in("shipment_status", ["DELIVERED", "FINISHED", "SETTLED"])
        .not("assigned_profile_id", "is", null)
        .gte("scheduled_at", startISO)
        .lte("scheduled_at", endISO);
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.assigned_profile_id] = (counts[row.assigned_profile_id] ?? 0) + 1;
      }

      const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
      if (sorted.length === 0) return null;

      const topId = sorted[0][0];
      const topCount = sorted[0][1];

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", topId)
        .single();

      return {
        name: profile?.full_name ?? "غير معروف",
        deliveredCount: topCount,
      };
    },
  });
}

// ─── Components ──────────────────────────────────────────────────────────────

function SkeletonBlock({ className = "h-10" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-brand-25 dark:bg-white/[0.02] ${className}`} />
  );
}

function KpiCards({ range }: DateRangeProps) {
  const activePlans = useActivePlans();
  const totalShipments = useTotalShipmentsToday({ range });
  const delivered = useDeliveredToday({ range });
  const failed = useFailedToday({ range });
  const activeDrivers = useActiveDrivers({ range });

  const deliveryRate =
    (delivered.data ?? 0) + (failed.data ?? 0) > 0
      ? Math.round(((delivered.data ?? 0) / ((delivered.data ?? 0) + (failed.data ?? 0))) * 100)
      : 0;

  const isLoading =
    activePlans.isLoading ||
    totalShipments.isLoading ||
    delivered.isLoading ||
    failed.isLoading ||
    activeDrivers.isLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <MetricCard label="خطط نشطة" value={String(activePlans.data ?? 0)} tone="info" />
      <MetricCard label="شحنات اليوم" value={String(totalShipments.data ?? 0)} tone="neutral" />
      <MetricCard label="تم التسليم" value={String(delivered.data ?? 0)} tone="success" />
      <MetricCard label="فشل / إلغاء" value={String(failed.data ?? 0)} tone="danger" />
      <MetricCard label="نسبة التسليم" value={`${deliveryRate}%`} tone={deliveryRate >= 80 ? "success" : "warning"} />
      <MetricCard label="سائقون نشطون" value={String(activeDrivers.data ?? 0)} tone="info" />
    </div>
  );
}

function LiveDriverStatusTable({ range }: DateRangeProps) {
  const { data: rows = [], isLoading } = useLiveDriverStatus({ range });

  return (
    <SectionCard title="حالة السائقين الحية" description="خطط اليوم وعدد الشحنات لكل سائق">
      {isLoading ? (
        <SkeletonBlock className="h-48" />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          لا توجد خطط نشطة اليوم
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm" dir="rtl">
            <thead className="border-b border-gray-200 bg-brand-25/80 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-3">السائق</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3 text-center">الإجمالي</th>
                <th className="px-4 py-3 text-center">تم التسليم</th>
                <th className="px-4 py-3 text-center">قيد التنفيذ</th>
                <th className="px-4 py-3 text-center">قيد الانتظار</th>
                <th className="px-4 py-3">آخر تتبّع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((row) => {
                const status = planStatusLabel(row.plan_status);
                const isOnline = row.last_seen_at && (Date.now() - new Date(row.last_seen_at).getTime()) < 5 * 60_000;
                return (
                  <tr key={row.id} className="hover:bg-brand-25 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {row.driver_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={status.label} tone={status.tone} />
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{row.total_shipments}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-green-600 font-semibold">{row.delivered_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-blue-600 font-semibold">{row.in_progress_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-amber-600 font-semibold">{row.pending_count}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${isOnline ? "text-green-600 font-medium" : "text-gray-400 dark:text-gray-500"}`}>
                        {row.last_seen_label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function ShipmentsByStatusSection({ range }: DateRangeProps) {
  const { data: grouped = {}, isLoading } = useShipmentsByStatus({ range });

  const sorted = Object.entries(grouped).sort(([, a], [, b]) => b - a);
  const maxCount = Math.max(...sorted.map(([, c]) => c), 1);

  return (
    <SectionCard title="شحنات اليوم حسب الحالة" description="توزيع الشحنات على الحالات المختلفة">
      {isLoading ? (
        <SkeletonBlock className="h-48" />
      ) : sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          لا توجد شحنات اليوم
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map(([status, count]) => {
            const info = shipmentStatusLabel(status);
            const barColor = STATUS_BAR_COLORS[status] ?? "bg-gray-400";
            const widthPercent = Math.round((count / maxCount) * 100);
            return (
              <div key={status} className="flex items-center gap-3">
                <span className="w-32 text-xs font-medium text-gray-700 dark:text-gray-300">
                  {info.label}
                </span>
                <div className="flex-1">
                  <div className="h-5 w-full rounded-full bg-brand-25 dark:bg-white/[0.02]">
                    <div
                      className={`h-5 rounded-full ${barColor} transition-all`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
                <span className="min-w-[2rem] text-center text-sm font-semibold text-gray-900 dark:text-white">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function PlansOverviewSection() {
  const { data: plans = [], isLoading } = usePlansOverview();

  function formatDistance(value: number | null | undefined) {
    const km = Number(value ?? 0);
    if (!Number.isFinite(km) || km <= 0) return "--";
    return km > 1000 ? `${(km / 1000).toFixed(1)} كم` : `${km.toFixed(1)} كم`;
  }

  return (
    <SectionCard title="نظرة على الخطط" description="آخر 10 خطط لوجستية">
      {isLoading ? (
        <SkeletonBlock className="h-64" />
      ) : plans.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          لا توجد خطط بعد
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm" dir="rtl">
            <thead className="border-b border-gray-200 bg-brand-25/80 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-3">الخطة</th>
                <th className="px-4 py-3">السائق</th>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">المنطقة</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3 text-center">الشحنات</th>
                <th className="px-4 py-3">المسافة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {plans.map((plan) => {
                const status = planStatusLabel(plan.plan_status);
                return (
                  <tr key={plan.id} className="hover:bg-brand-25 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-white">
                      {plan.plan_reference}
                    </td>
                    <td className="px-4 py-3">{plan.driver_name}</td>
                    <td className="px-4 py-3">{formatDate(plan.planned_date)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {plan.district ?? "--"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={status.label} tone={status.tone} />
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{plan.shipment_count}</td>
                    <td className="px-4 py-3">{formatDistance(plan.route_total_distance_km)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function RouteMapPlaceholder({ range }: DateRangeProps) {
  const { data, isLoading } = useMapData({ range });

  return (
    <SectionCard
      title="خريطة التتبع الحي"
      description="خطط اليوم النشطة مع مواقع السائقين المباشرة"
    >
      {isLoading ? (
        <SkeletonBlock className="h-[500px]" />
      ) : (
        <AdminLiveTrackingMap drivers={data?.drivers ?? []} plans={data?.planRoutes ?? []} />
      )}
    </SectionCard>
  );
}

function SettlementSummarySection() {
  const { data, isLoading } = useSettlementSummary();
  const grouped = data?.grouped ?? {};
  const recent = data?.recent ?? [];

  const pendingData = grouped["pending"] ?? { count: 0, totalAmount: 0 };
  const approvedData = grouped["approved"] ?? { count: 0, totalAmount: 0 };
  const totalAmountAll = Object.values(grouped).reduce((sum, g) => sum + g.totalAmount, 0);

  return (
    <SectionCard title="ملخص التسويات" description="طلبات تسوية السائقين والمبالغ">
      {isLoading ? (
        <SkeletonBlock className="h-48" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">
                قيد المراجعة
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">
                {pendingData.count}
              </p>
              <p className="mt-1 text-sm text-amber-600/80 dark:text-amber-400/80">
                {formatEGP(pendingData.totalAmount)}
              </p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-500/20 dark:bg-green-500/10">
              <p className="text-xs font-semibold uppercase text-green-600 dark:text-green-400">
                معتمدة
              </p>
              <p className="mt-2 text-2xl font-bold text-green-700 dark:text-green-300">
                {approvedData.count}
              </p>
              <p className="mt-1 text-sm text-green-600/80 dark:text-green-400/80">
                {formatEGP(approvedData.totalAmount)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-brand-25 p-4 dark:border-gray-700 dark:bg-white/[0.02]/50">
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                الإجمالي
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {formatEGP(totalAmountAll)}
              </p>
            </div>
          </div>

          {recent.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm" dir="rtl">
                <thead className="border-b border-gray-200 bg-brand-25/80 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-3">السائق</th>
                    <th className="px-4 py-3 text-left">المبلغ</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recent.map((r) => {
                    const status = settlementStatusLabel(r.status);
                    return (
                      <tr key={r.id} className="hover:bg-brand-25 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {r.driver_name}
                        </td>
                        <td className="px-4 py-3 text-left font-semibold">
                          {formatEGP(r.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge label={status.label} tone={status.tone} />
                        </td>
                        <td className="px-4 py-3">{formatDateTime(r.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

function TodaysPerformanceSection({ range }: DateRangeProps) {
  const delivered = useDeliveredToday({ range });
  const failed = useFailedToday({ range });
  const topDriver = useTopDriver({ range });

  const total = (delivered.data ?? 0) + (failed.data ?? 0);
  const deliveredPercent = total > 0 ? Math.round(((delivered.data ?? 0) / total) * 100) : 0;
  const failedPercent = total > 0 ? 100 - deliveredPercent : 0;

  const isLoading = delivered.isLoading || failed.isLoading || topDriver.isLoading;

  return (
    <SectionCard title="أداء اليوم" description="ملخص تسليمات اليوم وأفضل سائق">
      {isLoading ? (
        <SkeletonBlock className="h-40" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center dark:border-green-500/20 dark:bg-green-500/10">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400">تم التسليم</p>
              <p className="mt-2 text-3xl font-bold text-green-700 dark:text-green-300">
                {delivered.data ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-500/20 dark:bg-red-500/10">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">فشل / إلغاء</p>
              <p className="mt-2 text-3xl font-bold text-red-700 dark:text-red-300">
                {failed.data ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-brand-25 p-4 text-center dark:border-gray-700 dark:bg-white/[0.02]/50">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">المعدل</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {deliveredPercent}%
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="min-w-[80px] text-xs text-gray-500 dark:text-gray-400">تسليم</span>
              <div className="flex-1 h-3 rounded-full bg-brand-25 dark:bg-white/[0.02]">
                <div
                  className="h-3 rounded-full bg-green-400 transition-all"
                  style={{ width: `${deliveredPercent}%` }}
                />
              </div>
              <span className="min-w-[3rem] text-xs font-semibold text-green-600 dark:text-green-400">
                {deliveredPercent}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="min-w-[80px] text-xs text-gray-500 dark:text-gray-400">فشل</span>
              <div className="flex-1 h-3 rounded-full bg-brand-25 dark:bg-white/[0.02]">
                <div
                  className="h-3 rounded-full bg-red-400 transition-all"
                  style={{ width: `${failedPercent}%` }}
                />
              </div>
              <span className="min-w-[3rem] text-xs font-semibold text-red-600 dark:text-red-400">
                {failedPercent}%
              </span>
            </div>
          </div>

          {topDriver.data && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                أفضل سائق اليوم
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                  {topDriver.data.name}
                </span>
                <span className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {topDriver.data.deliveredCount} تسليم
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function LogisticsDashboard() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);
    return [start, end];
  });

  return (
    <>
      <PageMeta
        title="لوحة اللوجستيات | لوحة التحكم"
        description="نظرة شاملة على العمليات اللوجستية والشحنات وال sürücüler"
      />
      <AdminPageFrame dir="rtl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full min-w-[240px] sm:w-80">
            <DateRangePicker
              id="logistics-date-range"
              label=""
              placeholder="اختر الفترة"
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
        </div>

        <KpiCards range={dateRange} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ShipmentsByStatusSection range={dateRange} />
          <TodaysPerformanceSection range={dateRange} />
        </div>

        <LiveDriverStatusTable range={dateRange} />

        <RouteMapPlaceholder range={dateRange} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <PlansOverviewSection />
          <SettlementSummarySection />
        </div>
      </AdminPageFrame>
    </>
  );
}
