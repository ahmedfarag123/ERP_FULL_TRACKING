import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import CustomerAvatar from "../ui/CustomerAvatar";
import StatusBadge, { type StatusBadgeTone } from "../ui/StatusBadge";
import { AdminEmptyState, AdminMetricCard, AdminMetricGrid, AdminSection } from "./AdminPageElements";
import {
  fetchPlanCompletionReport,
  type DriverCompletionStats,
  type PlanCompletionRow,
} from "../../lib/logistics-admin";

type Props = {
  className?: string;
  refetchInterval?: number;
};

function formatDate(value: string | undefined | null): string {
  if (!value) return "--";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "numeric", year: "numeric" }).format(d);
}

function pctTone(pct: number): StatusBadgeTone {
  if (pct === 100) return "green";
  if (pct >= 70) return "blue";
  if (pct >= 40) return "yellow";
  return "red";
}

const CHIP_BAR: Record<StatusBadgeTone, string> = {
  green: "bg-emerald-500",
  red: "bg-rose-500",
  yellow: "bg-amber-500",
  blue: "bg-blue-500",
  gray: "bg-gray-400",
  orange: "bg-orange-500",
  purple: "bg-violet-500",
  indigo: "bg-indigo-500",
};

function statChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: StatusBadgeTone;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-gray-50 px-1.5 py-1.5 dark:bg-white/[0.03]">
      <span className="text-sm font-bold text-gray-900 dark:text-white">{value}</span>
      <span className="text-[9px] text-gray-400 dark:text-gray-500">{label}</span>
      <span className={`h-0.5 w-6 rounded-full ${CHIP_BAR[tone]}`} />
    </div>
  );
}

function DriverRow({
  driver,
  plans,
  defaultOpen,
  onSelectPlan,
}: {
  driver: DriverCompletionStats;
  plans: PlanCompletionRow[];
  defaultOpen: boolean;
  onSelectPlan: (plan: PlanCompletionRow) => void;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const driverPlans = plans.filter((p) => p.driverId === driver.driverId);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800">
      <div className="flex w-full items-center gap-3 px-3 py-3 text-right">
        <CustomerAvatar name={driver.driverName} size="md" shape="circle" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{driver.driverName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <CheckCircleIcon className="h-3 w-3 text-emerald-500" />
              {driver.completedPlans} خطة مكتملة
            </span>
            {driver.incompletePlans > 0 ? (
              <span className="flex items-center gap-1 text-rose-500">
                <XCircleIcon className="h-3 w-3" />
                {driver.incompletePlans} لم تكتمل
              </span>
            ) : null}
            {driver.returnedOrders > 0 ? (
              <span className="flex items-center gap-1 text-amber-500">
                <DocumentArrowDownIcon className="h-3 w-3" />
                {driver.returnedOrders} مرتجعة
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {statChip({ label: "سلّم", value: driver.deliveredOrders, tone: "green" })}
          {statChip({ label: "متسلمش", value: driver.undeliveredOrders, tone: "red" })}
          {driver.returnedOrders > 0 ? statChip({ label: "مرتجع", value: driver.returnedOrders, tone: "yellow" }) : null}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded-lg px-1 py-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
          aria-label={expanded ? "طي الخطط" : "إظهار الخطط"}
        >
          {expanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-gray-100 px-2 py-2 dark:border-gray-800">
          {driverPlans.length === 0 ? (
            <p className="px-2 py-2 text-xs text-gray-400">لا توجد خطط في النطاق</p>
          ) : (
            <div className="space-y-1">
              {driverPlans.map((plan) => (
                <PlanRow key={plan.planId} plan={plan} onClick={() => onSelectPlan(plan)} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PlanRow({ plan, onClick }: { plan: PlanCompletionRow; onClick: () => void }) {
  const statusTone: StatusBadgeTone = plan.complete ? "green" : plan.overdue ? "red" : "blue";
  const statusLabel = plan.complete ? "مكتملة" : plan.overdue ? "لم تكتمل" : "قيد التنفيذ";

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-right transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">
          {plan.planReference}
          <span className="mr-2 font-normal text-gray-400">{formatDate(plan.plannedDate)}</span>
        </p>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.max(plan.pct, 2)}%`,
              background: plan.complete ? "#10b981" : plan.overdue ? "#ef4444" : "#3b82f6",
            }}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-300">{plan.pct}%</span>
        <StatusBadge label={statusLabel} tone={statusTone} />
      </div>
    </button>
  );
}

export default function PlanCompletionSection({ className = "", refetchInterval = 20000 }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["logistics", "plan-completion"],
    queryFn: () => fetchPlanCompletionReport(30),
    refetchInterval,
  });

  const [selectedPlan, setSelectedPlan] = useState<PlanCompletionRow | null>(null);

  const totals = data?.totals;
  const drivers = data?.drivers ?? [];
  const plans = data?.plans ?? [];

  return (
    <AdminSection
      className={className}
      title="تقرير إكمال الخطط والأوردرات"
      description="نسبة إكمال كل خطة، الأوردرات المسلّمة والمرتجعة وغير المسلّمة، ومحاسبة السائق على الشحنات المرتجعة لحين تأكيد التسليم."
    >
      <div className="space-y-4">
        <AdminMetricGrid>
          <AdminMetricCard label="إجمالي الخطط" value={totals?.plans ?? 0} helper="في آخر 30 يوم" icon={<TruckIcon className="h-6 w-6" />} tone="blue" />
          <AdminMetricCard label="خطط مكتملة" value={totals?.completedPlans ?? 0} helper="أُغلقت بالكامل" icon={<CheckCircleIcon className="h-6 w-6" />} tone="emerald" />
          <AdminMetricCard label="خطط لم تكتمل" value={totals?.incompletePlans ?? 0} helper="عدّى يومها ومكملتش" icon={<XCircleIcon className="h-6 w-6" />} tone="rose" />
          <AdminMetricCard label="نسبة الإكمال الكلية" value={`${totals?.overallPct ?? 0}%`} helper="من إجمالي الأوردرات" icon={<TruckIcon className="h-6 w-6" />} tone="violet" />
        </AdminMetricGrid>

        <AdminMetricGrid>
          <AdminMetricCard label="أوردرات مسلّمة" value={totals?.deliveredOrders ?? 0} helper="وصلت للعميل" icon={<CheckCircleIcon className="h-6 w-6" />} tone="emerald" />
          <AdminMetricCard label="أوردرات مرتجعة" value={totals?.returnedOrders ?? 0} helper="تُحمّل على السائق لحين التأكيد" icon={<DocumentArrowDownIcon className="h-6 w-6" />} tone="amber" />
          <AdminMetricCard label="أوردرات متسلمتش" value={totals?.undeliveredOrders ?? 0} helper="ما زالت مفتوحة" icon={<ExclamationTriangleIcon className="h-6 w-6" />} tone="rose" />
          <AdminMetricCard label="سائقون" value={drivers.length} helper="بخطط في النطاق" icon={<TruckIcon className="h-6 w-6" />} tone="blue" />
        </AdminMetricGrid>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.3fr_0.9fr]">
          {/* Drivers */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
            ) : drivers.length === 0 ? (
              <AdminEmptyState title="لا توجد بيانات" description="لا توجد خطط في آخر 30 يوم بعد." icon={<TruckIcon className="h-6 w-6" />} />
            ) : (
              drivers.map((driver) => (
                <DriverRow
                  key={driver.driverId ?? driver.driverName}
                  driver={driver}
                  plans={plans}
                  defaultOpen={driver.undeliveredOrders > 0}
                  onSelectPlan={setSelectedPlan}
                />
              ))
            )}
          </div>

          {/* Plan detail */}
          <div>
            <AdminSection title="تفاصيل الخطة">
              {!selectedPlan ? (
                <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                  اختر خطة من قائمة السائقين لعرض تفاصيل إكمالها.
                </p>
              ) : (
                <PlanDetail plan={selectedPlan} />
              )}
            </AdminSection>
          </div>
        </div>
      </div>
    </AdminSection>
  );
}

function PlanDetail({ plan }: { plan: PlanCompletionRow }) {
  const statusTone: StatusBadgeTone = plan.complete ? "green" : plan.overdue ? "red" : "blue";
  const statusLabel = plan.complete ? "مكتملة" : plan.overdue ? "لم تكتمل" : "قيد التنفيذ";

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{plan.planReference}</p>
          <p className="mt-0.5 text-xs text-gray-400">{formatDate(plan.plannedDate)}</p>
        </div>
        <StatusBadge label={statusLabel} tone={statusTone} />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>نسبة الإكمال</span>
          <span className="font-bold text-gray-900 dark:text-white">{plan.pct}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(plan.pct, 2)}%`,
              background: plan.complete ? "#10b981" : plan.overdue ? "#ef4444" : "#3b82f6",
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="سلّم" value={plan.delivered} tone="green" />
        <MiniStat label="مرتجع" value={plan.returned} tone="yellow" />
        <MiniStat label="ملغي" value={plan.cancelled} tone="gray" />
        <MiniStat label="متسلمش" value={plan.open} tone="red" />
      </div>

      {plan.returned > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex items-start gap-2">
            <DocumentArrowDownIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="text-xs">
              <p className="font-bold text-amber-700 dark:text-amber-300">أوردرات مرتجعة ({plan.returned})</p>
              <p className="mt-1 text-amber-600 dark:text-amber-400">
                سُجّلت بسبب السائق وتُحمَّل عليه كخطأ لحين تأكيد تسليمها من قبل الأدمن. تظل محسوبة ضمن خطأ السائق.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: StatusBadgeTone }) {
  const color =
    tone === "green" ? "text-emerald-600 dark:text-emerald-400" :
    tone === "yellow" ? "text-amber-600 dark:text-amber-400" :
    tone === "red" ? "text-rose-600 dark:text-rose-400" :
    "text-gray-500 dark:text-gray-400";
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center dark:border-gray-800 dark:bg-white/[0.03]">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">{label}</p>
    </div>
  );
}
