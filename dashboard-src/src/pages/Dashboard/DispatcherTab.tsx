import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { AdminPageFrame, AdminSection } from "../../components/admin/AdminPageElements";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import DateRangePicker from "../../components/form/date-range-picker";
import { supabase } from "../../lib/supabase";
import type { DateRangeValue } from "../../lib/date-range";

type PlanPreparation = {
  id: string;
  plan_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  dispatcher_profile_id: string | null;
  dispatcher_name: string | null;
  plan_reference: string | null;
  plan_date: string | null;
  plan_status: string;
  shipment_count: number;
  item_count: number;
  ready_items: number;
  shortage_items: number;
};

type DispatcherStats = {
  profile_id: string;
  name: string;
  plans_completed: number;
  avg_duration: number | null;
  total_items: number;
  shortage_items: number;
};

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}ث`;
  return `${m}د ${s}ث`;
}

function normalizeRange(range: DateRangeValue) {
  const end = range[1] ?? range[0] ?? new Date();
  const start =
    range[0] ??
    new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29, 0, 0, 0, 0);
  return {
    start: new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0),
    end: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999),
  };
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "amber" | "rose";
}) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white" dir="ltr">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function DispatcherTab() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);
    return [start, end];
  });
  const [plans, setPlans] = useState<PlanPreparation[]>([]);
  const [loading, setLoading] = useState(true);

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => normalizeRange(dateRange),
    [dateRange],
  );

  useEffect(() => {
    loadData();
  }, [rangeStart, rangeEnd]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: planRows, error } = await supabase
        .from("dispatcher_plan_preparations")
        .select(`
          id, plan_id, status, started_at, completed_at, duration_seconds,
          dispatcher_profile_id,
          logistics_delivery_plans!inner(plan_reference, planned_date, plan_status),
          dispatcher_plan_item_preparations(status)
        `)
        .gte("started_at", rangeStart.toISOString())
        .lte("started_at", rangeEnd.toISOString())
        .order("completed_at", { ascending: false });

      if (error) throw error;

      const profileIds = [...new Set(
        (planRows ?? [])
          .map((r: any) => r.dispatcher_profile_id)
          .filter(Boolean),
      )];

      let profileMap: Record<string, string> = {};
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", profileIds);
        (profiles ?? []).forEach((p: any) => {
          profileMap[p.id] = p.full_name;
        });
      }

      const transformed: PlanPreparation[] = (planRows ?? []).map((row: any) => {
        const items = row.dispatcher_plan_item_preparations ?? [];
        return {
          id: row.id,
          plan_id: row.plan_id,
          status: row.status,
          started_at: row.started_at,
          completed_at: row.completed_at,
          duration_seconds: row.duration_seconds,
          dispatcher_profile_id: row.dispatcher_profile_id,
          dispatcher_name: profileMap[row.dispatcher_profile_id] ?? "غير معروف",
          plan_reference: row.logistics_delivery_plans?.plan_reference ?? null,
          plan_date: row.logistics_delivery_plans?.planned_date ?? null,
          plan_status: row.logistics_delivery_plans?.plan_status ?? "pending",
          shipment_count: 0,
          item_count: items.length,
          ready_items: items.filter((i: any) => i.status === "ready").length,
          shortage_items: items.filter((i: any) => ["partial", "unavailable"].includes(i.status)).length,
        };
      });

      setPlans(transformed);
    } catch (err) {
      console.error("Failed to load dispatcher data:", err);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const completed = plans.filter((p) => p.status === "ready");
    const totalItems = plans.reduce((sum, p) => sum + p.item_count, 0);
    const readyItems = plans.reduce((sum, p) => sum + p.ready_items, 0);
    const shortageItems = plans.reduce((sum, p) => sum + p.shortage_items, 0);

    const durations = completed
      .map((p) => p.duration_seconds)
      .filter((d): d is number => d != null);
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

    return {
      plansReady: completed.length,
      avgDuration,
      totalItems,
      readyItems,
      shortageItems,
      shortageRate: totalItems > 0 ? Math.round((shortageItems / totalItems) * 100) : 0,
    };
  }, [plans]);

  const dispatcherLeaderboard = useMemo(() => {
    const map = new Map<string, DispatcherStats>();

    plans.forEach((p) => {
      if (!p.dispatcher_profile_id) return;
      const existing = map.get(p.dispatcher_profile_id);
      if (existing) {
        existing.plans_completed += p.status === "ready" ? 1 : 0;
        if (p.duration_seconds != null) {
          const durations: number[] = [];
          if (existing.avg_duration != null) {
            durations.push(existing.avg_duration * (existing.plans_completed - 1));
          }
          durations.push(p.duration_seconds);
          existing.avg_duration = Math.round(
            durations.reduce((a, b) => a + b, 0) / existing.plans_completed,
          );
        }
        existing.total_items += p.item_count;
        existing.shortage_items += p.shortage_items;
      } else {
        map.set(p.dispatcher_profile_id, {
          profile_id: p.dispatcher_profile_id,
          name: p.dispatcher_name ?? "غير معروف",
          plans_completed: p.status === "ready" ? 1 : 0,
          avg_duration: p.duration_seconds,
          total_items: p.item_count,
          shortage_items: p.shortage_items,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.plans_completed - a.plans_completed);
  }, [plans]);

  return (
    <AdminPageFrame>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full min-w-[240px] sm:w-80">
          <DateRangePicker
            id="dispatcher-date-range"
            label=""
            placeholder="اختر الفترة"
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {plans.length} خطة · {dispatcherLeaderboard.length} مجهز
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="خطط جاهزة"
          value={stats.plansReady}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          tone="emerald"
        />
        <StatCard
          label="متوسط وقت التجهيز"
          value={formatDuration(stats.avgDuration)}
          icon={<ClockIcon className="h-6 w-6" />}
          tone="blue"
        />
        <StatCard
          label="أصناف معالجة"
          value={stats.readyItems}
          icon={<ArrowPathIcon className="h-6 w-6" />}
          tone="amber"
        />
        <StatCard
          label={`نسبة النقص (${stats.shortageRate}%)`}
          value={stats.shortageItems}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          tone="rose"
        />
      </div>

      <AdminSection title="أداء المجهزين" description="إحصائيات كل مجهز بناءً على الخطط في الفترة المحددة">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          </div>
        ) : dispatcherLeaderboard.length === 0 ? (
          <EmptyState
            icon={<ClockIcon className="h-6 w-6" />}
            title="لا توجد بيانات تجهيز"
            description="ستظهر إحصائيات المجهزين بمجرد بدء التجهيز في الفترة المحددة."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">المجهز</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">خطط مكتملة</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">متوسط الوقت</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">أصناف</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">نقص</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {dispatcherLeaderboard.map((d) => (
                  <tr key={d.profile_id} className="hover:bg-brand-25 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{d.name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300" dir="ltr">
                      {d.plans_completed}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300" dir="ltr">
                      {formatDuration(d.avg_duration)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300" dir="ltr">
                      {d.total_items}
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      <span className={d.shortage_items > 0 ? "font-semibold text-rose-600" : "text-gray-700 dark:text-gray-300"}>
                        {d.shortage_items}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <AdminSection title="خطط الفترة" description="جميع خطط التجهيز في الفترة المحددة">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={<CheckCircleIcon className="h-6 w-6" />}
            title="لا توجد خطط في الفترة"
            description="ستظهر خطط التجهيز هنا بمجرد البدء."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">الخطة</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">المجهز</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">الوقت</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">الأصناف</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">مكتمل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-brand-25 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <Link
                        to={`/logistics/plans/draft/${p.plan_id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      >
                        {p.plan_reference ?? p.plan_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {p.dispatcher_name}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={p.plan_status === "returned" ? "تم الاستلام" : p.status === "ready" ? "جاهز" : p.status === "preparing" ? "قيد التجهيز" : p.status}
                        tone={p.plan_status === "returned" || p.status === "ready" ? "green" : p.status === "preparing" ? "blue" : "yellow"}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300" dir="ltr">
                      {formatDuration(p.duration_seconds)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300" dir="ltr">
                      {p.ready_items}/{p.item_count}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300" dir="ltr">
                      {p.completed_at
                        ? new Date(p.completed_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
                        : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </AdminPageFrame>
  );
}
