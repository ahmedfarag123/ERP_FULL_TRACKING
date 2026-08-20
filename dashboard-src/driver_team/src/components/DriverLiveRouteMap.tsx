import { useEffect, useMemo, useState } from 'react';
import L, { type LatLngBoundsExpression, type LatLngExpression } from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Shipment } from '@/types';

type DriverLiveRouteMapProps = {
  shipments: Shipment[];
  activeShipmentId: string | null;
};

type Position = { lat: number; lng: number };

const ORS_API_KEY = String(import.meta.env.VITE_ORS_API_KEY ?? '').trim();

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
  }, [bounds, map]);

  return null;
}

function markerIcon(label: string, tone: 'driver' | 'stop') {
  const className =
    tone === 'driver'
      ? 'flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-xs font-bold text-white shadow'
      : 'flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-xs font-bold text-white shadow';

  return L.divIcon({
    className: '',
    html: `<div class="${className}">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function toPosition(shipment: Shipment): Position | null {
  return shipment.coordinates ? { lat: shipment.coordinates.lat, lng: shipment.coordinates.lng } : null;
}

async function fetchOrsRoute(points: Position[]) {
  if (!ORS_API_KEY || points.length < 2) return null;

  const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: {
      Authorization: ORS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: points.map((point) => [point.lng, point.lat]),
    }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await response.json());
    } catch {
      detail = await response.text().catch(() => '');
    }
    console.error(`[ORS] directions failed: ${response.status}${detail ? ` — ${detail}` : ''}`);
    return null;
  }

  const payload = (await response.json()) as {
    features?: Array<{ geometry?: { coordinates?: Array<[number, number]> } }>;
  };

  const coordinates = payload.features?.[0]?.geometry?.coordinates;
  if (!coordinates?.length) return null;

  return coordinates.map(([lng, lat]) => [lat, lng] as LatLngExpression);
}

export default function DriverLiveRouteMap({ shipments, activeShipmentId }: DriverLiveRouteMapProps) {
  const [driverPosition, setDriverPosition] = useState<Position | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [orsRoute, setOrsRoute] = useState<LatLngExpression[] | null>(null);

  const geoSupported = useMemo(() => 'geolocation' in navigator, []);

  const routeStops = useMemo(
    () =>
      shipments
        .filter((shipment) => shipment.status !== 'delivered' && shipment.status !== 'failed' && shipment.coordinates)
        .slice()
        .sort((a, b) => {
          const aSeq = a.routeOrder ?? Number.MAX_SAFE_INTEGER;
          const bSeq = b.routeOrder ?? Number.MAX_SAFE_INTEGER;
          return aSeq - bSeq;
        }),
    [shipments],
  );

  const routePoints = useMemo(() => {
    const stopPoints = routeStops.map(toPosition).filter((point): point is Position => Boolean(point));
    return driverPosition ? [driverPosition, ...stopPoints] : stopPoints;
  }, [driverPosition, routeStops]);

  const routePointsKey = routePoints.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');

  useEffect(() => {
    if (!geoSupported) return;

    const options: PositionOptions = { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGeoError(null);
        setDriverPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === error.TIMEOUT && options.enableHighAccuracy) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setGeoError(null);
              setDriverPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (fallbackError) => {
              setGeoError(fallbackError.code === fallbackError.PERMISSION_DENIED ? 'تم رفض الإذن لتحديد الموقع' : 'تعذّر تحديد موقعك الحالي');
            },
            { enableHighAccuracy: false, maximumAge: 60_000, timeout: 20_000 },
          );
        } else {
          setGeoError(error.code === error.PERMISSION_DENIED ? 'تم رفض الإذن لتحديد الموقع' : 'تعذّر تحديد موقعك الحالي');
        }
      },
      options,
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [geoSupported]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const nextRoute = await fetchOrsRoute(routePoints);
      if (!cancelled) setOrsRoute(nextRoute);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePointsKey]);

  const polylinePositions = orsRoute ?? routePoints.map((point) => [point.lat, point.lng] as LatLngExpression);

  if (routePoints.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl bg-gray-100 text-sm font-medium text-app-text-secondary">
        {geoSupported ? 'لا توجد إحداثيات متاحة للخريطة' : 'المتصفح لا يدعم تحديد الموقع'}
      </div>
    );
  }

  const center = polylinePositions[0];
  const bounds = polylinePositions as LatLngBoundsExpression;

  return (
    <div className="h-56 overflow-hidden rounded-xl border border-gray-200">
      {geoError ? (
        <div className="absolute right-2 top-2 z-[1000] rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 shadow ring-1 ring-red-200">
          {geoError}
        </div>
      ) : null}
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds bounds={bounds} />
        {polylinePositions.length > 1 ? (
          <Polyline positions={polylinePositions} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85 }} />
        ) : null}
        {driverPosition ? (
          <Marker position={[driverPosition.lat, driverPosition.lng]} icon={markerIcon('GPS', 'driver')}>
            <Tooltip direction="top" offset={[0, -12]} opacity={1}>
              موقعك الحالي
            </Tooltip>
          </Marker>
        ) : null}
        {routeStops.map((shipment, index) => {
          const position = toPosition(shipment);
          if (!position) return null;
          const isActive = shipment.id === activeShipmentId;

          return (
            <CircleMarker
              key={shipment.id}
              center={[position.lat, position.lng]}
              radius={isActive ? 12 : 9}
              pathOptions={{
                color: isActive ? '#ef4444' : '#2563eb',
                fillColor: isActive ? '#ef4444' : '#2563eb',
                fillOpacity: 0.22,
                weight: 3,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                {index + 1}. {shipment.customerName ?? shipment.address ?? shipment.id}
              </Tooltip>
            </CircleMarker>
          );
        })}
        {routeStops.map((shipment, index) => {
          const position = toPosition(shipment);
          if (!position) return null;
          return (
            <Marker
              key={`${shipment.id}-number`}
              position={[position.lat, position.lng]}
              icon={markerIcon(String(index + 1), 'stop')}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
