import { clsx } from "clsx";

interface KpiProgressBarProps {
  value: number;
  max?: number;
  target?: number;
  direction?: "Higher is Better" | "Lower is Better";
  height?: number;
  showLabel?: boolean;
  className?: string;
}

function getProgressColor(
  percent: number,
  direction: "Higher is Better" | "Lower is Better"
): string {
  if (direction === "Higher is Better") {
    if (percent >= 100) return "bg-emerald-500";
    if (percent >= 80) return "bg-blue-500";
    if (percent >= 60) return "bg-amber-500";
    return "bg-red-500";
  }
  // Lower is Better
  if (percent >= 100) return "bg-emerald-500";
  if (percent >= 80) return "bg-blue-500";
  if (percent >= 60) return "bg-amber-500";
  return "bg-red-500";
}

export function KpiProgressBar({
  value,
  max = 150,
  target,
  direction = "Higher is Better",
  height = 6,
  showLabel = true,
  className,
}: KpiProgressBarProps) {
  const percent = Math.min(Math.round(value), max);
  const color = getProgressColor(
    target ? (direction === "Higher is Better" ? (value / target) * 100 : (target / value) * 100) : value,
    direction
  );

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <div
        className="relative flex-1 overflow-hidden rounded-full bg-brand-25"
        style={{ height }}
      >
        <div
          className={clsx("absolute inset-y-0 left-0 rounded-full transition-all duration-500", color)}
          style={{ width: `${(percent / max) * 100}%` }}
        />
      </div>
      {showLabel && (
        <span className="min-w-[2rem] text-right text-xs font-medium text-gray-600">
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}

export function WeightBar({ weight }: { weight: number }) {
  const percent = Math.round(weight * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-brand-25">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600">{percent}%</span>
    </div>
  );
}
