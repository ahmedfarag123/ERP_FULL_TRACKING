import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { lazy, Suspense } from "react";
import { Link } from "react-router";
import {
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  MapPinIcon,
  ShoppingCartIcon,
  TruckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import DateRangePicker from "../../components/form/date-range-picker";
import { AdminPageFrame } from "../../components/admin/AdminPageElements";
import DashboardLayout from "../../components/layout/DashboardLayout";
import CustomerAvatar from "../../components/ui/CustomerAvatar";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useAdminDashboard } from "../../hooks/useAdminDashboard";
import {
  computeDashboardRangeMetrics,
  dashboardPreviousWindow,
} from "../../lib/dashboard-range-metrics";
import type { DateRangeValue } from "../../lib/date-range";

const MonthlySalesChart = lazy(() => import("./components/MonthlySalesChart"));
const DeliveryStatusChart = lazy(() => import("./components/DeliveryStatusChart"));

const currencyFormatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

const DONUT_COLORS = {
  pending: "#f59e0b",
  partial: "#3b82f6",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

type TrendDirection = "up" | "down" | "flat";

function normalizeRange(range: DateRangeValue) {
  const end = range[1] ?? range[0] ?? new Date();
  const start =
    range[0] ??
    new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29, 0, 0, 0, 0);

  const normalizedStart = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    0, 0, 0, 0,
  );
  const normalizedEnd = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
    23, 59, 59, 999,
  );

  return { start: normalizedStart, end: normalizedEnd };
}

function trendDelta(current: number, previous: number) {
  if (previous === 0) {
    return {
      direction: current > 0 ? ("up" as const) : ("flat" as const),
      label: current > 0 ? "١٠٠٪ مقابل الفترة السابقة" : "لا تغيير مقابل الفترة السابقة",
      pct: current > 0 ? 100 : 0,
    };
  }

  const change = Math.round(((current - previous) / previous) * 100);
  return {
    direction:
      change > 0 ? ("up" as const) : change < 0 ? ("down" as const) : ("flat" as const),
    label:
      change === 0 ? "لا تغيير مقابل الفترة السابقة" : `${Math.abs(change).toLocaleString("ar-EG")}٪ مقابل الفترة السابقة`,
    pct: change,
  };
}

function TrendPill({ direction, pct }: { direction: TrendDirection; pct: number }) {
  if (direction === "flat" && pct === 0) {
    return (
      <span className="shrink-0 rounded-full bg-brand-25 px-2.5 py-1 text-xs font-semibold text-gray-500 dark:bg-white/[0.02] dark:text-gray-400">
        0%
      </span>
    );
  }

  const isPositive = direction === "up";

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
        isPositive
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300"
      }`}
      dir="ltr"
    >
      {isPositive ? "↑" : "↓"} {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

function deliveryTone(label: string) {
  const normalized = label.toLowerCase();
  if (normalized === "full" || normalized === "delivered") return "green" as const;
  if (normalized === "partial") return "blue" as const;
  if (normalized === "cancelled") return "red" as const;
  return "yellow" as const;
}

function relativeSynced(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "--";

  const sec = Math.floor((Date.now() - then) / 1000);
  if (sec < 45) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 14) return `${Math.floor(sec / 86400)}d ago`;

  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function SectionCard({
  title,
  description,
  action,
  minHeightClass = "min-h-[420px]",
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  minHeightClass?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03] ${minHeightClass}`}
    >
      <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  helper,
  icon,
  iconToneClass,
  trend,
  quiet = false,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  iconToneClass: string;
  trend?: { direction: TrendDirection; pct: number };
  quiet?: boolean;
}) {
  return (
    <article className="flex h-full min-h-[168px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconToneClass}`}
          >
            {icon}
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</p>
        </div>
        {trend ? <TrendPill direction={trend.direction} pct={trend.pct} /> : null}
      </div>

      <div className="mt-6 flex flex-1 flex-col justify-end">
        <p
          className={`text-3xl font-bold tracking-tight ${
            quiet ? "text-gray-300 dark:text-gray-600" : "text-gray-900 dark:text-white"
          }`}
          dir="ltr"
        >
          {value}
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{helper}</p>
      </div>
    </article>
  );
}

function LoadingChartPanel() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="h-72 w-full animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
    </div>
  );
}

function LoadingListPanel({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-1 flex-col divide-y divide-gray-200 dark:divide-gray-800">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="px-6 py-4">
          <div className="h-12 animate-pulse rounded-xl bg-brand-25 dark:bg-white/[0.02]" />
        </div>
      ))}
    </div>
  );
}

function DomainSummaryCard({
  icon,
  iconBg,
  title,
  stats,
  linkTo,
  linkLabel,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  stats: { label: string; value: string }[];
  linkTo: string;
  linkLabel: string;
}) {
  return (
    <Link
      to={linkTo}
      className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:bg-brand-25 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {stats.map((s) => (
            <div key={s.label}>
              <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}: </span>
              <span className="text-xs font-semibold text-gray-900 dark:text-white" dir="ltr">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
      <span className="shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400 self-center">
        {linkLabel} ←
      </span>
    </Link>
  );
}

export default function OverviewTab() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);
    return [start, end];
  });

  const deferredRange = useDeferredValue(dateRange);

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => normalizeRange(deferredRange),
    [deferredRange],
  );
  const { data, isLoading, error } = useAdminDashboard(rangeStart, rangeEnd);

  const rangeMetrics = useMemo(() => {
    if (!data) return null;

    return computeDashboardRangeMetrics(
      rangeStart,
      rangeEnd,
      data.orderSnapshots,
      data.visitSnapshots,
      data.callSnapshots,
      data.orderIntentSnapshots,
    );
  }, [data, rangeEnd, rangeStart]);

  const previousWindow = useMemo(
    () => dashboardPreviousWindow(rangeStart, rangeEnd),
    [rangeEnd, rangeStart],
  );

  const previousMetrics = useMemo(() => {
    if (!data) return null;

    return computeDashboardRangeMetrics(
      previousWindow.start,
      previousWindow.end,
      data.orderSnapshots,
      data.visitSnapshots,
      data.callSnapshots,
      data.orderIntentSnapshots,
    );
  }, [data, previousWindow.end, previousWindow.start]);

  const revenueTrend = trendDelta(
    rangeMetrics?.revenue ?? 0,
    previousMetrics?.revenue ?? 0,
  );
  const ordersTrend = trendDelta(
    rangeMetrics?.orderCount ?? 0,
    previousMetrics?.orderCount ?? 0,
  );
  const customersTrend = trendDelta(
    rangeMetrics?.activeCustomers ?? 0,
    previousMetrics?.activeCustomers ?? 0,
  );
  const pendingTrend = trendDelta(
    rangeMetrics?.pendingDeliveries ?? 0,
    previousMetrics?.pendingDeliveries ?? 0,
  );

  const monthlySalesBars = useMemo(() => {
    if (!data) return [];

    return data.salesCategories.map((label, index) => ({
      label,
      revenue: data.salesSeries[index] ?? 0,
    }));
  }, [data]);

  const maxMonthlyRevenue = useMemo(
    () => Math.max(1, ...monthlySalesBars.map((row) => row.revenue)),
    [monthlySalesBars],
  );

  const monthlyGuideLines = useMemo(() => {
    const steps = [0.25, 0.5, 0.75].map((fraction) => Math.round(maxMonthlyRevenue * fraction));
    return Array.from(new Set(steps)).filter((value) => value > 0);
  }, [maxMonthlyRevenue]);

  const recentOrders = rangeMetrics?.recentOrders ?? [];
  const recentActivity = rangeMetrics?.recentActivity ?? [];
  const deliveryBreakdown = rangeMetrics?.deliveryBreakdown ?? [];
  const deliveryData = deliveryBreakdown.filter((item) => item.count > 0);

  const hasSalesData = monthlySalesBars.some((row) => row.revenue > 0);
  const hasDeliveryData = deliveryData.length > 0;
  const hasRecentOrders = recentOrders.length > 0;
  const hasRecentActivity = recentActivity.length > 0;

  const windowDays = useMemo(() => {
    const { start, end } = normalizeRange(deferredRange);

    return (
      Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1)
    );
  }, [deferredRange]);

  const revenueValue = isLoading
    ? "--"
    : rangeMetrics && rangeMetrics.revenue > 0
      ? currencyFormatter.format(rangeMetrics.revenue)
      : "--";
  const ordersValue = isLoading
    ? "--"
    : rangeMetrics && rangeMetrics.orderCount > 0
      ? rangeMetrics.orderCount.toLocaleString("en-US")
      : "--";
  const customersValue = isLoading
    ? "--"
    : rangeMetrics && rangeMetrics.activeCustomers > 0
      ? rangeMetrics.activeCustomers.toLocaleString("en-US")
      : "--";
  const pendingValue = isLoading
    ? "--"
    : rangeMetrics && rangeMetrics.pendingDeliveries > 0
      ? rangeMetrics.pendingDeliveries.toLocaleString("en-US")
      : "--";

  return (
    <>
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <DashboardLayout
        header={
          <PageHeader
            variant="list"
            eyebrow="نظرة عامة على العمليات"
            title="لوحة المعلومات"
            subtitle="الإيرادات، تدفق الطلبات، العملاء النشطين، وضغط التسليم لنافذة التقارير المحددة."
            meta={
              <span className="inline-flex rounded-full bg-brand-25 px-3 py-1 text-xs text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
                نافذة تقارير {windowDays} يوم
              </span>
            }
            actions={
              <div className="w-full min-w-[240px] sm:w-80">
                <DateRangePicker
                  id="dashboard-date-range"
                  label=""
                  placeholder="اختر نافذة التقارير"
                  value={dateRange}
                  onChange={(value) => {
                    startTransition(() => setDateRange(value));
                  }}
                />
              </div>
            }
          />
        }
        stats={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="إجمالي الإيرادات"
              value={revenueValue}
              helper={
                revenueValue === "--"
                  ? "لا توجد إيرادات في نافذة التقارير هذه"
                  : revenueTrend.label
              }
              icon={<CurrencyDollarIcon className="h-5 w-5" />}
              iconToneClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              trend={
                !isLoading &&
                ((rangeMetrics?.revenue ?? 0) > 0 || (previousMetrics?.revenue ?? 0) > 0)
                  ? revenueTrend
                  : undefined
              }
              quiet={revenueValue === "--"}
            />
            <KpiCard
              label="إجمالي الطلبات"
              value={ordersValue}
              helper={
                ordersValue === "--"
                  ? "لا توجد طلبات في نافذة التقارير هذه"
                  : ordersTrend.label
              }
              icon={<DocumentTextIcon className="h-5 w-5" />}
              iconToneClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              trend={
                !isLoading &&
                ((rangeMetrics?.orderCount ?? 0) > 0 || (previousMetrics?.orderCount ?? 0) > 0)
                  ? ordersTrend
                  : undefined
              }
              quiet={ordersValue === "--"}
            />
            <KpiCard
              label="العملاء النشطين"
              value={customersValue}
              helper={
                customersValue === "--"
                  ? "لا يوجد عملاء نشطين في نافذة التقارير هذه"
                  : customersTrend.label
              }
              icon={<UserGroupIcon className="h-5 w-5" />}
              iconToneClass="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
              trend={
                !isLoading &&
                ((rangeMetrics?.activeCustomers ?? 0) > 0 ||
                  (previousMetrics?.activeCustomers ?? 0) > 0)
                  ? customersTrend
                  : undefined
              }
              quiet={customersValue === "--"}
            />
            <KpiCard
              label="التسليمات المعلقة"
              value={pendingValue}
              helper={
                pendingValue === "--"
                  ? "لا توجد تسليمات معلقة في نافذة التقارير هذه"
                  : pendingTrend.label
              }
              icon={<TruckIcon className="h-5 w-5" />}
              iconToneClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              trend={
                !isLoading &&
                ((rangeMetrics?.pendingDeliveries ?? 0) > 0 ||
                  (previousMetrics?.pendingDeliveries ?? 0) > 0)
                  ? pendingTrend
                  : undefined
              }
              quiet={pendingValue === "--"}
            />
          </div>
        }
      >
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Link to="/orders/intents" className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white px-5 py-4 shadow-sm transition hover:bg-orange-50 dark:border-orange-500/20 dark:bg-white/[0.02] dark:hover:bg-orange-500/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
              <ClipboardDocumentListIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">Order intents</p>
              <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                {(rangeMetrics?.pendingOrderIntents ?? 0).toLocaleString("en-US")} pending
              </p>
            </div>
          </Link>

          <Link to="/customers" className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm transition hover:bg-brand-25 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <UserGroupIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">تعيين جماعي</p>
              <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">تعيين العملاء للممثلين</p>
            </div>
          </Link>
        </div>

        {/* Domain summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DomainSummaryCard
            icon={<TruckIcon className="h-6 w-6" />}
            iconBg="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            title="اللوجستيات"
            stats={[
              { label: "خطط نشطة", value: "—" },
              { label: "تسليمات اليوم", value: "—" },
            ]}
            linkTo="/dashboard"
            linkLabel="عرض"
          />
          <DomainSummaryCard
            icon={<ChatBubbleLeftRightIcon className="h-6 w-6" />}
            iconBg="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
            title="المكالمات وخدمة العملاء"
            stats={[
              { label: "تذاكر مفتوحة", value: "—" },
              { label: "مكالمات اليوم", value: "—" },
            ]}
            linkTo="/dashboard"
            linkLabel="عرض"
          />
          <DomainSummaryCard
            icon={<CurrencyDollarIcon className="h-6 w-6" />}
            iconBg="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            title="المالية"
            stats={[
              { label: "المستحقات", value: "—" },
              { label: "تسويات معلقة", value: "—" },
            ]}
            linkTo="/dashboard"
            linkLabel="عرض"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <SectionCard
              title="المبيعات الشهرية"
              description="إيرادات الطلبات مجمعة حسب الشهر التقويمي."
            >
              {isLoading ? (
                <LoadingChartPanel />
              ) : hasSalesData ? (
                <div className="flex flex-1 px-6 py-6">
                  <Suspense fallback={<LoadingChartPanel />}>
                    <MonthlySalesChart data={monthlySalesBars} guideLines={monthlyGuideLines} />
                  </Suspense>
                </div>
              ) : (
                <div className="flex flex-1 items-center px-6 py-6">
                  <EmptyState
                    icon={<CurrencyDollarIcon className="h-6 w-6" />}
                    title="لا توجد إيرادات شهرية بعد"
                    description="سيظهر مخطط المبيعات بمجرد تسجيل الطلبات لنافذة التقارير المحددة."
                    className="w-full border-0 px-0 py-10"
                  />
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="حالة التسليم"
            description="الطلبات مجمعة حسب تقدم التسليم للنافذة المحددة."
          >
            {isLoading ? (
              <LoadingChartPanel />
            ) : hasDeliveryData ? (
              <div className="flex flex-1 flex-col justify-center gap-5 px-6 py-6">
                <Suspense fallback={<LoadingChartPanel />}>
                  <DeliveryStatusChart data={deliveryData} />
                </Suspense>

                <div className="space-y-2">
                  {deliveryBreakdown.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-3 dark:border-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: DONUT_COLORS[item.key] }}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {item.label}
                        </span>
                      </div>
                      <span
                        className="text-sm font-semibold text-gray-900 dark:text-white"
                        dir="ltr"
                      >
                        {item.count.toLocaleString("en-US")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center px-6 py-6">
                <EmptyState
                  icon={<TruckIcon className="h-6 w-6" />}
                  title="لا توجد حالات تسليم بعد"
                  description="سيظهر تقدم التسليم هنا بمجرد انتقال الطلبات إلى نافذة التقارير المحددة."
                  className="w-full border-0 px-0 py-10"
                />
              </div>
            )}
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <SectionCard
              title="الطلبات الأخيرة"
              action={
                <Link
                  to="/orders"
                  className="text-sm font-medium text-blue-600 transition hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  عرض جميع الطلبات →
                </Link>
              }
            >
              {isLoading ? (
                <LoadingListPanel />
              ) : hasRecentOrders ? (
                <>
                  <div className="flex flex-1 flex-col divide-y divide-gray-200 dark:divide-gray-800">
                    {recentOrders.map((order) => (
                      <Link
                        key={order.id}
                        to={`/orders/${order.id}`}
                        className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-brand-25 dark:hover:bg-white/[0.02]/60"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="min-w-fit">
                            <p
                              className="text-sm font-semibold text-blue-600 dark:text-blue-400"
                              dir="ltr"
                            >
                              {order.orderNumber}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {relativeSynced(order.syncedAt)}
                            </p>
                          </div>
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <CustomerAvatar name={order.customerName} size="sm" />
                            <span
                              dir="auto"
                              className="truncate text-sm font-medium text-gray-900 dark:text-white"
                            >
                              {order.customerName}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <p
                            className="text-right text-sm font-semibold text-gray-900 dark:text-white"
                            dir="ltr"
                          >
                            {currencyFormatter.format(
                              typeof order.amount === "string"
                                ? Number.parseFloat(order.amount.replace(/[^0-9.-]/g, "")) || 0
                                : order.amount,
                            )}
                          </p>
                          <StatusBadge label={order.status} tone={deliveryTone(order.status)} />
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 bg-brand-25 px-6 py-3 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
                    عرض {recentOrders.length} من{" "}
                    {(rangeMetrics?.orderCount ?? 0).toLocaleString("en-US")} طلبات
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center px-6 py-6">
                  <EmptyState
                    icon={<ShoppingCartIcon className="h-6 w-6" />}
                    title="لم يتم العثور على طلبات"
                    description="ستظهر الطلبات الأخيرة هنا بمجرد أن تشمل نافذة التقارير المحددة نشاط الطلبات."
                    className="w-full border-0 px-0 py-10"
                  />
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="النشاط الأخير"
            description="سجلات مصغرة حية من طلبات أودو، المكالمات، والزيارات للنافذة المحددة."
            action={
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                التغذية الحية
              </span>
            }
          >
            {isLoading ? (
              <LoadingListPanel />
            ) : hasRecentActivity ? (
              <div className="flex flex-1 flex-col divide-y divide-gray-200 dark:divide-gray-800">
                {recentActivity.map((item) => (
                  <Link
                    key={item.id}
                    to={item.href ?? "/"}
                    className="flex items-start justify-between gap-3 px-6 py-4 transition hover:bg-brand-25 dark:hover:bg-white/[0.02]/60"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                          item.kind === "order"
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            : item.kind === "call"
                              ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                              : item.kind === "order_intent"
                                ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                                : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                        }`}
                      >
                        {item.kind === "order" ? (
                          <DocumentTextIcon className="h-5 w-5" />
                        ) : item.kind === "call" ? (
                          <ChatBubbleLeftRightIcon className="h-5 w-5" />
                        ) : item.kind === "order_intent" ? (
                          <ClipboardDocumentListIcon className="h-5 w-5" />
                        ) : (
                          <MapPinIcon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <CustomerAvatar name={item.actorName} size="xs" shape="circle" />
                          <span
                            dir="auto"
                            className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
                          >
                            {item.actorName}
                          </span>
                        </div>
                        <p
                          dir="auto"
                          className="mt-2 truncate text-sm font-medium text-gray-900 dark:text-white"
                        >
                          {item.title}
                        </p>
                        <p
                          dir="auto"
                          className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400"
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <StatusBadge
                        label={
                          item.kind === "order"
                            ? "طلب"
                            : item.kind === "call"
                              ? "مكالمة"
                              : "زيارة"
                        }
                        tone={
                          item.kind === "order"
                            ? "blue"
                            : item.kind === "call"
                              ? "purple"
                              : "green"
                        }
                      />
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                        {relativeSynced(item.occurredAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-1 items-center px-6 py-6">
                <EmptyState
                  icon={<ChatBubbleLeftRightIcon className="h-6 w-6" />}
                  title="لا يوجد نشاط أخير بعد"
                  description="ستظهر الطلبات، المكالمات، والزيارات هنا بمجرد تسجيل الفريق للنشاط في نافذة التقارير المحددة."
                  className="w-full border-0 px-0 py-10"
                />
              </div>
            )}
          </SectionCard>
        </div>
      </DashboardLayout>
    </>
  );
}
