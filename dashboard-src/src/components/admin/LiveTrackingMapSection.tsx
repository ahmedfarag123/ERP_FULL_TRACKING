import { useQuery } from "@tanstack/react-query";
import { AdminSection } from "./AdminPageElements";
import { supabase } from "../../lib/supabase";
import AdminLiveTrackingMap, {
  type MapDriverLocation,
  type MapPlanRoute,
  type MapShipmentStop,
} from "./AdminLiveTrackingMap";

type Props = {
  className?: string;
  refetchInterval?: number;
};

const DEFAULT_RANGE_DAYS = 30;
const DEFAULT_REFETCH_INTERVAL = 10000;

function lastNDayRange(days: number): { startISO: string; endISO: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

async function fetchLiveMapData(startISO: string, endISO: string) {
  const startDay = startISO.slice(0, 10);
  const endDay = endISO.slice(0, 10);

  const { data: plans, error: plansErr } = await supabase
    .from("logistics_delivery_plans")
    .select("id, plan_reference, assigned_profile_id, planned_date, plan_status")
    .in("plan_status", ["pending", "in_progress"])
    .gte("planned_date", startDay)
    .lte("planned_date", endDay);
  if (plansErr) throw plansErr;

  const planDriverIds = [
    ...new Set((plans ?? []).map((p) => p.assigned_profile_id).filter(Boolean)),
  ] as string[];

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

  const planIds = (plans ?? []).map((p) => p.id);
  const shipmentsByPlan = new Map<string, MapShipmentStop[]>();
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

      if (!warehouseByPlan.has(s.plan_id) && s.warehouse_name) {
        warehouseByPlan.set(s.plan_id, s.warehouse_name);
      }
    }
  }

  const driverSet = new Set<string>();
  for (const id of planDriverIds) driverSet.add(id);
  for (const id of liveDriverMap.keys()) driverSet.add(id);

  const drivers: MapDriverLocation[] = [];
  for (const id of driverSet) {
    const live = liveDriverMap.get(id);
    if (live && live.latitude !== 0) drivers.push(live);
  }

  const planRoutes: MapPlanRoute[] = [];
  for (const plan of plans ?? []) {
    const stops = shipmentsByPlan.get(plan.id) ?? [];
    if (stops.length === 0) continue;
    const driver = liveDriverMap.get(plan.assigned_profile_id ?? "");

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
}

export default function LiveTrackingMapSection({
  className = "",
  refetchInterval = DEFAULT_REFETCH_INTERVAL,
}: Props) {
  const { startISO, endISO } = lastNDayRange(DEFAULT_RANGE_DAYS);
  const { data, isLoading } = useQuery({
    queryKey: ["logistics", "live-map", startISO, endISO],
    queryFn: () => fetchLiveMapData(startISO, endISO),
    refetchInterval,
  });

  return (
    <AdminSection
      className={className}
      title="خريطة التتبع الحي"
      description={`مواقع السائقين والخطط النشطة، تتحدث كل ${Math.round(refetchInterval / 1000)} ثوانٍ`}
    >
      {isLoading ? (
        <div className="h-[540px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/60" />
      ) : (
        <AdminLiveTrackingMap drivers={data?.drivers ?? []} plans={data?.planRoutes ?? []} />
      )}
    </AdminSection>
  );
}
