import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'

export interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
  badge?: number | string
}

interface BottomNavigationProps {
  items: NavItem[]
  className?: string
}

export function BottomNavigation({ items, className }: BottomNavigationProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <nav
      className={clsx(
        'safe-bottom-nav safe-inline fixed bottom-0 left-0 right-0 z-40 border-t bg-[rgb(var(--surface))] backdrop-blur',
        'flex items-center justify-around md:hidden',
        className
      )}
    >
      {items.map((item) => {
        const active = isActive(item.path)
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={clsx(
              'flex h-[4.25rem] flex-1 touch-manipulation flex-col items-center justify-center gap-1 border-t-2 border-transparent px-1 py-2 text-xs font-semibold transition-colors',
              active
                ? 'border-[rgb(var(--primary))] text-[rgb(var(--primary))]'
                : 'text-[rgb(var(--muted-fg))] hover:text-[rgb(var(--fg))]'
            )}
            aria-current={active ? 'page' : undefined}
          >
            <div className="relative flex items-center justify-center text-base">
              {item.icon}

              {item.badge && (
                <span
                  className={clsx(
                    'absolute -right-1.5 -top-1 min-w-5 rounded-full bg-[rgb(var(--danger))] px-1.5 text-[10px] font-bold text-white'
                  )}
                >
                  {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>

            <span className="truncate">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNavigation
