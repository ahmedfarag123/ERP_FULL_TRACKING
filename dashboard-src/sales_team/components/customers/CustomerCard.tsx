import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, PhoneCall, MessageCircle, MapPin, Check, Target } from 'lucide-react'
import CustomerCallPage from '../calls/CustomerCallPage'
import { useAuthStore } from '../../store/authStore'
import { resolveCustomerLocation } from '../../lib/customer-location'
import type { Customer } from '../../types'

type CardCustomer = Customer & {
  isTarget?: boolean
  distance?: number
}

function formatDistance(meters?: number) {
  if (meters == null) return null
  if (meters < 1000) return `${Math.round(meters).toLocaleString('ar-EG')} م`
  return `${(meters / 1000).toLocaleString('ar-EG', { maximumFractionDigits: 1 })} كم`
}

function formatCustomerClass(customerClass?: string | null) {
  const classLabels: Record<string, string> = {
    A: 'أ',
    B: 'ب',
    C: 'ج',
    D: 'د',
    E: 'هـ',
  }
  return classLabels[String(customerClass ?? 'E').toUpperCase()] ?? 'هـ'
}

function classTone(customerClass?: string | null) {
  switch (String(customerClass ?? '').toUpperCase()) {
    case 'A':
      return 'badge-success'
    case 'B':
      return 'badge-info'
    case 'C':
      return 'badge-warning'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function productInterestLabels(value: CardCustomer['product_interests']) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean)
  }
  if (typeof value === 'object') {
    return Object.values(value)
      .flatMap((item) => (Array.isArray(item) ? item : [item]))
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
  }
  return [String(value).trim()].filter(Boolean)
}

function sanitizePhone(value: string | null | undefined) {
  return String(value ?? '').replace(/\D/g, '')
}

function sanitizeDialPhone(value: string | null | undefined) {
  const rawValue = String(value ?? '').trim()
  const digits = rawValue.replace(/\D/g, '')
  if (!digits) return ''
  return rawValue.startsWith('+') ? `+${digits}` : digits
}

export default function CustomerCard({ customer }: { customer: CardCustomer }) {
  const navigate = useNavigate()
  const actorUserId = useAuthStore((state) => state.user?.id ?? null)
  const [selectedCallCustomer, setSelectedCallCustomer] = useState<CardCustomer | null>(null)
  const callPhone = sanitizeDialPhone(customer.phone_number ?? customer.phone ?? customer.whatsapp_number)
  const whatsappPhone = sanitizePhone(customer.whatsapp_number ?? customer.phone_number ?? customer.phone)
  const callHref = callPhone ? `tel:${callPhone}` : undefined
  const productInterests = productInterestLabels(customer.product_interests)
  const customerType = customer.customer_type ?? customer.status ?? null
  const resolvedLocation = resolveCustomerLocation({
    customer_name: customer.name ?? customer.customer_name,
    lat: customer.lat,
    lng: customer.lng,
    customer_location: customer.customer_location,
    google_maps_url: customer.google_maps_url,
    district: customer.district,
    place: customer.area,
    address_line: customer.address_line,
  })
  const mapsUrl = resolvedLocation.mapUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [customer.name, customer.district, customer.area].filter(Boolean).join(', ')
  )}`

  return (
    <>
      <div className="bg-white rounded-xl shadow-card p-4 transition-all active:scale-[0.98]">
        {customer.isTarget ? (
          <div className="flex items-center gap-1 rounded-full bg-error-50 px-2 py-1 text-xs font-bold text-error-500 w-fit mb-3">
            <Target size={12} />
            هدف
          </div>
        ) : null}

        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3
              className="mb-1 text-base font-bold text-app-text"
              dir="auto"
            >
              {customer.name ?? customer.customer_name ?? 'عميل'}
            </h3>
            <p className="flex items-center gap-1 text-sm text-app-text-secondary" dir="auto">
              <MapPin size={14} />
              {resolvedLocation.displayText || [customer.district, customer.area].filter(Boolean).join(', ') || 'لا يوجد عنوان'}
            </p>
          </div>
          <div className={`${classTone(customer.customer_class)} text-xs`}>
            الفئة {formatCustomerClass(customer.customer_class)}
          </div>
        </div>

        <div className="my-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-2 py-1 text-xs text-brand-500" dir="ltr">
            <Phone size={12} />
            {customer.phone_number ?? customer.phone ?? '—'}
          </div>
          {customer.distance != null ? (
            <div className="flex items-center gap-1.5 text-xs text-app-text-secondary">
              <MapPin size={12} />
              {formatDistance(customer.distance)} بعيدا
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {customerType ? (
            <div className="rounded-xl bg-brand-25 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-secondary">نوع العميل</p>
              <p className="mt-1 truncate text-xs font-semibold text-app-text" dir="auto">{customerType}</p>
            </div>
          ) : null}
          {customer.geofence_radius_meters ? (
            <div className="rounded-xl bg-brand-25 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-secondary">نطاق الموقع</p>
              <p className="mt-1 text-xs font-semibold text-app-text">{Math.round(customer.geofence_radius_meters).toLocaleString('ar-EG')} م</p>
            </div>
          ) : null}
          {customer.size ? (
            <div className="rounded-xl bg-brand-25 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-secondary">الحجم</p>
              <p className="mt-1 truncate text-xs font-semibold text-app-text" dir="auto">{customer.size}</p>
            </div>
          ) : null}
          {customer.priority ? (
            <div className="rounded-xl bg-brand-25 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-secondary">الأولوية</p>
              <p className="mt-1 truncate text-xs font-semibold text-app-text" dir="auto">{customer.priority}</p>
            </div>
          ) : null}
        </div>

        {productInterests.length > 0 ? (
          <div className="mt-3 rounded-xl bg-brand-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-500">اهتمامات المنتجات</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {productInterests.slice(0, 4).map((interest) => (
                <span key={interest} className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-600" dir="auto">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-5 gap-2 border-t border-gray-200 pt-4">
          <a
            href={callHref}
            onClick={(event) => {
              if (!callHref) event.preventDefault()
            }}
            aria-disabled={!callHref}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl p-2 text-app-text-secondary transition-all active:scale-95 ${
              callHref ? 'hover:bg-success-50 hover:text-success-600' : 'pointer-events-none opacity-40'
            }`}
            title="اتصال بالعميل"
          >
            <Phone size={20} />
          </a>
          <button
            type="button"
            onClick={() => setSelectedCallCustomer(customer)}
            className="flex flex-col items-center justify-center gap-1 rounded-xl p-2 text-app-text-secondary transition-all active:scale-95 hover:bg-brand-50 hover:text-brand-500"
            title="تسجيل مكالمة"
          >
            <PhoneCall size={20} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (whatsappPhone) window.open(`https://wa.me/${whatsappPhone}`, '_blank', 'noopener,noreferrer')
            }}
            className="flex flex-col items-center justify-center gap-1 rounded-xl p-2 text-app-text-secondary transition-all active:scale-95 hover:bg-success-50 hover:text-success-600"
            title="WhatsApp"
          >
            <MessageCircle size={20} />
          </button>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center justify-center gap-1 rounded-xl p-2 text-app-text-secondary transition-all active:scale-95 hover:bg-brand-50 hover:text-brand-500"
            title="الخريطة"
          >
            <MapPin size={20} />
          </a>
          <button
            type="button"
            onClick={() => navigate(`/checkin/${customer.id}`)}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-brand-500 p-2 text-white transition-all active:scale-95 hover:bg-brand-600"
            title="تسجيل زيارة"
          >
            <Check size={20} />
          </button>
        </div>
      </div>
      <CustomerCallPage
        isOpen={Boolean(selectedCallCustomer)}
        customer={selectedCallCustomer}
        actorUserId={actorUserId}
        onClose={() => setSelectedCallCustomer(null)}
      />
    </>
  )
}
