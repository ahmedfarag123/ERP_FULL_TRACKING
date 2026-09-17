import { Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageMeta from "../../../components/common/PageMeta";
import RouteFallback from "../../../components/common/RouteFallback";
import { AdminPageFrame, AdminPageHero, TabButton } from "../../../components/admin/AdminPageElements";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { DonutChart, getStatusColor } from "../../../components/ui/DonutChart";
import { ScoreRing } from "../../../components/ui/ScoreRing";
import { useUrlEnumParam } from "../../../hooks/useUrlState";
import { KpiDictionaryTab } from "./components/tabs/KpiDictionaryTab";
import { DeptScorecardTab } from "./components/tabs/DeptScorecardTab";
import { IndividualKpisTab } from "./components/tabs/IndividualKpisTab";
import { SalesAgentKpisTab } from "./components/tabs/SalesAgentKpisTab";
import { KPI_DICTIONARY, buildScorecardFromDictionary } from "./data/kpi-formulas";
import { DEPARTMENTS } from "./data/department-meta";
import { supabase } from "../../../lib/supabase";
import type { ScorecardStatus } from "../../../types/kpi";

const TAB_KEYS = ["scorecard", "dictionary", "individual", "saleskpi"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const tabs: { key: TabKey; label: string }[] = [
  { key: "scorecard", label: "بطاقة النتائج" },
  { key: "dictionary", label: "قاموس المؤشرات" },
  { key: "individual", label: "المؤشرات الفردية" },
  { key: "saleskpi", label: "مؤشرات مندوبي المبيعات" },
];

async function fetchAllKpiActuals(dateFrom: string, dateTo: string) {
  const { data, error } = await (supabase.rpc as any)("get_all_kpi_actuals", {
    p_date_from: dateFrom,
    p_date_to: dateTo,
  });
  if (error) throw error;
  return data as Array<{
    kpi_code: string;
    actual_value: number;
    target_value: number;
    department: string;
    achieved: boolean;
  }>;
}

export default function KPIDashboardPage() {
  const [activeTab, setActiveTab] = useUrlEnumParam("tab", TAB_KEYS, "scorecard");
  const [dateRange] = useState(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  });
  const [selectedDept, setSelectedDept] = useState<string>("all");

  const { data: actualsData, isLoading } = useQuery({
    queryKey: ["kpi-all-actuals", dateRange],
    queryFn: () => fetchAllKpiActuals(dateRange.from, dateRange.to),
  });

  const actuals = useMemo(() => {
    const map = new Map<string, number>();
    if (!actualsData) return map;
    for (const row of actualsData) {
      if (row.actual_value != null) {
        map.set(row.kpi_code, Number(row.actual_value));
      }
    }
    return map;
  }, [actualsData]);

  const scorecard = useMemo(() => {
    return buildScorecardFromDictionary(KPI_DICTIONARY, actuals);
  }, [actuals]);

  const stats = useMemo(() => {
    const statusCounts: Record<ScorecardStatus, number> = {
      Exceeded: 0, "On Track": 0, "At Risk": 0, Missed: 0, Pending: 0,
    };
    const deptScores = new Map<string, { total: number; sum: number; counts: Record<ScorecardStatus, number> }>();

    for (const kpi of scorecard) {
      statusCounts[kpi.status]++;

      const existing = deptScores.get(kpi.departmentSlug) ?? {
        total: 0, sum: 0,
        counts: { Exceeded: 0, "On Track": 0, "At Risk": 0, Missed: 0, Pending: 0 },
      };
      existing.total++;
      if (kpi.weightedScore !== undefined) existing.sum += kpi.weightedScore;
      existing.counts[kpi.status]++;
      deptScores.set(kpi.departmentSlug, existing);
    }

    const activeKpis = scorecard.filter((k) => k.status !== "Pending");
    const overallScore = activeKpis.length > 0
      ? Math.round(activeKpis.reduce((sum, k) => sum + (k.weightedScore ?? 0), 0) / activeKpis.reduce((sum, k) => sum + k.weight, 0))
      : 0;

    const atRiskCount = statusCounts["At Risk"] + statusCounts.Missed;

    return { statusCounts, deptScores, overallScore, atRiskCount, total: scorecard.length };
  }, [scorecard]);

  const overallHealth: "excellent" | "good" | "warning" | "critical" = useMemo(() => {
    if (stats.overallScore >= 90) return "excellent";
    if (stats.overallScore >= 75) return "good";
    if (stats.overallScore >= 50) return "warning";
    return "critical";
  }, [stats.overallScore]);

  const healthLabel: Record<string, string> = {
    excellent: "ممتاز",
    good: "جيد",
    warning: "يحتاج انتباه",
    critical: "حرج",
  };

  const healthBadgeTone: Record<string, "green" | "blue" | "yellow" | "red"> = {
    excellent: "green", good: "blue", warning: "yellow", critical: "red",
  };

  const donutData = [
    { label: "تم التجاوز", value: stats.statusCounts.Exceeded, color: getStatusColor("Exceeded") },
    { label: "على المسار", value: stats.statusCounts["On Track"], color: getStatusColor("On Track") },
    { label: "تحت التهديد", value: stats.statusCounts["At Risk"], color: getStatusColor("At Risk") },
    { label: "لم يتحقق", value: stats.statusCounts.Missed, color: getStatusColor("Missed") },
    { label: "قيد الانتظار", value: stats.statusCounts.Pending, color: getStatusColor("Pending") },
  ];

  return (
    <>
      <PageMeta title="لوحة مؤشرات الأداء" description="تتبع شامل لمؤشرات الأداء عبر جميع الأقسام" />
      <AdminPageFrame>
        <AdminPageHero
          eyebrow="إدارة مؤشرات الأداء"
          title="لوحة مؤشرات الأداء"
          description="نظرة عامة على أداء جميع الأقسام ومؤشرات الأداء الرئيسية"
        />

        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Executive Summary */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Overall Health */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card sm:p-6">
                <p className="text-sm font-medium text-gray-500">الصحة العامة</p>
                <div className="mt-3 flex items-center gap-4">
                  <ScoreRing score={stats.overallScore} size={72} strokeWidth={6} />
                  <div>
                    <StatusBadge label={healthLabel[overallHealth]} tone={healthBadgeTone[overallHealth]} dot />
                    <p className="mt-2 text-xs text-gray-500">
                      {stats.total - stats.statusCounts.Pending} مؤشر من أصل {stats.total} تم تقييمه
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Distribution */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card sm:p-6">
                <p className="text-sm font-medium text-gray-500">توزيع الحالات</p>
                <div className="mt-3 flex items-center gap-4">
                  <DonutChart
                    data={donutData.filter(d => d.value > 0)}
                    size={100}
                    thickness={16}
                    centerValue={stats.total}
                    centerLabel="إجمالي"
                  />
                  <div className="flex-1 space-y-1.5">
                    {donutData.filter(d => d.value > 0).map((d) => (
                      <div key={d.label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-gray-600">{d.label}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Insights */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card sm:p-6">
                <p className="text-sm font-medium text-gray-500">رؤى سريعة</p>
                <div className="mt-3 space-y-3">
                  {stats.atRiskCount > 0 && (
                    <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5">
                      <span className="mt-0.5 text-amber-500">⚠</span>
                      <p className="text-xs text-amber-700">
                        <span className="font-semibold">{stats.atRiskCount}</span> مؤشر تحت التهديد أو لم يتحقق — يحتاج مراجعة
                      </p>
                    </div>
                  )}
                  {stats.statusCounts.Exceeded > 0 && (
                    <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-2.5">
                      <span className="mt-0.5 text-emerald-500">✓</span>
                      <p className="text-xs text-emerald-700">
                        <span className="font-semibold">{stats.statusCounts.Exceeded}</span> مؤشر تجاوز الهدف — أداء متميز
                      </p>
                    </div>
                  )}
                  {stats.statusCounts.Pending > 0 && (
                    <div className="flex items-start gap-2 rounded-lg bg-brand-25 p-2.5">
                      <span className="mt-0.5 text-gray-400">○</span>
                      <p className="text-xs text-gray-600">
                        <span className="font-semibold">{stats.statusCounts.Pending}</span> مؤشر لم يتم تقييمه بعد — بيانات مطلوبة
                      </p>
                    </div>
                  )}
                  {stats.atRiskCount === 0 && stats.statusCounts.Exceeded > 0 && (
                    <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-2.5">
                      <span className="mt-0.5 text-blue-500">★</span>
                      <p className="text-xs text-blue-700">
                        جميع المؤشرات في حالة جيدة — استمر في الأداء المتميز
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Department Health Overview */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-card">
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">صحة الأقسام</h2>
                  <p className="text-sm text-gray-500">نظرة عامة على أداء كل قسم</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-6 lg:grid-cols-4 xl:grid-cols-6">
                {DEPARTMENTS.map((dept) => {
                  const deptStats = stats.deptScores.get(dept.slug);
                  const total = deptStats?.total ?? 0;
                  const sum = deptStats?.sum ?? 0;
                  const counts = deptStats?.counts ?? { Exceeded: 0, "On Track": 0, "At Risk": 0, Missed: 0, Pending: 0 };
                  const activeTotal = total - counts.Pending;
                  const score = activeTotal > 0 ? (sum / (activeTotal * 0.1)) : 0;

                  return (
                    <button
                      key={dept.slug}
                      onClick={() => {
                        setSelectedDept(dept.slug);
                        setActiveTab("scorecard");
                      }}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-3 transition-all hover:border-gray-200 hover:shadow-sm"
                    >
                      <ScoreRing
                        score={Math.min(score, 100)}
                        size={48}
                        strokeWidth={4}
                        label={dept.name}
                      />
                      <div className="flex flex-wrap justify-center gap-1">
                        {counts.Exceeded > 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title={`${counts.Exceeded} تجاوز`} />
                        )}
                        {counts["On Track"] > 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" title={`${counts["On Track"]} على المسار`} />
                        )}
                        {counts["At Risk"] > 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title={`${counts["At Risk"]} تحت التهديد`} />
                        )}
                        {counts.Missed > 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" title={`${counts.Missed} لم يتحقق`} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="-mb-px flex items-center gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <TabButton
                key={tab.key}
                active={activeTab === tab.key}
                label={tab.label}
                onClick={() => setActiveTab(tab.key)}
              />
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <Suspense fallback={<RouteFallback />}>
          {activeTab === "dictionary" && <KpiDictionaryTab dateRange={dateRange} />}
          {activeTab === "scorecard" && (
            isLoading ? (
              <DashboardSkeleton />
            ) : (
              <DeptScorecardTab
                dateRange={dateRange}
                preloadedActuals={actuals}
                preloadedScorecard={scorecard}
                selectedDept={selectedDept}
                onDeptChange={setSelectedDept}
              />
            )
          )}
          {activeTab === "individual" && <IndividualKpisTab dateRange={dateRange} />}
          {activeTab === "saleskpi" && <SalesAgentKpisTab />}
        </Suspense>
      </AdminPageFrame>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
            <div className="h-4 w-24 animate-pulse rounded bg-brand-25" />
            <div className="mt-3 flex items-center gap-4">
              <div className="h-16 w-16 animate-pulse rounded-full bg-brand-25" />
              <div className="space-y-2">
                <div className="h-5 w-16 animate-pulse rounded bg-brand-25" />
                <div className="h-3 w-32 animate-pulse rounded bg-brand-25" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Department Health Skeleton */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-card">
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="h-5 w-32 animate-pulse rounded bg-brand-25" />
          <div className="mt-1 h-3 w-48 animate-pulse rounded bg-brand-25" />
        </div>
        <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-3">
              <div className="h-12 w-12 animate-pulse rounded-full bg-brand-25" />
              <div className="h-3 w-16 animate-pulse rounded bg-brand-25" />
            </div>
          ))}
        </div>
      </div>

      {/* Loading Message */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-3 rounded-full bg-white px-5 py-2.5 shadow-card">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
          <span className="text-sm text-gray-600">جاري تحميل بيانات المؤشرات...</span>
        </div>
      </div>
    </div>
  );
}
