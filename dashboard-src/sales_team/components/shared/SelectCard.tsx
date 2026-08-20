import type { ReactNode } from 'react'

export default function SelectCard({
  active,
  onClick,
  title,
  subtitle,
  icon,
  activeClass,
  disabled = false,
}: {
  active: boolean
  onClick: () => void
  title: string
  subtitle?: string
  icon: ReactNode
  activeClass: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? activeClass : 'border-app-border bg-brand-25 text-app-text-secondary hover:bg-brand-25/70'
      }`}
    >
      <div>{icon}</div>
      <div className="flex-1">
        <div className="font-bold">{title}</div>
        {subtitle ? <div className="text-xs opacity-70">{subtitle}</div> : null}
      </div>
      {active ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : null}
    </button>
  )
}
