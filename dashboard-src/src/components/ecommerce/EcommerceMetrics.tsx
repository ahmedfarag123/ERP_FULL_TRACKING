import type { ReactNode } from "react";
import { ArrowDownIcon, ArrowUpIcon, BoxIconLine, GroupIcon } from "../../icons";
import type { DashboardMetric } from "../../types/admin-dashboard";
import StatusBadge from "../ui/StatusBadge";

interface EcommerceMetricsProps {
  metrics: DashboardMetric[];
  isLoading?: boolean;
}

const iconByMetric: Record<string, ReactNode> = {
  customers: <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />,
  visits: <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />,
  calls: <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />,
  gmv: <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />,
};

export default function EcommerceMetrics({
  metrics,
  isLoading = false,
}: EcommerceMetricsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {isLoading && metrics.length === 0
        ? Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
            >
              <div className="h-12 w-12 animate-pulse rounded-xl bg-brand-25 dark:bg-white/[0.02]" />
              <div className="mt-5 space-y-3">
                <div className="h-4 w-20 animate-pulse rounded bg-brand-25 dark:bg-white/[0.02]" />
                <div className="h-8 w-28 animate-pulse rounded bg-brand-25 dark:bg-white/[0.02]" />
                <div className="h-3 w-36 animate-pulse rounded bg-brand-25 dark:bg-white/[0.02]" />
              </div>
            </div>
          ))
        : metrics.map((metric) => (
            <div
              key={metric.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-25 dark:bg-white/[0.02]">
                {iconByMetric[metric.id] ?? (
                  <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
                )}
              </div>

              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {metric.label}
                  </span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {metric.value}
                  </h4>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {metric.detail}
                  </p>
                </div>
                {metric.deltaPercentage !== null ? (
                  <StatusBadge
                    label={<>{metric.trend === "down" ? <ArrowDownIcon /> : <ArrowUpIcon />}{metric.deltaPercentage.toFixed(2)}%</>}
                    tone={metric.tone === "success" ? "green" : metric.tone === "error" ? "red" : metric.tone === "warning" ? "yellow" : "blue"}
                  />
                ) : null}
              </div>
            </div>
          ))}
    </div>
  );
}
