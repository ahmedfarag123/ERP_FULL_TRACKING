export type CustomerLocationKind =
  | "coordinates"
  | "google_maps_url"
  | "address_text"
  | "none";

export interface CustomerLocationInput {
  customer_name?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  customer_location?: string | null;
  google_maps_url?: string | null;
  governorate?: string | null;
  district?: string | null;
  place?: string | null;
  address_line?: string | null;
}

export interface ResolvedCustomerLocation {
  kind: CustomerLocationKind;
  displayText: string | null;
  mapUrl: string | null;
  lat: number | null;
  lng: number | null;
}

const COORDINATE_PATTERN = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;
const GOOGLE_MAPS_PATTERN = /^https?:\/\//i;
const GOOGLE_MAPS_HOST_PATTERN = /(maps\.app\.goo\.gl|goo\.gl\/maps|google\.[^/]+\/maps)/i;

function cleanText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumber(value: number | string | null | undefined) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidCoordinate(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function parseCoordinateText(value: string | null | undefined) {
  const match = cleanText(value)?.match(COORDINATE_PATTERN);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return isValidCoordinate(lat, lng) ? { lat, lng } : null;
}

function isGoogleMapsUrl(value: string | null | undefined) {
  const text = cleanText(value);
  return Boolean(text && GOOGLE_MAPS_PATTERN.test(text) && GOOGLE_MAPS_HOST_PATTERN.test(text));
}

function uniqueTextParts(parts: Array<string | null>) {
  const seen = new Set<string>();
  return parts.filter((part): part is string => {
    if (!part) return false;
    const key = part.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveCustomerLocation(customer: CustomerLocationInput): ResolvedCustomerLocation {
  const lat = normalizeNumber(customer.lat);
  const lng = normalizeNumber(customer.lng);
  if (lat != null && lng != null && isValidCoordinate(lat, lng)) {
    return {
      kind: "coordinates",
      displayText: `${lat}, ${lng}`,
      mapUrl: `https://www.google.com/maps?q=${lat},${lng}`,
      lat,
      lng,
    };
  }

  const googleMapsUrl = cleanText(customer.google_maps_url);
  if (isGoogleMapsUrl(googleMapsUrl)) {
    return {
      kind: "google_maps_url",
      displayText: "Google Maps",
      mapUrl: googleMapsUrl,
      lat: null,
      lng: null,
    };
  }

  const locationText = cleanText(customer.customer_location);
  if (isGoogleMapsUrl(locationText)) {
    return {
      kind: "google_maps_url",
      displayText: "Google Maps",
      mapUrl: locationText,
      lat: null,
      lng: null,
    };
  }

  const locationCoordinates = parseCoordinateText(locationText);
  if (locationCoordinates) {
    return {
      kind: "coordinates",
      displayText: `${locationCoordinates.lat}, ${locationCoordinates.lng}`,
      mapUrl: `https://www.google.com/maps?q=${locationCoordinates.lat},${locationCoordinates.lng}`,
      lat: locationCoordinates.lat,
      lng: locationCoordinates.lng,
    };
  }

  const addressText = uniqueTextParts([
    locationText,
    cleanText(customer.address_line),
    cleanText(customer.place),
    cleanText(customer.district),
    cleanText(customer.governorate),
  ]).join(", ");

  if (addressText) {
    const searchText = uniqueTextParts([cleanText(customer.customer_name), addressText]).join(", ");
    return {
      kind: "address_text",
      displayText: addressText,
      mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchText)}`,
      lat: null,
      lng: null,
    };
  }

  return {
    kind: "none",
    displayText: null,
    mapUrl: null,
    lat: null,
    lng: null,
  };
}
