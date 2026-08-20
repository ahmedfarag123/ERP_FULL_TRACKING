import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  IconCustomers,
  IconDashboard,
  IconLogout,
  IconRoute,
  IconSettings,
  IconUser,
  IconVisits
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

export default function DesktopSidebar() {
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/sales/auth')
  }

  return (
    <aside className="h-full w-[304px] shrink-0 rounded-[1.35rem] border border-soft surface-card p-4">
      <div className="flex h-full flex-col gap-4">
        <div className="surface-soft rounded-2xl border border-soft p-4">
          <div className="flex flex-row-reverse items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl  text-[rgb(var(--primary-fg))]">
              <img src={SALES_LOGO_SRC} alt="هوريكا سمارت" className='h-11 w-20 object-contain' />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-wide">
                <span>هوريكا</span>
                <span className="text-blue-800">سمارت</span>
                
              </h1>
            </div>
          </div>
        </div>

        {user && (
          <div className="rounded-2xl border border-soft bg-[rgb(var(--surface))] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-soft bg-[rgb(var(--surface-soft))] text-[rgb(var(--primary))]">
                <IconUser size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[rgb(var(--fg))]">{user.full_name}</p>
                <p className="truncate text-xs text-[rgb(var(--muted-fg))]">{user.role}</p>
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
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold transition-colors',
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
                  {isActive && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-[rgb(var(--primary))]" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleSignOut}
          
          className="mt-auto flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold text-[rgb(var(--danger))] hover:bg-[rgb(var(--danger-soft))]"
        >
          <IconLogout size={18} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}
