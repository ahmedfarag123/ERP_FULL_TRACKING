import type { Customer } from '../types'

const SUPPORTED_CLASSES = new Set(['A', 'B', 'C', 'D', 'E'])

function toOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return undefined
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const numeric = Number(value)
    if (Number.isFinite(numeric)) return numeric
  }
  return undefined
}

function isEmail(value: string | undefined): boolean {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
}

function parseCoordinatePair(value: string | undefined): { lat: number; lng: number } | undefined {
  if (!value) return undefined
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(value)
  if (!match) return undefined

  const lat = Number(match[1])
  const lng = Number(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined

  return { lat, lng }
}

function normalizeCustomerClass(value: unknown): string | undefined {
  const raw = toOptionalString(value)?.toUpperCase()
  if (!raw) return undefined

  const firstLetter = raw[0]
  return SUPPORTED_CLASSES.has(firstLetter) ? firstLetter : undefined
}

function normalizeProductInterests(value: unknown): Customer['product_interests'] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toOptionalString(item))
      .filter((item): item is string => Boolean(item))
  }

  if (value && typeof value === 'object') {
    return value as Customer['product_interests']
  }

  const text = toOptionalString(value)
  if (!text) return null

  if (text.includes(',')) {
    return text
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return [text]
}

function deriveCustomerClass(record: Record<string, unknown>): string {
  const explicitClass = normalizeCustomerClass(record.customer_class ?? record.class ?? record.class_type)
  if (explicitClass) return explicitClass

  const priority = toOptionalString(record.priority)?.toLowerCase()
  if (priority === 'high') return 'A'
  if (priority === 'medium') return 'C'
  if (priority === 'low') return 'E'

  const size = toOptionalString(record.size)?.toLowerCase()
  if (size === 'enterprise' || size === 'large') return 'A'
  if (size === 'medium') return 'C'
  if (size === 'small') return 'D'

  return 'E'
}

export function mapCustomerRecord(record: Record<string, unknown>): Customer {
  const id =
    toOptionalString(record.id) ??
    toOptionalString(record.external_customer_id) ??
    toOptionalString(record.customerid) ??
    toOptionalString(record.customer_id) ??
    toOptionalString(record.customer_name) ??
    `customer-${Math.random().toString(36).substr(2, 9)}`
  const name = toOptionalString(record.name) ?? toOptionalString(record.customer_name) ?? 'Unknown customer'
  const customerClass = deriveCustomerClass(record)
  const rawEmail = toOptionalString(record.customer_email)
  const emailCoordinates = parseCoordinatePair(rawEmail)
  const googleMapsUrl = toOptionalString(record.google_maps_url) ?? null
  const customerLocation = toOptionalString(record.customer_location) ?? (emailCoordinates ? rawEmail : undefined)
  const area =
    toOptionalString(record.area) ??
    toOptionalString(record.place) ??
    toOptionalString(record.governorate) ??
    toOptionalString(record.city) ??
    customerLocation
  const district = toOptionalString(record.district) ?? area

  return {
    id,
    external_customer_id: toOptionalString(record.external_customer_id) ?? null,
    name,
    customerid:
      toOptionalString(record.customerid) ??
      toOptionalString(record.external_customer_id) ??
      id,
    customer_name: toOptionalString(record.customer_name) ?? name,
    customer_class: customerClass,
    area,
    district: district ?? null,
    governorate: toOptionalString(record.governorate) ?? null,
    place: toOptionalString(record.place) ?? null,
    phone: toOptionalString(record.phone) ?? toOptionalString(record.phone_number),
    phone_number: toOptionalString(record.phone_number) ?? null,
    customer_email: isEmail(rawEmail) ? rawEmail ?? null : null,
    customer_location: customerLocation ?? null,
    google_maps_url: googleMapsUrl,
    whatsapp_number: toOptionalString(record.whatsapp_number) ?? null,
    customer_type: toOptionalString(record.customer_type) ?? null,
    product_interests: normalizeProductInterests(record.product_interests),
    address_line: toOptionalString(record.address_line) ?? null,
    notes: toOptionalString(record.notes) ?? null,
    status: toOptionalString(record.status) ?? null,
    priority: toOptionalString(record.priority) ?? null,
    size: toOptionalString(record.size) ?? null,
    lat: toOptionalNumber(record.lat) ?? emailCoordinates?.lat ?? null,
    lng: toOptionalNumber(record.lng) ?? emailCoordinates?.lng ?? null,
    geofence_radius_meters: toOptionalNumber(record.geofence_radius_meters) ?? 150,
    assigned_user_id: toOptionalString(record.assigned_user_id) ?? null,
    created_by: toOptionalString(record.created_by) ?? null,
    updated_by: toOptionalString(record.updated_by) ?? null,
    last_visit_at: toOptionalString(record.last_visit_at) ?? null,
    created_at: toOptionalString(record.created_at) ?? null,
    updated_at: toOptionalString(record.updated_at) ?? null
  }
}
