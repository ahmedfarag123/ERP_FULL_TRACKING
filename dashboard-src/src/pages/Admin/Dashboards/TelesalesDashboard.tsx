import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PhoneIcon,
  TicketIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  StarIcon,
  BoltIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import PageMeta from "../../../components/common/PageMeta";
import { AdminPageFrame } from "../../../components/admin/AdminPageElements";
import { SectionCard } from "../admin-shared";
import StatusBadge from "../../../components/ui/StatusBadge";
import { supabase } from "../../../lib/supabase";
import DateRangePicker from "../../../components/form/date-range-picker";
import TelesalesAgentPerformanceRow from "../../../components/admin/telesales/TelesalesAgentPerformanceRow";
import CustomerServiceAgentPerformanceRow from "../../../components/customer-service/CustomerServiceAgentPerformanceRow";
import type { DateRangeValue } from "../../../lib/date-range";

// ── Constants ────────────────────────────────────────────────────────────────

const CALL_STATUS_LABELS: Record<string, string> = {
  completed: "مكتملة",
  missed: "فائتة",
  no_answer: "لم يجب",
  busy: "مشغول",
  failed: "فشل",
  cancelled: "ملغاة",
};

const CALL_STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  missed: "#f43f5e",
  no_answer: "#f59e0b",
  busy: "#f97316",
  failed: "#ef4444",
  cancelled: "#9ca3af",
};

const TICKET_STATUS_MAP: Record<string, { label: string; tone: "green" | "blue" | "yellow" | "red" | "gray" }> = {
  open: { label: "مفتوحة", tone: "blue" },
  pending: { label: "قيد الانتظار", tone: "yellow" },
  in_progress: { label: "قيد المعالجة", tone: "blue" },
  resolved: { label: "تم الحل", tone: "green" },
  closed: { label: "مغلقة", tone: "gray" },
};

const PRIORITY_MAP: Record<string, { label: string; tone: "red" | "orange" | "yellow" | "gray" }> = {
  urgent: { label: "عاجل", tone: "red" },
  high: { label: "عالي", tone: "orange" },
  medium: { label: "متوسط", tone: "yellow" },
  low: { label: "منخفض", tone: "gray" },
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#9ca3af",
};

const STATUS_COLORS: Record<string, string> = {
  open: "#3b82f6",
  pending: "#f59e0b",
  in_progress: "#6366f1",
  resolved: "#10b981",
  closed: "#9ca3af",
};

const QUICK_RANGES = [
  { label: "اليوم", value: "today" as const },
  { label: "أمس", value: "yesterday" as const },
  { label: "7 أيام", value: "7d" as const },
  { label: "30 يوم", value: "30d" as const },
];

// ── Utility Functions ────────────────────────────────────────────────────────

function formatDateAr(value: string | null | undefined): string {
  if (!value) return "–";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "–";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}د ${s}ث` : `${s}ث`;
}

function rangeToISO(range: DateRangeValue) {
  const now = new Date();
  const start = range[0] ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const end = range[1] ?? now;
  return {
    startISO: new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0).toISOString(),
    endISO: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).toISOString(),
  };
}

function getYesterdayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
}

// ── Sub-Components ───────────────────────────────────────────────────────────

function MiniSparkline({ data, color = "#3b82f6" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendBadge({ value, suffix = "" }: { value: number; suffix?: string }) {
  const isPositive = value > 0;
  const isZero = value === 0;
  if (isZero) return <span className="text-xs text-gray-400 dark:text-gray-500">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
      }`}
    >
      {isPositive ? (
        <ArrowTrendingUpIcon className="h-3 w-3" />
      ) : (
        <ArrowTrendingDownIcon className="h-3 w-3" />
      )}
      {isPositive ? "+" : ""}{value.toFixed(1)}{suffix}
    </span>
  );
}

function PremiumKpiCard({
  label,
  value,
  icon,
  sparklineData,
  trend,
  trendLabel = "vs yesterday",
  tone,
  subValue,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sparklineData?: number[];
  trend?: number;
  trendLabel?: string;
  tone: "blue" | "emerald" | "amber" | "red" | "violet";
  subValue?: string;
}) {
  const toneMap = {
    blue: {
      iconBg: "bg-blue-50 dark:bg-blue-500/10",
      iconText: "text-blue-600 dark:text-blue-400",
      ring: "ring-blue-200 dark:ring-blue-500/20",
    },
    emerald: {
      iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
      iconText: "text-emerald-600 dark:text-emerald-400",
      ring: "ring-emerald-200 dark:ring-emerald-500/20",
    },
    amber: {
      iconBg: "bg-amber-50 dark:bg-amber-500/10",
      iconText: "text-amber-600 dark:text-amber-400",
      ring: "ring-amber-200 dark:ring-amber-500/20",
    },
    red: {
      iconBg: "bg-rose-50 dark:bg-rose-500/10",
      iconText: "text-rose-600 dark:text-rose-400",
      ring: "ring-rose-200 dark:ring-rose-500/20",
    },
    violet: {
      iconBg: "bg-violet-50 dark:bg-violet-500/10",
      iconText: "text-violet-600 dark:text-violet-400",
      ring: "ring-violet-200 dark:ring-violet-500/20",
    },
  };
  const t = toneMap[tone];
  const sparkColor =
    tone === "emerald" ? "#10b981" : tone === "red" ? "#f43f5e" : tone === "amber" ? "#f59e0b" : tone === "violet" ? "#8b5cf6" : "#3b82f6";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] ring-1 ${t.ring}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
          <div className="mt-1.5 flex items-center gap-2">
            {trend != null && <TrendBadge value={trend} />}
            {trendLabel && <span className="text-[11px] text-gray-400 dark:text-gray-500">{trendLabel}</span>}
          </div>
          {subValue && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{subValue}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.iconBg}`}>
            <span className={t.iconText}>{icon}</span>
          </div>
          {sparklineData && <MiniSparkline data={sparklineData} color={sparkColor} />}
        </div>
      </div>
    </motion.div>
  );
}

function DonutChart({
  data,
  centerLabel,
  centerValue,
  size = 180,
}: {
  data: { name: string; value: number; color: string }[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const chartData = data.filter((d) => d.value > 0);

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.32}
              outerRadius={size * 0.45}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0];
                return (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    <span className="font-medium text-gray-900 dark:text-white">{d.name}</span>
                    <span className="mr-2 text-gray-500 dark:text-gray-400">{d.value as number}</span>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && <span className="text-2xl font-bold text-gray-900 dark:text-white">{centerValue}</span>}
            {centerLabel && <span className="text-[11px] text-gray-400 dark:text-gray-500">{centerLabel}</span>}
          </div>
        )}
      </div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
            <span className="font-medium text-gray-900 dark:text-white">{d.value}</span>
            {total > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                ({((d.value / total) * 100).toFixed(0)}%)
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RadialProgress({
  value,
  max = 100,
  label,
  color = "#3b82f6",
  size = 120,
}: {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  size?: number;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} className="dark:stroke-gray-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700"
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-xl font-bold fill-gray-900 dark:fill-white"
          fontSize={size * 0.18}
        >
          {pct.toFixed(0)}%
        </text>
      </svg>
      {label && <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>}
    </div>
  );
}

function HorizontalBarChart({
  items,
  max,
  barHeight = "h-5",
}: {
  items: { label: string; count: number; color: string }[];
  max: number;
  barHeight?: string;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-sm text-gray-700 dark:text-gray-300 truncate">{item.label}</span>
          <div className="flex-1 overflow-hidden rounded-full bg-brand-25 dark:bg-white/[0.02]">
            <motion.div
              className={`${barHeight} rounded-full`}
              style={{ backgroundColor: item.color }}
              initial={{ width: 0 }}
              animate={{ width: `${max > 0 ? (item.count / max) * 100 : 0}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <span className="w-10 text-left text-sm font-medium text-gray-600 dark:text-gray-400">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

function CallFunnel({ stages }: { stages: { label: string; value: number; color: string }[] }) {
  const maxValue = stages[0]?.value ?? 1;
  return (
    <div className="flex flex-col items-center gap-1">
      {stages.map((stage, i) => {
        const widthPct = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
        const dropoff = i > 0 ? stages[i - 1].value - stage.value : 0;
        const dropoffPct = i > 0 && stages[i - 1].value > 0 ? ((dropoff / stages[i - 1].value) * 100).toFixed(1) : null;
        return (
          <div key={stage.label} className="w-full">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{stage.label}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{stage.value}</span>
            </div>
            <div className="flex justify-center py-1">
              <motion.div
                className="h-10 rounded-lg"
                style={{ backgroundColor: stage.color, width: `${widthPct}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
              />
            </div>
            {dropoffPct && (
              <div className="text-center text-[10px] text-rose-500 dark:text-rose-400">
                ↓ -{dropoffPct}% ({dropoff})
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HeatmapGrid({
  data,
  max,
  labels,
  cols = 8,
}: {
  data: number[];
  max: number;
  labels: string[];
  cols?: number;
}) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {data.map((val, i) => {
        const intensity = max > 0 ? val / max : 0;
        return (
          <div
            key={i}
            className="group relative flex h-8 items-center justify-center rounded text-[10px] font-medium text-white transition-transform hover:scale-110"
            style={{
              backgroundColor:
                intensity === 0
                  ? "#f3f4f6"
                  : intensity < 0.25
                    ? "#bfdbfe"
                    : intensity < 0.5
                      ? "#60a5fa"
                      : intensity < 0.75
                        ? "#2563eb"
                        : "#1e40af",
              color: intensity > 0.25 ? "white" : "#6b7280",
            }}
            title={`${labels[i]}: ${val} calls`}
          >
            {val > 0 && val}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-xs text-white shadow-lg group-hover:block">
              {labels[i]}: {val}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgentCard({
  name,
  total,
  completed,
  avgDuration,
  rank,
}: {
  name: string;
  total: number;
  completed: number;
  avgDuration: number;
  rank: number;
}) {
  const rate = total > 0 ? ((completed / total) * 100).toFixed(0) : "0";
  const medals = ["🥇", "🥈", "🥉"];
  const medal = rank <= 3 ? medals[rank - 1] : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl border p-4 transition-all hover:shadow-md ${
        rank <= 3
          ? "border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-25 text-lg font-bold text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
            {name.charAt(0)}
          </div>
          {medal && <span className="absolute -top-1 -right-1 text-sm">{medal}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-white truncate">{name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{total} مكالمة · {formatDuration(avgDuration)}</p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${Number(rate) >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            {rate}%
          </p>
          <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-brand-25 dark:bg-white/[0.02]">
            <div
              className={`h-full rounded-full ${Number(rate) >= 80 ? "bg-emerald-500" : Number(rate) >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
              style={{ width: `${Math.min(Number(rate), 100)}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ActivityItem({
  icon,
  iconColor,
  text,
  time,
}: {
  icon: React.ReactNode;
  iconColor: string;
  text: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 dark:border-gray-800">
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconColor}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-700 dark:text-gray-300">{text}</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">{time}</p>
      </div>
    </div>
  );
}

function InsightCard({ icon, text, color = "text-blue-600 dark:text-blue-400" }: { icon: React.ReactNode; text: string; color?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-brand-25/50 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
      <span className={`mt-0.5 shrink-0 ${color}`}>{icon}</span>
      <p className="text-sm text-gray-700 dark:text-gray-300">{text}</p>
    </div>
  );
}

function AlertCard({ icon, text, severity, onClick }: { icon: React.ReactNode; text: string; severity: "warning" | "danger" | "info"; onClick?: () => void }) {
  const styles = {
    warning: "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5 text-amber-700 dark:text-amber-300",
    danger: "border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/5 text-rose-700 dark:text-rose-300",
    info: "border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/5 text-blue-700 dark:text-blue-300",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-right transition hover:shadow-sm ${styles[severity]} ${onClick ? "cursor-pointer" : ""}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p className="flex-1 text-sm">{text}</p>
      {onClick && (
        <svg className="mt-0.5 h-4 w-4 shrink-0 opacity-50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
}

function HealthScore({
  score,
  trend,
  label,
}: {
  score: number;
  trend: number;
  label: string;
}) {
  const grade =
    score >= 90 ? { label: "ممتاز", color: "#10b981" } :
    score >= 75 ? { label: "جيد", color: "#3b82f6" } :
    score >= 60 ? { label: "مقبول", color: "#f59e0b" } :
    { label: "يحتاج تحسين", color: "#ef4444" };

  return (
    <div className="flex items-center gap-6 rounded-2xl border border-gray-200 bg-gradient-to-r from-white to-gray-50 p-6 dark:border-gray-800 dark:from-white/[0.03] dark:to-white/[0.01]">
      <div className="relative">
        <RadialProgress value={score} color={grade.color} size={140} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">صحة العمليات</p>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">{score}</span>
          <span className="text-sm font-semibold" style={{ color: grade.color }}>{grade.label}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <TrendBadge value={trend} />
          <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
        </div>
      </div>
      <div className="hidden lg:flex flex-col gap-2 text-right">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">الهدف</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">90</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">الحالي</p>
          <p className="text-lg font-bold" style={{ color: grade.color }}>{score}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function TelesalesDashboard() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);
    return [start, end];
  });
  const [activeQuick, setActiveQuick] = useState<string | null>("30d");
  const [selectedTelesalesAgentId, setSelectedTelesalesAgentId] = useState<string | null>(null);
  const [selectedCSAgentId, setSelectedCSAgentId] = useState<string | null>(null);

  const handleQuickRange = (value: string) => {
    const now = new Date();
    let start: Date;
    const end = now;
    switch (value) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "yesterday":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case "7d":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        break;
      case "30d":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        break;
      default:
        return;
    }
    setDateRange([start, end]);
    setActiveQuick(value);
  };

  const { startISO, endISO } = rangeToISO(dateRange);
  const yesterday = useMemo(() => getYesterdayRange(), []);

  // ── Current Period Queries ───────────────────────────────────────────────

  const { data: totalCalls = 0 } = useQuery({
    queryKey: ["telesales", "totalCalls", startISO, endISO],
    queryFn: async () => {
      const { count } = await supabase
        .from("calls")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startISO)
        .lte("created_at", endISO);
      return count ?? 0;
    },
  });

  const { data: completedCalls = 0 } = useQuery({
    queryKey: ["telesales", "completedCalls", startISO, endISO],
    queryFn: async () => {
      const { count } = await supabase
        .from("calls")
        .select("*", { count: "exact", head: true })
        .eq("call_status", "completed")
        .gte("created_at", startISO)
        .lte("created_at", endISO);
      return count ?? 0;
    },
  });

  const { data: avgDuration = 0 } = useQuery({
    queryKey: ["telesales", "avgDuration", startISO, endISO],
    queryFn: async () => {
      const { data } = await supabase
        .from("calls")
        .select("call_duration_seconds")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .not("call_duration_seconds", "is", null);
      if (!data?.length) return 0;
      return Math.round(data.reduce((sum, r) => sum + (r.call_duration_seconds ?? 0), 0) / data.length);
    },
  });

  const { data: totalTickets = 0 } = useQuery({
    queryKey: ["telesales", "totalTickets"],
    queryFn: async () => {
      const { count } = await supabase.from("order_tickets").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: openTickets = 0 } = useQuery({
    queryKey: ["telesales", "openTickets"],
    queryFn: async () => {
      const { count } = await supabase
        .from("order_tickets")
        .select("*", { count: "exact", head: true })
        .in("status", ["open", "pending", "in_progress"]);
      return count ?? 0;
    },
  });

  const { data: resolvedToday = 0 } = useQuery({
    queryKey: ["telesales", "resolvedToday", startISO, endISO],
    queryFn: async () => {
      const { count } = await supabase
        .from("order_tickets")
        .select("*", { count: "exact", head: true })
        .in("status", ["resolved", "closed"])
        .gte("updated_at", startISO)
        .lte("updated_at", endISO);
      return count ?? 0;
    },
  });

  // ── Comparison (Yesterday) ───────────────────────────────────────────────

  const { data: yestTotalCalls = 0 } = useQuery({
    queryKey: ["telesales", "yestTotalCalls", yesterday.startISO, yesterday.endISO],
    queryFn: async () => {
      const { count } = await supabase
        .from("calls")
        .select("*", { count: "exact", head: true })
        .gte("created_at", yesterday.startISO)
        .lte("created_at", yesterday.endISO);
      return count ?? 0;
    },
  });

  const { data: yestCompletedCalls = 0 } = useQuery({
    queryKey: ["telesales", "yestCompletedCalls", yesterday.startISO, yesterday.endISO],
    queryFn: async () => {
      const { count } = await supabase
        .from("calls")
        .select("*", { count: "exact", head: true })
        .eq("call_status", "completed")
        .gte("created_at", yesterday.startISO)
        .lte("created_at", yesterday.endISO);
      return count ?? 0;
    },
  });

  const { data: yestAvgDuration = 0 } = useQuery({
    queryKey: ["telesales", "yestAvgDuration", yesterday.startISO, yesterday.endISO],
    queryFn: async () => {
      const { data } = await supabase
        .from("calls")
        .select("call_duration_seconds")
        .gte("created_at", yesterday.startISO)
        .lte("created_at", yesterday.endISO)
        .not("call_duration_seconds", "is", null);
      if (!data?.length) return 0;
      return Math.round(data.reduce((sum, r) => sum + (r.call_duration_seconds ?? 0), 0) / data.length);
    },
  });

  // ── Sparkline + Trend Data (single query, last 7 days) ───────────────────

  const { data: dailyMetrics } = useQuery({
    queryKey: ["telesales", "dailyMetrics"],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      const { data: calls } = await supabase
        .from("calls")
        .select("created_at, call_status, call_duration_seconds")
        .gte("created_at", sevenDaysAgo.toISOString())
        .lte("created_at", new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString());

      const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const dailyCalls: number[] = Array(7).fill(0);
      const dailyCompleted: number[] = Array(7).fill(0);
      const dailyDuration: number[] = Array(7).fill(0);
      const durationCounts: number[] = Array(7).fill(0);
      const trendMap: { day: string; calls: number; completed: number; avgDuration: number }[] =
        Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + i);
          return { day: days[d.getDay()], calls: 0, completed: 0, avgDuration: 0 };
        });

      for (const row of calls ?? []) {
        const d = new Date(row.created_at);
        const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86400000);
        const idx = 6 - daysAgo;
        if (idx < 0 || idx > 6) continue;
        dailyCalls[idx]++;
        trendMap[idx].calls++;
        if (row.call_status === "completed") {
          dailyCompleted[idx]++;
          trendMap[idx].completed++;
        }
        if (row.call_duration_seconds != null) {
          dailyDuration[idx] += row.call_duration_seconds;
          durationCounts[idx]++;
        }
      }

      for (let i = 0; i < 7; i++) {
        trendMap[i].avgDuration = durationCounts[i] > 0 ? Math.round(dailyDuration[i] / durationCounts[i]) : 0;
      }

      return {
        callsSparkline: dailyCalls,
        completedSparkline: dailyCompleted,
        durationSparkline: dailyDuration.map((total, i) => durationCounts[i] > 0 ? Math.round(total / durationCounts[i]) : 0),
        trend: trendMap,
      };
    },
  });

  const dailyCallsSparkline = dailyMetrics?.callsSparkline ?? [];
  const dailyCompletedSparkline = dailyMetrics?.completedSparkline ?? [];
  const dailyDurationSparkline = dailyMetrics?.durationSparkline ?? [];
  const weeklyTrend = dailyMetrics?.trend ?? [];

  // ── Chart Queries ─────────────────────────────────────────────────────────

  const { data: callsByStatus = [] } = useQuery({
    queryKey: ["telesales", "callsByStatus", startISO, endISO],
    queryFn: async () => {
      const { data } = await supabase.from("calls").select("call_status")
        .gte("created_at", startISO).lte("created_at", endISO);
      if (!data) return [];
      const map = new Map<string, number>();
      for (const row of data) {
        const s = row.call_status ?? "unknown";
        map.set(s, (map.get(s) ?? 0) + 1);
      }
      return Array.from(map.entries()).map(([call_status, count]) => ({ call_status, count })).sort((a, b) => b.count - a.count);
    },
  });

  const { data: callsByReason = [] } = useQuery({
    queryKey: ["telesales", "callsByReason", startISO, endISO],
    queryFn: async () => {
      const { data } = await supabase.from("calls").select("call_reason")
        .gte("created_at", startISO).lte("created_at", endISO);
      if (!data) return [];
      const map = new Map<string, number>();
      for (const row of data) {
        const r = row.call_reason ?? "غير محدد";
        map.set(r, (map.get(r) ?? 0) + 1);
      }
      return Array.from(map.entries()).map(([call_reason, count]) => ({ call_reason, count })).sort((a, b) => b.count - a.count);
    },
  });

  const { data: ticketsByPriority = [] } = useQuery({
    queryKey: ["telesales", "ticketsByPriority", startISO, endISO],
    queryFn: async () => {
      const { data } = await supabase.from("order_tickets").select("priority")
        .gte("created_at", startISO).lte("created_at", endISO);
      if (!data) return [];
      const map = new Map<string, number>();
      for (const row of data) {
        const p = row.priority ?? "medium";
        map.set(p, (map.get(p) ?? 0) + 1);
      }
      return Array.from(map.entries()).map(([priority, count]) => ({ priority, count }))
        .sort((a, b) => ["urgent", "high", "medium", "low"].indexOf(a.priority) - ["urgent", "high", "medium", "low"].indexOf(b.priority));
    },
  });

  const { data: ticketsByStatus = [] } = useQuery({
    queryKey: ["telesales", "ticketsByStatus", startISO, endISO],
    queryFn: async () => {
      const { data } = await supabase.from("order_tickets").select("status")
        .gte("created_at", startISO).lte("created_at", endISO);
      if (!data) return [];
      const map = new Map<string, number>();
      for (const row of data) {
        const s = row.status ?? "unknown";
        map.set(s, (map.get(s) ?? 0) + 1);
      }
      return Array.from(map.entries()).map(([status, count]) => ({ status, count }))
        .sort((a, b) => ["open", "pending", "in_progress", "resolved", "closed"].indexOf(a.status) - ["open", "pending", "in_progress", "resolved", "closed"].indexOf(b.status));
    },
  });

  // ── Hourly Heatmap Data ──────────────────────────────────────────────────

  const { data: hourlyData } = useQuery({
    queryKey: ["telesales", "hourlyData", startISO, endISO],
    queryFn: async () => {
      const { data } = await supabase.from("calls").select("created_at")
        .gte("created_at", startISO).lte("created_at", endISO);
      if (!data) return { hours: Array(24).fill(0), daysOfWeek: Array(7).fill(0) };
      const hours = Array(24).fill(0);
      const daysOfWeek = Array(7).fill(0);
      for (const row of data) {
        const d = new Date(row.created_at);
        hours[d.getHours()] += 1;
        daysOfWeek[d.getDay()] += 1;
      }
      return { hours, daysOfWeek };
    },
  });

  // ── Overdue Follow-ups ────────────────────────────────────────────────────

  const { data: overdueFollowUps = [] } = useQuery({
    queryKey: ["telesales", "overdueFollowUps"],
    queryFn: async () => {
      const { data } = await supabase
        .from("calls")
        .select("id, callback_at, follow_up_sla_status, customer_id, user_id")
        .not("callback_at", "is", null)
        .lte("callback_at", new Date().toISOString())
        .order("callback_at", { ascending: true });
      if (!data) return [];

      const filtered = (data ?? []).filter((row) => {
        const status = String(row.follow_up_sla_status ?? "").toLowerCase();
        return !status.includes("done");
      });

      if (filtered.length === 0) return [];

      const customerIds = [...new Set(filtered.map((r) => r.customer_id).filter(Boolean))] as string[];
      const userIds = [...new Set(filtered.map((r) => r.user_id))];

      const BATCH = 50;
      async function batchFetch<T extends Record<string, unknown>>(table: string, select: string, ids: string[]) {
        const chunks: string[][] = [];
        for (let i = 0; i < ids.length; i += BATCH) chunks.push(ids.slice(i, i + BATCH));
        const results = await Promise.all(chunks.map((c) => supabase.from(table).select(select).in("id", c)));
        return results.flatMap((r) => (r.data ?? []) as unknown as T[]);
      }

      const [customersData, profilesData] = await Promise.all([
        customerIds.length > 0 ? batchFetch<{ id: string; customer_name: string }>("customers", "id, customer_name", customerIds) : [],
        userIds.length > 0 ? batchFetch<{ id: string; full_name: string }>("profiles", "id, full_name", userIds) : [],
      ]);

      const customerMap = new Map(customersData.map((c) => [c.id, c.customer_name]));
      const profileMap = new Map(profilesData.map((p) => [p.id, p.full_name]));

      return filtered.map((row) => ({
        id: row.id,
        callbackAt: row.callback_at as string,
        customerId: row.customer_id as string | null,
        customerName: row.customer_id ? customerMap.get(row.customer_id) ?? "عميل غير معروف" : "عميل غير معروف",
        agentName: profileMap.get(row.user_id) ?? "غير معروف",
        userId: row.user_id,
      }));
    },
  });

  // ── Recent Data ──────────────────────────────────────────────────────────

  const { data: recentCalls = [], isLoading: callsLoading } = useQuery({
    queryKey: ["telesales", "recentCalls", startISO, endISO],
    queryFn: async () => {
      const { data } = await supabase
        .from("calls")
        .select("id, call_status, call_reason, call_outcome, call_duration_seconds, created_at, customer_id, user_id, customers(customer_name), profiles(full_name)")
        .gte("created_at", startISO).lte("created_at", endISO)
        .order("created_at", { ascending: false }).limit(10);
      return (data ?? []) as unknown as {
        id: string; call_status: string; call_reason: string; call_outcome: string;
        call_duration_seconds: number; created_at: string; customer_id: string; user_id: string;
        customers: { customer_name: string } | null; profiles: { full_name: string } | null;
      }[];
    },
  });

  const { data: recentTickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["telesales", "recentTickets", startISO, endISO],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_tickets")
        .select("id, subject, status, priority, category, created_at, profiles!order_tickets_assigned_to_fkey(full_name)")
        .gte("created_at", startISO).lte("created_at", endISO)
        .order("created_at", { ascending: false }).limit(10);
      return (data ?? []) as {
        id: string; subject: string; status: string; priority: string;
        category: string; created_at: string;
        profiles: { full_name: string }[] | null;
      }[];
    },
  });

  // ── Agent Performance ────────────────────────────────────────────────────

  const { data: agentPerformance = [] } = useQuery({
    queryKey: ["telesales", "agentPerformance", startISO, endISO],
    queryFn: async () => {
      const { data: calls } = await supabase
        .from("calls")
        .select("user_id, call_status, call_duration_seconds")
        .gte("created_at", startISO).lte("created_at", endISO);
      if (!calls?.length) return [];
      const map = new Map<string, { total: number; completed: number; totalDuration: number; durationCount: number }>();
      for (const row of calls) {
        const uid = row.user_id;
        if (!uid) continue;
        const entry = map.get(uid) ?? { total: 0, completed: 0, totalDuration: 0, durationCount: 0 };
        entry.total += 1;
        if (row.call_status === "completed") entry.completed += 1;
        if (row.call_duration_seconds != null) { entry.totalDuration += row.call_duration_seconds; entry.durationCount += 1; }
        map.set(uid, entry);
      }
      const userIds = Array.from(map.keys());
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const nameMap = new Map<string, string>();
      for (const p of profiles ?? []) nameMap.set(p.id, p.full_name ?? "غير معروف");
      return Array.from(map.entries())
        .map(([userId, stats]) => ({
          userId,
          name: nameMap.get(userId) ?? "غير معروف",
          total: stats.total,
          completed: stats.completed,
          avgDuration: stats.durationCount > 0 ? Math.round(stats.totalDuration / stats.durationCount) : 0,
        }))
        .sort((a, b) => b.total - a.total);
    },
  });

  // ── Derived Data ─────────────────────────────────────────────────────────

  const successRate = totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(1) : "0";
  const completionRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
  const yestSuccessRate = yestTotalCalls > 0 ? ((yestCompletedCalls / yestTotalCalls) * 100) : 0;
  const completionTrend = yestSuccessRate > 0 ? completionRate - yestSuccessRate : 0;

  const callsTrend = yestTotalCalls > 0 ? ((totalCalls - yestTotalCalls) / yestTotalCalls) * 100 : 0;
  const completedTrend = yestCompletedCalls > 0 ? ((completedCalls - yestCompletedCalls) / yestCompletedCalls) * 100 : 0;
  const durationTrend = yestAvgDuration > 0 ? ((avgDuration - yestAvgDuration) / yestAvgDuration) * 100 : 0;

  const maxCallsStatus = Math.max(...callsByStatus.map((r) => r.count), 0);
  const maxTicketsStatus = Math.max(...ticketsByStatus.map((r) => r.count), 0);
  const maxReasonCount = Math.max(...callsByReason.map((r) => r.count), 0);

  const maxHourly = Math.max(...(hourlyData?.hours ?? []), 1);

  const reasonColors = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f97316", "#ef4444", "#6366f1", "#ec4899", "#14b8a6"];

  const ticketStatusData = ticketsByStatus.map((r) => ({
    name: TICKET_STATUS_MAP[r.status]?.label ?? r.status,
    value: r.count,
    color: STATUS_COLORS[r.status] ?? "#9ca3af",
  }));

  const callsStatusData = callsByStatus.map((r) => ({
    name: CALL_STATUS_LABELS[r.call_status] ?? r.call_status,
    value: r.count,
    color: CALL_STATUS_COLORS[r.call_status] ?? "#9ca3af",
  }));

  const funnelStages = [
    { label: "المكالمات المُنشأة", value: totalCalls, color: "#3b82f6" },
    { label: "المكالمات المكتملة", value: completedCalls, color: "#10b981" },
    { label: "التذاكر المفتوحة", value: openTickets, color: "#f59e0b" },
    { label: "تم الحل", value: resolvedToday, color: "#8b5cf6" },
  ];

  const topAgent = agentPerformance[0];
  const fastestAgent = [...agentPerformance].sort((a, b) => {
    if (a.avgDuration === 0) return 1;
    if (b.avgDuration === 0) return -1;
    return a.avgDuration - b.avgDuration;
  })[0];
  const highestRate = [...agentPerformance].sort((a, b) => {
    const rateA = a.total > 0 ? a.completed / a.total : 0;
    const rateB = b.total > 0 ? b.completed / b.total : 0;
    return rateB - rateA;
  })[0];

  const urgentTickets = ticketsByPriority.find((t) => t.priority === "urgent")?.count ?? 0;
  const highTickets = ticketsByPriority.find((t) => t.priority === "high")?.count ?? 0;

  const healthScore = useMemo(() => {
    let score = 50;
    if (completionRate >= 80) score += 20;
    else if (completionRate >= 60) score += 10;
    if (openTickets < 10) score += 15;
    else if (openTickets < 20) score += 8;
    if (urgentTickets === 0) score += 10;
    else score -= 5;
    if (avgDuration > 60 && avgDuration < 300) score += 5;
    return Math.min(score, 100);
  }, [completionRate, openTickets, urgentTickets, avgDuration]);

  const insights = useMemo(() => {
    const list: { icon: React.ReactNode; text: string; color?: string }[] = [];
    if (completedCalls > yestCompletedCalls && yestCompletedCalls > 0) {
      const pct = ((completedCalls - yestCompletedCalls) / yestCompletedCalls * 100).toFixed(0);
      list.push({ icon: <ArrowTrendingUpIcon className="h-4 w-4" />, text: `المكالمات المكتملة زادت ${pct}% عن الأمس`, color: "text-emerald-600 dark:text-emerald-400" });
    }
    if (topAgent) {
      list.push({ icon: <StarIcon className="h-4 w-4" />, text: `${topAgent.name} حقق أعلى عدد مكالمات (${topAgent.total})`, color: "text-amber-600 dark:text-amber-400" });
    }
    if (avgDuration > 0 && yestAvgDuration > 0) {
      const diff = avgDuration - yestAvgDuration;
      if (diff < -10) {
        list.push({ icon: <BoltIcon className="h-4 w-4" />, text: `متوسط المدة تحسن بـ ${Math.abs(diff)} ثانية`, color: "text-blue-600 dark:text-blue-400" });
      }
    }
    if (openTickets > 15) {
      list.push({ icon: <TicketIcon className="h-4 w-4" />, text: `${openTickets} تذكرة مفتوحة تحتاج متابعة`, color: "text-amber-600 dark:text-amber-400" });
    }
    if (urgentTickets > 0) {
      list.push({ icon: <ExclamationTriangleIcon className="h-4 w-4" />, text: `${urgentTickets} تذاكر عاجلة`, color: "text-rose-600 dark:text-rose-400" });
    }
    if (callsByReason.length > 0) {
      list.push({ icon: <ChartBarIcon className="h-4 w-4" />, text: `أكثر سبب: ${callsByReason[0].call_reason} (${callsByReason[0].count})`, color: "text-violet-600 dark:text-violet-400" });
    }
    return list.slice(0, 6);
  }, [completedCalls, yestCompletedCalls, topAgent, avgDuration, yestAvgDuration, openTickets, urgentTickets, callsByReason]);

  const navigate = useNavigate();

  const alerts = useMemo(() => {
    const list: { icon: React.ReactNode; text: string; severity: "warning" | "danger" | "info"; onClick?: () => void }[] = [];
    if (urgentTickets > 0) {
      list.push({ icon: <ExclamationTriangleIcon className="h-4 w-4" />, text: `${urgentTickets} تذاكر عاجلة تحتاج معالجة فورية`, severity: "danger" });
    }
    if (openTickets > 20) {
      list.push({ icon: <TicketIcon className="h-4 w-4" />, text: `${openTickets} تذكرة مفتوحة - تجاوزت الحد`, severity: "warning" });
    }
    if (completionRate < 70 && totalCalls > 10) {
      list.push({ icon: <ClockIcon className="h-4 w-4" />, text: `نسبة الإنجاز ${successRate}% - أقل من الهدف`, severity: "warning" });
    }
    if (durationTrend > 15 && yestAvgDuration > 0) {
      list.push({ icon: <ClockIcon className="h-4 w-4" />, text: `متوسط المدة زاد ${durationTrend.toFixed(0)}%`, severity: "info" });
    }
    for (const fu of overdueFollowUps) {
      list.push({
        icon: <PhoneIcon className="h-4 w-4" />,
        text: `${fu.agentName}: متابعة متأخرة — ${fu.customerName}`,
        severity: "warning",
        onClick: fu.customerId ? () => navigate(`/customers/${fu.customerId}?highlight=follow-up-${fu.id}`) : undefined,
      });
    }
    return list;
  }, [urgentTickets, openTickets, completionRate, totalCalls, successRate, durationTrend, yestAvgDuration, overdueFollowUps, navigate]);

  return (
    <AdminPageFrame dir="rtl">
      <PageMeta title="لوحة المبيعات والاتصالات" description="لوحة متابعة المبيعات والاتصالات وخدمة العملاء" />

      {/* ── Header + Filters ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">لوحة المبيعات والاتصالات</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">نظرة عامة على أداء فريق المبيعات والاتصالات</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
          <div className="flex overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-white/[0.03]">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => handleQuickRange(r.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeQuick === r.value
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "text-gray-600 hover:bg-brand-25 dark:text-gray-400 dark:hover:bg-white/[0.02]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="w-full sm:w-64">
            <DateRangePicker
              id="telesales-date-range"
              label=""
              placeholder="فترة مخصصة"
              value={dateRange}
              onChange={(v) => { setDateRange(v); setActiveQuick(null); }}
            />
          </div>
        </div>
      </div>

      {/* ── Health Score Hero ──────────────────────────────────────────── */}
      <HealthScore score={healthScore} trend={completionTrend} label="مقارنة بالأمس" />

      {/* ── Executive KPIs ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <PremiumKpiCard
          label="إجمالي المكالمات"
          value={totalCalls.toString()}
          icon={<PhoneIcon className="h-5 w-5" />}
          sparklineData={dailyCallsSparkline}
          trend={callsTrend}
          tone="blue"
        />
        <PremiumKpiCard
          label="المكالمات المكتملة"
          value={completedCalls.toString()}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          sparklineData={dailyCompletedSparkline}
          trend={completedTrend}
          tone="emerald"
          subValue={`${successRate}% نسبة الإنجاز`}
        />
        <PremiumKpiCard
          label="متوسط المدة"
          value={formatDuration(avgDuration)}
          icon={<ClockIcon className="h-5 w-5" />}
          sparklineData={dailyDurationSparkline}
          trend={durationTrend}
          tone="violet"
        />
        <PremiumKpiCard
          label="إجمالي التذاكر"
          value={totalTickets.toString()}
          icon={<TicketIcon className="h-5 w-5" />}
          trend={0}
          tone="amber"
          subValue={`${openTickets} مفتوحة`}
        />
        <PremiumKpiCard
          label="التذاكر المفتوحة"
          value={openTickets.toString()}
          icon={<ExclamationTriangleIcon className="h-5 w-5" />}
          trend={0}
          tone={openTickets > 15 ? "red" : "amber"}
        />
        <PremiumKpiCard
          label="تم الحل"
          value={resolvedToday.toString()}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          trend={0}
          tone="emerald"
        />
      </div>

      {/* ── Telesales Agent Performance ────────────────────────────────── */}
      <TelesalesAgentPerformanceRow
        selectedAgentId={selectedTelesalesAgentId}
        onSelectAgent={setSelectedTelesalesAgentId}
        startISO={startISO}
        endISO={endISO}
      />

      {/* ── Customer Service Agent Performance ─────────────────────────── */}
      <CustomerServiceAgentPerformanceRow
        selectedAgentId={selectedCSAgentId}
        onSelectAgent={setSelectedCSAgentId}
        startISO={startISO}
        endISO={endISO}
      />

      {/* ── Performance Trends ─────────────────────────────────────────── */}
      <SectionCard title="اتجاهات الأداء" description="آخر 7 أيام">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-800" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="calls" name="إجمالي" stroke="#3b82f6" fill="url(#callsGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="completed" name="مكتملة" stroke="#10b981" fill="url(#completedGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* ── Call Funnel + Status Donut ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard title="قمع المكالمات" description="معدل التحويل بين المراحل" className="lg:col-span-2">
          <CallFunnel stages={funnelStages} />
        </SectionCard>
        <SectionCard title="توزيع الحالات">
          <div className="flex flex-col items-center gap-4">
            <DonutChart data={callsStatusData} centerValue={`${totalCalls}`} centerLabel="إجمالي" size={160} />
          </div>
        </SectionCard>
      </div>

      {/* ── Reasons + Heatmap ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="أسباب المكالمات" description="توزيع الأسباب">
          <HorizontalBarChart
            items={callsByReason.slice(0, 8).map((r, i) => ({
              label: r.call_reason,
              count: r.count,
              color: reasonColors[i % reasonColors.length],
            }))}
            max={maxReasonCount}
          />
        </SectionCard>
        <SectionCard title="خريطة حرارية" description="المكالمات حسب الساعة">
          <HeatmapGrid
            data={hourlyData?.hours ?? Array(24).fill(0)}
            max={maxHourly}
            labels={Array.from({ length: 24 }, (_, i) => `${i}:00`)}
            cols={8}
          />
        </SectionCard>
      </div>

      {/* ── Agent Leaderboard + Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard title="أداء المندوبين" description="تصنيف حسب الأداء" className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {agentPerformance.slice(0, 6).map((agent, i) => (
              <AgentCard
                key={agent.userId}
                name={agent.name}
                total={agent.total}
                completed={agent.completed}
                avgDuration={agent.avgDuration}
                rank={i + 1}
              />
            ))}
          </div>
        </SectionCard>
        <SectionCard title="أفضل الأداء">
          <div className="space-y-5">
            {topAgent && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">🏆 الأكثر مكالمات</p>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{topAgent.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{topAgent.total} مكالمة</p>
              </div>
            )}
            {fastestAgent && fastestAgent.userId !== topAgent?.userId && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-500/20 dark:bg-blue-500/5">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">⚡ الأسرع</p>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{fastestAgent.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatDuration(fastestAgent.avgDuration)} متوسط</p>
              </div>
            )}
            {highestRate && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">⭐ أعلى نسبة إنجاز</p>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{highestRate.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {highestRate.total > 0 ? ((highestRate.completed / highestRate.total) * 100).toFixed(0) : 0}%
                </p>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── Ticket Analytics ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="التذاكر حسب الحالة">
          <div className="flex flex-col items-center gap-4">
            <DonutChart data={ticketStatusData} centerValue={`${totalTickets}`} centerLabel="إجمالي" size={160} />
          </div>
        </SectionCard>
        <SectionCard title="التذاكر حسب الأولوية">
          <div className="space-y-3">
            {ticketsByPriority.map((r) => {
              const p = PRIORITY_MAP[r.priority] ?? { label: r.priority };
              return (
                <div key={r.priority} className="flex items-center gap-3">
                  <StatusBadge label={p.label} tone={PRIORITY_MAP[r.priority]?.tone ?? "gray"} dot />
                  <div className="flex-1 overflow-hidden rounded-full bg-brand-25 dark:bg-white/[0.02]">
                    <motion.div
                      className="h-4 rounded-full"
                      style={{ backgroundColor: PRIORITY_COLORS[r.priority] ?? "#9ca3af" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${maxTicketsStatus > 0 ? (r.count / maxTicketsStatus) * 100 : 0}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <span className="w-10 text-left text-sm font-medium text-gray-600 dark:text-gray-400">{r.count}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* ── Insights + Alerts ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="💡 رؤى ذكية" description="تحليلات تلقائية">
          <div className="space-y-2">
            {insights.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">لا توجد رؤى كافية</p>
            ) : (
              insights.map((insight, i) => (
                <InsightCard key={i} icon={insight.icon} text={insight.text} color={insight.color} />
              ))
            )}
          </div>
        </SectionCard>
        <SectionCard title="⚠ تنبيهات" description="أشياء تحتاج انتباهك">
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">كل شيء يبدو ممتازاً!</p>
              </div>
            ) : (
              alerts.map((alert, i) => (
                <AlertCard key={i} icon={alert.icon} text={alert.text} severity={alert.severity} onClick={alert.onClick} />
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── Recent Calls ──────────────────────────────────────────────── */}
      <SectionCard title="آخر المكالمات" description="آخر 10 مكالمات مسجلة">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">العميل</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">المندوب</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">السبب</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">النتيجة</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">المدة</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {callsLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-3 py-3">
                          <div className="h-4 animate-pulse rounded bg-brand-25 dark:bg-white/[0.02]" />
                        </td>
                      ))}
                    </tr>
                  ))
                : recentCalls.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">لا توجد مكالمات</td>
                    </tr>
                  )
                  : recentCalls.map((call) => (
                      <tr key={call.id} className="border-b border-gray-100 transition-colors hover:bg-brand-25 dark:border-gray-800 dark:hover:bg-white/[0.02]">
                        <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{call.customers?.customer_name ?? "–"}</td>
                        <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{call.profiles?.full_name ?? "–"}</td>
                        <td className="px-3 py-2.5">
                          <StatusBadge
                            label={CALL_STATUS_LABELS[call.call_status] ?? call.call_status}
                            tone={call.call_status === "completed" ? "green" : call.call_status === "missed" ? "red" : "gray"}
                            dot
                          />
                        </td>
                        <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{call.call_reason ?? "–"}</td>
                        <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{call.call_outcome ?? "–"}</td>
                        <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300" dir="ltr">{formatDuration(call.call_duration_seconds)}</td>
                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{formatDateAr(call.created_at)}</td>
                      </tr>
                    ))
              }
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ── Recent Tickets ─────────────────────────────────────────────── */}
      <SectionCard title="آخر التذاكر" description="آخر 10 تذاكر مسجلة">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ticketsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-brand-25 dark:bg-white/[0.02]" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-brand-25 dark:bg-white/[0.02]" />
                  </div>
                </div>
              ))
            : recentTickets.length === 0
              ? (
                <div className="col-span-2 py-8 text-center text-gray-500 dark:text-gray-400">لا توجد تذاكر</div>
              )
              : recentTickets.map((ticket) => {
                  const statusInfo = TICKET_STATUS_MAP[ticket.status] ?? { label: ticket.status, tone: "gray" as const };
                  const priorityInfo = PRIORITY_MAP[ticket.priority] ?? { label: ticket.priority, tone: "gray" as const };
                  return (
                    <div
                      key={ticket.id}
                      className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 transition-colors hover:bg-brand-25 dark:border-gray-800 dark:hover:bg-white/[0.02]"
                    >
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        ticket.priority === "urgent" ? "bg-rose-100 dark:bg-rose-500/10" :
                        ticket.priority === "high" ? "bg-orange-100 dark:bg-orange-500/10" :
                        "bg-brand-25 dark:bg-white/[0.02]"
                      }`}>
                        <TicketIcon className={`h-4 w-4 ${
                          ticket.priority === "urgent" ? "text-rose-600 dark:text-rose-400" :
                          ticket.priority === "high" ? "text-orange-600 dark:text-orange-400" :
                          "text-gray-500 dark:text-gray-400"
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{ticket.subject}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <StatusBadge label={statusInfo.label} tone={statusInfo.tone} dot />
                          <StatusBadge label={priorityInfo.label} tone={priorityInfo.tone} />
                          {ticket.category && (
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">{ticket.category}</span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{formatDateAr(ticket.created_at)}</p>
                      </div>
                    </div>
                  );
                })
          }
        </div>
      </SectionCard>
    </AdminPageFrame>
  );
}
