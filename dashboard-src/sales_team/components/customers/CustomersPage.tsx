// Page Type: A
// Purpose: Let the sales rep search customers and launch the main field actions from a single list.
// Primary user action: Filter customers and open the native caller, WhatsApp, maps, or check-in.
// Data source: customers table scoped to the authenticated sales user.
import { useEffect, useMemo, useState } from 'react'
import { Search, MapPin } from 'lucide-react'
import CustomerCard from './CustomerCard'
import { fetchScopedCustomers } from '../../lib/customerQueries'
import { getScopedUserContext } from '../../lib/userAccess'
import { distanceMeters } from '../../lib/location'
import { useAppStore } from '../../store/appStore'
import type { Customer } from '../../types'

type FilterKey = 'all' | 'target' | 'nearby'

type ViewCustomer = Customer & {
  isTarget: boolean
  distance?: number
}

const CUSTOMERS_PER_PAGE = 20

export default function CustomersPage() {
  const currentLocation = useAppStore((state) => state.currentLocation)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let active = true

    const loadCustomers = async () => {
      setLoading(true)
      try {
        const userContext = await getScopedUserContext()
        if (!userContext) {
          if (active) setCustomers([])
          return
        }

        const rows = await fetchScopedCustomers({
          userContext,
          search,
          limit: 250,
          orderBy: 'customer_name',
        })

        if (!active) return

        setCustomers(rows)
      } catch (error) {
        console.error('Failed to fetch sales customers.', error)
        if (active) setCustomers([])
      } finally {
        if (active) setLoading(false)
      }
    }

    const timer = window.setTimeout(loadCustomers, search.trim() ? 220 : 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [search])

  const viewCustomers = useMemo<ViewCustomer[]>(
    () =>
      customers.map((customer) => ({
        ...customer,
        isTarget: String(customer.priority ?? '').toLowerCase() === 'high' || customer.customer_class === 'A',
        distance:
          currentLocation && typeof customer.lat === 'number' && typeof customer.lng === 'number'
            ? Math.round(distanceMeters(currentLocation, { lat: customer.lat, lng: customer.lng }))
            : undefined,
      })),
    [currentLocation, customers]
  )

  const filteredCustomers = useMemo(
    () =>
      viewCustomers.filter((customer) => {
        if (filter === 'target') return customer.isTarget
        if (filter === 'nearby') return currentLocation ? (customer.distance ?? Number.POSITIVE_INFINITY) <= 2000 : false
        return true
      }),
    [currentLocation, filter, viewCustomers]
  )

  const sortedCustomers = useMemo(
    () =>
      [...filteredCustomers].sort(
        (left, right) => (left.distance ?? Number.POSITIVE_INFINITY) - (right.distance ?? Number.POSITIVE_INFINITY)
      ),
    [filteredCustomers]
  )

  const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / CUSTOMERS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * CUSTOMERS_PER_PAGE
  const visibleCustomers = sortedCustomers.slice(pageStart, pageStart + CUSTOMERS_PER_PAGE)

  useEffect(() => {
    setPage(1)
  }, [filter, search])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  return (
    <div className="flex flex-col min-h-full">
      {/* Search & Filters - Sticky */}
      <div className="sticky top-0 z-10 bg-gray-100 px-4 pt-4 pb-3 space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث باسم العميل أو المنطقة..."
            className="input pl-11"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Search size={20} className="absolute left-4 top-3.5 text-gray-400" />
        </div>

        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'كل العملاء' },
            { id: 'target', label: 'الأهداف' },
            { id: 'nearby', label: 'قريبون (٢ كم)' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id as FilterKey)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                filter === item.id
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-gray-600 shadow-card'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {filter === 'nearby' ? (
          <div className="px-1 text-xs text-app-text-secondary">
            {currentLocation ? 'يعرض العملاء داخل نطاق ٢ كم من الأقرب إلى الأبعد.' : 'بانتظار إشارة الموقع...'}
          </div>
        ) : null}
      </div>

      {/* Customer List */}
      <div className="flex-1 px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="spinner" />
            <p className="mt-4 text-app-text-secondary">جار تحميل العملاء...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-card text-gray-400">
              <MapPin size={32} />
            </div>
            <h3 className="mb-2 text-xl font-bold text-app-text">لا توجد عملاء</h3>
            <p className="text-app-text-secondary">
              {filter === 'nearby' && !currentLocation
                ? 'إشارة الموقع مطلوبة للعثور على العملاء القريبين.'
                : filter === 'nearby'
                  ? 'لا توجد عملاء داخل نطاق ٢ كم من موقعك.'
                  : 'عدّل الفلاتر أو كلمات البحث.'}
            </p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white shadow-card px-4 py-3 text-sm text-app-text-secondary">
              <span>
                عرض {(pageStart + 1).toLocaleString('ar-EG')}-
                {Math.min(pageStart + CUSTOMERS_PER_PAGE, sortedCustomers.length).toLocaleString('ar-EG')} من{' '}
                {sortedCustomers.length.toLocaleString('ar-EG')} عميل
              </span>
              <span>
                صفحة {currentPage.toLocaleString('ar-EG')} من {totalPages.toLocaleString('ar-EG')}
              </span>
            </div>

            {/* Customer Cards */}
            <div className="space-y-3 pb-20">
              {visibleCustomers.map((customer) => (
                <CustomerCard key={customer.id} customer={customer} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 ? (
              <div className="my-3 flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-card">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  السابق
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .filter((pageNumber) => {
                      if (pageNumber === 1 || pageNumber === totalPages) return true
                      return Math.abs(pageNumber - currentPage) <= 1
                    })
                    .map((pageNumber, index, pages) => {
                      const previousPage = pages[index - 1]
                      const showGap = previousPage !== undefined && pageNumber - previousPage > 1
                      return (
                        <div key={pageNumber} className="flex items-center gap-1">
                          {showGap ? <span className="px-1 text-app-text-secondary">...</span> : null}
                          <button
                            type="button"
                            onClick={() => setPage(pageNumber)}
                            className={`h-9 min-w-9 rounded-lg px-3 text-sm font-bold transition ${
                              currentPage === pageNumber
                                ? 'bg-brand-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {pageNumber.toLocaleString('ar-EG')}
                          </button>
                        </div>
                      )
                    })}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  التالي
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
