import { useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'
import { IconMenu, IconBell, IconMoon, IconSun } from '../shared/Icons'

const pageTitles: Record<string, string> = {
  '/': 'الرئيسية',
  '/customers': 'العملاء',
  '/visits': 'الزيارات',
  '/routes': 'المسارات',
  '/settings': 'الإعدادات'
}

export default function TopBar() {
  const { pathname } = useLocation()
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const unreadCount = useAppStore((state) => state.unreadCount)
  const themeMode = useAppStore((state) => state.themeMode)
  const setThemeMode = useAppStore((state) => state.setThemeMode)

  const title =
    Object.entries(pageTitles).find(([routePath]) => pathname === routePath || pathname.startsWith(`${routePath}/`))?.[1] ??
    'هوريكا سمارت للمبيعات'

  return (
    <header className="safe-top sticky top-0 z-30 flex min-h-14 items-center border-b border-soft bg-[rgb(var(--surface))] px-3">
      <button
        onClick={() => setSidebarOpen(true)}
        className="rounded-xl p-2 text-[rgb(var(--muted-fg))] transition-colors hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--fg))]"
        aria-label="فتح القائمة"
      >
        <IconMenu size={20} />
      </button>

      <h2 className="flex-1 truncate px-2 font-display text-base font-semibold text-[rgb(var(--fg))]">{title}</h2>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          className="rounded-xl p-2 text-[rgb(var(--muted-fg))] transition-colors hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--fg))]"
          aria-label={themeMode === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
        >
          {themeMode === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
        </button>

        <button
          type="button"
          className="relative rounded-xl p-2 text-[rgb(var(--muted-fg))] transition-colors hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--fg))]"
          aria-label="التنبيهات"
        >
          <IconBell size={20} />
          {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[rgb(var(--primary))]" />}
        </button>
      </div>
    </header>
  )
}
