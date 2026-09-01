import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L, { type LatLngBoundsExpression, type LatLngExpression, type DivIcon } from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const ORS_API_KEY = String(import.meta.env.VITE_ORS_API_KEY ?? "").trim();

const TILE_MODES = [
  {
    id: "map",
    label: "خريطة",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    id: "satellite",
    label: "قمر صناعي",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
  },
  {
    id: "terrain",
    label: "تضاريس",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
  },
] as const;

export type MapTileMode = (typeof TILE_MODES)[number]["id"];

export type MapDriverLocation = {
  driverId: string;
  driverName: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
  headingDegrees?: number | null;
};

export type MapShipmentStop = {
  id: string;
  customerName: string | null;
  shipmentStatus: string | null;
  latitude: number;
  longitude: number;
};

export type MapPlanRoute = {
  planId: string;
  planReference: string;
  driverId: string;
  driverName: string;
  warehouseName: string;
  warehouseLatitude: number;
  warehouseLongitude: number;
  stops: MapShipmentStop[];
};

export type MapPrimaryWarehouse = {
  latitude: number;
  longitude: number;
  name: string;
};

type Props = {
  drivers: MapDriverLocation[];
  plans: MapPlanRoute[];
  primaryWarehouse?: MapPrimaryWarehouse | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function nearestNeighborSort(
  stops: MapShipmentStop[],
  origin: { lat: number; lng: number }
): MapShipmentStop[] {
  if (stops.length <= 1) return stops;
  const remaining = [...stops];
  const sorted: MapShipmentStop[] = [];
  let current = origin;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, { lat: remaining[i].latitude, lng: remaining[i].longitude });
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    sorted.push(remaining[bestIdx]);
    current = { lat: remaining[bestIdx].latitude, lng: remaining[bestIdx].longitude };
    remaining.splice(bestIdx, 1);
  }
  return sorted;
}

function computeTotalDistanceKm(stops: MapShipmentStop[], origin: { lat: number; lng: number }): number {
  if (stops.length === 0) return 0;
  let total = haversineKm(origin, { lat: stops[0].latitude, lng: stops[0].longitude });
  for (let i = 1; i < stops.length; i++) {
    total += haversineKm(
      { lat: stops[i - 1].latitude, lng: stops[i - 1].longitude },
      { lat: stops[i].latitude, lng: stops[i].longitude }
    );
  }
  return total;
}

const MAX_ORS_DISTANCE_KM = 500;

const DRIVER_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

function driverColor(index: number): string {
  return DRIVER_COLORS[index % DRIVER_COLORS.length];
}

function driverIconHtml(color: string, heading?: number | null): string {
  const hasHeading = typeof heading === "number" && Number.isFinite(heading);
  const rot = hasHeading ? heading! : 0;
  const arrow = hasHeading
    ? `<div style="position:absolute;top:50%;left:50%;width:20px;height:20px;transform:translate(-50%,-50%) rotate(${rot}deg);display:flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" style="transform:rotate(90deg)"><path d="M12 2 19 20l-7-4-7 4z" fill="${color}"/><path d="M12 6v10" stroke="white" stroke-width="1.5"/></svg></div>`
    : "";
  const dot = hasHeading
    ? `<div style="position:absolute;top:50%;left:50%;width:12px;height:12px;transform:translate(-50%,-50%);border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`
    : `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`;
  return `<div style="position:relative;width:32px;height:32px;border-radius:50%;background:${color}22;border:2px solid ${color}55;box-shadow:0 2px 10px rgba(0,0,0,0.2);">${arrow}${dot}</div>`;
}

function shipmentStatusLabel(status: string | null): string {
  switch (status) {
    case "PENDING_ASSIGN": return "جاهزة للتخطيط";
    case "ASSIGNED": return "تم الإسناد";
    case "CHECK_IN":
    case "PICKUP": return "استلام";
    case "OUT_FOR_DELIVERY":
    case "ARRIVED": return "في الطريق";
    case "DELIVERED":
    case "FINISHED":
    case "SETTLED": return "تم التسليم";
    case "CANCELLED": return "ملغي";
    default: return status ?? "—";
  }
}

function shipmentColor(status: string | null): string {
  switch (status) {
    case "OUT_FOR_DELIVERY":
    case "ARRIVED": return "#f97316";
    case "CHECK_IN":
    case "PICKUP": return "#6366f1";
    case "ASSIGNED": return "#3b82f6";
    case "DELIVERED":
    case "FINISHED":
    case "SETTLED": return "#10b981";
    default: return "#64748b";
  }
}

function shipmentStatusIcon(status: string | null): string {
  switch (status) {
    case "DELIVERED":
    case "FINISHED":
    case "SETTLED": return "✓";
    case "OUT_FOR_DELIVERY":
    case "ARRIVED": return "→";
    case "CANCELLED": return "✕";
    default: return "";
  }
}

// ─── ORS Route Fetching ──────────────────────────────────────────────────────

async function fetchOrsRoute(
  points: { lat: number; lng: number }[]
): Promise<LatLngExpression[] | null> {
  if (!ORS_API_KEY || points.length < 2) return null;

  const unique = points.filter(
    (p, i, arr) => i === arr.findIndex((q) => q.lat === p.lat && q.lng === p.lng)
  );
  if (unique.length < 2) return null;

  let maxDist = 0;
  for (let i = 0; i < unique.length; i++)
    for (let j = i + 1; j < unique.length; j++)
      maxDist = Math.max(maxDist, haversineKm(unique[i], unique[j]));
  if (maxDist > MAX_ORS_DISTANCE_KM) return null;

  try {
    const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
      method: "POST",
      headers: { Authorization: `Bearer ${ORS_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: unique.map((p) => [p.lng, p.lat]) }),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { features?: Array<{ geometry?: { coordinates?: Array<[number, number]> } }> };
    const coords = payload.features?.[0]?.geometry?.coordinates;
    if (!coords?.length) return null;
    return coords.map(([lng, lat]) => [lat, lng] as LatLngExpression);
  } catch {
    return null;
  }
}

// ─── FitBounds ───────────────────────────────────────────────────────────────

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  const hasFit = useRef(false);
  useEffect(() => {
    if (hasFit.current) return;
    hasFit.current = true;
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 14 });
  }, [bounds, map]);
  return null;
}

function SingleWarehouseFocus({ center }: { center: LatLngExpression }) {
  const map = useMap();
  const hasFit = useRef(false);
  useEffect(() => {
    if (hasFit.current) return;
    hasFit.current = true;
    map.setView(center, 13, { animate: false });
  }, [center, map]);
  return null;
}

// ─── Route Polyline with ORS ─────────────────────────────────────────────────

function PlanRouteLine({
  stops,
  color,
  warehouseLatitude,
  warehouseLongitude,
  isActive,
  useOrs,
  onClick,
}: {
  stops: MapShipmentStop[];
  color: string;
  warehouseLatitude: number;
  warehouseLongitude: number;
  isActive: boolean;
  useOrs: boolean;
  onClick: () => void;
}) {
  const [orsRoute, setOrsRoute] = useState<LatLngExpression[] | null>(null);

  const sortedStops = useMemo(
    () => nearestNeighborSort(stops, { lat: warehouseLatitude, lng: warehouseLongitude }),
    [stops, warehouseLatitude, warehouseLongitude]
  );

  const points = [
    { lat: warehouseLatitude, lng: warehouseLongitude },
    ...sortedStops.map((s) => ({ lat: s.latitude, lng: s.longitude })),
  ];
  const pointsKey = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|");

  useEffect(() => {
    if (!useOrs) {
      setOrsRoute(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const route = await fetchOrsRoute(points);
      if (!cancelled) setOrsRoute(route);
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [pointsKey, useOrs]);

  if (points.length < 2) return null;

  const positions = orsRoute ?? points.map((p) => [p.lat, p.lng] as LatLngExpression);
  const weight = isActive ? 5 : 3;
  const opacity = isActive ? 0.9 : 0.35;

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color,
        weight,
        opacity,
        lineCap: "round",
        lineJoin: "round",
      }}
      eventHandlers={{ click: onClick }}
    />
  );
}

// ─── Warehouse Marker ──────────────────────────────────────────────────────

function WarehouseMarker({
  latitude,
  longitude,
  name,
}: {
  latitude: number;
  longitude: number;
  name: string;
}) {
  const pos: LatLngExpression = [latitude, longitude];
  return (
    <Marker
      position={pos}
      icon={L.divIcon({
        className: "",
        html: `<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;inset:0;background:#111827;opacity:0.15;border-radius:50%;transform:scale(1.25);"></div>
          <div style="position:relative;width:30px;height:30px;border-radius:8px;background:#111827;border:2.5px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,0.35);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21V12h6v9"/></svg>
          </div>
          <div style="position:absolute;top:-3px;right:-3px;width:12px;height:12px;border-radius:50%;background:#10b981;border:2px solid white;"></div>
        </div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      })}
    >
      <Tooltip direction="top" offset={[0, -26]} opacity={1}>
        <div style={{ fontFamily: "sans-serif", textAlign: "right", direction: "rtl" }}>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-gray-900 dark:text-white">{name}</span>
          </div>
          <div className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">المخزن الأساسي</div>
        </div>
      </Tooltip>
    </Marker>
  );
}

// ─── Stop Marker ─────────────────────────────────────────────────────────────

function StopMarker({
  stop,
  idx,
  color,
  isActive,
}: {
  stop: MapShipmentStop;
  idx: number;
  color: string;
  isActive: boolean;
}) {
  const pos: LatLngExpression = [stop.latitude, stop.longitude];
  const statusClr = shipmentColor(stop.shipmentStatus);
  const statusIcon = shipmentStatusIcon(stop.shipmentStatus);
  const size = isActive ? 24 : 20;
  const fontSize = isActive ? "10px" : "9px";

  return (
    <>
      <CircleMarker
        center={pos}
        radius={isActive ? 12 : 8}
        pathOptions={{
          color: isActive ? color : "white",
          fillColor: color,
          fillOpacity: isActive ? 0.25 : 0.15,
          weight: isActive ? 2 : 1.5,
        }}
      />
      <Marker
        position={pos}
        icon={L.divIcon({
          className: "",
          html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;position:relative;">
            <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.25);color:white;font-size:${fontSize};font-weight:700;font-family:sans-serif;">${idx + 1}</div>
            ${statusIcon ? `<div style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:${statusClr};border:1.5px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:8px;font-weight:700;">${statusIcon}</div>` : ""}
          </div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })}
      >
        <Tooltip direction="top" offset={[0, -size / 2 - 4]} opacity={1}>
          <div style={{ fontFamily: "sans-serif", textAlign: "right", direction: "rtl", minWidth: 140 }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{idx + 1}. {stop.customerName ?? stop.id}</div>
            <div style={{ fontSize: 11, color: statusClr, fontWeight: 600 }}>{shipmentStatusLabel(stop.shipmentStatus)}</div>
          </div>
        </Tooltip>
      </Marker>
    </>
  );
}

// ─── Driver Card in Sidebar ──────────────────────────────────────────────────

function DriverCard({
  driver,
  color,
  isSelected,
  onSelect,
  driverIndex,
}: {
  driver: {
    driverId: string;
    driverName: string;
    plans: { planId: string; planReference: string; stops: MapShipmentStop[]; warehouseName: string }[];
    totalStops: number;
    totalDist: number;
  };
  color: string;
  isSelected: boolean;
  onSelect: () => void;
  driverIndex: number;
}) {
  const initials = (driver.driverName || "س")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <button
      onClick={onSelect}
      className={`w-full text-right rounded-xl transition-all duration-200 group relative ${
        isSelected ? "shadow-md" : "hover:shadow-sm"
      }`}
      style={{
        background: isSelected ? `${color}0f` : "transparent",
        border: isSelected ? `1.5px solid ${color}55` : "1.5px solid transparent",
      }}
    >
      {isSelected && (
        <span
          className="absolute inset-y-2 right-0 w-1 rounded-full"
          style={{ background: color }}
        />
      )}
      <div className="px-3 py-3">
        {/* Header row */}
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white/70 dark:ring-white/10 shrink-0"
            style={{ background: color }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[13px] font-semibold text-gray-900 dark:text-white">
                {driver.driverName}
              </span>
              {isSelected && (
                <svg className="shrink-0 text-emerald-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {driver.plans.length > 1 && (
                <span
                  className="rounded px-1 py-px text-[9px] font-bold text-white leading-tight"
                  style={{ background: color }}
                >
                  {driver.plans.length} خطط
                </span>
              )}
              <span className="truncate text-[11px] text-gray-400 dark:text-gray-500">
                {driver.plans[0]?.planReference || `خطة ${driverIndex + 1}`}
                {driver.plans.length > 1 ? ` +${driver.plans.length - 1}` : ""}
              </span>
            </div>
          </div>
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white shrink-0"
            style={{ background: color }}
          >
            {driverIndex + 1}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gray-50 px-2 py-1.5 text-[10px] font-medium text-gray-600 dark:bg-white/[0.03] dark:text-gray-300">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            {driver.totalStops} نقطة
          </div>
          <div className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gray-50 px-2 py-1.5 text-[10px] font-medium text-gray-600 dark:bg-white/[0.03] dark:text-gray-300">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            {driver.totalDist.toFixed(1)} كم
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

function TrackingMapInner({ drivers, plans, primaryWarehouse }: Props) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [tileMode, setTileMode] = useState<MapTileMode>("map");
  const [fullscreen, setFullscreen] = useState(false);
  const [useOrs, setUseOrs] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const didDefaultFocus = useRef(false);

  const activeTile = TILE_MODES.find((t) => t.id === tileMode) ?? TILE_MODES[0];

  const toggleFullscreen = useCallback(() => {
    setFullscreen((prev) => !prev);
    const el = mapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const plansWithSortedStops = useMemo(
    () =>
      plans.map((plan) => ({
        ...plan,
        stops: nearestNeighborSort(plan.stops, {
          lat: plan.warehouseLatitude,
          lng: plan.warehouseLongitude,
        }),
      })),
    [plans]
  );

  const driverIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    drivers.forEach((d, i) => map.set(d.driverId, i));
    return map;
  }, [drivers]);

  type DriverWithPlans = {
    driverId: string;
    driverName: string;
    plans: typeof plansWithSortedStops;
    totalStops: number;
    totalDist: number;
  };

  const driversWithPlans: DriverWithPlans[] = useMemo(() => {
    const map = new Map<string, DriverWithPlans>();
    for (const plan of plansWithSortedStops) {
      let entry = map.get(plan.driverId);
      if (!entry) {
        entry = { driverId: plan.driverId, driverName: plan.driverName, plans: [], totalStops: 0, totalDist: 0 };
        map.set(plan.driverId, entry);
      }
      entry.plans.push(plan);
      entry.totalStops += plan.stops.length;
      entry.totalDist += computeTotalDistanceKm(plan.stops, { lat: plan.warehouseLatitude, lng: plan.warehouseLongitude });
    }
    return [...map.values()];
  }, [plansWithSortedStops]);

  useEffect(() => {
    if (didDefaultFocus.current) return;
    if (driversWithPlans.length === 0) return;
    didDefaultFocus.current = true;
    setSelectedDriverId(driversWithPlans[0].driverId);
  }, [driversWithPlans]);

  const filteredPlans = useMemo(
    () =>
      selectedDriverId
        ? plansWithSortedStops.filter((p) => p.driverId === selectedDriverId)
        : plansWithSortedStops,
    [plansWithSortedStops, selectedDriverId]
  );

  const filteredDrivers = useMemo(
    () => (selectedDriverId ? drivers.filter((d) => d.driverId === selectedDriverId) : drivers),
    [drivers, selectedDriverId]
  );

  const handleSelectDriver = useCallback((driverId: string) => {
    setSelectedDriverId((prev) => (prev === driverId ? null : driverId));
  }, []);

  const allCoords = useMemo(() => {
    const pts: LatLngExpression[] = [];
    for (const d of filteredDrivers) pts.push([d.latitude, d.longitude]);
    for (const p of filteredPlans) {
      pts.push([p.warehouseLatitude, p.warehouseLongitude]);
      for (const s of p.stops) pts.push([s.latitude, s.longitude]);
    }
    return pts;
  }, [filteredDrivers, filteredPlans]);

  const totalStats = useMemo(() => {
    const stops = driversWithPlans.reduce((sum, d) => sum + d.totalStops, 0);
    const dist = driversWithPlans.reduce((sum, d) => sum + d.totalDist, 0);
    return { drivers: driversWithPlans.length, plans: plansWithSortedStops.length, stops, dist };
  }, [driversWithPlans, plansWithSortedStops]);

  const mainWarehouse = useMemo(() => {
    if (primaryWarehouse) {
      return { latitude: primaryWarehouse.latitude, longitude: primaryWarehouse.longitude, name: primaryWarehouse.name || "المخزن الرئيسي" };
    }
    if (plansWithSortedStops.length === 0) return null;
    const nameCount = new Map<string, number>();
    for (const p of plansWithSortedStops) {
      const n = p.warehouseName?.trim();
      if (n) nameCount.set(n, (nameCount.get(n) ?? 0) + 1);
    }
    let dominantName = "";
    let maxCount = 0;
    for (const [n, c] of nameCount) {
      if (c > maxCount) { maxCount = c; dominantName = n; }
    }
    const lat = plansWithSortedStops.reduce((sum, p) => sum + p.warehouseLatitude, 0) / plansWithSortedStops.length;
    const lng = plansWithSortedStops.reduce((sum, p) => sum + p.warehouseLongitude, 0) / plansWithSortedStops.length;
    return { latitude: lat, longitude: lng, name: dominantName || "المخزن الرئيسي" };
  }, [plansWithSortedStops, primaryWarehouse]);

  if (allCoords.length === 0 && !mainWarehouse) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/60 dark:to-gray-800/60 text-sm text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <svg className="mx-auto mb-3 text-gray-300 dark:text-gray-600" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          لا توجد بيانات لعرضها حاليًا
        </div>
      </div>
    );
  }

  const mapCenter = allCoords.length > 0 ? allCoords[0] : ([mainWarehouse?.latitude ?? 0, mainWarehouse?.longitude ?? 0] as LatLngExpression);
  const mapBounds = allCoords.length > 0 ? (allCoords as LatLngBoundsExpression) : undefined;

  return (
    <div
      ref={mapRef}
      className={`relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-700/80 flex shadow-lg ${fullscreen ? "fixed inset-0 z-[9999] h-screen w-screen rounded-none border-0" : "h-[540px]"}`}
    >
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 overflow-y-auto border-r border-gray-200/80 bg-white dark:border-gray-700/80 dark:bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white" style={{ fontFamily: "sans-serif" }}>
              السائقون
            </h3>
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-brand-25 dark:bg-white/[0.02] px-2 py-0.5 rounded-full" style={{ fontFamily: "sans-serif" }}>
              {totalStats.drivers} سائق
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500" style={{ fontFamily: "sans-serif" }}>
            <span>{totalStats.plans} خطط</span>
            <span>·</span>
            <span>{totalStats.stops} نقطة</span>
            <span>·</span>
            <span>{totalStats.dist.toFixed(0)} كم</span>
          </div>
        </div>

        {/* Driver Cards */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {driversWithPlans.map((dp) => {
            const idx = driverIndexMap.get(dp.driverId) ?? 0;
            const color = driverColor(idx);
            const isSelected = selectedDriverId === dp.driverId;
            return (
              <DriverCard
                key={dp.driverId}
                driver={dp}
                color={color}
                isSelected={isSelected}
                onSelect={() => handleSelectDriver(dp.driverId)}
                driverIndex={idx}
              />
            );
          })}
        </div>

        {/* Toggle */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/[0.04]">
            <button
              onClick={() => setSelectedDriverId(null)}
              className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                !selectedDriverId
                  ? "bg-white text-gray-900 shadow-sm dark:bg-white/[0.08] dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              style={{ fontFamily: "sans-serif" }}
            >
              عرض الكل
            </button>
            <button
              onClick={() => {
                if (!selectedDriverId && driversWithPlans.length > 0) {
                  setSelectedDriverId(driversWithPlans[0].driverId);
                }
              }}
              className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                selectedDriverId
                  ? "bg-white text-gray-900 shadow-sm dark:bg-white/[0.08] dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              style={{ fontFamily: "sans-serif" }}
            >
              سائق واحد
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={12}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            key={activeTile.id}
            attribution={activeTile.attribution}
            url={activeTile.url}
            maxZoom={activeTile.id === "map" ? 19 : 18}
          />
          {mapBounds ? <FitBounds bounds={mapBounds} /> : mainWarehouse ? <SingleWarehouseFocus center={mapCenter as LatLngExpression} /> : null}

          {/* Route lines */}
          {filteredPlans.map((plan) => {
            const idx = driverIndexMap.get(plan.driverId) ?? 0;
            const color = driverColor(idx);
            return (
              <PlanRouteLine
                key={plan.planId}
                stops={plan.stops}
                color={color}
                warehouseLatitude={plan.warehouseLatitude}
                warehouseLongitude={plan.warehouseLongitude}
                isActive
                useOrs={useOrs}
                onClick={() => handleSelectDriver(plan.driverId)}
              />
            );
          })}

          {/* Main warehouse marker */}
          {mainWarehouse ? (
            <WarehouseMarker
              latitude={mainWarehouse.latitude}
              longitude={mainWarehouse.longitude}
              name={mainWarehouse.name}
            />
          ) : null}

          {/* Stop markers */}
          {filteredPlans.map((plan) => {
            const idx = driverIndexMap.get(plan.driverId) ?? 0;
            const color = driverColor(idx);
            return plan.stops.map((stop, sIdx) => (
              <StopMarker
                key={`${plan.planId}-${stop.id}`}
                stop={stop}
                idx={sIdx}
                color={color}
                isActive={true}
              />
            ));
          })}

          {/* Driver markers */}
          {filteredDrivers.map((d) => {
            const idx = driverIndexMap.get(d.driverId) ?? 0;
            const color = driverColor(idx);
            const icon = L.divIcon({
              className: "",
              html: driverIconHtml(color, d.headingDegrees),
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            });
            return <DriverMarker key={d.driverId} driver={d} icon={icon} color={color} />;
          })}
        </MapContainer>

        {/* Map Mode Switcher (Google-Maps style) */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2">
          <div className="flex overflow-hidden rounded-xl border border-gray-200/70 bg-white/90 shadow-lg backdrop-blur-sm dark:border-gray-700/70 dark:bg-gray-900/90">
            {TILE_MODES.map((mode) => {
              const isActiveMode = tileMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setTileMode(mode.id)}
                  className={`px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    isActiveMode
                      ? "bg-brand-600 text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"
                  }`}
                  style={{ fontFamily: "sans-serif" }}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-gray-200/70 bg-white/90 px-2 py-1.5 shadow-lg backdrop-blur-sm dark:border-gray-700/70 dark:bg-gray-900/90">
            <button
              onClick={() => setUseOrs((v) => !v)}
              title="خطوط الطرق الحقيقية (إن وجد مفتاح API)"
              className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
                useOrs
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.06]"
              }`}
              style={{ fontFamily: "sans-serif", whiteSpace: "nowrap" }}
            >
              {useOrs ? "طرق حقيقية" : "خطوط مستقيمة"}
            </button>
            <button
              onClick={toggleFullscreen}
              title={fullscreen ? "خروج من ملء الشاشة" : "ملء الشاشة"}
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.06]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {fullscreen ? (
                  <>
                    <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                    <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                    <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                    <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                  </>
                ) : (
                  <>
                    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Floating Legend */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl px-3 py-2.5 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-gray-600 dark:text-gray-300" style={{ fontFamily: "sans-serif" }}>
              <span className="inline-block h-3 w-3 rounded bg-gradient-to-br from-gray-500 to-gray-700" />
              المستودع
            </span>
            {(selectedDriverId ? driversWithPlans.filter((dp) => dp.driverId === selectedDriverId) : driversWithPlans).map((dp) => {
              const idx = driverIndexMap.get(dp.driverId) ?? 0;
              const color = driverColor(idx);
              return (
                <span
                  key={dp.driverId}
                  className="inline-flex items-center gap-1.5 text-[10px] font-medium text-gray-600 dark:text-gray-300"
                  style={{ fontFamily: "sans-serif" }}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: color }}
                  />
                  {dp.driverName}
                </span>
              );
            })}
          </div>
        </div>

        {/* Driver Info Popup */}
        {selectedDriverId && (
          <div className="absolute top-3 left-3 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-gray-200/50 dark:border-gray-700/50 max-w-xs">
            {(() => {
              const dp = driversWithPlans.find((d) => d.driverId === selectedDriverId);
              if (!dp) return null;
              const idx = driverIndexMap.get(dp.driverId) ?? 0;
              const color = driverColor(idx);
              return (
                <div style={{ fontFamily: "sans-serif" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: color }}
                    />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{dp.driverName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-gray-500 dark:text-gray-400">
                    <span>{dp.plans.length} خطة{dp.plans.length !== 1 ? "ط" : ""}</span>
                    <span>{dp.totalStops} نقطة</span>
                    <span>{dp.totalDist.toFixed(1)} كم</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function DriverMarker({
  driver,
  icon,
  color,
}: {
  driver: MapDriverLocation;
  icon: DivIcon;
  color: string;
}) {
  const hasHeading = typeof driver.headingDegrees === "number" && Number.isFinite(driver.headingDegrees);
  return (
    <Marker position={[driver.latitude, driver.longitude]} icon={icon}>
      <Tooltip direction="top" offset={[0, -18]} opacity={1}>
        <div
          style={{
            fontFamily: "sans-serif",
            textAlign: "right",
            direction: "rtl",
            minWidth: 120,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: color }}
            />
            <span className="text-xs font-bold text-gray-900 dark:text-white">{driver.driverName}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
            {hasHeading ? (
              <span className="flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 14c4 2 6 4 8 6" />
                  <path d="M20 4c-6 2-10 6-12 12" />
                  <circle cx="4" cy="14" r="2" />
                  <circle cx="20" cy="4" r="2" />
                </svg>
                {Math.round(driver.headingDegrees as number)}° ضلع
              </span>
            ) : (
              <span>موقع مباشر</span>
            )}
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
}

export default function AdminLiveTrackingMap(props: Props) {
  return <TrackingMapInner {...props} />;
}
