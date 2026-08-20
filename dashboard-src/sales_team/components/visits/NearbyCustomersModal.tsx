import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'
import { useVisitStore } from '../../store/visitStore'
import { fetchScopedCustomers } from '../../lib/customerQueries'
import { getScopedUserContext } from '../../lib/userAccess'
import { distanceMeters, formatDistanceMeters } from '../../lib/location'
import { classColor, cn } from '../../lib/utils'
import { IconPhone, IconClose, IconRefresh, IconVisits } from '../shared/Icons'
import type { Customer } from '../../types'

const NEARBY_RADIUS_KM = 5
const REFRESH_INTERVAL_MS = 50_000

interface NearbyCustomer extends Customer {
  distance: number
}

export default function NearbyCustomersModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const currentLocation = useAppStore((state) => state.currentLocation)
  const setPreSelectedCustomer = useVisitStore((state) => state.setPreSelectedCustomer)
  const [customers, setCustomers] = useState<NearbyCustomer[]>([])
  const [loading, setLoading] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0)
  const lastLocationCheckRef = useRef<{ lat: number; lng: number } | null>(null)

  const hasLocationChangedSignificantly = (
    left: { lat: number; lng: number } | null,
    right: { lat: number; lng: number } | null
  ) => {
    if (!left || !right) {
      return left !== right
    }
    return distanceMeters(left, right) > 100
  }

  const fetchNearbyCustomers = async (location = currentLocation) => {
    if (!location) return

    setLoading(true)
    try {
      const userContext = await getScopedUserContext()
      if (!userContext) {
        setCustomers([])
        return
      }

      const rows = await fetchScopedCustomers({
        userContext,
        requireCoordinates: true,
        limit: 500,
        orderBy: 'customer_name'
      })

      const nearbyCustomers = rows
        .map((customer) => {
          if (customer.lat == null || customer.lng == null) return null
          const distance = distanceMeters(location, { lat: customer.lat, lng: customer.lng })
          return distance <= NEARBY_RADIUS_KM * 1000 ? { ...customer, distance } : null
        })
        .filter(Boolean)
        .sort((left, right) => left!.distance - right!.distance) as NearbyCustomer[]

      setCustomers(nearbyCustomers)
      setLastRefreshTime(Date.now())
      lastLocationCheckRef.current = location
    } catch (error) {
      console.error('Failed to fetch nearby customers.', error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open || !currentLocation) return

    const shouldRefresh =
      !lastLocationCheckRef.current ||
      hasLocationChangedSignificantly(lastLocationCheckRef.current, currentLocation) ||
      Date.now() - lastRefreshTime > REFRESH_INTERVAL_MS

    if (shouldRefresh) {
      void fetchNearbyCustomers()
    }
  }, [currentLocation, lastRefreshTime, open])

  const handleVisit = (customer: NearbyCustomer) => {
    setPreSelectedCustomer(customer)
    onClose()
    navigate('/visits')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative flex max-h-[80vh] w-full flex-col rounded-t-2xl border border-white/10 bg-slate-950 lg:max-w-2xl lg:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/5 p-4 lg:p-6">
          <div>
            <h2 className="text-lg font-bold text-white lg:text-xl">العملاء القريبون</h2>
            <p className="mt-1 text-xs text-white/40">{customers.length} عميل خلال {NEARBY_RADIUS_KM} كم</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/5 p-2 text-white/60 transition-all hover:bg-white/10 hover:text-white"
          >
            <IconClose size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4 lg:p-6">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-xl bg-white/5" />
            ))
          ) : customers.length === 0 ? (
            <div className="p-6 text-center text-sm text-white/40">لا يوجد عملاء قريبون حالياً.</div>
          ) : (
            customers.map((customer) => (
              <div
                key={customer.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all hover:bg-white/5 lg:p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border text-sm font-bold',
                      classColor((customer.customer_class ?? '') as string)
                    )}
                  >
                    {customer.customer_class ?? '-'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-white" dir="auto">
                      {customer.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-white/30" dir="auto">
                      {[customer.district, customer.area].filter(Boolean).join(' · ')}
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      {customer.phone ? (
                        <a
                          href={`tel:${customer.phone}`}
                          className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-all hover:bg-white/10 hover:text-white"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <IconPhone size={12} />
                          اتصال
                        </a>
                      ) : null}

                      <button
                        onClick={() => handleVisit(customer)}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-400 transition-all hover:bg-amber-400/20"
                      >
                        <IconVisits size={12} />
                        فتح الزيارة
                      </button>

                      <span className="flex-shrink-0 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-400">
                        {formatDistanceMeters(customer.distance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {customers.length > 0 ? (
          <div className="flex items-center justify-between border-t border-white/5 p-4">
            <p className="text-xs text-white/30">
              آخر تحديث:{' '}
              {lastRefreshTime
                ? new Date(lastRefreshTime).toLocaleTimeString('ar-SA', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'الآن'}
            </p>
            <button
              onClick={() => void fetchNearbyCustomers()}
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-all hover:bg-white/10 hover:text-white"
            >
              <IconRefresh size={14} />
              تحديث الآن
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
