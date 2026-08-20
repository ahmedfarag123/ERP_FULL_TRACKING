import { useMemo, type ReactNode } from "react";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import type { DashboardOrderSnapshot } from "../../../types/admin-dashboard";
import type { CustomerAnalytics } from "../../../hooks/useCustomerAnalytics";

/* ─── Shared tiny helpers ──────────────────────────────────────────── */

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-gray-400">—</span>;
  if (previous === 0) return <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-500" />;
  const pct = ((current - previous) / previous) * 100;
  const positive = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}>
      {positive ? <ArrowTrendingUpIcon className="h-3.5 w-3.5" /> : <ArrowTrendingDownIcon className="h-3.5 w-3.5" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof CheckCircleIcon;
  label: string;
  value: number | string;
  sub?: ReactNode;
  tone: "emerald" | "blue" | "amber" | "rose" | "purple";
}) {
  const bg = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  }[tone];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
      {sub ? <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{sub}</p> : null}
    </div>
  );
}

/* ─── 2. Customer Acquisition Channel ────────────────────────────── */

const APP_PRICELIST_VALUE = "14 | App Pricelist (EGP)";

export function CustomerAcquisitionChannel({ orderSnapshots }: { orderSnapshots: DashboardOrderSnapshot[] }) {
  const stats = useMemo(() => {
    const appCustomers = new Set<string>();
    const salesCustomers = new Set<string>();

    for (const order of orderSnapshots) {
      if (!order.customerId) continue;
      if (order.pricelistId === APP_PRICELIST_VALUE) {
        appCustomers.add(order.customerId);
      } else {
        salesCustomers.add(order.customerId);
      }
    }

    const appCount = appCustomers.size;
    const salesCount = salesCustomers.size;
    const total = appCount + salesCount;

    return {
      appCount,
      salesCount,
      total,
      appPct: total > 0 ? (appCount / total) * 100 : 0,
      salesPct: total > 0 ? (salesCount / total) * 100 : 0,
    };
  }, [orderSnapshots]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">مصدر الطلبات</h3>
      <div className="space-y-4">
        {/* App channel */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">عبر التطبيق</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {stats.appCount.toLocaleString("ar-EG")}
              <span className="ms-1 text-xs text-gray-500 dark:text-gray-400">({stats.appPct.toFixed(0)}%)</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-brand-25 dark:bg-white/[0.02]">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${stats.appPct}%` }} />
          </div>
        </div>
        {/* Sales team channel */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">فريق المبيعات</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {stats.salesCount.toLocaleString("ar-EG")}
              <span className="ms-1 text-xs text-gray-500 dark:text-gray-400">({stats.salesPct.toFixed(0)}%)</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-brand-25 dark:bg-white/[0.02]">
            <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${stats.salesPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 3. First-Time Purchasers (MTD) ─────────────────────────────── */

export function FirstTimePurchasersKpi({ analytics }: { analytics: CustomerAnalytics }) {
  return (
    <KpiCard
      icon={UserPlusIcon}
      label="عملاء اشتروا لأول مرة (حتى الآن)"
      value={analytics.firstTimePurchasers.toLocaleString("ar-EG")}
      sub={
        <>
          <TrendIndicator current={analytics.firstTimePurchasers} previous={analytics.firstTimePurchasersLastMonth} />
          <span className="ms-1">مقارنة بالشهر الماضي ({analytics.firstTimePurchasersLastMonth})</span>
        </>
      }
      tone="emerald"
    />
  );
}

/* ─── 4. Lost Customers ──────────────────────────────────────────── */

export function LostCustomersKpi({ analytics }: { analytics: CustomerAnalytics }) {
  return (
    <KpiCard
      icon={ExclamationTriangleIcon}
      label="عملاء فقدناهم هذا الشهر"
      value={analytics.lostCustomers.toLocaleString("ar-EG")}
      sub={
        <>
          <TrendIndicator current={analytics.lostCustomers} previous={analytics.lostCustomersLastMonth} />
          <span className="ms-1">مقارنة بالشهر الماضي ({analytics.lostCustomersLastMonth})</span>
        </>
      }
      tone="rose"
    />
  );
}

/* ─── 5. Newly Created Customers (MTD) ───────────────────────────── */

export function NewlyCreatedCustomersKpi({ analytics }: { analytics: CustomerAnalytics }) {
  return (
    <KpiCard
      icon={UserGroupIcon}
      label="عملاء جديدُا تم إنشاؤهم (حتى الآن)"
      value={analytics.newlyCreatedCustomers.toLocaleString("ar-EG")}
      sub={
        <>
          <TrendIndicator current={analytics.newlyCreatedCustomers} previous={analytics.newlyCreatedCustomersLastMonth} />
          <span className="ms-1">مقارنة بالشهر الماضي ({analytics.newlyCreatedCustomersLastMonth})</span>
        </>
      }
      tone="blue"
    />
  );
}

/* ─── Combined Section ───────────────────────────────────────────── */

export function CustomerAnalyticsSection({
  orderSnapshots,
  analytics,
  isLoading,
}: {
  orderSnapshots: DashboardOrderSnapshot[];
  analytics: CustomerAnalytics;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI row: first-time purchasers, lost customers, newly created */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FirstTimePurchasersKpi analytics={analytics} />
        <LostCustomersKpi analytics={analytics} />
        <NewlyCreatedCustomersKpi analytics={analytics} />
      </div>
      {/* Acquisition channel */}
      <CustomerAcquisitionChannel orderSnapshots={orderSnapshots} />
    </div>
  );
}
