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

type Props = {
  drivers: MapDriverLocation[];
  plans: MapPlanRoute[];
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

function driverIconHtml(color: string): string {
  return `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`;
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

function WarehouseMarker({ latitude, longitude, color }: { latitude: number; longitude: number; color: string }) {
  const pos: LatLngExpression = [latitude, longitude];
  return (
    <Marker
      position={pos}
      icon={L.divIcon({
        className: "",
        html: `<div style="width:36px;height:36px;background:${color};border:3px solid white;border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,0.3);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21V12h6v9"/></svg></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })}
    >
      <Tooltip direction="top" offset={[0, -20]} opacity={1}>
        <span className="text-xs font-semibold" style={{ fontFamily: "sans-serif" }}>المستودع</span>
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

// ─── Route Card in Sidebar ───────────────────────────────────────────────────

function RouteCard({
  plan,
  color,
  isSelected,
  onSelect,
  driverIndex,
}: {
  plan: MapPlanRoute;
  color: string;
  isSelected: boolean;
  onSelect: () => void;
  driverIndex: number;
}) {
  const totalDist = useMemo(
    () => computeTotalDistanceKm(plan.stops, { lat: plan.warehouseLatitude, lng: plan.warehouseLongitude }),
    [plan]
  );

  return (
    <button
      onClick={onSelect}
      className="w-full text-right rounded-xl transition-all duration-200"
      style={{
        background: isSelected ? `${color}10` : "transparent",
        border: isSelected ? `1.5px solid ${color}40` : "1.5px solid transparent",
      }}
    >
      <div className="px-3 py-3">
        {/* Header row */}
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 28, height: 28, background: color }}
          >
            <span className="text-white text-xs font-bold" style={{ fontFamily: "sans-serif" }}>
              {driverIndex + 1}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate" style={{ fontFamily: "sans-serif" }}>
              {plan.driverName}
            </div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500" style={{ fontFamily: "sans-serif" }}>
              {plan.planReference}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400" style={{ fontFamily: "sans-serif" }}>
          <div className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <span>{plan.stops.length} نقطة</span>
          </div>
          <div className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            <span>{plan.warehouseName}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{totalDist.toFixed(1)} km</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

function TrackingMapInner({ drivers, plans }: Props) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [tileMode, setTileMode] = useState<MapTileMode>("map");
  const [fullscreen, setFullscreen] = useState(false);
  const [useOrs, setUseOrs] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

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

  const filteredPlans = useMemo(
    () =>
      selectedPlanId
        ? plansWithSortedStops.filter((p) => p.planId === selectedPlanId)
        : plansWithSortedStops,
    [plansWithSortedStops, selectedPlanId]
  );

  const filteredDrivers = useMemo(
    () => (selectedPlanId ? drivers.filter((d) => d.driverId === filteredPlans[0]?.driverId) : drivers),
    [drivers, selectedPlanId, filteredPlans]
  );

  const driverIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    drivers.forEach((d, i) => map.set(d.driverId, i));
    return map;
  }, [drivers]);

  const planIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    plansWithSortedStops.forEach((p, i) => map.set(p.planId, i));
    return map;
  }, [plansWithSortedStops]);

  const allCoords = useMemo(() => {
    const pts: LatLngExpression[] = [];
    for (const d of filteredDrivers) pts.push([d.latitude, d.longitude]);
    for (const p of filteredPlans) {
      pts.push([p.warehouseLatitude, p.warehouseLongitude]);
      for (const s of p.stops) pts.push([s.latitude, s.longitude]);
    }
    return pts;
  }, [filteredDrivers, filteredPlans]);

  const bounds = allCoords.length > 0 ? (allCoords as LatLngBoundsExpression) : undefined;

  const handleSelectPlan = useCallback((planId: string) => {
    setSelectedPlanId((prev) => (prev === planId ? null : planId));
  }, []);

  const totalStats = useMemo(() => {
    const stops = plansWithSortedStops.reduce((sum, p) => sum + p.stops.length, 0);
    const dist = plansWithSortedStops.reduce(
      (sum, p) => sum + computeTotalDistanceKm(p.stops, { lat: p.warehouseLatitude, lng: p.warehouseLongitude }),
      0
    );
    return { plans: plansWithSortedStops.length, stops, dist };
  }, [plansWithSortedStops]);

  if (allCoords.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/60 dark:to-gray-800/60 text-sm text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <svg className="mx-auto mb-3 text-gray-300 dark:text-gray-600" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          لا توجد خطط نشطة أو سائقين متاحين حاليًا
        </div>
      </div>
    );
  }

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
              خطط التوصيل
            </h3>
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-brand-25 dark:bg-white/[0.02] px-2 py-0.5 rounded-full" style={{ fontFamily: "sans-serif" }}>
              {totalStats.plans} خطط
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500" style={{ fontFamily: "sans-serif" }}>
            <span>{totalStats.stops} نقطة</span>
            <span>·</span>
            <span>{totalStats.dist.toFixed(0)} km</span>
            <span>·</span>
            <span>{drivers.length} سائق</span>
          </div>
        </div>

        {/* Route Cards */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {plansWithSortedStops.map((plan) => {
            const idx = driverIndexMap.get(plan.driverId) ?? 0;
            const color = driverColor(idx);
            const isSelected = selectedPlanId === plan.planId;
            return (
              <RouteCard
                key={plan.planId}
                plan={plan}
                color={color}
                isSelected={isSelected}
                onSelect={() => handleSelectPlan(plan.planId)}
                driverIndex={idx}
              />
            );
          })}
        </div>

        {/* Clear filter */}
        {selectedPlanId && (
          <div className="p-3 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setSelectedPlanId(null)}
              className="w-full text-center text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2 rounded-lg hover:bg-brand-25 dark:hover:bg-white/[0.02] transition-colors"
              style={{ fontFamily: "sans-serif" }}
            >
              عرض جميع الخطط
            </button>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={allCoords[0]}
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
          {bounds && <FitBounds bounds={bounds} />}

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
                isActive={!selectedPlanId || selectedPlanId === plan.planId}
                useOrs={useOrs}
                onClick={() => handleSelectPlan(plan.planId)}
              />
            );
          })}

          {/* Warehouse markers */}
          {filteredPlans.map((plan) => {
            const idx = driverIndexMap.get(plan.driverId) ?? 0;
            const color = driverColor(idx);
            return (
              <WarehouseMarker
                key={`wh-${plan.planId}`}
                latitude={plan.warehouseLatitude}
                longitude={plan.warehouseLongitude}
                color={color}
              />
            );
          })}

          {/* Stop markers */}
          {filteredPlans.map((plan) => {
            const idx = driverIndexMap.get(plan.driverId) ?? 0;
            const color = driverColor(idx);
            const isActive = !selectedPlanId || selectedPlanId === plan.planId;
            return plan.stops.map((stop, sIdx) => (
              <StopMarker
                key={`${plan.planId}-${stop.id}`}
                stop={stop}
                idx={sIdx}
                color={color}
                isActive={isActive}
              />
            ));
          })}

          {/* Driver markers */}
          {filteredDrivers.map((d) => {
            const idx = driverIndexMap.get(d.driverId) ?? 0;
            const color = driverColor(idx);
            const icon = L.divIcon({
              className: "",
              html: driverIconHtml(color),
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            });
            return <DriverMarker key={d.driverId} driver={d} icon={icon} />;
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
            {filteredPlans.map((plan) => {
              const idx = driverIndexMap.get(plan.driverId) ?? 0;
              const color = driverColor(idx);
              const planIdx = planIndexMap.get(plan.planId) ?? 0;
              return (
                <span
                  key={plan.planId}
                  className="inline-flex items-center gap-1.5 text-[10px] font-medium text-gray-600 dark:text-gray-300"
                  style={{ fontFamily: "sans-serif" }}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: color }}
                  />
                  {plan.driverName}
                </span>
              );
            })}
          </div>
        </div>

        {/* Route Info Popup */}
        {selectedPlanId && (
          <div className="absolute top-3 left-3 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-gray-200/50 dark:border-gray-700/50 max-w-xs">
            {(() => {
              const plan = plansWithSortedStops.find((p) => p.planId === selectedPlanId);
              if (!plan) return null;
              const idx = driverIndexMap.get(plan.driverId) ?? 0;
              const color = driverColor(idx);
              const dist = computeTotalDistanceKm(plan.stops, { lat: plan.warehouseLatitude, lng: plan.warehouseLongitude });
              return (
                <div style={{ fontFamily: "sans-serif" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: color }}
                    />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{plan.driverName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-gray-500 dark:text-gray-400">
                    <span>{plan.stops.length} نقطة</span>
                    <span>~{dist.toFixed(1)} km</span>
                    <span>{plan.warehouseName}</span>
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

function DriverMarker({ driver, icon }: { driver: MapDriverLocation; icon: DivIcon }) {
  return (
    <Marker position={[driver.latitude, driver.longitude]} icon={icon}>
      <Tooltip direction="top" offset={[0, -18]} opacity={1}>
        <span className="text-xs font-semibold whitespace-nowrap" style={{ fontFamily: "sans-serif" }}>
          {driver.driverName}
        </span>
      </Tooltip>
    </Marker>
  );
}

export default function AdminLiveTrackingMap(props: Props) {
  return <TrackingMapInner {...props} />;
}
