import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { AlertTriangle, CheckCircle2, LocateFixed, MapPin, UserPlus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  createCheckInCustomer,
  fetchCustomerNameSuggestions,
  fetchSalesCustomerTypeOptions,
  findScopedCustomerByPhone,
  type SalesCustomerTypeOption,
} from '../../lib/customerQueries'
import { getBestEffortPosition, type Coordinates } from '../../lib/location'
import {
  normalizePhoneDigits,
  validateNewCustomerCheckInInput,
  type NewCustomerCheckInErrors,
} from '../../lib/newCustomerCheckInValidation'
import { getScopedUserContext, type ScopedUserContext } from '../../lib/userAccess'
import { useAppStore } from '../../store/appStore'
import { useVisitStore } from '../../store/visitStore'
import type { Customer } from '../../types'

type Props = {
  open: boolean
  onClose: () => void
}

const DEFAULT_MAP_LOCATION: Coordinates = {
  lat: 30.0444,
  lng: 31.2357,
}

const customerPinIcon = L.divIcon({
  className: '',
  html: '<div style="width:24px;height:24px;border-radius:9999px;background:#16a34a;border:3px solid white;box-shadow:0 8px 20px rgba(15,23,42,.35)"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

function formatCoordinate(value: number) {
  return value.toFixed(6)
}

function RecenterMap({ location }: { location: Coordinates }) {
  const map = useMap()

  useEffect(() => {
    map.setView([location.lat, location.lng], map.getZoom(), { animate: true })
  }, [location.lat, location.lng, map])

  return null
}

function PinMap({
  location,
  onChange,
}: {
  location: Coordinates
  onChange: (location: Coordinates) => void
}) {
  useMapEvents({
    click(event) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })

  return (
    <>
      <RecenterMap location={location} />
      <Marker
        draggable
        icon={customerPinIcon}
        position={[location.lat, location.lng]}
        eventHandlers={{
          dragend(event) {
            const nextLocation = event.target.getLatLng()
            onChange({ lat: nextLocation.lat, lng: nextLocation.lng })
          },
        }}
      />
    </>
  )
}

export default function NewCustomerCheckInModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const currentLocation = useAppStore((state) => state.currentLocation)
  const setLocation = useAppStore((state) => state.setLocation)
  const setLocationPermission = useAppStore((state) => state.setLocationPermission)
  const addNotification = useAppStore((state) => state.addNotification)
  const activeVisit = useVisitStore((state) => state.activeVisit)
  const startVisit = useVisitStore((state) => state.startVisit)

  const [userContext, setUserContext] = useState<ScopedUserContext | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [customerType, setCustomerType] = useState('')
  const [locationPin, setLocationPin] = useState<Coordinates | null>(currentLocation ?? null)
  const [customerTypes, setCustomerTypes] = useState<SalesCustomerTypeOption[]>([])
  const [nameSuggestions, setNameSuggestions] = useState<Customer[]>([])
  const [duplicatePhoneCustomer, setDuplicatePhoneCustomer] = useState<Customer | null>(null)
  const [errors, setErrors] = useState<NewCustomerCheckInErrors>({})
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [loadingLookups, setLoadingLookups] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const currentLocationRef = useRef<Coordinates | null>(currentLocation ?? null)

  const normalizedPhone = useMemo(() => normalizePhoneDigits(phone), [phone])
  const selectedCustomerType = customerTypes.find((type) => type.customer_type_key === customerType)

  useEffect(() => {
    currentLocationRef.current = currentLocation ?? null
  }, [currentLocation])

  useEffect(() => {
    if (!open) return

    const timer = window.setTimeout(() => {
      nameInputRef.current?.focus()
    }, 50)

    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return

    let active = true
    const loadInitialData = async () => {
      setLookupError(null)
      setLoadingLookups(true)
      try {
        const [context, typeRows] = await Promise.all([
          getScopedUserContext(),
          fetchSalesCustomerTypeOptions(),
        ])
        if (!active) return
        setUserContext(context)
        setCustomerTypes(typeRows)
        setCustomerType((previous) => previous || typeRows[0]?.customer_type_key || '')
      } catch (error) {
        console.error('Failed to load new customer check-in lookups.', error)
        if (active) setLookupError('تعذر تحميل اختيارات العميل. حاول مرة أخرى.')
      } finally {
        if (active) setLoadingLookups(false)
      }
    }

    void loadInitialData()

    return () => {
      active = false
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    let active = true
    const loadLocation = async () => {
      setLoadingLocation(true)
      try {
        const position = await getBestEffortPosition({
          fallback: currentLocationRef.current,
          maxCachedAgeMs: 60_000,
          timeoutMs: 6_000,
          maximumAgeMs: 30_000,
        })
        if (!active) return
        setLocationPin(position)
        setLocation(position)
        setLocationPermission('granted')
      } catch (error) {
        console.error('Failed to resolve current location for new customer.', error)
        if (active) {
          setLocationPin((previous) => previous ?? DEFAULT_MAP_LOCATION)
          setLocationPermission('denied')
        }
      } finally {
        if (active) setLoadingLocation(false)
      }
    }

    void loadLocation()

    return () => {
      active = false
    }
  }, [open, setLocation, setLocationPermission])

  useEffect(() => {
    if (!open || !userContext || customerName.trim().length < 2) {
      setNameSuggestions([])
      return
    }

    let active = true
    const timer = window.setTimeout(async () => {
      try {
        const suggestions = await fetchCustomerNameSuggestions({
          userContext,
          search: customerName,
          limit: 5,
        })
        if (active) setNameSuggestions(suggestions)
      } catch (error) {
        console.error('Failed to fetch customer name suggestions.', error)
        if (active) setNameSuggestions([])
      }
    }, 220)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [customerName, open, userContext])

  useEffect(() => {
    if (!open || !userContext || normalizedPhone.length < 10) {
      setDuplicatePhoneCustomer(null)
      return
    }

    let active = true
    const timer = window.setTimeout(async () => {
      try {
        const duplicate = await findScopedCustomerByPhone({ userContext, phone })
        if (active) setDuplicatePhoneCustomer(duplicate)
      } catch (error) {
        console.error('Failed to check customer phone duplicate.', error)
        if (active) setDuplicatePhoneCustomer(null)
      }
    }, 260)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [normalizedPhone, open, phone, userContext])

  const closeAndReset = (force = false) => {
    if (submitting && !force) return
    setCustomerName('')
    setPhone('')
    setErrors({})
    setNameSuggestions([])
    setDuplicatePhoneCustomer(null)
    setLocationPin(currentLocation ?? null)
    onClose()
  }

  const startExistingCustomerVisit = (customer: Customer) => {
    if (!locationPin) return
    if (activeVisit && activeVisit.customerId !== customer.id) {
      addNotification({
        title: 'زيارة نشطة بالفعل',
        message: 'أنهِ الزيارة الحالية قبل بدء زيارة جديدة.',
        type: 'warning',
      })
      navigate(`/checkin/${activeVisit.customerId}`)
      closeAndReset()
      return
    }

    startVisit(customer.id, customer.name ?? customer.customer_name ?? 'عميل', locationPin.lat, locationPin.lng)
    setLocation(locationPin)
    closeAndReset()
    navigate(`/checkin/${customer.id}`)
  }

  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true)
    try {
      const position = await getBestEffortPosition({
        fallback: currentLocation,
        preferCached: false,
        timeoutMs: 8_000,
        maximumAgeMs: 10_000,
      })
      setLocationPin(position)
      setLocation(position)
      setLocationPermission('granted')
    } catch (error) {
      console.error('Failed to refresh current location.', error)
      setLocationPermission('denied')
      addNotification({
        title: 'تعذر تحديد الموقع',
        message: error instanceof Error ? error.message : 'حاول مرة أخرى.',
        type: 'error',
      })
    } finally {
      setLoadingLocation(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!userContext) return

    const validation = validateNewCustomerCheckInInput({
      customerName,
      phone,
      customerType,
      location: locationPin,
    })

    setErrors(validation.errors)
    if (!validation.valid || !locationPin) return

    if (activeVisit) {
      addNotification({
        title: 'زيارة نشطة بالفعل',
        message: 'أنهِ الزيارة الحالية قبل بدء زيارة جديدة.',
        type: 'warning',
      })
      navigate(`/checkin/${activeVisit.customerId}`)
      closeAndReset(true)
      return
    }

    if (duplicatePhoneCustomer) return

    setSubmitting(true)
    try {
      const newCustomer = await createCheckInCustomer({
        userContext,
        customerName,
        phone,
        customerType,
        lat: locationPin.lat,
        lng: locationPin.lng,
      })

      setLocation(locationPin)
      startVisit(newCustomer.id, newCustomer.name ?? newCustomer.customer_name ?? customerName, locationPin.lat, locationPin.lng)
      addNotification({
        title: 'تم إنشاء العميل',
        message: 'تم بدء زيارة العميل الجديد.',
        type: 'success',
      })
      closeAndReset()
      navigate(`/checkin/${newCustomer.id}`)
    } catch (error) {
      console.error('Failed to create customer for check-in.', error)
      addNotification({
        title: 'تعذر إنشاء العميل',
        message: error instanceof Error ? error.message : 'حاول مرة أخرى.',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/50 px-3 py-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="new-customer-checkin-title">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-app-border px-4 py-3">
          <div className="min-w-0">
            <h2 id="new-customer-checkin-title" className="text-lg font-bold text-app-text">تسجيل عميل وبدء زيارة</h2>
            <p className="text-xs text-app-text-secondary">سيتم إنشاء العميل داخل جدول العملاء ثم فتح الزيارة.</p>
          </div>
          <button
            type="button"
            onClick={() => closeAndReset()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-app-text-secondary transition hover:bg-gray-200"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-4">
          {lookupError ? (
            <div className="mb-4 rounded-xl border border-error-200 bg-error-50 p-3 text-sm font-semibold text-error-600">
              {lookupError}
            </div>
          ) : null}

          {activeVisit ? (
            <div className="mb-4 rounded-xl border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700">
              لديك زيارة نشطة الآن. سيتم فتحها قبل إنشاء زيارة جديدة.
            </div>
          ) : null}

          <div className="space-y-4">
            <div>
              <label htmlFor="new-customer-name" className="mb-1.5 block text-sm font-bold text-app-text">
                اسم العميل
              </label>
              <input
                ref={nameInputRef}
                id="new-customer-name"
                type="text"
                className={`input ${errors.customerName ? 'border-error-500 ring-2 ring-error-500/20' : ''}`}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                autoComplete="off"
                dir="auto"
              />
              {errors.customerName ? <p className="mt-1 text-xs font-semibold text-error-600">{errors.customerName}</p> : null}
              {nameSuggestions.length > 0 ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-app-border bg-white">
                  {nameSuggestions.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => startExistingCustomerVisit(customer)}
                      className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-2 text-right last:border-b-0 hover:bg-brand-25"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-app-text" dir="auto">
                          {customer.name ?? customer.customer_name}
                        </span>
                        <span className="block text-xs text-app-text-secondary" dir="auto">
                          {customer.phone_number || customer.district || customer.place || 'عميل مسجل'}
                        </span>
                      </span>
                      <CheckCircle2 size={18} className="flex-shrink-0 text-brand-500" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <label htmlFor="new-customer-phone" className="mb-1.5 block text-sm font-bold text-app-text">
                رقم الموبايل
              </label>
              <input
                id="new-customer-phone"
                type="tel"
                inputMode="tel"
                className={`input ${errors.phone || duplicatePhoneCustomer ? 'border-error-500 ring-2 ring-error-500/20' : ''}`}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                dir="ltr"
                autoComplete="tel"
              />
              {errors.phone ? <p className="mt-1 text-xs font-semibold text-error-600">{errors.phone}</p> : null}
              {duplicatePhoneCustomer ? (
                <div className="mt-2 rounded-xl border border-warning-200 bg-warning-50 p-3">
                  <div className="flex items-start gap-2 text-sm text-warning-700">
                    <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                    <p>
                      الرقم مرتبط بالعميل <span className="font-bold" dir="auto">{duplicatePhoneCustomer.name ?? duplicatePhoneCustomer.customer_name}</span>. هل تريد تسجيل زيارة له بدلاً من إنشاء عميل جديد؟
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startExistingCustomerVisit(duplicatePhoneCustomer)}
                    className="mt-3 w-full rounded-xl bg-warning-500 px-4 py-2 text-sm font-bold text-white"
                  >
                    بدء زيارة لهذا العميل
                  </button>
                </div>
              ) : null}
            </div>

            <div>
              <label htmlFor="new-customer-type" className="mb-1.5 block text-sm font-bold text-app-text">
                نوع العميل
              </label>
              <select
                id="new-customer-type"
                className={`input ${errors.customerType ? 'border-error-500 ring-2 ring-error-500/20' : ''}`}
                value={customerType}
                onChange={(event) => setCustomerType(event.target.value)}
                disabled={loadingLookups}
              >
                <option value="">اختر نوع العميل</option>
                {customerTypes.map((type) => (
                  <option key={type.customer_type_key} value={type.customer_type_key}>
                    {type.customer_type_name_ar}
                  </option>
                ))}
              </select>
              {errors.customerType ? <p className="mt-1 text-xs font-semibold text-error-600">{errors.customerType}</p> : null}
              {selectedCustomerType ? (
                <p className="mt-1 text-xs text-app-text-secondary">{selectedCustomerType.customer_type_name_ar}</p>
              ) : null}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="text-sm font-bold text-app-text">الموقع</label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={loadingLocation}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600 disabled:opacity-50"
                >
                  <LocateFixed size={15} />
                  {loadingLocation ? 'جار التحديد...' : 'موقعي الحالي'}
                </button>
              </div>

              <div className={`overflow-hidden rounded-xl border ${errors.location ? 'border-error-500' : 'border-app-border'}`}>
                {locationPin ? (
                  <div className="h-64 w-full">
                    <MapContainer
                      center={[locationPin.lat, locationPin.lng]}
                      zoom={16}
                      scrollWheelZoom={false}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <PinMap location={locationPin} onChange={setLocationPin} />
                    </MapContainer>
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center bg-brand-25 text-sm text-app-text-secondary">
                    جار تجهيز الخريطة...
                  </div>
                )}
              </div>
              {locationPin ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-app-text-secondary" dir="ltr">
                  <MapPin size={14} />
                  <span>{formatCoordinate(locationPin.lat)}, {formatCoordinate(locationPin.lng)}</span>
                </div>
              ) : null}
              {errors.location ? <p className="mt-1 text-xs font-semibold text-error-600">{errors.location}</p> : null}
            </div>
          </div>

          <div className="sticky bottom-0 -mx-4 mt-5 border-t border-app-border bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
            <button
              type="submit"
              disabled={submitting || loadingLookups || Boolean(duplicatePhoneCustomer)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus size={18} />
              {submitting ? 'جار الإنشاء...' : 'إنشاء العميل وبدء الزيارة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
