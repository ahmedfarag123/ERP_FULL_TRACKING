export interface GeoPoint {
  lat: number;
  lng: number;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function distanceKilometers(a: GeoPoint, b: GeoPoint): number {
  return distanceMeters(a, b) / 1000;
}

export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters).toLocaleString("ar-EG")} م`;
  }
  return `${(meters / 1000).toLocaleString("ar-EG", { maximumFractionDigits: 1 })} كم`;
}

export function formatDistanceKm(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000).toLocaleString("ar-EG")} م`;
  }
  return `${km.toLocaleString("ar-EG", { maximumFractionDigits: 1 })} كم`;
}

export function googleMapsUrl(point: GeoPoint): string {
  return `https://www.google.com/maps?q=${point.lat},${point.lng}`;
}

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
