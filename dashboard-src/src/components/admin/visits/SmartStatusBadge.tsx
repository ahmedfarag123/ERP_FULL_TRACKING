import type { SmartStatus } from "../../../lib/visit-translations";

const TONE_CLASSES: Record<SmartStatus["color"], string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  yellow: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
  red: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
  gray: "border-gray-200 bg-brand-25 text-gray-600 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-300",
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
};

interface SmartStatusBadgeProps {
  status: SmartStatus;
  className?: string;
  size?: "sm" | "md";
}

export default function SmartStatusBadge({ status, className = "", size = "sm" }: SmartStatusBadgeProps) {
  const sizeClasses = size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${TONE_CLASSES[status.color]} ${sizeClasses} ${className}`}
      title={status.description}
    >
      <span>{status.icon}</span>
      <span>{status.label}</span>
    </span>
  );
}
