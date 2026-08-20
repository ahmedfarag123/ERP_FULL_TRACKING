import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useAppStore } from '../../store/appStore'
import { IconBell, IconUser, IconMoon, IconSun } from '../shared/Icons'

const pageTitles: Record<string, string> = {
  '/': 'الرئيسية',
  '/customers': 'العملاء',
  '/visits': 'الزيارات',
  '/routes': 'المسارات',
  '/settings': 'الإعدادات'
}

export default function DesktopTopBar() {
  const { pathname } = useLocation()
  const unreadCount = useAppStore((state) => state.unreadCount)
  const themeMode = useAppStore((state) => state.themeMode)
  const setThemeMode = useAppStore((state) => state.setThemeMode)
  const user = useAuthStore((state) => state.user)

  const title =
    Object.entries(pageTitles).find(([routePath]) => pathname === routePath || pathname.startsWith(`${routePath}/`))?.[1] ??
    'هوريكا سمارت للمبيعات'

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-soft bg-[rgb(var(--surface))] px-5 lg:px-6">
      <div>
        <h2 className="font-display text-lg font-bold text-[rgb(var(--fg))]">{title}</h2>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          className="rounded-xl border border-soft bg-[rgb(var(--surface-soft))] p-2.5 text-[rgb(var(--muted-fg))] transition-colors hover:text-[rgb(var(--fg))]"
          aria-label={themeMode === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
        >
          {themeMode === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
        </button>

        <button
          type="button"
          className="relative rounded-xl border border-soft bg-[rgb(var(--surface-soft))] p-2.5 text-[rgb(var(--muted-fg))] transition-colors hover:text-[rgb(var(--fg))]"
          aria-label="التنبيهات"
        >
          <IconBell size={20} />
          {unreadCount > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[rgb(var(--primary))]" />}
        </button>

        <div className="flex items-center gap-2 rounded-xl border border-soft bg-[rgb(var(--surface-soft))] px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--primary-soft))] text-[rgb(var(--primary))]">
            <IconUser size={16} />
          </div>
          <div className="text-right leading-tight">
            <p className="max-w-[160px] truncate text-sm font-semibold text-[rgb(var(--fg))]">{user?.full_name ?? 'مستخدم'}</p>
            <p className="max-w-[160px] truncate text-xs text-[rgb(var(--muted-fg))]">{user?.email ?? ''}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
