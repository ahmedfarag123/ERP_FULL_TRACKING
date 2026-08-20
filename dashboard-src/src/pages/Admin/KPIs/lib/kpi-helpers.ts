import type { ScorecardStatus, KpiDirection } from "../../../../types/kpi";

export function formatWeight(weight: number): string {
  return `${Math.round(weight * 100)}%`;
}

export function formatValue(value: number | undefined, unit: string): string {
  if (value === undefined || value === null) return "—";
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit.startsWith("EGP")) return `${value.toLocaleString()} EGP`;
  if (unit === "Days") return `${value.toFixed(1)} يوم`;
  if (unit === "Hours") return `${value.toFixed(1)} ساعة`;
  if (unit === "Minutes") return `${value.toFixed(0)} دقيقة`;
  if (unit === "Turns") return `${value.toFixed(2)}x`;
  if (unit === "Orders/Day") return `${value.toFixed(0)} طلب/يوم`;
  if (unit === "Score") return `${value.toFixed(1)} نقطة`;
  if (unit === "Count") return `${value.toLocaleString()}`;
  if (unit.startsWith("EGP/KM")) return `${value.toLocaleString()} EGP/كم`;
  if (unit === "L/KM") return `${value.toFixed(3)} لتر/كم`;
  if (unit === "Lines/Hr") return `${value.toFixed(0)} سطر/ساعة`;
  if (unit === "Trips/Vehicle") return `${value.toFixed(1)} رحلة/مركبة`;
  return value.toLocaleString();
}

export function getStatusTone(status: ScorecardStatus): "blue" | "green" | "yellow" | "red" | "gray" {
  const tones: Record<ScorecardStatus, "blue" | "green" | "yellow" | "red" | "gray"> = {
    "Pending": "gray", "On Track": "green", "At Risk": "yellow", "Missed": "red", "Exceeded": "blue",
  };
  return tones[status] ?? "gray";
}

export function getDirectionIcon(direction: KpiDirection): string {
  return direction === "Higher is Better" ? "↑" : "↓";
}

export function getDirectionColor(direction: KpiDirection): string {
  return direction === "Higher is Better" ? "text-green-600" : "text-red-600";
}

export function computeScorecardStatus(
  actual: number | undefined,
  target: number | undefined,
  direction: KpiDirection,
  threshold?: number
): ScorecardStatus {
  if (actual === undefined || target === undefined) return "Pending";
  if (target === 0) return "On Track";
  const ratio = actual / target;
  const minThreshold = threshold ?? 0.7;
  if (direction === "Higher is Better") {
    if (ratio >= 1) return "Exceeded";
    if (ratio >= 0.9) return "On Track";
    if (ratio >= minThreshold) return "At Risk";
    return "Missed";
  } else {
    if (ratio <= 1) return "Exceeded";
    if (ratio <= 1.1) return "On Track";
    if (ratio <= 1 + (1 - minThreshold)) return "At Risk";
    return "Missed";
  }
}
