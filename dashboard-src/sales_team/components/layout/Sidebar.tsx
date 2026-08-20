import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useAppStore } from '../../store/appStore'
import {
  IconDashboard,
  IconCustomers,
  IconVisits,
  IconRoute,
  IconSettings,
  IconClose,
  IconLogout,
  IconUser
} from '../shared/Icons'
import { cn } from '../../lib/utils'
import { SALES_LOGO_SRC } from '../../lib/appAssets'

const navItems = [
  { to: '/', icon: IconDashboard, label: 'الرئيسية' },
  { to: '/customers', icon: IconCustomers, label: 'العملاء' },
  { to: '/visits', icon: IconVisits, label: 'الزيارات' },
  { to: '/routes', icon: IconRoute, label: 'المسارات' },
  { to: '/settings', icon: IconSettings, label: 'الإعدادات' }
]

export default function Sidebar() {
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/40 transition-opacity duration-200 md:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={cn(
          'safe-top fixed inset-y-0 right-0 z-50 flex w-72 flex-col border-l border-soft bg-[rgb(var(--surface))] p-4 shadow-2xl transition-transform duration-300 md:hidden',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl  text-[rgb(var(--primary-fg))]">
              <img src={SALES_LOGO_SRC} alt='هوريكا سمارت' className="h-10 w-10 object-contain" />
            </div>
            <div>
              <h1 className="font-display text-sm font-bold tracking-wide text-[rgb(var(--fg))])">هوريكا سمارت للمبيعات</h1>
              <p className="text-xs text-[rgb(var(--muted-fg))]">مساحة العمل الميدانية</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-[rgb(var(--muted-fg))] transition-colors hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--fg))]"
          >
            <IconClose size={18} />
          </button>
        </div>

        {user && (
          <div className="mb-4 rounded-2xl border border-soft bg-[rgb(var(--surface-soft))] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--surface))] text-[rgb(var(--primary))]">
                <IconUser size={18} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[rgb(var(--fg))]">{user.full_name}</p>
                <p className="text-xs text-[rgb(var(--muted-fg))]">{user.role}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="scrollbar-none flex-1 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[rgb(var(--primary-soft))] text-[rgb(var(--primary))]'
                    : 'text-[rgb(var(--muted-fg))] hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--fg))]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-[rgb(var(--primary))]' : 'text-[rgb(var(--muted-fg))]'} />
                  <span>{label}</span>
                  {isActive && <div className="mr-auto h-1.5 w-1.5 rounded-full bg-[rgb(var(--primary))]" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="pt-4">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl border border-soft bg-[rgb(var(--surface-soft))] px-3 py-2.5 text-sm font-medium text-[rgb(var(--muted-fg))] transition-colors hover:text-[rgb(var(--fg))]"
          >
            <IconLogout size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  )
}
