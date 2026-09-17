import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminSection } from "./AdminPageElements";
import { supabase } from "../../lib/supabase";
import TripAnalyticsPanel from "./TripAnalyticsPanel";
import AdminLiveTrackingMap, {
  type MapDriverLocation,
  type MapPlanRoute,
  type MapPrimaryWarehouse,
  type MapShipmentStop,
  type MapDriverTrack,
} from "./AdminLiveTrackingMap";

type Props = {
  className?: string;
  refetchInterval?: number;
};

const DEFAULT_REFETCH_INTERVAL = 10000;

const HORECA_MARG_WAREHOUSE: MapPrimaryWarehouse = {
  latitude: 30.157468,
  longitude: 31.359598,
  name: "Horeca Marg",
};

const MIN_MOVE_METERS_FOR_BEARING = 6;
const MAX_BEARING_AGE_MS = 10 * 60 * 1000;

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function bearingDegrees(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

async function fetchLiveMapData() {
  const today = new Date().toISOString().slice(0, 10);

  const { data: plans, error: plansErr } = await supabase
    .from("logistics_delivery_plans")
    .select("id, plan_reference, assigned_profile_id, planned_date, plan_status")
    .in("plan_status", ["pending", "in_progress", "completed"])
    .eq("planned_date", today);
  if (plansErr) throw plansErr;

  const planDriverIds = [
    ...new Set((plans ?? []).map((p) => p.assigned_profile_id).filter(Boolean)),
  ] as string[];

  const planDriverName = new Map<string, string>();
  for (const p of plans ?? []) {
    if (p.assigned_profile_id) planDriverName.set(String(p.assigned_profile_id), "");
  }

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
    if (row.full_name) planDriverName.set(row.id, String(row.full_name));
  }

  const headingDriverIds = [...planDriverIds, ...liveDriverMap.keys()];
  if (headingDriverIds.length > 0) {
    const { data: recentPings } = await supabase
      .from("location_tracking")
      .select("user_id, lat, lng, heading_degrees, accuracy_meters, captured_at")
      .in("user_id", headingDriverIds)
      .order("captured_at", { ascending: false })
      .limit(headingDriverIds.length * 6);

    const pingsByUser = new Map<string, Array<{
      lat: number;
      lng: number;
      heading: number | null;
      accuracy: number | null;
      captured_at: string;
    }>>();
    for (const p of recentPings ?? []) {
      const list = pingsByUser.get(p.user_id) ?? [];
      if (list.length >= 2) continue;
      list.push({
        lat: Number(p.lat),
        lng: Number(p.lng),
        heading:
          p.heading_degrees !== null && p.heading_degrees !== undefined && Number.isFinite(Number(p.heading_degrees))
            ? Number(p.heading_degrees)
            : null,
        accuracy:
          p.accuracy_meters !== null && p.accuracy_meters !== undefined && Number.isFinite(Number(p.accuracy_meters))
            ? Number(p.accuracy_meters)
            : null,
        captured_at: p.captured_at ?? "",
      });
      pingsByUser.set(p.user_id, list);
    }

    for (const [userId, pings] of pingsByUser) {
      const existing = liveDriverMap.get(userId);
      if (!existing || pings.length === 0) continue;
      const newest = pings[0];
      let heading: number | null = newest.heading;
      if (heading === null && pings.length === 2) {
        const from = pings[1];
        const newestTs = newest.captured_at ? new Date(newest.captured_at).getTime() : 0;
        const isFresh = Boolean(newestTs) && Date.now() - newestTs < MAX_BEARING_AGE_MS;
        if (isFresh && Number.isFinite(newest.lat) && Number.isFinite(newest.lng) && Number.isFinite(from.lat) && Number.isFinite(from.lng)) {
          const moved = haversineMeters(from, newest);
          if (moved >= MIN_MOVE_METERS_FOR_BEARING) {
            heading = bearingDegrees(from, newest);
          }
        }
      }
      liveDriverMap.set(userId, {
        ...existing,
        headingDegrees: heading,
        accuracyMeters: newest.accuracy,
        updatedAt: newest.captured_at || existing.updatedAt,
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
      if (p.full_name) planDriverName.set(p.id, String(p.full_name));
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
  const warehouseCoordByPlan = new Map<string, { latitude: number; longitude: number }>();
  if (planIds.length > 0) {
    const { data: shipments, error: shipErr } = await supabase
      .from("logistics_shipments")
      .select("id, plan_id, customer_name, shipment_status, customer_latitude, customer_longitude, route_sequence, warehouse_name, warehouse_latitude, warehouse_longitude")
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
        routeSequence:
          s.route_sequence !== null && s.route_sequence !== undefined && Number.isFinite(Number(s.route_sequence))
            ? Number(s.route_sequence)
            : null,
      });
      shipmentsByPlan.set(s.plan_id, existing);

      if (!warehouseByPlan.has(s.plan_id) && s.warehouse_name) {
        warehouseByPlan.set(s.plan_id, s.warehouse_name);
      }
      if (!warehouseCoordByPlan.has(s.plan_id)) {
        const wLat = Number(s.warehouse_latitude);
        const wLng = Number(s.warehouse_longitude);
        if (!Number.isNaN(wLat) && !Number.isNaN(wLng) && wLat !== 0 && wLng !== 0) {
          warehouseCoordByPlan.set(s.plan_id, { latitude: wLat, longitude: wLng });
        }
      }
    }
  }

  const driverSet = new Set<string>();
  for (const id of planDriverIds) driverSet.add(id);
  for (const id of liveDriverMap.keys()) driverSet.add(id);

  const completedDriverIds = new Set(
    (plans ?? [])
      .filter((p) => p.plan_status === "completed" && p.assigned_profile_id)
      .map((p) => String(p.assigned_profile_id)),
  );

  const drivers: MapDriverLocation[] = [];
  for (const id of driverSet) {
    const live = liveDriverMap.get(id);
    if (live && live.latitude !== 0) drivers.push(live);
    else if (completedDriverIds.has(id)) {
      drivers.push({
        driverId: id,
        driverName: planDriverName.get(id) ?? "سائق",
        latitude: 0,
        longitude: 0,
        updatedAt: "",
        completedToday: true,
      });
    }
  }

  const trackDriverIds = [...new Set([...planDriverIds, ...liveDriverMap.keys()])];
  const tracks: MapDriverTrack[] = [];
  if (trackDriverIds.length > 0) {
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: trailRows } = await supabase
      .from("location_tracking")
      .select("user_id, lat, lng, captured_at")
      .in("user_id", trackDriverIds)
      .gte("captured_at", since)
      .order("captured_at", { ascending: true })
      .limit(2000);
    const byUser = new Map<string, MapDriverTrack>();
    for (const t of trailRows ?? []) {
      const lat = Number(t.lat);
      const lng = Number(t.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
      let entry = byUser.get(t.user_id);
      if (!entry) {
        entry = { driverId: t.user_id, points: [] };
        byUser.set(t.user_id, entry);
      }
      entry.points.push({ lat, lng });
    }
    for (const entry of byUser.values()) {
      if (entry.points.length > 240) entry.points = entry.points.slice(-240);
      tracks.push(entry);
    }
  }

  const planRoutes: MapPlanRoute[] = [];
  for (const plan of plans ?? []) {
    const stops = shipmentsByPlan.get(plan.id) ?? [];
    if (stops.length === 0) continue;
    const driver = liveDriverMap.get(plan.assigned_profile_id ?? "");
    const warehouseCoord = warehouseCoordByPlan.get(plan.id) ?? HORECA_MARG_WAREHOUSE;

    planRoutes.push({
      planId: plan.id,
      planReference: plan.plan_reference ?? plan.id,
      driverId: plan.assigned_profile_id ?? "",
      driverName: driver?.driverName ?? "سائق",
      planStatus: plan.plan_status,
      warehouseName: warehouseByPlan.get(plan.id) ?? HORECA_MARG_WAREHOUSE.name,
      warehouseLatitude: warehouseCoord.latitude,
      warehouseLongitude: warehouseCoord.longitude,
      driverLatitude: driver && driver.latitude !== 0 ? driver.latitude : undefined,
      driverLongitude: driver && driver.longitude !== 0 ? driver.longitude : undefined,
      stops,
    });
  }

  return { drivers, planRoutes, tracks, primaryWarehouse: HORECA_MARG_WAREHOUSE };
}

export default function LiveTrackingMapSection({
  className = "",
  refetchInterval = DEFAULT_REFETCH_INTERVAL,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["logistics", "live-map", "today"],
    queryFn: () => fetchLiveMapData(),
    refetchInterval,
  });
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const selectedDriver = (data?.drivers ?? []).find((d) => d.driverId === selectedDriverId);

  return (
    <div className="space-y-6">
      <AdminSection
        className={className}
        title="خريطة التتبع الحي"
        description={`مواقع السائقين والخطط النشطة، تتحدث كل ${Math.round(refetchInterval / 1000)} ثوانٍ`}
      >
        {isLoading ? (
          <div className="h-[88vh] md:h-[540px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/60" />
        ) : (
          <AdminLiveTrackingMap
            drivers={data?.drivers ?? []}
            plans={data?.planRoutes ?? []}
            primaryWarehouse={data?.primaryWarehouse}
            tracks={data?.tracks ?? []}
            onDriverSelect={setSelectedDriverId}
          />
        )}
      </AdminSection>

      <TripAnalyticsPanel driverId={selectedDriverId} driverName={selectedDriver?.driverName} />
    </div>
  );
}
