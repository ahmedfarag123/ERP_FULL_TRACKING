import { useMemo, useState } from "react";
import { StatusBadge, type StatusBadgeTone } from "../../../../../components/ui/StatusBadge";
import { ScoreRing } from "../../../../../components/ui/ScoreRing";
import { INDIVIDUAL_KPIS } from "../../data/kpi-formulas";
import { DEPARTMENTS } from "../../data/department-meta";
import { useIndividualKpiPerAgent } from "../../data/kpi-queries";
import type { AgentKpiActual, DateRange, IndividualKpiEntry, KpiDirection } from "../../../../../types/kpi";

const roleLabelsAr: Record<string, string> = {
  "Tele-Sales Agent": "مندوب المبيعات الهاتفي",
  "Outdoor Sales Rep": "مندوب المبيعات الميداني",
  "Driver / Delivery Rep": "سائق / مندوب التوصيل",
  "Warehouse Worker": "عامل المخزن",
  "Customer Service": "خدمة العملاء",
};

const roleIcons: Record<string, string> = {
  "Tele-Sales Agent": "📞",
  "Outdoor Sales Rep": "🚶",
  "Driver / Delivery Rep": "🚚",
  "Warehouse Worker": "🏭",
  "Customer Service": "🎧",
};

function computeStatus(
  actual: number | undefined,
  target: number,
  direction: KpiDirection
): "Exceeded" | "On Track" | "At Risk" | "Missed" | "Pending" {
  if (actual == null || target === 0) return "Pending";
  const ratio = actual / target;
  if (direction === "Higher is Better") {
    if (ratio >= 1) return "Exceeded";
    if (ratio >= 0.9) return "On Track";
    if (ratio >= 0.7) return "At Risk";
    return "Missed";
  }
  if (ratio <= 1) return "Exceeded";
  if (ratio <= 1.1) return "On Track";
  if (ratio <= 1.3) return "At Risk";
  return "Missed";
}

const statusBadgeTone: Record<string, StatusBadgeTone> = {
  Exceeded: "green",
  "On Track": "blue",
  "At Risk": "yellow",
  Missed: "red",
  Pending: "gray",
};

const statusLabelsAr: Record<string, string> = {
  Exceeded: "تم التجاوز",
  "On Track": "على المسار",
  "At Risk": "تحت التهديد",
  Missed: "لم يتحقق",
  Pending: "قيد الانتظار",
};

interface AgentGroup {
  profileId: string;
  fullName: string;
  role: string;
  jobTitle: string;
  department: string;
  departmentSlug: string;
  kpis: Array<{
    kpi: IndividualKpiEntry;
    actual: number | null;
    target: number;
    status: string;
    scorePercent: number;
  }>;
  overallScore: number;
}

export function IndividualKpisTab({ dateRange }: { dateRange: DateRange }) {
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  const { data: rawData, isLoading, error } = useIndividualKpiPerAgent(dateRange);

  const agentGroups = useMemo(() => {
    if (!rawData || !Array.isArray(rawData)) return [];

    const kpiDefMap = new Map<string, IndividualKpiEntry>();
    for (const def of INDIVIDUAL_KPIS) {
      kpiDefMap.set(def.kpiCode, def);
    }

    const agentMap = new Map<string, AgentGroup>();

    for (const row of rawData as AgentKpiActual[]) {
      const kpi = kpiDefMap.get(row.kpi_code);
      if (!kpi) continue;

      const key = `${row.profile_id}|${row.role}`;
      if (!agentMap.has(key)) {
        agentMap.set(key, {
          profileId: row.profile_id,
          fullName: row.full_name,
          role: row.role,
          jobTitle: row.job_title,
          department: row.department,
          departmentSlug: row.department_slug,
          kpis: [],
          overallScore: 0,
        });
      }

      const agent = agentMap.get(key)!;
      const actual = row.actual_value != null ? Number(row.actual_value) : null;
      const target = Number(row.target_value);
      const status = computeStatus(actual ?? undefined, target, kpi.direction);
      const scorePercent =
        actual != null && target > 0
          ? kpi.direction === "Higher is Better"
            ? Math.min(Math.round((actual / target) * 100), 150)
            : Math.min(Math.round((target / actual) * 100), 150)
          : 0;

      agent.kpis.push({
        kpi,
        actual,
        target,
        status,
        scorePercent,
      });
    }

    const groups = Array.from(agentMap.values());

    for (const g of groups) {
      const totalWeight = g.kpis.reduce((sum, k) => sum + k.kpi.weight, 0);
      const weightedSum = g.kpis.reduce((sum, k) => sum + (k.scorePercent * k.kpi.weight), 0);
      g.overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    }

    groups.sort((a, b) => b.overallScore - a.overallScore);
    return groups;
  }, [rawData]);

  const filtered = useMemo(() => {
    let result = agentGroups;
    if (selectedDept !== "all") {
      result = result.filter((g) => g.departmentSlug === selectedDept);
    }
    if (selectedRole !== "all") {
      result = result.filter((g) => g.role === selectedRole);
    }
    return result;
  }, [agentGroups, selectedDept, selectedRole]);

  const roles = useMemo(() => {
    const roleSet = new Set(agentGroups.map((g) => g.role));
    return Array.from(roleSet);
  }, [agentGroups]);

  const totalAgents = filtered.length;
  const totalKpis = filtered.reduce((sum, g) => sum + g.kpis.length, 0);
  const avgScore = totalAgents > 0
    ? Math.round(filtered.reduce((sum, g) => sum + g.overallScore, 0) / totalAgents)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20" dir="rtl">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" />
          <p className="mt-3 text-sm text-gray-500">جاري تحميل بيانات المؤشرات الفردية...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center" dir="rtl">
        <p className="text-sm font-semibold text-red-700">خطأ في تحميل البيانات</p>
        <p className="mt-1 text-xs text-red-500">تأكد من تشغيل الدالة get_individual_kpi_per_agent</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
          <p className="text-sm font-medium text-gray-500">إجمالي المناديب</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalAgents}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
          <p className="text-sm font-medium text-gray-500">إجمالي المؤشرات الفردية</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalKpis}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
          <p className="text-sm font-medium text-gray-500">متوسط الأداء العام</p>
          <div className="mt-2 flex items-center gap-3">
            <ScoreRing score={avgScore} size={56} strokeWidth={5} />
            <span className="text-lg font-bold text-gray-900">{avgScore}%</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedDept}
          onChange={(e) => {
            setSelectedDept(e.target.value);
            setSelectedRole("all");
          }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="all">جميع الأقسام</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.slug} value={d.slug}>{d.name}</option>
          ))}
        </select>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="all">جميع الأدوار</option>
          {roles.map((r) => (
            <option key={r} value={r}>{roleLabelsAr[r] ?? r}</option>
          ))}
        </select>

        <span className="text-xs text-gray-500">
          {totalAgents} مندوب — {totalKpis} مؤشر فردي
        </span>
      </div>

      {/* Agent Cards */}
      {filtered.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-card">
          <p className="text-sm text-gray-500">لا توجد بيانات متاحة</p>
          <p className="mt-1 text-xs text-gray-400">تأكد من تشغيل الدالة واسترجاع البيانات</p>
        </div>
      )}

      {filtered.map((agent) => (
        <AgentCard key={agent.profileId} agent={agent} />
      ))}
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentGroup }) {
  const roleIcon = roleIcons[agent.role] ?? "👤";
  const roleLabelAr = roleLabelsAr[agent.role] ?? agent.role;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Exceeded: 0, "On Track": 0, "At Risk": 0, Missed: 0, Pending: 0,
    };
    for (const kpi of agent.kpis) {
      counts[kpi.status]++;
    }
    return counts;
  }, [agent.kpis]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
      {/* Agent Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{roleIcon}</span>
          <div>
            <h3 className="text-base font-semibold text-gray-900">{agent.fullName}</h3>
            <p className="text-xs text-gray-500">{roleLabelAr} — {agent.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Status Dots */}
          <div className="flex items-center gap-1.5">
            {statusCounts.Exceeded > 0 && (
              <span className="h-2 w-2 rounded-full bg-emerald-500" title={`${statusCounts.Exceeded} تجاوز`} />
            )}
            {statusCounts["On Track"] > 0 && (
              <span className="h-2 w-2 rounded-full bg-blue-500" title={`${statusCounts["On Track"]} على المسار`} />
            )}
            {statusCounts["At Risk"] > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500" title={`${statusCounts["At Risk"]} تحت التهديد`} />
            )}
            {statusCounts.Missed > 0 && (
              <span className="h-2 w-2 rounded-full bg-red-500" title={`${statusCounts.Missed} لم يتحقق`} />
            )}
          </div>
          {/* Overall Score */}
          <div className="flex items-center gap-2">
            <ScoreRing score={agent.overallScore} size={48} strokeWidth={4} />
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agent.kpis.map((kpiItem) => (
            <AgentKpiCard key={kpiItem.kpi.kpiCode} item={kpiItem} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentKpiCard({
  item,
}: {
  item: {
    kpi: IndividualKpiEntry;
    actual: number | null;
    target: number;
    status: string;
    scorePercent: number;
  };
}) {
  const { kpi, actual, target, status, scorePercent } = item;
  const tone = statusBadgeTone[status] ?? "gray";
  const progressColor =
    scorePercent >= 100
      ? "bg-emerald-500"
      : scorePercent >= 80
      ? "bg-blue-500"
      : scorePercent >= 60
      ? "bg-amber-500"
      : "bg-red-500";

  const formatValue = (val: number | null, unit: string) => {
    if (val == null) return "—";
    if (unit === "EGP") return `${val.toLocaleString("ar-EG")}`;
    if (unit === "%") return `${val}%`;
    if (unit === "hours") return `${val} ساعة`;
    if (unit === "days") return `${val} يوم`;
    return val.toLocaleString("ar-EG");
  };

  return (
    <div className="rounded-xl border border-gray-100 p-4 transition-all hover:border-gray-200 hover:shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <StatusBadge label={statusLabelsAr[status] ?? status} tone={tone} dot />
        <span className="text-[10px] font-medium text-gray-400">{kpi.kpiCode}</span>
      </div>

      {/* Name */}
      <p className="mt-2 text-sm font-semibold text-gray-900">{kpi.kpi}</p>
      <p className="text-xs text-gray-500">{kpi.kpiAr}</p>

      {/* Target */}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-xl font-bold text-gray-900">
          {formatValue(actual, kpi.unit)}
        </span>
        <span className="text-xs text-gray-400">
          / {formatValue(target, kpi.unit)}
        </span>
      </div>

      {/* Suggested Target + Data Source / Frequency */}
      <div className="mt-1.5 space-y-1">
        <p className="text-[11px] font-medium text-brand-600" title={kpi.suggestedTarget}>
          الهدف المقترح: {kpi.suggestedTarget}
        </p>
        <p className="text-[10px] text-gray-400">
          {kpi.dataSource} · {kpi.frequency}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mt-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-25">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${Math.min(scorePercent, 100)}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">النسبة: {scorePercent}%</span>
          <span className="text-[10px] text-gray-400">الوزن: {Math.round(kpi.weight * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
