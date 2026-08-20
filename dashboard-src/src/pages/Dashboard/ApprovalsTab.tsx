import { useEffect, useMemo, useState } from "react";
import {
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { AdminPageFrame, AdminSection } from "../../components/admin/AdminPageElements";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import DateRangePicker from "../../components/form/date-range-picker";
import { supabase } from "../../lib/supabase";
import type { DateRangeValue } from "../../lib/date-range";

type CollectionRequest = {
  id: string;
  driver_name: string;
  collected_amount: number;
  status: string;
  created_at: string;
  plan_reference: string | null;
};

type CollectionCheck = {
  id: string;
  driver_name: string;
  order_number: string | null;
  check_status: string;
  payment_method: string | null;
  review_status: string;
  created_at: string;
};

type SettlementRequest = {
  id: string;
  driver_name: string;
  total_debt_amount: number;
  status: string;
  created_at: string;
  plan_reference: string | null;
};

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
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  detail?: string;
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
        <p className="text-2xl font-bold text-gray-900 dark:text-white" dir="ltr">{value}</p>
        {detail && <p className="text-xs text-gray-400 dark:text-gray-500">{detail}</p>}
      </div>
    </div>
  );
}

const currencyFormatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

export default function ApprovalsTab() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);
    return [start, end];
  });
  const [collectionRequests, setCollectionRequests] = useState<CollectionRequest[]>([]);
  const [collectionChecks, setCollectionChecks] = useState<CollectionCheck[]>([]);
  const [settlementRequests, setSettlementRequests] = useState<SettlementRequest[]>([]);
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
      const [requestsRes, checksRes, settlementsRes] = await Promise.all([
        supabase
          .from("logistics_collection_requests")
          .select("id, collected_amount, status, created_at, driver_profile_id, plan_id")
          .gte("created_at", rangeStart.toISOString())
          .lte("created_at", rangeEnd.toISOString())
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("driver_plan_collection_checks")
          .select("id, check_status, payment_method, review_status, created_at, driver_profile_id, shipment_id")
          .gte("created_at", rangeStart.toISOString())
          .lte("created_at", rangeEnd.toISOString())
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("driver_plan_settlement_requests")
          .select("id, total_debt_amount, status, created_at, driver_profile_id, plan_id")
          .gte("created_at", rangeStart.toISOString())
          .lte("created_at", rangeEnd.toISOString())
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const driverIds = new Set<string>();
      [requestsRes.data, checksRes.data, settlementsRes.data].forEach((rows) => {
        (rows ?? []).forEach((r: any) => {
          if (r.driver_profile_id) driverIds.add(r.driver_profile_id);
        });
      });

      let driverMap: Record<string, string> = {};
      if (driverIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", [...driverIds]);
        (profiles ?? []).forEach((p: any) => {
          driverMap[p.id] = p.full_name;
        });
      }

      const planIds = new Set<string>();
      [requestsRes.data, settlementsRes.data].forEach((rows) => {
        (rows ?? []).forEach((r: any) => {
          if (r.plan_id) planIds.add(r.plan_id);
        });
      });

      let planMap: Record<string, string> = {};
      if (planIds.size > 0) {
        const { data: plans } = await supabase
          .from("logistics_delivery_plans")
          .select("id, reference")
          .in("id", [...planIds]);
        (plans ?? []).forEach((p: any) => {
          planMap[p.id] = p.reference;
        });
      }

      setCollectionRequests(
        (requestsRes.data ?? []).map((r: any) => ({
          id: r.id,
          driver_name: driverMap[r.driver_profile_id] ?? "غير معروف",
          collected_amount: r.collected_amount,
          status: r.status,
          created_at: r.created_at,
          plan_reference: planMap[r.plan_id] ?? null,
        })),
      );

      setCollectionChecks(
        (checksRes.data ?? []).map((r: any) => ({
          id: r.id,
          driver_name: driverMap[r.driver_profile_id] ?? "غير معروف",
          order_number: null,
          check_status: r.check_status,
          payment_method: r.payment_method,
          review_status: r.review_status,
          created_at: r.created_at,
        })),
      );

      setSettlementRequests(
        (settlementsRes.data ?? []).map((r: any) => ({
          id: r.id,
          driver_name: driverMap[r.driver_profile_id] ?? "غير معروف",
          total_debt_amount: r.total_debt_amount,
          status: r.status,
          created_at: r.created_at,
          plan_reference: planMap[r.plan_id] ?? null,
        })),
      );
    } catch (err) {
      console.error("Failed to load approvals data:", err);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const pendingRequests = collectionRequests.filter((r) => r.status === "pending");
    const pendingChecks = collectionChecks.filter((c) => c.review_status === "pending");
    const pendingSettlements = settlementRequests.filter((s) => s.status === "pending");

    const now = Date.now();
    const overdue = pendingRequests.filter(
      (r) => now - new Date(r.created_at).getTime() > 24 * 60 * 60 * 1000,
    );

    return {
      pendingRequestCount: pendingRequests.length,
      pendingRequestAmount: pendingRequests.reduce((sum, r) => sum + r.collected_amount, 0),
      pendingCheckCount: pendingChecks.length,
      pendingSettlementCount: pendingSettlements.length,
      pendingSettlementAmount: pendingSettlements.reduce((sum, s) => sum + s.total_debt_amount, 0),
      overdueCount: overdue.length,
    };
  }, [collectionRequests, collectionChecks, settlementRequests]);

  return (
    <AdminPageFrame>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full min-w-[240px] sm:w-80">
          <DateRangePicker
            id="approvals-date-range"
            label=""
            placeholder="اختر الفترة"
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {collectionRequests.length} طلب تحصيل · {collectionChecks.length} فحص · {settlementRequests.length} تسوية
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="طلبات تحصيل معلقة"
          value={stats.pendingRequestCount}
          detail={stats.pendingRequestAmount > 0 ? currencyFormatter.format(stats.pendingRequestAmount) : undefined}
          icon={<CurrencyDollarIcon className="h-6 w-6" />}
          tone="amber"
        />
        <StatCard
          label="فحوصات تحصيل معلقة"
          value={stats.pendingCheckCount}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          tone="blue"
        />
        <StatCard
          label="تسويات معلقة"
          value={stats.pendingSettlementCount}
          detail={stats.pendingSettlementAmount > 0 ? currencyFormatter.format(stats.pendingSettlementAmount) : undefined}
          icon={<ClockIcon className="h-6 w-6" />}
          tone="emerald"
        />
        <StatCard
          label="متأخرة (>24 ساعة)"
          value={stats.overdueCount}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          tone="rose"
        />
      </div>

      <AdminSection
        title="طلبات التحصيل"
        description="طلبات التحصيل من السائقين في الفترة المحددة"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          </div>
        ) : collectionRequests.length === 0 ? (
          <EmptyState
            icon={<CurrencyDollarIcon className="h-6 w-6" />}
            title="لا توجد طلبات تحصيل"
            description="ستظهر طلبات التحصيل هنا بمجرد إرسالها من السائقين."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">السائق</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">المبلغ</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">الخطة</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {collectionRequests.slice(0, 20).map((r) => (
                  <tr key={r.id} className="hover:bg-brand-25 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.driver_name}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300" dir="ltr">
                      {currencyFormatter.format(r.collected_amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.plan_reference ?? "--"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={r.status === "pending" ? "معلق" : r.status === "approved" ? "موافق" : "مرفوض"}
                        tone={r.status === "pending" ? "yellow" : r.status === "approved" ? "green" : "red"}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                      {new Date(r.created_at).toLocaleDateString("ar-EG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="فحوصات التحصيل"
        description="فحص كل شحنة كمحصلة أو غير محصلة في الفترة المحددة"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          </div>
        ) : collectionChecks.length === 0 ? (
          <EmptyState
            icon={<CheckCircleIcon className="h-6 w-6" />}
            title="لا توجد فحوصات"
            description="ستظهر فحوصات التحصيل هنا."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">السائق</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">طريقة الدفع</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">المراجعة</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {collectionChecks.slice(0, 20).map((c) => (
                  <tr key={c.id} className="hover:bg-brand-25 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.driver_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={c.check_status === "collected" ? "محصلة" : "غير محصلة"}
                        tone={c.check_status === "collected" ? "green" : "red"}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {c.payment_method === "cash" ? "نقدي" : c.payment_method === "bank_transfer" ? "تحويل بنكي" : c.payment_method ?? "--"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={c.review_status === "pending" ? "معلق" : c.review_status === "approved" ? "موافق" : "مرفوض"}
                        tone={c.review_status === "pending" ? "yellow" : c.review_status === "approved" ? "green" : "red"}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                      {new Date(c.created_at).toLocaleDateString("ar-EG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="تسويات الخطط"
        description="طلبات تسوية ديون السائقين في الفترة المحددة"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          </div>
        ) : settlementRequests.length === 0 ? (
          <EmptyState
            icon={<ClockIcon className="h-6 w-6" />}
            title="لا توجد تسويات"
            description="ستظهر طلبات التسوية هنا."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">السائق</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">المبلغ</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">الخطة</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {settlementRequests.slice(0, 20).map((s) => (
                  <tr key={s.id} className="hover:bg-brand-25 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.driver_name}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300" dir="ltr">
                      {currencyFormatter.format(s.total_debt_amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.plan_reference ?? "--"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={s.status === "pending" ? "معلق" : s.status === "approved" ? "موافق" : s.status === "paid" ? "مدفوع" : "مرفوض"}
                        tone={s.status === "pending" ? "yellow" : s.status === "approved" ? "blue" : s.status === "paid" ? "green" : "red"}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                      {new Date(s.created_at).toLocaleDateString("ar-EG")}
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
