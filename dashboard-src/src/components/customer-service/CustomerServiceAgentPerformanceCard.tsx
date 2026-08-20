import { ChevronLeftIcon } from "@heroicons/react/24/outline";

export interface CustomerServiceAgentStats {
  userId: string;
  userName: string;
  totalTickets: number;
  solvedTickets: number;
  linkedOrders: number;
  reachability: number;
  followUpNotDone: number;
  achievementPercent: number;
}

interface CustomerServiceAgentPerformanceCardProps {
  agent: CustomerServiceAgentStats;
  isSelected: boolean;
  onSelect: (userId: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

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

function getScoreLevel(pct: number): { color: string; label: string } {
  if (pct >= 80) return { color: "green", label: "أداء ممتاز" };
  if (pct >= 60) return { color: "blue", label: "أداء جيد" };
  if (pct >= 40) return { color: "yellow", label: "مقبول" };
  return { color: "red", label: "يحتاج تحسين" };
}

export default function CustomerServiceAgentPerformanceCard({
  agent,
  isSelected,
  onSelect,
}: CustomerServiceAgentPerformanceCardProps) {
  const perf = getScoreLevel(agent.achievementPercent);
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
              {agent.achievementPercent}/100
            </span>
            <span className={`text-xs font-medium ${SCORE_TEXT_COLORS[perf.color]}`}>
              {perf.label}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{agent.totalTickets}</p>
          <p className="text-[10px] text-gray-400">تذاكر</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-violet-600">{agent.linkedOrders}</p>
          <p className="text-[10px] text-gray-400">طلبات منتهية</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-600">{agent.reachability}%</p>
          <p className="text-[10px] text-gray-400">نسبة الاستجابة</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-600">{agent.solvedTickets}</p>
          <p className="text-[10px] text-gray-400">تم الحل</p>
        </div>
        <div className="text-center">
          <p className={`text-lg font-bold ${agent.followUpNotDone > 0 ? "text-rose-600" : "text-gray-700 dark:text-gray-300"}`}>
            {agent.followUpNotDone}
          </p>
          <p className="text-[10px] text-gray-400">متابعة لم تتم</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-blue-600">
            {agent.achievementPercent}%
          </p>
          <p className="text-[10px] text-gray-400">الإنجاز</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            الإنجاز{" "}
            <span className={`font-semibold ${SCORE_TEXT_COLORS[perf.color]}`}>
              {agent.achievementPercent}%
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
