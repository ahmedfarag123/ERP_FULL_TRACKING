export type TripPing = {
  capturedAt: string;
  lat: number;
  lng: number;
  accuracyMeters?: number | null;
};

export type TripCustomer = {
  id: string;
  name: string | null;
  lat: number;
  lng: number;
  status: string | null;
  routeSequence: number | null;
};

export type TripWarehouse = {
  name?: string | null;
  lat: number;
  lng: number;
};

export type TripStop = {
  kind: "customer" | "warehouse" | "other";
  customerId?: string;
  label: string;
  lat: number;
  lng: number;
  arrivedAt: string;
  departedAt: string | null;
  dwellSeconds: number;
  status: string | null;
};

export type TripLeg = {
  toStopIndex: number;
  durationSeconds: number;
  straightKm: number;
};

export type TripReport = {
  pings: number;
  spanSeconds: number;
  stops: TripStop[];
  customerStops: number;
  idleStops: number;
  totalStopSeconds: number;
  driveSeconds: number;
  driveKm: number;
  visits: number;
  legs: TripLeg[];
};

const MOVE_EPS_M = 25;
const ACC_FACTOR = 2.5;
const MIN_STOP_SECONDS = 45;
const MAX_CUSTOMER_MATCH_M = 120;
const MAX_WAREHOUSE_MATCH_M = 150;
const MERGE_GAP_SECONDS = 60;
const MERGE_DIST_M = 40;

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function toMs(value: string): number | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

type StopRun = {
  start: number;
  end: number;
  lat: number;
  lng: number;
  acc: number;
};

type MutableStopRun = Omit<StopRun, "start"> & { start: number };

const EMPTY_REPORT: TripReport = {
  pings: 0,
  spanSeconds: 0,
  stops: [],
  customerStops: 0,
  idleStops: 0,
  totalStopSeconds: 0,
  driveSeconds: 0,
  driveKm: 0,
  visits: 0,
  legs: [],
};

export function analyzeDriverTrip(
  pings: TripPing[],
  customers: TripCustomer[],
  warehouse?: TripWarehouse | null
): TripReport {
  const pts = pings
    .map((p) => {
      const t = toMs(p.capturedAt);
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (t === null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        t,
        lat,
        lng,
        acc: Number(p.accuracyMeters) && Number.isFinite(Number(p.accuracyMeters)) && Number(p.accuracyMeters) > 0
          ? Number(p.accuracyMeters)
          : 10,
      };
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .sort((a, b) => a.t - b.t);

  if (pts.length < 2) return { ...EMPTY_REPORT, pings: pts.length };

  const runs: MutableStopRun[] = [];
  let cluster: typeof pts = [];
  let cLat = 0;
  let cLng = 0;
  let cN = 0;

  const flush = () => {
    if (cluster.length === 0) return;
    const start = Math.min(...cluster.map((p) => p.t));
    const end = Math.max(...cluster.map((p) => p.t));
    const lat = cluster.reduce((s, p) => s + p.lat, 0) / cluster.length;
    const lng = cluster.reduce((s, p) => s + p.lng, 0) / cluster.length;
    const acc = cluster.reduce((s, p) => s + p.acc, 0) / cluster.length;
    runs.push({ start, end, lat, lng, acc });
    cluster = [];
    cLat = 0;
    cLng = 0;
    cN = 0;
  };

  for (const p of pts) {
    if (cluster.length === 0) {
      cluster = [p];
      cLat = p.lat;
      cLng = p.lng;
      continue;
    }
    const eps = Math.max(MOVE_EPS_M, p.acc * ACC_FACTOR);
    if (haversineM({ lat: cLat, lng: cLng }, { lat: p.lat, lng: p.lng }) <= eps) {
      cluster.push(p);
      cLat = (cLat * cN + p.lat) / (cN + 1);
      cLng = (cLng * cN + p.lng) / (cN + 1);
      cN += 1;
    } else {
      flush();
      cluster = [p];
      cLat = p.lat;
      cLng = p.lng;
    }
  }
  flush();

  const stopRuns = runs
    .filter((r) => (r.end - r.start) / 1000 >= MIN_STOP_SECONDS)
    .sort((a, b) => a.start - b.start);

  const merged: StopRun[] = [];
  for (const r of stopRuns) {
    const prev = merged[merged.length - 1];
    if (prev && r.start - prev.end <= MERGE_GAP_SECONDS * 1000 && haversineM(prev, r) <= MERGE_DIST_M) {
      prev.start = prev.start;
      prev.end = r.end;
      prev.lat = (prev.lat + r.lat) / 2;
      prev.lng = (prev.lng + r.lng) / 2;
    } else {
      merged.push({ ...r });
    }
  }

  const used = new Set<string>();
  const stops: TripStop[] = [];
  for (const run of merged) {
    const loc = { lat: run.lat, lng: run.lng };
    let best: TripCustomer | null = null;
    let bestD = Infinity;
    for (const c of customers) {
      if (used.has(c.id)) continue;
      const d = haversineM(loc, c);
      if (d < bestD && d <= MAX_CUSTOMER_MATCH_M) {
        bestD = d;
        best = c;
      }
    }
    let kind: TripStop["kind"] = "other";
    let label = "وقفة";
    let customerId: string | undefined;
    let status: string | null = null;
    if (best) {
      used.add(best.id);
      kind = "customer";
      customerId = best.id;
      label = best.name ?? best.id;
      status = best.status;
    } else if (warehouse && haversineM(loc, warehouse) <= MAX_WAREHOUSE_MATCH_M) {
      kind = "warehouse";
      label = warehouse.name || "المستودع";
    }
    stops.push({
      kind,
      customerId,
      label,
      lat: run.lat,
      lng: run.lng,
      arrivedAt: new Date(run.start).toISOString(),
      departedAt: new Date(run.end).toISOString(),
      dwellSeconds: Math.round((run.end - run.start) / 1000),
      status,
    });
  }

  const legs: TripLeg[] = [];
  for (let i = 1; i < stops.length; i++) {
    const prevMs = toMs(stops[i - 1].departedAt ?? stops[i - 1].arrivedAt);
    const currMs = toMs(stops[i].arrivedAt);
    legs.push({
      toStopIndex: i,
      durationSeconds: prevMs !== null && currMs !== null ? Math.max(0, Math.round((currMs - prevMs) / 1000)) : 0,
      straightKm: haversineM(stops[i - 1], stops[i]) / 1000,
    });
  }

  const totalStopSeconds = stops.reduce((s, st) => s + st.dwellSeconds, 0);
  const spanSeconds = Math.max(0, Math.round((pts[pts.length - 1].t - pts[0].t) / 1000));

  return {
    pings: pts.length,
    spanSeconds,
    stops,
    customerStops: stops.filter((s) => s.kind === "customer").length,
    idleStops: stops.filter((s) => s.kind !== "customer").length,
    totalStopSeconds,
    driveSeconds: Math.max(0, spanSeconds - totalStopSeconds),
    driveKm: legs.reduce((s, l) => s + l.straightKm, 0),
    visits: stops.filter((s) => s.kind === "customer").length,
    legs,
  };
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}س ${m}د`;
  if (m > 0) return `${m}د ${sec}ث`;
  return `${sec}ث`;
}