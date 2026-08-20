import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Tone = 'neutral' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'

const toneClasses: Record<Tone, string> = {
  neutral: 'border-slate-200/70 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
  blue: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
  yellow: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
  red: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
  purple: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/20 dark:bg-fuchsia-500/10 dark:text-fuchsia-300',
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

const avatarPalettes = [
  'from-amber-500 to-orange-500',
  'from-sky-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-fuchsia-500 to-violet-500',
  'from-indigo-500 to-blue-500',
]

export function CustomerAvatar({
  name,
  size = 'md',
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  const palette = avatarPalettes[hashString(name) % avatarPalettes.length]
  const sizeClass = size === 'sm' ? 'h-10 w-10 text-xs' : size === 'lg' ? 'h-14 w-14 text-lg' : 'h-12 w-12 text-sm'

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-bold text-white shadow-lg shadow-slate-950/10',
        palette,
        sizeClass
      )}
      aria-hidden
    >
      {initials || 'C'}
    </div>
  )
}

export function SurfaceCard({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-soft bg-[rgb(var(--surface))] shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)]',
        className
      )}
    >
      {children}
    </section>
  )
}

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="relative p-5 md:p-7">
        <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.22),transparent_55%),radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_35%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--muted-fg))]">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[rgb(var(--fg))] md:text-4xl">
              {title}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[rgb(var(--muted-fg))] md:text-base">
              {description}
            </p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </SurfaceCard>
  )
}

export function MetricCard({
  label,
  value,
  note,
  icon,
}: {
  label: string
  value: string
  note?: string
  icon?: ReactNode
}) {
  return (
    <SurfaceCard className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[rgb(var(--muted-fg))]">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold text-[rgb(var(--fg))]">{value}</p>
          {note ? <p className="mt-1 text-xs text-[rgb(var(--muted-fg))]">{note}</p> : null}
        </div>
        {icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--surface-soft))] text-[rgb(var(--primary))]">
            {icon}
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  )
}

export function PillBadge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export function EmptyPanel({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <SurfaceCard className="p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgb(var(--surface-soft))] text-[rgb(var(--muted-fg))]">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold text-[rgb(var(--fg))]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[rgb(var(--muted-fg))]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </SurfaceCard>
  )
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-[rgb(var(--fg))]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[rgb(var(--muted-fg))]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}
