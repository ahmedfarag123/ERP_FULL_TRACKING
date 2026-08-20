// Page Type: D
// Purpose: Help the sales rep organize nearby customers into an optimized route.
// Primary user action: Review the proposed route and open Google Maps or start check-in from a stop.
// Data source: scoped customers with coordinates plus the current device location.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchScopedCustomers } from '../../lib/customerQueries'
import { distanceMeters, formatDistanceMeters } from '../../lib/location'
import { getScopedUserContext } from '../../lib/userAccess'
import { useAppStore } from '../../store/appStore'
import type { Customer } from '../../types'

type RouteStop = Customer & {
  distance?: number
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

function optimizeRoute(start: { lat: number; lng: number }, customers: RouteStop[]) {
  const remaining = [...customers]
  const route: RouteStop[] = []
  let currentPoint = start

  while (remaining.length > 0) {
    let bestIndex = 0
    let bestDistance = Number.POSITIVE_INFINITY

    remaining.forEach((customer, index) => {
      if (typeof customer.lat !== 'number' || typeof customer.lng !== 'number') return
      const customerDistance = distanceMeters(currentPoint, { lat: customer.lat, lng: customer.lng })
      if (customerDistance < bestDistance) {
        bestDistance = customerDistance
        bestIndex = index
      }
    })

    const nextCustomer = remaining.splice(bestIndex, 1)[0]
    route.push(nextCustomer)
    if (typeof nextCustomer.lat === 'number' && typeof nextCustomer.lng === 'number') {
      currentPoint = { lat: nextCustomer.lat, lng: nextCustomer.lng }
    }
  }

  return route
}

function RouteMapModal({
  open,
  onClose,
  route,
  currentLocation,
}: {
  open: boolean
  onClose: () => void
  route: RouteStop[]
  currentLocation: { lat: number; lng: number } | null
}) {
  if (!open || !currentLocation) return null

  const points = [
    { lat: currentLocation.lat, lng: currentLocation.lng, label: 'ب' },
    ...route
      .filter((stop) => typeof stop.lat === 'number' && typeof stop.lng === 'number')
      .map((stop, index) => ({ lat: stop.lat as number, lng: stop.lng as number, label: String(index + 1) })),
  ]

  const lats = points.map((point) => point.lat)
  const lngs = points.map((point) => point.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const latRange = maxLat - minLat || 0.01
  const lngRange = maxLng - minLng || 0.01
  const project = (lat: number, lng: number) => ({
    x: ((lng - minLng) / lngRange) * 300,
    y: 180 - ((lat - minLat) / latRange) * 180,
  })
  const projected = points.map((point) => ({ ...point, ...project(point.lat, point.lng) }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-700 bg-[#1e293b] shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 p-6">
          <div>
            <h2 className="text-xl font-bold text-white">خط سير محسّن</h2>
            <p className="text-sm text-gray-400">مسار فعال لعدد {route.length.toLocaleString('ar-EG')} أهداف</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="space-y-6 p-6">
          <div className="grid-background overflow-hidden rounded-2xl border border-gray-700 bg-[#0f172a] p-8">
            <svg viewBox="0 0 300 180" className="w-full overflow-visible">
              {projected.slice(0, -1).map((point, index) => (
                <line
                  key={`${index}-${projected[index + 1].label}`}
                  x1={point.x}
                  y1={point.y}
                  x2={projected[index + 1].x}
                  y2={projected[index + 1].y}
                  stroke="rgba(99,102,241,0.6)"
                  strokeDasharray="4 3"
                  strokeWidth="1.5"
                />
              ))}
              {projected.map((point, index) => (
                <g key={`${point.label}-${index}`} transform={`translate(${point.x},${point.y})`}>
                  <circle r={index === 0 ? 8 : 10} fill={index === 0 ? '#6366f1' : 'white'} stroke="#0f172a" strokeWidth="1.5" />
                  <text textAnchor="middle" dominantBaseline="middle" fontSize="6" fill={index === 0 ? 'white' : '#111827'} fontWeight="bold">
                    {point.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-4 rounded-xl border border-gray-700/50 bg-gray-800 p-3 opacity-70">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">ب</div>
              <div>
                <h4 className="text-sm font-bold text-white">نقطة البداية</h4>
                <p className="text-xs text-gray-400">الموقع الحالي</p>
              </div>
            </div>
            {route.map((customer, index) => (
              <div key={customer.id} className="group flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-800 p-4 transition-colors hover:bg-gray-700">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-500 shadow-lg">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-white" dir="auto">{customer.name ?? customer.customer_name ?? 'عميل'}</h4>
                  <p className="text-xs text-gray-400" dir="auto">
                    {[customer.district, customer.area].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RoutesPage() {
  const navigate = useNavigate()
  const currentLocation = useAppStore((state) => state.currentLocation)
  const [loading, setLoading] = useState(true)
  const [route, setRoute] = useState<RouteStop[]>([])
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    let active = true

    const loadRoute = async () => {
      if (!currentLocation) {
        setRoute([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const userContext = await getScopedUserContext()
        if (!userContext) {
          if (active) setRoute([])
          return
        }

        const customers = await fetchScopedCustomers({
          userContext,
          requireCoordinates: true,
          limit: 60,
          orderBy: 'customer_name',
        })

        const candidates = customers
          .map((customer) => ({
            ...customer,
            distance:
              typeof customer.lat === 'number' && typeof customer.lng === 'number'
                ? Math.round(distanceMeters(currentLocation, { lat: customer.lat, lng: customer.lng }))
                : undefined,
          }))
          .filter((customer) => (customer.distance ?? Number.POSITIVE_INFINITY) <= 8000)
          .sort((left, right) => (left.distance ?? Number.POSITIVE_INFINITY) - (right.distance ?? Number.POSITIVE_INFINITY))
          .slice(0, 8)

        if (!active) return
        setRoute(optimizeRoute(currentLocation, candidates))
      } catch (error) {
        console.error('Failed to build route list.', error)
        if (active) setRoute([])
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadRoute()
    return () => {
      active = false
    }
  }, [currentLocation])

  const totalDistance = useMemo(() => {
    if (!currentLocation || route.length === 0) return 0
    return route.reduce((total, customer, index) => {
      if (typeof customer.lat !== 'number' || typeof customer.lng !== 'number') return total
      const previous =
        index === 0
          ? currentLocation
          : {
              lat: route[index - 1].lat as number,
              lng: route[index - 1].lng as number,
            }
      return total + Math.round(distanceMeters(previous, { lat: customer.lat, lng: customer.lng }))
    }, 0)
  }, [currentLocation, route])

  const mapsUrl =
    currentLocation && route.length > 0
      ? `https://www.google.com/maps/dir/${[
          `${currentLocation.lat},${currentLocation.lng}`,
          ...route
            .filter((customer) => typeof customer.lat === 'number' && typeof customer.lng === 'number')
            .map((customer) => `${customer.lat},${customer.lng}`),
        ].join('/')}`
      : '#'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text">تحسين خط السير</h1>
          <p className="mt-1 text-app-text-secondary">{currentLocation ? 'تم تحديد الموقع الحالي' : 'فعّل خدمة الموقع'}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowMap(true)}
          disabled={!currentLocation || route.length === 0}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
            currentLocation
              ? 'border border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100'
              : 'cursor-not-allowed border border-app-border bg-brand-25 text-app-text-secondary opacity-50'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
          عرض الخط
        </button>
      </div>

      {!currentLocation ? (
        <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-brand-600">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <div>
            <p className="text-sm font-medium text-brand-600">خدمة الموقع غير نشطة</p>
            <p className="text-xs text-app-text-secondary">الموقع مطلوب لتحسين خط السير.</p>
          </div>
        </div>
      ) : null}

      {route.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-app-border bg-brand-25 p-3 text-center">
            <p className="text-xl font-bold text-brand-600">{route.length.toLocaleString('ar-EG')}</p>
            <p className="mt-1 text-xs text-app-text-secondary">توقفات</p>
          </div>
          <div className="rounded-xl border border-app-border bg-brand-25 p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{formatDistanceMeters(totalDistance)}</p>
            <p className="mt-1 text-xs text-app-text-secondary">إجمالي المسافة</p>
          </div>
          <div className="rounded-xl border border-app-border bg-brand-25 p-3 text-center">
            <p className="text-xl font-bold text-emerald-600">{Math.round(totalDistance / 50 / 60).toLocaleString('ar-EG')} س</p>
            <p className="mt-1 text-xs text-app-text-secondary">زمن تقديري</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 rounded-2xl bg-brand-25" />)
        ) : route.length === 0 ? (
          <div className="rounded-2xl border border-app-border bg-brand-25 p-6 text-center text-app-text-secondary">
            لا توجد ترشيحات خط سير حتى الآن.
          </div>
        ) : (
          route.map((customer, index) => (
            <div
              key={customer.id}
              className="group rounded-2xl border border-app-border bg-brand-25 p-5 transition-all hover:border-brand-400 hover:bg-brand-25/70"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-lg font-bold text-app-text">توقف {index + 1}</h3>
                    {index === 0 ? (
                      <div className="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-semibold text-white">مختار</div>
                    ) : null}
                  </div>
                  <p className="text-sm text-app-text-secondary" dir="auto">
                    {customer.name ?? customer.customer_name ?? 'عميل'} • {[customer.district, customer.area].filter(Boolean).join(', ')}
                  </p>
                </div>
                <a
                  href={
                    typeof customer.lat === 'number' && typeof customer.lng === 'number'
                      ? `https://www.google.com/maps/search/?api=1&query=${customer.lat},${customer.lng}`
                      : '#'
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg p-2 text-gray-400 opacity-0 transition-colors group-hover:opacity-100 hover:bg-blue-400/10 hover:text-blue-400"
                  title="عرض الخط على الخريطة"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                </a>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-gray-100 p-3 text-center">
                  <div className="mb-1 text-xs text-app-text-secondary">المسافة</div>
                  <div className="text-lg font-bold text-app-text">{formatDistanceMeters(customer.distance ?? 0)}</div>
                </div>
                <div className="rounded-lg bg-gray-100 p-3 text-center">
                  <div className="mb-1 text-xs text-app-text-secondary">الأولوية</div>
                  <div className="text-lg font-bold text-app-text">{customer.priority ?? 'عادية'}</div>
                </div>
                <div className="rounded-lg bg-gray-100 p-3 text-center">
                  <div className="mb-1 text-xs text-app-text-secondary">الفئة</div>
                  <div className="text-lg font-bold text-app-text">{formatCustomerClass(customer.customer_class)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-app-border/50 pt-4">
                <div className="text-xs text-app-text-secondary">{index === 0 ? 'جاهز للبدء' : 'المحطة التالية في خط السير'}</div>
                <button
                  type="button"
                  onClick={() => navigate(`/checkin/${customer.id}`)}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                >
                  بدء الزيارة
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {currentLocation ? (
        <div className="flex justify-end">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-600 transition-all hover:bg-brand-100"
          >
            فتح في خرائط جوجل
          </a>
        </div>
      ) : null}

      <RouteMapModal open={showMap} onClose={() => setShowMap(false)} route={route} currentLocation={currentLocation} />
    </div>
  )
}
