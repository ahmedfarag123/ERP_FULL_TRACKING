import type { ReactNode } from "react";

export type StatusBadgeTone =
  | "blue"
  | "green"
  | "yellow"
  | "red"
  | "gray"
  | "orange"
  | "purple"
  | "indigo";

const TONE_CLASS: Record<StatusBadgeTone, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
  green:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  yellow:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
  red: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
  gray: "border-gray-200 bg-brand-25 text-gray-600 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-300",
  orange:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300",
  purple:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
  indigo:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300",
};

export interface StatusBadgeProps {
  label: ReactNode;
  tone?: StatusBadgeTone;
  className?: string;
  dir?: "ltr" | "rtl" | "auto";
  dot?: boolean;
}

export function StatusBadge({
  label,
  tone = "gray",
  className = "",
  dir,
  dot = false,
}: StatusBadgeProps) {
  return (
    <span
      dir={dir}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[tone]} ${className}`}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" /> : null}
      {label}
    </span>
  );
}

export default StatusBadge;
