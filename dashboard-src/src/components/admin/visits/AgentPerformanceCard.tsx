import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { calculatePerformanceScore } from "../../../lib/visit-translations";

export interface AgentStats {
  userId: string;
  userName: string;
  totalVisits: number;
  productiveVisits: number;
  quotations: number;
  orders: number;
  followUps: number;
  avgDurationMinutes: number;
  gpsCompliance: number;
  manualOverrides: number;
  photoCaptureRate: number;
}

interface AgentPerformanceCardProps {
  agent: AgentStats;
  isSelected: boolean;
  onSelect: (userId: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const SCORE_COLORS: Record<string, string> = {
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  yellow: "bg-amber-500",
  red: "bg-rose-500",
};

const SCORE_TEXT_COLORS: Record<string, string> = {
  green: "text-emerald-700",
  blue: "text-blue-700",
  yellow: "text-amber-700",
  red: "text-rose-700",
};

const SCORE_BG: Record<string, string> = {
  green: "bg-emerald-50 border-emerald-200",
  blue: "bg-blue-50 border-blue-200",
  yellow: "bg-amber-50 border-amber-200",
  red: "bg-rose-50 border-rose-200",
};

export default function AgentPerformanceCard({
  agent,
  isSelected,
  onSelect,
}: AgentPerformanceCardProps) {
  const perf = calculatePerformanceScore({
    totalVisits: agent.totalVisits,
    productiveVisits: agent.productiveVisits,
    quotations: agent.quotations,
    orders: agent.orders,
    gpsCompliance: agent.gpsCompliance,
    avgDurationMinutes: agent.avgDurationMinutes,
  });

  const initials = getInitials(agent.userName);

  return (
    <button
      type="button"
      onClick={() => onSelect(agent.userId)}
      className={`flex flex-col rounded-2xl border-2 p-4 text-right transition-all hover:shadow-lg sm:p-5 ${
        isSelected
          ? "border-blue-500 bg-blue-50/50 shadow-md dark:border-blue-400 dark:bg-blue-500/5"
          : "border-gray-100 bg-white hover:border-gray-200 dark:border-gray-800 dark:bg-white/[0.02]"
      }`}
    >
      {/* Header: Avatar + Name + Score */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-25 text-sm font-bold text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-base font-bold text-gray-900 dark:text-white" dir="auto">
            {agent.userName}
          </h3>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SCORE_BG[perf.color]} border ${SCORE_TEXT_COLORS[perf.color]}`}
            >
              {perf.score}/100
            </span>
            <span className={`text-xs font-medium ${SCORE_TEXT_COLORS[perf.color]}`}>
              {perf.label}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{agent.totalVisits}</p>
          <p className="text-[10px] text-gray-400">الزيارات</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-600">{agent.productiveVisits}</p>
          <p className="text-[10px] text-gray-400">منتجة</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-violet-600">{agent.quotations}</p>
          <p className="text-[10px] text-gray-400">عروض أسعار</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-blue-600">{agent.orders}</p>
          <p className="text-[10px] text-gray-400">طلبات</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-amber-600">{agent.followUps}</p>
          <p className="text-[10px] text-gray-400">متابعة</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-700 dark:text-gray-300">
            {agent.avgDurationMinutes}<span className="text-xs"> د</span>
          </p>
          <p className="text-[10px] text-gray-400">متوسط المدة</p>
        </div>
      </div>

      {/* Bottom Row: GPS + Compliance + CTA */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            GPS{" "}
            <span className={`font-semibold ${agent.gpsCompliance >= 90 ? "text-emerald-600" : agent.gpsCompliance >= 70 ? "text-amber-600" : "text-rose-600"}`}>
              {agent.gpsCompliance}%
            </span>
          </span>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-blue-600">
          عرض النشاط
          <ChevronLeftIcon className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}
