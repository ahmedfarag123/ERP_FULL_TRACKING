import { useEffect, useRef } from 'react';
import { publishDriverLocationPing } from '@/services/locationTracking';
import { useDeliveryStore } from '@/stores/deliveryStore';

const MIN_PING_INTERVAL_MS = 15_000;
const BACKGROUND_PING_INTERVAL_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const BACKGROUND_HEARTBEAT_INTERVAL_MS = 60_000;

function toNullableNumber(value: number | null) {
  return Number.isFinite(value) ? value : null;
}

export function useDriverLocationTracking(input: {
  isAuthenticated: boolean;
  requiresPasswordChange: boolean;
  profileId: string | null | undefined;
}) {
  const lastSentAtRef = useRef(0);
  const lastPositionRef = useRef<GeolocationPosition | null>(null);

  useEffect(() => {
    if (!input.isAuthenticated || input.requiresPasswordChange || !input.profileId) return;
    if (!('geolocation' in navigator)) return;

    let cancelled = false;
    let watchId: number | null = null;
    let heartbeatId: number | null = null;

    const isBackground = () =>
      document.visibilityState === 'hidden' || document.hidden;

    const getPingInterval = () =>
      isBackground() ? BACKGROUND_PING_INTERVAL_MS : MIN_PING_INTERVAL_MS;

    const getHeartbeatInterval = () =>
      isBackground() ? BACKGROUND_HEARTBEAT_INTERVAL_MS : HEARTBEAT_INTERVAL_MS;

    const publishPosition = async (position: GeolocationPosition, force = false) => {
      if (cancelled) return;
      const now = Date.now();
      const interval = getPingInterval();
      if (!force && now - lastSentAtRef.current < interval) return;

      lastSentAtRef.current = now;
      lastPositionRef.current = position;

      const shipments = useDeliveryStore.getState().shipments;
      const activeShipment = shipments.find((s) => s.status === 'in_transit' && s.planId);
      const activePlanId = activeShipment?.planId ?? null;

      try {
        await publishDriverLocationPing({
          profileId: input.profileId!,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: toNullableNumber(position.coords.accuracy),
          altitudeMeters: toNullableNumber(position.coords.altitude),
          headingDegrees: toNullableNumber(position.coords.heading),
          speedMps: toNullableNumber(position.coords.speed),
          activePlanId,
        });
      } catch {
        lastSentAtRef.current = 0;
      }
    };

    const positionOptions: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 15_000,
      timeout: 20_000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => void publishPosition(position, true),
      () => undefined,
      positionOptions,
    );

    watchId = navigator.geolocation.watchPosition(
      (position) => void publishPosition(position),
      () => undefined,
      positionOptions,
    );

    const startHeartbeat = (intervalMs: number) => {
      if (heartbeatId != null) window.clearInterval(heartbeatId);
      heartbeatId = window.setInterval(() => {
        if (lastPositionRef.current) {
          void publishPosition(lastPositionRef.current, true);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => void publishPosition(position, true),
          () => undefined,
          positionOptions,
        );
      }, intervalMs);
    };

    startHeartbeat(HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (cancelled) return;
      startHeartbeat(getHeartbeatInterval());
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (heartbeatId != null) window.clearInterval(heartbeatId);
    };
  }, [input.isAuthenticated, input.profileId, input.requiresPasswordChange]);
}
