import { useMemo } from "react";
import { AdminSection } from "../../../../../components/admin/AdminPageElements";
import { StatusBadge } from "../../../../../components/ui/StatusBadge";
import { DonutChart, DonutLegend, getStatusColor } from "../../../../../components/ui/DonutChart";
import { KpiProgressBar } from "../../../../../components/ui/KpiProgressBar";
import { DEPARTMENTS } from "../../data/department-meta";
import { formatWeight, formatValue, getStatusTone } from "../../lib/kpi-helpers";
import type { DateRange, DeptScorecardEntry, ScorecardStatus } from "../../../../../types/kpi";

interface DeptScorecardTabProps {
  dateRange: DateRange;
  preloadedActuals?: Map<string, number>;
  preloadedScorecard?: DeptScorecardEntry[];
  selectedDept?: string;
  onDeptChange?: (dept: string) => void;
}

const statusLabelsAr: Record<ScorecardStatus, string> = {
  Pending: "قيد الانتظار",
  "On Track": "على المسار",
  "At Risk": "تحت التهديد",
  Missed: "لم يتحقق",
  Exceeded: "تم التجاوز",
};

export function DeptScorecardTab({
  dateRange: _dateRange,
  preloadedScorecard = [],
  selectedDept = "all",
  onDeptChange,
}: DeptScorecardTabProps) {
  const filtered = useMemo(() => {
    if (selectedDept === "all") return preloadedScorecard;
    return preloadedScorecard.filter((k) => k.departmentSlug === selectedDept);
  }, [selectedDept, preloadedScorecard]);

  const grouped = useMemo(() => {
    const groups = new Map<string, DeptScorecardEntry[]>();
    for (const entry of filtered) {
      const existing = groups.get(entry.department) ?? [];
      existing.push(entry);
      groups.set(entry.department, existing);
    }
    return groups;
  }, [filtered]);

  const deptSummaries = useMemo(() => {
    return Array.from(grouped.entries()).map(([dept, kpis]) => {
      const active = kpis.filter((k) => k.status !== "Pending");
      const totalWeight = active.reduce((sum, k) => sum + k.weight, 0);
      const weightedSum = active.reduce((sum, k) => sum + (k.weightedScore ?? 0), 0);
      const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

      const counts: Record<ScorecardStatus, number> = {
        Exceeded: 0, "On Track": 0, "At Risk": 0, Missed: 0, Pending: 0,
      };
      for (const kpi of kpis) counts[kpi.status]++;

      return { dept, kpis, score, counts, total: kpis.length };
    });
  }, [grouped]);

  const selectedDeptMeta = selectedDept !== "all" ? DEPARTMENTS.find((d) => d.slug === selectedDept) : null;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Department Selector */}
      <div className="flex items-center gap-3">
        <select
          value={selectedDept}
          onChange={(e) => onDeptChange?.(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="all">جميع الأقسام</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.slug} value={d.slug}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Department Summaries - Grid Cards */}
      {selectedDept === "all" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deptSummaries.map(({ dept, score, counts, total }) => {
            const deptMeta = DEPARTMENTS.find((d) => d.name === dept);
            const donutData = [
              { label: "تجاوز", value: counts.Exceeded, color: getStatusColor("Exceeded") },
              { label: "على المسار", value: counts["On Track"], color: getStatusColor("On Track") },
              { label: "تحت التهديد", value: counts["At Risk"], color: getStatusColor("At Risk") },
              { label: "لم يتحقق", value: counts.Missed, color: getStatusColor("Missed") },
            ].filter((d) => d.value > 0);

            return (
              <div
                key={dept}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card transition-all hover:shadow-md cursor-pointer"
                onClick={() => onDeptChange?.(deptMeta?.slug ?? "all")}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{dept}</p>
                    <p className="text-xs text-gray-500">{total} مؤشر أداء</p>
                  </div>
                  {donutData.length > 0 && (
                    <DonutChart
                      data={donutData}
                      size={72}
                      thickness={10}
                      centerValue={score}
                      centerLabel="النتيجة"
                    />
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {counts.Exceeded > 0 && (
                    <StatusBadge label={`${counts.Exceeded} تجاوز`} tone="green" dot />
                  )}
                  {counts["On Track"] > 0 && (
                    <StatusBadge label={`${counts["On Track"]} على المسار`} tone="blue" dot />
                  )}
                  {counts["At Risk"] > 0 && (
                    <StatusBadge label={`${counts["At Risk"]} تحت التهديد`} tone="yellow" dot />
                  )}
                  {counts.Missed > 0 && (
                    <StatusBadge label={`${counts.Missed} لم يتحقق`} tone="red" dot />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Scorecard - Per Department */}
      {Array.from(grouped.entries()).map(([dept, kpis]) => {
        const active = kpis.filter((k) => k.status !== "Pending");
        const totalWeight = active.reduce((sum, k) => sum + k.weight, 0);
        const weightedSum = active.reduce((sum, k) => sum + (k.weightedScore ?? 0), 0);
        const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

        const missedKpis = kpis.filter((k) => k.status === "Missed" || k.status === "At Risk");

        return (
          <AdminSection
            key={dept}
            title={dept}
            description={`${kpis.length} مؤشر أداء — النتيجة ${score}%`}
          >
            {/* Insights Bar */}
            {missedKpis.length > 0 && (
              <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs font-medium text-amber-800">
                  ⚠ {missedKpis.length} مؤشر يحتاج انتباه:
                  {missedKpis.slice(0, 3).map((k, idx) => (
                    <span key={k.kpiCode} className="mr-1 font-semibold">
                      {k.kpiNameAr}
                      {idx < 2 && "،"}
                    </span>
                  ))}
                  {missedKpis.length > 3 && ` و${missedKpis.length - 3} مؤشر آخر`}
                </p>
              </div>
            )}

            {/* KPI Rows with Visual Progress */}
            <div className="space-y-2">
              {kpis.map((kpi) => {
                const scorePct = kpi.scorePercent ?? 0;
                return (
                  <div
                    key={kpi.kpiCode}
                    className="flex items-center gap-4 rounded-xl border border-gray-100 p-3 transition-colors hover:bg-brand-25"
                  >
                    {/* KPI Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-semibold text-gray-400">{kpi.kpiCode}</span>
                        <span className="text-sm font-medium text-gray-900">{kpi.kpiNameAr}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-500">
                        <span>الوزن: {formatWeight(kpi.weight)}</span>
                        <span>الهدف: {kpi.target ? formatValue(kpi.target, kpi.unit) : "—"}</span>
                        <span>الفعلي: {kpi.actual !== undefined ? formatValue(kpi.actual, kpi.unit) : "—"}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-32">
                      <KpiProgressBar
                        value={scorePct}
                        target={kpi.target}
                        direction={kpi.direction}
                        showLabel={false}
                      />
                    </div>

                    {/* Score */}
                    <div className="w-16 text-center">
                      <span className="text-sm font-bold text-gray-900">
                        {kpi.scorePercent !== undefined ? `${kpi.scorePercent}%` : "—"}
                      </span>
                    </div>

                    {/* Weighted Score */}
                    <div className="w-14 text-center">
                      <span className="text-xs text-gray-500">
                        {kpi.weightedScore !== undefined ? kpi.weightedScore.toFixed(2) : "—"}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="w-28">
                      <StatusBadge
                        label={statusLabelsAr[kpi.status]}
                        tone={getStatusTone(kpi.status)}
                        dot
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </AdminSection>
        );
      })}

      {/* Empty State */}
      {!_dateRange && filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-500">
          لا توجد بيانات متاحة لهذا الفترة
        </div>
      )}
    </div>
  );
}
