import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L, { type LatLngExpression, type LatLngTuple } from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Crosshair, MapPin, Navigation, Package, Truck } from 'lucide-react';
import { useDeliveryStore } from '@/stores/deliveryStore';
import { supabase } from '@/lib/supabase';

const ORS_API_KEY = String(import.meta.env.VITE_ORS_API_KEY ?? '').trim();

const FALLBACK_WAREHOUSE = { label: 'Horeca Marg', lat: 30.157468, lng: 31.359598 };

type MapMode = 'standard' | 'satellite' | 'terrain';
const TILE_SOURCES: Record<MapMode, { url: string; attribution: string }> = {
  standard: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap' },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri' },
  terrain: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: 'Map data: &copy; OpenTopoMap (CC-BY-SA)' },
};

type BreadcrumbPoint = { lat: number; lng: number; ts: string };

type RouteTrackingRow = {
  actual_route: Array<{ lat: number; lng: number; ts: string }> | null;
  planned_route: Array<{ lat: number; lng: number }> | null;
  tracking_status: string | null;
};

/* ─── Leaflet sub-components ─────────────────────────── */

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function FlyTo({ center, tick }: { center: LatLngTuple | null; tick: number }) {
  const map = useMap();
  const lastTick = useRef(0);
  useEffect(() => {
    if (center && tick !== lastTick.current) {
      lastTick.current = tick;
      map.flyTo(center, 16, { animate: true, duration: 0.8 });
    }
  }, [center, tick, map]);
  return null;
}

/* ─── Routing helper: OSRM primary (free, no key), ORS fallback ── */

function fetchOsrmRoute(points: { lat: number; lng: number }[]): Promise<LatLngExpression[] | null> {
  if (points.length < 2) return Promise.resolve(null);
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
  return fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`)
    .then((r) => (r.ok ? r.json() : null))
    .then((payload) => {
      const coordsOut = payload?.routes?.[0]?.geometry?.coordinates as Array<[number, number]> | undefined;
      if (!coordsOut?.length) return null;
      return coordsOut.map(([lng, lat]) => [lat, lng] as LatLngExpression);
    })
    .catch(() => null);
}

async function fetchOrsRoute(points: { lat: number; lng: number }[]): Promise<LatLngExpression[] | null> {
  if (!ORS_API_KEY || points.length < 2) return null;
  try {
    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: { Authorization: ORS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: points.map((p) => [p.lng, p.lat]) }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { features?: Array<{ geometry?: { coordinates?: Array<[number, number]> } }> };
    const coords = payload.features?.[0]?.geometry?.coordinates;
    if (!coords?.length) return null;
    return coords.map(([lng, lat]) => [lat, lng] as LatLngExpression);
  } catch {
    return null;
  }
}

// Primary = OSRM (no API key, no tight rate limit); fallback = ORS.
async function fetchRoute(points: { lat: number; lng: number }[]): Promise<LatLngExpression[] | null> {
  const osrm = await fetchOsrmRoute(points);
  if (osrm && osrm.length > 1) return osrm;
  return fetchOrsRoute(points);
}

/* ─── Marker icons ───────────────────────────────────── */

function driverIcon(heading: number | null) {
  const rotation = heading ?? 0;
  return L.divIcon({
    className: '',
    html: `<div style="transform:rotate(${rotation}deg)" class="relative flex items-center justify-center">
      <div class="w-10 h-10 rounded-full bg-emerald-500 border-[3px] border-white shadow-lg flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L8 10h8L12 2z" fill="white"/>
          <circle cx="12" cy="14" r="3" fill="white"/>
        </svg>
      </div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function stopIcon(number: number, isActive: boolean) {
  const bg = isActive ? '#ef4444' : '#2563eb';
  return L.divIcon({
    className: '',
    html: `<div class="flex h-8 w-8 items-center justify-center rounded-full border-[2.5px] border-white text-xs font-bold text-white shadow-md" style="background:${bg}">${number}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function completedIcon() {
  return L.divIcon({
    className: '',
    html: `<div class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-md">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function warehouseIcon() {
  return L.divIcon({
    className: '',
    html: `<div class="warehouse-pin">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35a2 2 0 0 1 1.1-1.79l8-4a2 2 0 0 1 1.8 0l8 4A2 2 0 0 1 22 8.35Z"/>
        <path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>
      </svg>
    </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
  });
}

/* ─── Main Screen ────────────────────────────────────── */

export default function DriverLiveMapScreen() {
  const navigate = useNavigate();
  const shipments = useDeliveryStore((s) => s.shipments);
  const activePlanId = useDeliveryStore((s) => s.activePlanId);
  const getRouteGate = useDeliveryStore((s) => s.getRouteGate);

  const [driverPosition, setDriverPosition] = useState<LatLngTuple | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbPoint[]>([]);
  const [trackingStatus, setTrackingStatus] = useState<string | null>(null);
  const [orsRoute, setOrsRoute] = useState<LatLngExpression[] | null>(null);
  const [recenterTick, setRecenterTick] = useState(0);
  const [warehousePos, setWarehousePos] = useState<LatLngTuple | null>(null);
  const [warehouseName, setWarehouseName] = useState<string | null>(null);
  const [routeToWarehouse, setRouteToWarehouse] = useState(false);
  const [warehouseRoute, setWarehouseRoute] = useState<LatLngExpression[] | null>(null);
  const [mapMode, setMapMode] = useState<'standard' | 'satellite' | 'terrain'>('standard');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const driverPosRef = useRef<LatLngTuple | null>(null);

  const { nextActionableShipmentId } = getRouteGate(activePlanId ?? undefined);

  const routeStops = useMemo(
    () =>
      shipments
        .filter((s) => s.status !== 'delivered' && s.status !== 'failed' && s.coordinates)
        .slice()
        .sort((a, b) => (a.routeOrder ?? Number.MAX_SAFE_INTEGER) - (b.routeOrder ?? Number.MAX_SAFE_INTEGER)),
    [shipments],
  );

  const activeStop = routeStops.find((s) => s.id === nextActionableShipmentId) ?? routeStops[0] ?? null;

  /* ─── GPS tracking ─── */
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const opts: PositionOptions = { enableHighAccuracy: true, maximumAge: 2_000, timeout: 20_000 };
    const handle = (pos: GeolocationPosition) => {
      const p: LatLngTuple = [pos.coords.latitude, pos.coords.longitude];
      driverPosRef.current = p;
      setDriverPosition(p);
      setHeading(pos.coords.heading && Number.isFinite(pos.coords.heading) ? pos.coords.heading : null);
      setGpsAccuracy(pos.coords.accuracy ?? null);
    };
    const watchId = navigator.geolocation.watchPosition(handle, () => { /* ignore */ }, opts);
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  /* ─── Auto-center once when driver position first obtained ─── */
  const didInitialCenter = useRef(false);
  useEffect(() => {
    if (driverPosition && !didInitialCenter.current) {
      didInitialCenter.current = true;
      setRecenterTick((t) => t + 1);
    }
  }, [driverPosition]);

  /* ─── Fetch breadcrumbs + planned route from logistics_route_tracking ─── */
  const fetchTrackingData = useCallback(async () => {
    if (!activePlanId) return;
    const { data } = await supabase
      .from('logistics_route_tracking')
      .select('actual_route, planned_route, tracking_status')
      .eq('plan_id', activePlanId)
      .maybeSingle();
    if (!data) return;
    const row = data as RouteTrackingRow;
    if (row.actual_route) setBreadcrumbs(row.actual_route);
    if (row.tracking_status) setTrackingStatus(row.tracking_status);
  }, [activePlanId]);

  useEffect(() => {
    void fetchTrackingData();
    const interval = setInterval(() => void fetchTrackingData(), 10_000);
    return () => clearInterval(interval);
  }, [fetchTrackingData]);

  /* ─── Realtime subscription for route tracking updates ─── */
  useEffect(() => {
    if (!activePlanId) return;
    const channel = supabase
      .channel(`driver-route-tracking-${activePlanId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'logistics_route_tracking', filter: `plan_id=eq.${activePlanId}` },
        () => { void fetchTrackingData(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activePlanId, fetchTrackingData]);

  /* ─── ORS road routing for planned stops ─── */
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const stops = routeStops.map((s) => s.coordinates!).filter(Boolean);
      const points = driverPosition
        ? [{ lat: driverPosition[0], lng: driverPosition[1] }, ...stops]
        : stops;
      if (points.length < 2) { if (!cancelled) setOrsRoute(null); return; }
      const route = await fetchRoute(points);
      if (!cancelled) setOrsRoute(route);
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverPosition, routeStops.map((s) => s.id).join(',')]);

  /* ─── Resolve warehouse position from shipments, fallback to primary ─── */
  useEffect(() => {
    const withWh = routeStops.find((s) => s.warehouseCoordinates);
    const w = withWh?.warehouseCoordinates;
    if (w) {
      setWarehousePos([w.lat, w.lng]);
      setWarehouseName(withWh.warehouseOrigin && withWh.warehouseOrigin !== 'null' ? withWh.warehouseOrigin : 'المخزن');
    } else {
      setWarehousePos([FALLBACK_WAREHOUSE.lat, FALLBACK_WAREHOUSE.lng]);
      setWarehouseName(FALLBACK_WAREHOUSE.label);
    }
  }, [routeStops]);

  /* ─── Route driver → warehouse when toggled ─── */
  const lastRouteOrigin = useRef<string>('');
  useEffect(() => {
    let cancelled = false;
    if (!routeToWarehouse || !driverPosition || !warehousePos) {
      setWarehouseRoute(null);
      return;
    }
    const start = { lat: driverPosition[0], lng: driverPosition[1] };
    const end = { lat: warehousePos[0], lng: warehousePos[1] };
    const originKey = `${start.lat.toFixed(4)},${start.lng.toFixed(4)}|${end.lat.toFixed(4)},${end.lng.toFixed(4)}`;

    // Only fetch a new road route if origin/end moved meaningfully (~50m) since last good one
    if (lastRouteOrigin.current === originKey) {
      return;
    }
    const timer = setTimeout(async () => {
      const route = await fetchRoute([start, end]);
      if (cancelled) return;
      if (route && route.length > 1) lastRouteOrigin.current = originKey;
      // Prefer a successful road route; never swap a good route for a straight line.
      setWarehouseRoute((prev) => {
        if (route && route.length > 1) return route;
        return prev ?? ([[start.lat, start.lng] as LatLngExpression, [end.lat, end.lng] as LatLngExpression]);
      });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [routeToWarehouse, driverPosition, warehousePos]);

  /* ─── Geometry helpers ─── */
  const totalDistanceKm = useMemo(() => {
    if (breadcrumbs.length < 2) return 0;
    let d = 0;
    for (let i = 1; i < breadcrumbs.length; i++) {
      const R = 6371;
      const dLat = ((breadcrumbs[i].lat - breadcrumbs[i - 1].lat) * Math.PI) / 180;
      const dLng = ((breadcrumbs[i].lng - breadcrumbs[i - 1].lng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((breadcrumbs[i - 1].lat * Math.PI) / 180) * Math.cos((breadcrumbs[i].lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      d += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    return d;
  }, [breadcrumbs]);

  const deliveredCount = useMemo(() => shipments.filter((s) => s.status === 'delivered').length, [shipments]);
  const totalCount = routeStops.length;

  /* ─── Build planned route polyline (from stops + driver) ─── */
  const planPolyline: LatLngExpression[] = useMemo(() => {
    if (orsRoute) return orsRoute;
    const points = routeStops
      .map((s) => s.coordinates)
      .filter((c): c is { lat: number; lng: number } => !!c);
    const all = driverPosition
      ? [[driverPosition[0], driverPosition[1]] as LatLngTuple, ...points.map((p) => [p.lat, p.lng] as LatLngTuple)]
      : points.map((p) => [p.lat, p.lng] as LatLngTuple);
    return all;
  }, [orsRoute, routeStops, driverPosition]);

  /* ─── Build breadcrumb polyline ─── */
  const breadcrumbPolyline: LatLngExpression[] = useMemo(
    () => breadcrumbs.map((b) => [b.lat, b.lng] as LatLngExpression),
    [breadcrumbs],
  );

  /* ─── Center of all points ─── */
  const defaultCenter: LatLngTuple = useMemo(() => {
    if (driverPosition) return driverPosition;
    if (routeStops.length > 0 && routeStops[0].coordinates) {
      return [routeStops[0].coordinates.lat, routeStops[0].coordinates.lng];
    }
    return [30.0444, 31.2357]; // Cairo fallback
  }, [driverPosition, routeStops]);

  const defaultZoom = driverPosition ? 15 : 13;

  return (
    <div className="relative h-[100dvh] w-full bg-gray-100">
      {/* ─── Back Button Overlay ─── */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute top-4 right-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm active:scale-95 transition-transform"
      >
        <ArrowLeft size={22} className="text-gray-700" />
      </button>

      {/* ─── Re-center Button ─── */}
      <button
        type="button"
        onClick={() => setRecenterTick((t) => t + 1)}
        className="absolute top-4 left-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm active:scale-95 transition-transform"
      >
        <Crosshair size={20} className="text-emerald-600" />
      </button>

      {/* ─── Map mode switcher (standard/satellite/terrain) ─── */}
      <div className="absolute left-1/2 top-4 z-[1000] flex -translate-x-1/2 gap-1 rounded-full bg-white/95 p-1 shadow-lg backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setMapMode('standard')}
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
            mapMode === 'standard' ? 'bg-emerald-500 text-white shadow' : 'text-gray-600'
          }`}
        >
          قياسي
        </button>
        <button
          type="button"
          onClick={() => setMapMode('satellite')}
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
            mapMode === 'satellite' ? 'bg-emerald-500 text-white shadow' : 'text-gray-600'
          }`}
        >
          قمر صناعي
        </button>
        <button
          type="button"
          onClick={() => setMapMode('terrain')}
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
            mapMode === 'terrain' ? 'bg-emerald-500 text-white shadow' : 'text-gray-600'
          }`}
        >
          تضاريس
        </button>
      </div>

      {/* ─── Low GPS accuracy warning ─── */}
      {driverPosition && gpsAccuracy != null && gpsAccuracy > 50 ? (
        <div className="absolute bottom-24 left-1/2 z-[1000] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl bg-red-500/95 px-4 py-2.5 text-center shadow-lg backdrop-blur-sm">
          <p className="text-[12px] font-semibold text-white">
            دقة الموقع ضعيفة (حوالي ±{Math.round(gpsAccuracy)}م) — تأكد من تشغيل GPS عالي الدقة والوقوف بمكان مفتوح
          </p>
        </div>
      ) : null}

      {/* ─── Map ─── */}
      <MapContainer center={defaultCenter} zoom={defaultZoom} className="h-full w-full" zoomControl={false}>
        <TileLayer key={mapMode} attribution={TILE_SOURCES[mapMode].attribution} url={TILE_SOURCES[mapMode].url} />
        {mapMode === 'satellite' && (
          <TileLayer opacity={1} attribution="Labels &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
        )}
        <InvalidateSize />
        {driverPosition ? <FlyTo center={driverPosition} tick={recenterTick} /> : null}

        {/* Planned route polyline (blue dashed) */}
        {planPolyline.length > 1 && (
          <Polyline
            positions={planPolyline}
            pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.7, dashArray: '8 6' }}
          />
        )}

        {/* Actual traveled path (green solid) */}
        {breadcrumbPolyline.length > 1 && (
          <Polyline
            positions={breadcrumbPolyline}
            pathOptions={{ color: '#16a34a', weight: 5, opacity: 0.85 }}
          />
        )}

        {/* Warehouse route polyline (orange, when toggled) */}
        {routeToWarehouse && warehouseRoute && warehouseRoute.length > 1 ? (
          <Polyline
            positions={warehouseRoute}
            pathOptions={{ color: '#f59e0b', weight: 5, opacity: 0.9 }}
          />
        ) : null}

        {/* Warehouse marker */}
        {warehousePos ? (
          <Marker
            position={warehousePos}
            icon={warehouseIcon()}
            eventHandlers={{
              click: () => {
                setRouteToWarehouse((v) => !v);
                setRecenterTick((t) => t + 1);
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -38]} opacity={1}>
              <div className="text-center">
                <div className="font-bold">{warehouseName ?? 'المخزن'}</div>
                <div className="text-[10px] text-gray-500">اضغط للمسار</div>
              </div>
            </Tooltip>
          </Marker>
        ) : null}

        {/* Completed stop markers */}
        {shipments
          .filter((s) => s.status === 'delivered' && s.coordinates)
          .map((s) => (
            <Marker
              key={`done-${s.id}`}
              position={[s.coordinates!.lat, s.coordinates!.lng]}
              icon={completedIcon()}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                ✓ {s.customerName ?? ''}
              </Tooltip>
            </Marker>
          ))}

        {/* Active stop markers */}
        {routeStops.map((shipment, index) => {
          const c = shipment.coordinates;
          if (!c) return null;
          const isActive = shipment.id === nextActionableShipmentId;
          const done = shipment.status === 'delivered';
          if (done) return null;

          return (
            <Marker
              key={shipment.id}
              position={[c.lat, c.lng]}
              icon={isActive ? stopIcon(index + 1, true) : stopIcon(index + 1, false)}
            >
              <Tooltip direction="top" offset={[0, -14]} opacity={1}>
                <div className="text-center">
                  <div className="font-bold">{index + 1}. {shipment.customerName ?? ''}</div>
                  {isActive && <div className="text-emerald-600 font-semibold">← التوصيل الحالي</div>}
                </div>
              </Tooltip>
              <Popup>
                <div className="min-w-[160px] text-sm">
                  <div className="font-bold mb-1">{shipment.customerName ?? `#${shipment.id}`}</div>
                  {shipment.address && <div className="text-gray-500 text-xs">{shipment.address}</div>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Driver marker */}
        {driverPosition && (
          <>
            {gpsAccuracy && gpsAccuracy > 0 && gpsAccuracy <= 2000 ? (
              <Circle center={driverPosition} radius={Math.max(gpsAccuracy, 5)} pathOptions={{ color: '#10b981', weight: 1, opacity: 0.5, fillColor: '#10b981', fillOpacity: 0.08 }} />
            ) : null}
            <Marker position={driverPosition} icon={driverIcon(heading)}>
              <Tooltip direction="top" offset={[0, -22]} opacity={1}>
                <span className="font-semibold text-emerald-700">
                  موقعك الحالي{gpsAccuracy ? `  (±${Math.round(gpsAccuracy)}م)` : ''}
                </span>
              </Tooltip>
            </Marker>
          </>
        )}
      </MapContainer>

      {/* ─── Route-to-warehouse toggle button ─── */}
      {warehousePos ? (
        <button
          type="button"
          onClick={() => {
            setRouteToWarehouse((v) => !v);
            setRecenterTick((t) => t + 1);
          }}
          className={`absolute bottom-44 right-4 z-[1000] flex items-center gap-1.5 rounded-full px-3.5 py-2.5 shadow-lg backdrop-blur-sm active:scale-95 transition-all border ${
            routeToWarehouse
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-white/95 text-gray-800 border-gray-200'
          }`}
        >
          <Navigation size={15} />
          <span className={`text-xs font-semibold ${routeToWarehouse ? 'text-white' : 'text-gray-800'}`}>
            {routeToWarehouse ? 'إخفاء مسار المخزن' : 'مسار إلى المخزن'}
          </span>
        </button>
      ) : null}

      {/* ─── Bottom Info Panel ─── */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000]">
        <div className="mx-4 mb-4 rounded-2xl bg-white/95 shadow-2xl backdrop-blur-md border border-gray-200 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-gray-200">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (deliveredCount / totalCount) * 100 : 0}%` }}
            />
          </div>

          <div className="p-4">
            {/* Stats row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Package size={14} className="text-blue-500" />
                  <span>{deliveredCount}/{totalCount} تم</span>
                </div>
                {totalDistanceKm > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin size={12} />
                    <span>{totalDistanceKm.toFixed(1)} كم</span>
                  </div>
                )}
              </div>
              {trackingStatus && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  trackingStatus === 'in_progress' ? 'bg-emerald-100 text-emerald-700' :
                  trackingStatus === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {trackingStatus === 'in_progress' ? 'جاري' : trackingStatus === 'completed' ? 'مكتمل' : trackingStatus}
                </span>
              )}
            </div>

            {/* Current stop info */}
            {activeStop ? (
              <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Truck size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-emerald-600 uppercase">التوصيل الحالي</div>
                  <div className="text-sm font-bold text-gray-900 truncate">
                    {activeStop.customerName ?? `طلب #${activeStop.id}`}
                  </div>
                  {activeStop.address && (
                    <div className="text-[11px] text-gray-500 truncate">{activeStop.address}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-sm text-gray-400 py-2">
                {totalCount === 0 ? 'لا توجد نقاط توقف في الخطة' : 'تم التسليم لجميع النقاط'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
