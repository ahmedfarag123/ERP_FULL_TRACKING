import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type HeatPoint = {
  lat: number;
  lng: number;
  intensity?: number;
};

type MarkerPoint = {
  lat: number;
  lng: number;
  label: string;
  count?: number;
};

let heatReady: Promise<void> | null = null;
function ensureHeatLayer(): Promise<void> {
  if (!heatReady) {
    // Expose L on the window so leaflet.heat's IIFE can find it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).L = L;
    heatReady = import("leaflet.heat").then(() => {});
  }
  return heatReady;
}

function HeatmapLayer({
  points,
  radius = 25,
  blur = 15,
  maxZoom = 17,
}: {
  points: HeatPoint[];
  radius?: number;
  blur?: number;
  maxZoom?: number;
}) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureHeatLayer().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!map || !ready) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    if (points.length === 0) return;

    const heatData: [number, number, number][] = points.map((p) => [
      p.lat,
      p.lng,
      p.intensity ?? 1,
    ]);

    const layer = (L as any).heatLayer(heatData, {
      radius,
      blur,
      maxZoom,
      gradient: {
        0.2: "#eff6ff",
        0.4: "#60a5fa",
        0.6: "#3b82f6",
        0.8: "#2563eb",
        1.0: "#1d4ed8",
      },
    });

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points, radius, blur, maxZoom, ready]);

  return null;
}

function MarkerLayer({ markers }: { markers: MarkerPoint[] }) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    if (markers.length === 0) return;

    const group = L.layerGroup();

    markers.forEach((m) => {
      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="
          background: #2563eb;
          color: white;
          border-radius: 50%;
          width: ${m.count && m.count > 1 ? 32 : 24}px;
          height: ${m.count && m.count > 1 ? 32 : 24}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">${m.count && m.count > 1 ? m.count : ""}</div>`,
        iconSize: [m.count && m.count > 1 ? 32 : 24, m.count && m.count > 1 ? 32 : 24],
        iconAnchor: [m.count && m.count > 1 ? 16 : 12, m.count && m.count > 1 ? 16 : 12],
      });

      L.marker([m.lat, m.lng], { icon })
        .bindTooltip(m.label, { direction: "top", offset: [0, -8] })
        .addTo(group);
    });

    group.addTo(map);
    layerRef.current = group;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, markers]);

  return null;
}

function FitBounds({ points }: { points: HeatPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);

  return null;
}

export default function SalesHeatmap({
  heatPoints,
  markers = [],
  center = [30.0444, 31.2357],
  zoom = 11,
  height = "500px",
}: {
  heatPoints: HeatPoint[];
  markers?: MarkerPoint[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}) {
  const validHeatPoints = useMemo(
    () => heatPoints.filter((p) => p.lat && p.lng && !isNaN(p.lat) && !isNaN(p.lng)),
    [heatPoints],
  );

  return (
    <div
      className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validHeatPoints.length > 0 && (
          <HeatmapLayer points={validHeatPoints} />
        )}
        {markers.length > 0 && <MarkerLayer markers={markers} />}
        {validHeatPoints.length > 0 && <FitBounds points={validHeatPoints} />}
      </MapContainer>
    </div>
  );
}
