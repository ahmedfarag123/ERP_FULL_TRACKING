import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L, { type LatLngExpression } from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Navigation, Warehouse } from 'lucide-react';
import { useDeliveryStore } from '@/stores/deliveryStore';

const ORS_API_KEY = String(import.meta.env.VITE_ORS_API_KEY ?? '').trim();

const FALLBACK_WAREHOUSE = { label: 'Horeca Marg', lat: 30.157468, lng: 31.359598 };

type MapMode = 'standard' | 'satellite' | 'terrain';
const TILE_SOURCES: Record<MapMode, { url: string; attribution: string }> = {
  standard: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap' },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri' },
  terrain: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: 'Map data: &copy; OpenTopoMap (CC-BY-SA)' },
};

type Props = {
  heightClass?: string;
};

/* ─── Leaflet sub-components ─────────────────────────── */

function MapController({
  center,
  boundsPoints,
}: {
  center: [number, number] | null;
  boundsPoints: Array<[number, number]>;
}) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (!map) return;
    if (boundsPoints.length >= 2) {
      map.fitBounds(boundsPoints, { padding: [28, 28], maxZoom: 15 });
    } else if (center) {
      map.setView(center, 15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1], boundsPoints.map((p) => `${p[0]},${p[1]}`).join('|')]);

  return null;
}

function driverIconPulse() {
  return L.divIcon({
    className: '',
    html: `<div class="driver-pin">
      <div class="driver-pin-pulse"></div>
      <div class="driver-pin-core"></div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
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

function stopNumberIcon(n: number, isActive: boolean) {
  const bg = isActive ? '#f43f5e' : '#059669';
  return L.divIcon({
    className: '',
    html: `<div class="stop-pin" style="background:${bg}">${n}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

/* ─── ORS routing helper ─────────────────────────────── */

async function fetchOsrmRoute(points: { lat: number; lng: number }[]): Promise<LatLngExpression[] | null> {
  if (points.length < 2) return null;
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`);
    if (!r.ok) return null;
    const payload = await r.json();
    const coordsOut = payload?.routes?.[0]?.geometry?.coordinates as Array<[number, number]> | undefined;
    if (!coordsOut?.length) return null;
    return coordsOut.map(([lng, lat]) => [lat, lng] as LatLngExpression);
  } catch {
    return null;
  }
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

/* ─── Main Component ─────────────────────────────────── */

export default function DriverDashboardMap({ heightClass = 'h-64' }: Props) {
  const navigate = useNavigate();
  const shipments = useDeliveryStore((s) => s.shipments);
  const activePlanId = useDeliveryStore((s) => s.activePlanId);
  const getRouteGate = useDeliveryStore((s) => s.getRouteGate);

  const [orsRoute, setOrsRoute] = useState<LatLngExpression[] | null>(null);
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>('standard');

  const { nextActionableShipmentId } = getRouteGate(activePlanId ?? undefined);

  /* Only show stops/route when a plan is active */
  const hasPlan = Boolean(activePlanId);
  const routeStops = useMemo(
    () =>
      shipments
        .filter((s) => s.status !== 'delivered' && s.status !== 'failed' && s.coordinates)
        .slice()
        .sort((a, b) => (a.routeOrder ?? Number.MAX_SAFE_INTEGER) - (b.routeOrder ?? Number.MAX_SAFE_INTEGER)),
    [shipments],
  );

  /* Resolve warehouse from the plan's shipments */
  const warehouse = useMemo(() => {
    const withWh = routeStops.find((s) => s.warehouseCoordinates);
    if (withWh?.warehouseCoordinates) {
      return {
        label: withWh.warehouseOrigin && withWh.warehouseOrigin !== 'null' ? withWh.warehouseOrigin : 'المخزن',
        lat: withWh.warehouseCoordinates.lat,
        lng: withWh.warehouseCoordinates.lng,
      };
    }
    return FALLBACK_WAREHOUSE;
  }, [routeStops]);

  /* ─── GPS watch (always on) ─── */
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const opts: PositionOptions = { enableHighAccuracy: true, maximumAge: 2_000, timeout: 20_000 };
    const lastPos = { current: null as [number, number] | null };
    let driftWarnings = 0;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        const acc = pos.coords.accuracy ?? 0;
        let accepted = true;
        if (lastPos.current) {
          const jump = Math.hypot(p[0] - lastPos.current[0], p[1] - lastPos.current[1]) > 0.002 && acc > 30;
          if (jump) {
            driftWarnings += 1;
            accepted = driftWarnings > 3;
          } else {
            driftWarnings = 0;
          }
        }
        if (!accepted) return;
        lastPos.current = p;
        setDriverPos(p);
      },
      () => {},
      opts,
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  /* ─── ORS route when plan active ─── */
  const routeKey = useMemo(
    () => (hasPlan ? routeStops.map((s) => `${s.coordinates!.lat},${s.coordinates!.lng}`).join('|') : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasPlan],
  );

  useEffect(() => {
    if (!hasPlan) { setOrsRoute(null); return; }
    let cancelled = false;
    const stops = routeStops.map((s) => s.coordinates!);
    const points = driverPos ? [{ lat: driverPos[0], lng: driverPos[1] }, ...stops] : stops;
    if (points.length < 2) {
      setOrsRoute(null);
      return;
    }
    const timer = setTimeout(async () => {
      const route = await fetchRoute(points);
      if (!cancelled) setOrsRoute(route);
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [routeKey, driverPos, hasPlan, routeStops]);

  const planPolyline: LatLngExpression[] = useMemo(() => {
    if (!hasPlan) return [];
    if (orsRoute) return orsRoute;
    const pts = routeStops.map((s) => s.coordinates!).map((c) => [c.lat, c.lng] as LatLngExpression);
    return driverPos ? [[driverPos[0], driverPos[1]] as LatLngExpression, ...pts] : pts;
  }, [hasPlan, orsRoute, routeStops, driverPos]);

  const boundsPoints = useMemo(() => {
    const pts: Array<[number, number]> = [];
    if (driverPos) pts.push(driverPos);
    if (hasPlan) {
      if (routeStops[0]) pts.push([routeStops[0].coordinates!.lat, routeStops[0].coordinates!.lng]);
      if (routeStops.length > 1) pts.push([routeStops[routeStops.length - 1].coordinates!.lat, routeStops[routeStops.length - 1].coordinates!.lng]);
    }
    pts.push([warehouse.lat, warehouse.lng]);
    return pts;
  }, [driverPos, hasPlan, routeStops, warehouse]);

  const fallbackCenter: [number, number] | null = driverPos ?? (hasPlan && routeStops[0] ? [routeStops[0].coordinates!.lat, routeStops[0].coordinates!.lng] : null);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <MapContainer
        center={[warehouse.lat, warehouse.lng]}
        zoom={14}
        zoomControl={false}
        attributionControl={false}
        className={`${heightClass} w-full`}
        scrollWheelZoom={false}
        touchZoom={false}
        dragging={false}
      >
        <TileLayer key={mapMode} attribution={TILE_SOURCES[mapMode].attribution} url={TILE_SOURCES[mapMode].url} />
        {mapMode === 'satellite' && (
          <TileLayer opacity={1} attribution="Labels &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
        )}
        <MapController center={fallbackCenter} boundsPoints={boundsPoints} />

        {/* Route polyline (only with plan) */}
        {hasPlan && planPolyline.length > 1 ? (
          <Polyline positions={planPolyline} pathOptions={{ color: '#059669', weight: 4, opacity: 0.75, dashArray: '7 7' }} />
        ) : null}

        {/* Warehouse marker (always visible) */}
        <Marker position={[warehouse.lat, warehouse.lng]} icon={warehouseIcon()}>
          <Tooltip direction="top" offset={[0, -34]} opacity={1}>
            <span className="font-semibold">{warehouse.label}</span>
          </Tooltip>
        </Marker>

        {/* Stop markers (only with plan) */}
        {hasPlan
          ? routeStops.map((shipment, index) => {
              const c = shipment.coordinates!;
              const isActive = shipment.id === nextActionableShipmentId;
              return (
                <Marker key={shipment.id} position={[c.lat, c.lng]} icon={stopNumberIcon(index + 1, isActive)}>
                  <Tooltip direction="top" offset={[0, -14]} opacity={1}>
                    <div className="text-xs text-center">
                      <span className="font-bold">{index + 1}. </span>
                      <span className="font-semibold">{shipment.customerName}</span>
                      {isActive && <div className="text-emerald-600 font-bold">← هنا</div>}
                    </div>
                  </Tooltip>
                </Marker>
              );
            })
          : null}

        {/* Driver marker (always) */}
        {driverPos ? (
          <Marker position={driverPos} icon={driverIconPulse()} zIndexOffset={1000}>
            <Tooltip direction="top" offset={[0, -24]} opacity={1}>
              <span className="font-semibold text-emerald-700">انت هنا</span>
            </Tooltip>
          </Marker>
        ) : null}
      </MapContainer>

      {/* ─── Overlays ─── */}
      {/* Live badge */}
      <div className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1.5 backdrop-blur-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
        </span>
        <span className="text-[10px] font-bold text-white">مباشر</span>
      </div>

      {/* Map mode cycle button */}
      <button
        type="button"
        onClick={() =>
          setMapMode((m) => (m === 'standard' ? 'satellite' : m === 'satellite' ? 'terrain' : 'standard'))
        }
        className="absolute right-3 top-3 z-[500] flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1.5 shadow backdrop-blur-sm active:scale-95 transition-transform"
      >
        <Layers size={12} />
        <span className="text-[10px] font-semibold text-gray-700">
          {mapMode === 'standard' ? 'قياسي' : mapMode === 'satellite' ? 'قمر صناعي' : 'تضاريس'}
        </span>
      </button>

      {/* Status / action chip */}
      <button
        type="button"
        onClick={() => navigate('/live-map')}
        className="absolute bottom-3 right-3 z-[500] flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 shadow-lg backdrop-blur-sm active:scale-95 transition-transform"
      >
        <Navigation size={14} className="text-emerald-600" />
        <span className="text-xs font-semibold text-gray-800">تعقب مباشر</span>
      </button>

      {/* Warehouse quick badge (always visible) */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1.5 shadow backdrop-blur-sm">
        <Warehouse size={12} className="text-amber-600" />
        <span className="text-[10px] font-semibold text-gray-700">{warehouse.label}</span>
      </div>
    </div>
  );
}