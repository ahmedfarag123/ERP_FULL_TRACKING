import type { ReactNode } from "react";

type TrendDirection = "up" | "down" | "flat";
type StatTone = "neutral" | "blue" | "green" | "yellow" | "red" | "purple";

const TONE_ACCENT: Record<StatTone, string> = {
  neutral: "text-gray-700 bg-brand-25 dark:bg-white/[0.02] dark:text-gray-300",
  blue: "text-blue-700 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-300",
  green: "text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300",
  yellow: "text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300",
  red: "text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300",
  purple: "text-violet-700 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-300",
};

function TrendArrow({ direction }: { direction: TrendDirection }) {
  return (
    <span aria-hidden="true">
      {direction === "up" ? "↑" : direction === "down" ? "↓" : "→"}
    </span>
  );
}

export interface StatCardProps {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  icon?: ReactNode;
  trendValue?: string;
  trendDirection?: TrendDirection;
  tone?: StatTone;
  muted?: boolean;
  valueDir?: "ltr" | "rtl" | "auto";
}

export default function StatCard({
  label,
  value,
  helper,
  icon,
  trendValue,
  trendDirection = "flat",
  tone = "neutral",
  muted = false,
  valueDir,
}: StatCardProps) {
  const trendTone =
    trendDirection === "up"
      ? "text-emerald-600"
      : trendDirection === "down"
        ? "text-rose-600"
        : "text-gray-500";

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {label}
          </p>
          <div
            dir={valueDir}
            className={`mt-3 text-3xl font-bold tracking-tight ${
              muted ? "text-gray-300 dark:text-gray-600" : "text-gray-900 dark:text-white"
            }`}
          >
            {value}
          </div>
          {helper ? (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{helper}</p>
          ) : null}
          {trendValue ? (
            <p className={`mt-3 inline-flex items-center gap-1 text-sm font-semibold ${trendTone}`}>
              <TrendArrow direction={trendDirection} />
              {trendValue}
            </p>
          ) : null}
        </div>

        {icon ? (
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${TONE_ACCENT[tone]}`}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </article>
  );
}
