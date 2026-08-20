import { supabase } from '@/lib/supabase';

export type DriverLocationPing = {
  profileId: string;
  lat: number;
  lng: number;
  accuracyMeters?: number | null;
  altitudeMeters?: number | null;
  headingDegrees?: number | null;
  speedMps?: number | null;
  activePlanId?: string | null;
};

export type DriverLocation = {
  lat: number;
  lng: number;
  accuracyMeters: number | null;
  altitudeMeters: number | null;
  headingDegrees: number | null;
  speedMps: number | null;
};

function toNullableNumber(value: number | null) {
  return Number.isFinite(value) ? value : null;
}

let cachedLocation: DriverLocation | null = null;
let cachedLocationAt = 0;
const LOCATION_CACHE_MS = 30_000;

export function getCurrentDriverLocation(timeout = 8_000): Promise<DriverLocation> {
  const now = Date.now();
  if (cachedLocation && now - cachedLocationAt < LOCATION_CACHE_MS) {
    return Promise.resolve(cachedLocation);
  }

  if (!('geolocation' in navigator)) {
    return Promise.reject(new Error('GPS location is required for this driver action.'));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: DriverLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: toNullableNumber(position.coords.accuracy),
          altitudeMeters: toNullableNumber(position.coords.altitude),
          headingDegrees: toNullableNumber(position.coords.heading),
          speedMps: toNullableNumber(position.coords.speed),
        };
        cachedLocation = loc;
        cachedLocationAt = Date.now();
        resolve(loc);
      },
      (error) => {
        if (cachedLocation) {
          resolve(cachedLocation);
        } else {
          reject(new Error(error.message || 'Unable to read driver GPS location.'));
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout,
      },
    );
  });
}

export async function publishDriverLocationPing(input: DriverLocationPing) {
  // Insert into location_tracking table
  const { error } = await supabase.from('location_tracking').insert({
    user_id: input.profileId,
    lat: input.lat,
    lng: input.lng,
    accuracy_meters: input.accuracyMeters ?? null,
    altitude_meters: input.altitudeMeters ?? null,
    heading_degrees: input.headingDegrees ?? null,
    speed_mps: input.speedMps ?? null,
    plan_id: input.activePlanId ?? null,
    metadata: {
      source: 'driver_app',
      visibility_state: document.visibilityState,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  // Also append to route tracking if there's an active plan
  if (input.activePlanId) {
    try {
      await supabase.rpc('driver_append_route_breadcrumb', {
        p_plan_id: input.activePlanId,
        p_lat: input.lat,
        p_lng: input.lng,
        p_accuracy: input.accuracyMeters ?? null,
        p_speed: input.speedMps ?? null,
      });
    } catch {
      // Non-critical, ignore errors
    }
  }
}
