// Page Type: C
// Purpose: Give the sales rep a quick performance summary and direct access to the next field actions.
// Primary user action: Review progress and jump into customers, visits, routes, or the active check-in.
// Data source: visits, sales_targets, and scoped customers for the authenticated user.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Phone, TrendingUp, DollarSign, MapPin, Users, ClipboardCheck, UserPlus } from 'lucide-react'
import { motion } from 'framer-motion'
import { fetchSalesActivityFeed, type ActivityFeedItem } from '../../lib/salesActivity'
import { fetchScopedCustomers } from '../../lib/customerQueries'
import { distanceMeters, formatDistanceMeters } from '../../lib/location'
import { supabase } from '../../lib/supabase'
import { getScopedUserContext } from '../../lib/userAccess'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import { useVisitStore } from '../../store/visitStore'
import NewCustomerCheckInModal from './NewCustomerCheckInModal'

type DashboardStats = {
  totalCompletion: number
  visitsToday: number
  visitsActual: number
  visitsTarget: number
  actual_calls: number
  target_calls: number
  actual_quotations: number
  target_quotations: number
  actual_gmv: number
  target_gmv: number
  actual_reachability: number
  target_reachability: number
  nearbyCount: number
  urgentFollowUps: number
  overdueCallbacks: number
}

type NearbyCustomer = {
  id: string
  name: string
  district: string | null | undefined
  area: string | null | undefined
  distance: number
}

function emptyDashboardStats(): DashboardStats {
  return {
    totalCompletion: 0,
    visitsToday: 0,
    visitsActual: 0,
    visitsTarget: 0,
    actual_calls: 0,
    target_calls: 0,
    actual_quotations: 0,
    target_quotations: 0,
    actual_gmv: 0,
    target_gmv: 0,
    actual_reachability: 0,
    target_reachability: 0,
    nearbyCount: 0,
    urgentFollowUps: 0,
    overdueCallbacks: 0,
  }
}

function getMonthStartDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-01`
}

function toNumber(value: unknown) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function progressPercent(actual: number, target: number) {
  return target > 0 ? Math.min(999, Math.round((actual / target) * 100)) : 0
}

function formatNumberCompact(value: number) {
  return new Intl.NumberFormat('ar-EG', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(value)
}

function formatCurrencyCompact(value: number) {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(value)
}

function isCleanFraudStatus(status: string | null) {
  const normalized = String(status ?? '').toLowerCase()
  return !normalized || normalized === 'clear' || normalized === 'low' || normalized === 'approved'
}

function isReachableCall(row: { call_outcome?: unknown; call_status?: unknown }) {
  const source = `${row.call_outcome ?? ''} ${row.call_status ?? ''}`.toLowerCase()
  return source.includes('connected') || source.includes('answered') || source.includes('reached') || source.includes('completed')
}

function isOverdueCallback(row: { callback_at?: unknown; follow_up_sla_status?: unknown }) {
  const callbackAt = typeof row.callback_at === 'string' ? row.callback_at : null
  if (!callbackAt) return false
  if (String(row.follow_up_sla_status ?? '').toLowerCase().includes('done')) return false
  return new Date(callbackAt).getTime() < Date.now()
}

async function loadPerformanceMetrics(userId: string, today: Date) {
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const targetMonth = getMonthStartDate(today)
  const fromIso = monthStart.toISOString()
  const toIso = nextMonthStart.toISOString()

  const [targets, visitsCount, calls, quotationsCount, orders] = await Promise.all([
    supabase
      .from('sales_targets')
      .select('target_visits, target_calls, target_quotations, target_gmv, target_reachability')
      .eq('user_id', userId)
      .eq('target_month', targetMonth)
      .maybeSingle(),
    supabase
      .from('visits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', fromIso)
      .lt('created_at', toIso),
    supabase
      .from('calls')
      .select('call_outcome, call_status, callback_at, follow_up_sla_status, requires_urgent_action')
      .eq('user_id', userId)
      .gte('created_at', fromIso)
      .lt('created_at', toIso),
    supabase
      .from('quotations')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .gte('created_at', fromIso)
      .lt('created_at', toIso),
    supabase
      .from('orders')
      .select('total_amount')
      .eq('assigned_user_id', userId)
      .gte('order_date', fromIso)
      .lt('order_date', toIso),
  ])

  if (targets.error) throw targets.error
  if (visitsCount.error) throw visitsCount.error
  if (calls.error) throw calls.error
  if (quotationsCount.error) throw quotationsCount.error
  if (orders.error) throw orders.error

  const actualCalls = calls.data?.length ?? 0
  const callRows = calls.data ?? []
  const reachableCalls = callRows.filter((row) => isReachableCall(row as { call_outcome?: unknown; call_status?: unknown })).length
  const urgentFollowUps = callRows.filter((row: any) => Boolean(row.requires_urgent_action)).length
  const overdueCallbacks = callRows.filter((row) => isOverdueCallback(row as { callback_at?: unknown; follow_up_sla_status?: unknown })).length
  const actualGmv = (orders.data ?? []).reduce((total, order: any) => total + toNumber(order.total_amount), 0)

  return {
    visitsActual: visitsCount.count ?? 0,
    visitsTarget: toNumber(targets.data?.target_visits),
    actual_calls: actualCalls,
    target_calls: toNumber(targets.data?.target_calls),
    actual_quotations: quotationsCount.count ?? 0,
    target_quotations: toNumber(targets.data?.target_quotations),
    actual_gmv: actualGmv,
    target_gmv: toNumber(targets.data?.target_gmv),
    actual_reachability: actualCalls > 0 ? Math.round((reachableCalls / actualCalls) * 100) : 0,
    target_reachability: toNumber(targets.data?.target_reachability),
    urgentFollowUps,
    overdueCallbacks,
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const currentLocation = useAppStore((state) => state.currentLocation)
  const activeVisit = useVisitStore((state) => state.activeVisit)
  const locationKey = currentLocation
    ? `${currentLocation.lat.toFixed(4)}:${currentLocation.lng.toFixed(4)}`
    : 'no-location'
  const [stats, setStats] = useState<DashboardStats>({
    ...emptyDashboardStats(),
  })
  const [recentFeed, setRecentFeed] = useState<ActivityFeedItem[]>([])
  const [nearbyCustomers, setNearbyCustomers] = useState<NearbyCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [newCustomerCheckInOpen, setNewCustomerCheckInOpen] = useState(false)

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      if (!user?.id) {
        setStats(emptyDashboardStats())
        setRecentFeed([])
        setNearbyCustomers([])
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const today = new Date()
        const [feed, performance] = await Promise.all([
          fetchSalesActivityFeed(user.id, 60),
          loadPerformanceMetrics(user.id, today),
        ])

        const visitsToday = feed.filter((item) => {
          const date = new Date(item.occurredAt)
          return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        }).length

        const visitsActual = performance.visitsActual
        const visitsTarget = performance.visitsTarget
        const totalCompletion = progressPercent(visitsActual, visitsTarget)

        if (!active) return

        setStats({
          totalCompletion,
          visitsToday,
          visitsActual,
          visitsTarget,
          actual_calls: performance.actual_calls,
          target_calls: performance.target_calls,
          actual_quotations: performance.actual_quotations,
          target_quotations: performance.target_quotations,
          actual_gmv: performance.actual_gmv,
          target_gmv: performance.target_gmv,
          actual_reachability: performance.actual_reachability,
          target_reachability: performance.target_reachability,
          urgentFollowUps: performance.urgentFollowUps,
          overdueCallbacks: performance.overdueCallbacks,
          nearbyCount: 0,
        })
        setRecentFeed(feed.slice(0, 5))
      } catch (error) {
        console.error('Failed to load sales dashboard.', error)
        if (!active) return
        setStats(emptyDashboardStats())
        setRecentFeed([])
        setNearbyCustomers([])
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadDashboard()

    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(() => {
    let active = true

    const loadNearbyCustomers = async () => {
      if (!user?.id || !currentLocation) {
        setNearbyCustomers([])
        setStats((previous) => ({ ...previous, nearbyCount: 0 }))
        setNearbyLoading(false)
        return
      }

      setNearbyLoading(true)

      try {
        const userContext = await getScopedUserContext()
        if (!userContext || !active) {
          if (active) {
            setNearbyCustomers([])
            setStats((previous) => ({ ...previous, nearbyCount: 0 }))
          }
          return
        }

        const customers = await fetchScopedCustomers({
          userContext,
          requireCoordinates: true,
          limit: 120,
          orderBy: 'customer_name',
        })

        if (!active) return

        const mappedCustomers = customers
          .map((customer) => ({
            id: customer.id,
            name: customer.name ?? customer.customer_name ?? 'عميل',
            district: customer.district,
            area: customer.area,
            distance:
              typeof customer.lat === 'number' && typeof customer.lng === 'number'
                ? Math.round(distanceMeters(currentLocation, { lat: customer.lat, lng: customer.lng }))
                : Number.POSITIVE_INFINITY,
          }))
          .sort((left, right) => left.distance - right.distance)

        setNearbyCustomers(mappedCustomers.slice(0, 4))
        setStats((previous) => ({
          ...previous,
          nearbyCount: mappedCustomers.filter((customer) => customer.distance <= 2000).length,
        }))
      } catch (error) {
        console.error('Failed to load nearby customers.', error)
        if (!active) return
        setNearbyCustomers([])
        setStats((previous) => ({ ...previous, nearbyCount: 0 }))
      } finally {
        if (active) setNearbyLoading(false)
      }
    }

    void loadNearbyCustomers()

    return () => {
      active = false
    }
  }, [locationKey, user?.id])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'صباح الخير'
    if (hour < 17) return 'مساء الخير'
    return 'مساء الخير'
  }

  const statCards = [
    { label: 'الإنجاز', value: `${stats.totalCompletion}%`, icon: Clock, color: 'text-brand-500' },
    { label: 'المكالمات', value: formatNumberCompact(stats.actual_calls), icon: Phone, color: 'text-brand-500' },
    { label: 'الوصول', value: `${Math.round(stats.actual_reachability)}%`, icon: TrendingUp, color: 'text-success-500' },
    { label: 'المبيعات', value: formatCurrencyCompact(stats.actual_gmv), icon: DollarSign, color: 'text-success-500' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      <NewCustomerCheckInModal
        open={newCustomerCheckInOpen}
        onClose={() => setNewCustomerCheckInOpen(false)}
      />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1"
      >
        {/* Greeting Section - Matching Driver App */}
        <motion.div variants={itemVariants} className="bg-app-dark px-4 pt-4 pb-8 rounded-b-[20px]">
          <h2 className="text-[22px] font-semibold text-white leading-tight">
            {getGreeting()}،
          </h2>
          {user?.full_name && (
            <h2 className="text-[22px] font-semibold text-white leading-tight">
              {user.full_name.split(' ')[0]}
            </h2>
          )}
          <p className="text-sm text-white/70 mt-1">
            {new Date().toLocaleDateString('ar-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </motion.div>

        {/* Stats Cards - Overlapping Header */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 gap-2 px-4 -mt-5"
        >
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className="bg-white rounded-xl p-4 shadow-card flex flex-col items-center text-center"
            >
              <stat.icon size={20} className={stat.color} />
              <span className="text-xl font-bold text-app-text mt-1">{stat.value}</span>
              <span className="text-xs text-app-text-secondary">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="spinner" />
            <p className="mt-4 text-app-text-secondary">جار تحميل لوحة المبيعات...</p>
          </div>
        ) : (
          <>
            {/* Progress Section */}
            <motion.div variants={itemVariants} className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-card">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-app-text">تقدم اليوم</h3>
                <span className="text-sm text-app-text-secondary">
                  {stats.visitsActual} من {stats.visitsTarget}
                </span>
              </div>
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${stats.totalCompletion}%`,
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                  className="h-full bg-app-success rounded-full"
                />
              </div>
              <p className="text-sm text-app-success font-medium mt-2">
                {stats.totalCompletion}% نسبة الإنجاز
              </p>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={itemVariants} className="px-4 mt-4">
              <h3 className="text-lg font-semibold text-app-text mb-3">إجراءات سريعة</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: UserPlus, label: 'زيارة عميل جديد', action: () => setNewCustomerCheckInOpen(true), iconClassName: 'text-brand-500' },
                  { icon: ClipboardCheck, label: 'الزيارات', action: () => navigate('/visits'), iconClassName: 'text-brand-500' },
                  { icon: Users, label: 'العملاء', action: () => navigate('/customers'), iconClassName: 'text-brand-500' },
                  { icon: MapPin, label: activeVisit ? 'استئناف الزيارة' : 'بدء زيارة', action: () => navigate(activeVisit ? `/checkin/${activeVisit.customerId}` : '/customers'), iconClassName: 'text-brand-500' },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={action.action}
                    className="bg-white rounded-xl p-4 shadow-card flex flex-col items-center gap-2 active:scale-[0.97] transition-transform"
                  >
                    <action.icon size={26} className={action.iconClassName} />
                    <span className="text-sm font-semibold text-app-text">{action.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Recent Visits */}
            <motion.div variants={itemVariants} className="px-4 mt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-app-text">آخر الزيارات</h3>
                <button
                  onClick={() => navigate('/visits')}
                  className="text-sm text-brand-500 font-medium"
                >
                  عرض الكل
                </button>
              </div>
              <div className="bg-white rounded-xl shadow-card overflow-hidden">
                {recentFeed.length === 0 ? (
                  <div className="p-4 text-sm text-app-text-secondary text-center">
                    لم يتم تسجيل أي نشاط بعد.
                  </div>
                ) : (
                  recentFeed.map((item, i) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 px-4 py-3 ${
                        i < recentFeed.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-brand-500" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm text-app-text font-medium truncate" dir="auto">{item.customerName}</p>
                          <span className="badge-info text-xs">زيارة</span>
                          {item.urgent ? (
                            <span className="badge-warning text-xs">عاجل</span>
                          ) : null}
                          {!isCleanFraudStatus(item.fraudStatus) ? (
                            <span className="badge-error text-xs">اشتباه</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(item.occurredAt).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Nearby Customers */}
            <motion.div variants={itemVariants} className="px-4 mt-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-app-text">عملاء قريبون</h3>
                <button
                  onClick={() => navigate('/customers')}
                  className="text-sm text-brand-500 font-medium"
                >
                  عرض الكل
                </button>
              </div>
              <div className="bg-white rounded-xl shadow-card overflow-hidden">
                {nearbyLoading && nearbyCustomers.length === 0 ? (
                  <div className="p-4 text-sm text-app-text-secondary text-center">
                    جار تحديث العملاء القريبين...
                  </div>
                ) : nearbyCustomers.length === 0 ? (
                  <div className="p-4 text-sm text-app-text-secondary text-center">
                    لا يوجد عملاء قريبون متاحون.
                  </div>
                ) : (
                  nearbyCustomers.map((customer, i) => (
                    <div
                      key={customer.id}
                      className={`flex items-center gap-3 px-4 py-3 active:scale-[0.98] transition-transform ${
                        i < nearbyCustomers.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                      onClick={() => navigate(`/checkin/${customer.id}`)}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-app-text" dir="auto">{customer.name}</p>
                        <p className="text-xs text-app-text-secondary" dir="auto">
                          {[customer.district, customer.area].filter(Boolean).join(', ')}
                        </p>
                      </div>
                      <div className="text-xs text-app-text-secondary">{formatDistanceMeters(customer.distance)}</div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  )
}
