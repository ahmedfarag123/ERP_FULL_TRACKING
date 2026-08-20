import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, ClipboardCheck, Route, Settings, Bell, Wifi, WifiOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LocationStatusChip from '../common/LocationStatusChip'
import { useAuthStore } from '../../store/authStore'
import { useVisitStore } from '../../store/visitStore'
import { useAppStore } from '../../store/appStore'

const tabs = [
  { key: 'home', label: 'الرئيسية', icon: LayoutDashboard, path: '/' },
  { key: 'customers', label: 'العملاء', icon: Users, path: '/customers' },
  { key: 'visits', label: 'الزيارات', icon: ClipboardCheck, path: '/visits' },
  { key: 'routes', label: 'المسارات', icon: Route, path: '/routes' },
  { key: 'settings', label: 'الإعدادات', icon: Settings, path: '/settings' },
]

function MobileContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center items-start min-h-[100dvh] bg-neutral-200 overflow-hidden">
      <div className="mobile-app-frame w-full max-w-[430px] h-[100dvh] max-h-[100dvh] bg-gray-100 relative overflow-hidden shadow-2xl flex flex-col">
        {children}
      </div>
    </div>
  )
}

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const activeVisit = useVisitStore((state) => state.activeVisit)
  const updateElapsed = useVisitStore((state) => state.updateElapsed)
  const isOffline = useAppStore((state) => state.isOffline)
  const unreadCount = useAppStore((state) => state.unreadCount)

  useEffect(() => {
    if (!activeVisit) return undefined

    const tick = () => {
      updateElapsed(Math.max(0, Math.floor((Date.now() - activeVisit.startTime) / 1000)))
    }

    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [activeVisit?.customerId, activeVisit?.startTime, updateElapsed])

  const handleLogout = async () => {
    await signOut()
    navigate('/auth', { replace: true })
  }

  const isDetailPage = location.pathname.includes('/checkin/') ||
                        location.pathname.includes('/settings/') ||
                        location.pathname.includes('/notifications')

  return (
    <MobileContainer>
      {/* Offline Banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sticky top-14 z-[99] bg-app-error text-white px-4 py-2 flex items-center gap-2"
          >
            <WifiOff size={14} />
            <span className="text-xs font-medium">
              أنت غير متصل. ستتم مزامنة التغييرات عند عودة الاتصال.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-[100] border-b border-gray-200 bg-white text-gray-800 shadow-theme-xs">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2 flex-1">
            {isDetailPage ? (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 active:opacity-70 transition-opacity"
              >
                <span className="text-base font-medium text-gray-900">رجوع</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-base font-bold text-gray-900">هوريكا</span>
                  <span className="text-base font-medium text-brand-500">سمارت</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <LocationStatusChip />
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand-25 text-gray-600 active:scale-95 transition-transform"
              aria-label="الإشعارات"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-app-error px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <div className="relative">
              {isOffline ? (
                <WifiOff size={18} className="text-error-500" />
              ) : (
                <Wifi size={18} className="text-success-500" />
              )}
              {isOffline && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-error-500 rounded-full animate-pulse-dot" />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Active Visit Banner */}
      {activeVisit ? (
        <div className="mx-auto w-full px-4 py-2">
          <button
            type="button"
            onClick={() => navigate(`/checkin/${activeVisit.customerId}`)}
            className="flex w-full items-center justify-between rounded-xl border border-brand-500/30 bg-brand-50 px-4 py-3 text-left text-app-text shadow-card"
          >
            <div>
              <p className="font-bold">{activeVisit.customerName}</p>
              <p className="text-xs text-app-text-secondary">استئناف الزيارة النشطة</p>
            </div>
            <p className="font-mono text-sm text-brand-500">{`${Math.floor(activeVisit.elapsed / 60)
              .toString()
              .padStart(2, '0')}:${(activeVisit.elapsed % 60).toString().padStart(2, '0')}`}</p>
          </button>
        </div>
      ) : null}

      {/* Main Content */}
      <main className="flex-1 w-full overflow-y-auto no-scrollbar pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      {!isDetailPage && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[100] bg-white border-t border-gray-200 shadow-nav">
          <div className="flex items-center justify-around h-16 pb-safe">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/')
              const Icon = tab.icon

              return (
                <button
                  key={tab.key}
                  onClick={() => navigate(tab.path)}
                  className="relative flex flex-col items-center justify-center gap-1 w-16 h-full active:scale-[0.92] transition-transform duration-150"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <Icon
                    size={22}
                    className={isActive ? 'text-brand-500' : 'text-gray-500'}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                  <span
                    className={`text-[11px] font-medium tracking-wide ${
                      isActive ? 'text-brand-500' : 'text-gray-500'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </MobileContainer>
  )
}
