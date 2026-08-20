/**
 * AdminPageElements — TailAdmin-aligned component kit
 *
 * Drop-in replacement for the gradient/shadow version.
 * Same exported names + props → zero changes needed in any page file.
 *
 * Design contract (mirrors actual TailAdmin tokens):
 *   - Cards:   rounded-2xl  border-gray-200  bg-white  dark:bg-white/[0.03]  (NO shadow, NO gradient)
 *   - Sections: rounded-2xl  overflow-hidden  border-gray-200  (NOT rounded-3xl)
 *   - Text:    gray-900/white primary · gray-500/400 secondary
 *   - Badges:  rounded-full  px-2.5 py-1  text-xs font-semibold  ring-1
 */

import type { ReactNode } from "react";

// ─── Tone palette (flat, no gradients) ────────────────────────────────────────

type Tone = "blue" | "emerald" | "amber" | "violet" | "rose" | "slate";

const TONE_VALUE: Record<Tone, string> = {
  blue:    "text-blue-700 dark:text-blue-300",
  emerald: "text-emerald-700 dark:text-emerald-300",
  amber:   "text-amber-700 dark:text-amber-300",
  violet:  "text-violet-700 dark:text-violet-300",
  rose:    "text-rose-700 dark:text-rose-300",
  slate:   "text-gray-900 dark:text-white",
};

const TONE_ICON: Record<Tone, string> = {
  blue:    "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  amber:   "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  violet:  "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  rose:    "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  slate:   "bg-brand-25 text-gray-700 dark:bg-white/10 dark:text-gray-300",
};

const TONE_PILL: Record<Tone, string> = {
  blue:    "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20",
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  amber:   "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  violet:  "bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20",
  rose:    "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
  slate:   "bg-brand-25 text-gray-700 ring-1 ring-gray-200 dark:bg-white/10 dark:text-gray-300 dark:ring-white/10",
};

// ─── AdminPageFrame ────────────────────────────────────────────────────────────
// Simple vertical stack — AppLayout already provides the shell.
// (Removed PageShell dependency; layout is handled by AppLayout → Outlet)

export function AdminPageFrame({
  children,
  className = "",
  dir,
}: {
  children: ReactNode;
  className?: string;
  dir?: "ltr" | "rtl" | "auto";
}) {
  return <div dir={dir} className={`space-y-6 ${className}`}>{children}</div>;
}

// ─── AdminPageHero ─────────────────────────────────────────────────────────────
// Flat page header — no gradient, no rounded-3xl.
// Used in CustomerDetail for the customer profile header.

export function AdminPageHero({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  tone?: Tone;
  meta?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-6 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            {description}
          </p>
          {meta ? <div className="mt-4 flex flex-wrap gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-start gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}

export function TabButton({
  active,
  label,
  labelAr,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  labelAr?: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition ${
        active
          ? "border-brand-500 text-brand-600 dark:text-brand-400"
          : "border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      }`}
    >
      <span>{labelAr ?? label}</span>
      {count !== undefined ? (
        <span className="rounded-full bg-brand-25 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/10 dark:text-gray-300">
          {count}
        </span>
      ) : null}
    </button>
  );
}

// ─── AdminHeroPill ─────────────────────────────────────────────────────────────

export function AdminHeroPill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${TONE_PILL[tone]}`}>
      {children}
    </span>
  );
}

// ─── AdminMetricGrid ───────────────────────────────────────────────────────────

export function AdminMetricGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
      {children}
    </div>
  );
}

// ─── AdminMetricCard ───────────────────────────────────────────────────────────
// TailAdmin token: rounded-2xl border bg-white dark:bg-white/[0.03] p-5 md:p-6
// NO shadow, NO gradient.

export function AdminMetricCard({
  label,
  value,
  helper,
  icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <div className={`mt-3 text-3xl font-semibold tracking-tight ${TONE_VALUE[tone]}`}>
            {value}
          </div>
          {helper ? (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{helper}</p>
          ) : null}
        </div>
        {icon ? (
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${TONE_ICON[tone]}`}>
            {icon}
          </div>
        ) : null}
      </div>
    </article>
  );
}

// ─── AdminSection ──────────────────────────────────────────────────────────────
// TailAdmin section card: rounded-2xl overflow-hidden border bg-white dark:bg-white/[0.03]
// NOT rounded-3xl. NOT shadow-sm.

export function AdminSection({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const hasHeader = Boolean(title || description || actions);
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {hasHeader ? (
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              {title ? (
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? (
              <div className="flex flex-wrap gap-2">{actions}</div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

// ─── AdminFilterBar ────────────────────────────────────────────────────────────

export function AdminFilterBar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-brand-25/80 p-4 dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {children}
    </div>
  );
}

// ─── AdminField ────────────────────────────────────────────────────────────────

export function AdminField({
  label,
  children,
  helper,
}: {
  label: string;
  children: ReactNode;
  helper?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
        {label}
      </span>
      {children}
      {helper ? (
        <span className="block text-xs text-gray-400 dark:text-gray-500">{helper}</span>
      ) : null}
    </label>
  );
}

// ─── AdminEmptyState ───────────────────────────────────────────────────────────

export function AdminEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 px-6 py-14 text-center dark:border-gray-700">
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-25 text-gray-500 dark:bg-white/[0.02] dark:text-gray-400">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

// ─── AdminTableSkeleton ────────────────────────────────────────────────────────

export function AdminTableSkeleton({
  columns,
  rows = 5,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <table className="w-full text-left text-sm">
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex} className="border-b border-gray-100 dark:border-gray-800">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <td key={colIndex} className="px-5 py-4">
                <div className="h-4 animate-pulse rounded-md bg-brand-25 dark:bg-white/[0.02]" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
