import { useEffect, useMemo, useState } from "react";
import {
  MapPinIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AdminPageFrame, AdminSection } from "../../components/admin/AdminPageElements";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import SalesHeatmap from "../../components/admin/SalesHeatmap";
import DateRangePicker from "../../components/form/date-range-picker";
import { supabase } from "../../lib/supabase";
import type { DateRangeValue } from "../../lib/date-range";

type VisitRow = {
  id: string;
  user_id: string;
  user_name: string;
  customer_name: string;
  lat: number | null;
  lng: number | null;
  checked_in_at: string;
  visit_result: string | null;
  customer_lat: number | null;
  customer_lng: number | null;
  customer_distance_meters: number | null;
  fraud_status: string | null;
};

type OrderRow = {
  id: string;
  assigned_user_id: string;
  user_name: string;
  customer_name: string;
  total_amount: number;
  status: string;
  order_date: string;
};

type SalesRepStats = {
  user_id: string;
  name: string;
  visits_count: number;
  orders_count: number;
  total_revenue: number;
  delivered_count: number;
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

const currencyFormatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

export default function SalesTeamTab() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);
    return [start, end];
  });
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selectedRep, setSelectedRep] = useState<string | null>(null);
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
      const [visitsRes, ordersRes] = await Promise.all([
        supabase
          .from("visits")
          .select(`
            id, user_id, customer_id, lat, lng, checked_in_at, visit_result,
            customer_distance_meters, fraud_status,
            customers!inner(customer_name, lat, lng)
          `)
          .gte("checked_in_at", rangeStart.toISOString())
          .lte("checked_in_at", rangeEnd.toISOString())
          .not("lat", "is", null)
          .order("checked_in_at", { ascending: false }),
        supabase
          .from("orders")
          .select("id, assigned_user_id, customer_name, total_amount, status, order_date")
          .gte("order_date", rangeStart.toISOString())
          .lte("order_date", rangeEnd.toISOString())
          .not("assigned_user_id", "is", null),
      ]);

      const userIds = new Set<string>();
      (visitsRes.data ?? []).forEach((v: any) => userIds.add(v.user_id));
      (ordersRes.data ?? []).forEach((o: any) => userIds.add(o.assigned_user_id));

      let userMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", [...userIds]);
        (profiles ?? []).forEach((p: any) => {
          userMap[p.id] = p.full_name;
        });
      }

      setVisits(
        (visitsRes.data ?? []).map((v: any) => ({
          id: v.id,
          user_id: v.user_id,
          user_name: userMap[v.user_id] ?? "غير معروف",
          customer_name: v.customers?.customer_name ?? "--",
          lat: v.lat,
          lng: v.lng,
          checked_in_at: v.checked_in_at,
          visit_result: v.visit_result,
          customer_lat: v.customers?.lat ?? null,
          customer_lng: v.customers?.lng ?? null,
          customer_distance_meters: v.customer_distance_meters,
          fraud_status: v.fraud_status,
        })),
      );

      setOrders(
        (ordersRes.data ?? []).map((o: any) => ({
          id: o.id,
          assigned_user_id: o.assigned_user_id,
          user_name: userMap[o.assigned_user_id] ?? "غير معروف",
          customer_name: o.customer_name ?? "--",
          total_amount: o.total_amount,
          status: o.status,
          order_date: o.order_date,
        })),
      );
    } catch (err) {
      console.error("Failed to load sales team data:", err);
    } finally {
      setLoading(false);
    }
  }

  const repStats = useMemo(() => {
    const map = new Map<string, SalesRepStats>();

    visits.forEach((v) => {
      const existing = map.get(v.user_id);
      if (existing) {
        existing.visits_count += 1;
      } else {
        map.set(v.user_id, {
          user_id: v.user_id,
          name: v.user_name,
          visits_count: 1,
          orders_count: 0,
          total_revenue: 0,
          delivered_count: 0,
        });
      }
    });

    orders.forEach((o) => {
      const existing = map.get(o.assigned_user_id);
      if (existing) {
        existing.orders_count += 1;
        existing.total_revenue += o.total_amount;
        existing.delivered_count += o.status === "delivered" ? 1 : 0;
      } else {
        map.set(o.assigned_user_id, {
          user_id: o.assigned_user_id,
          name: o.user_name,
          visits_count: 0,
          orders_count: 1,
          total_revenue: o.total_amount,
          delivered_count: o.status === "delivered" ? 1 : 0,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.orders_count - a.orders_count);
  }, [visits, orders]);

  const heatPoints = useMemo(() => {
    const pointMap = new Map<string, { lat: number; lng: number; intensity: number }>();

    visits.forEach((v) => {
      if (!v.lat || !v.lng) return;
      const key = `${v.lat.toFixed(4)},${v.lng.toFixed(4)}`;
      const existing = pointMap.get(key);
      if (existing) {
        existing.intensity += 1;
      } else {
        pointMap.set(key, { lat: v.lat, lng: v.lng, intensity: 1 });
      }
    });

    return Array.from(pointMap.values());
  }, [visits]);

  const markers = useMemo(() => {
    const customerMap = new Map<string, { lat: number; lng: number; label: string; count: number }>();

    visits.forEach((v) => {
      const lat = v.customer_lat ?? v.lat;
      const lng = v.customer_lng ?? v.lng;
      if (!lat || !lng) return;
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      const existing = customerMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        customerMap.set(key, { lat, lng, label: v.customer_name, count: 1 });
      }
    });

    return Array.from(customerMap.values());
  }, [visits]);

  const outlierMarkers = useMemo(() => {
    return visits
      .filter(
        (v) =>
          (v.customer_distance_meters && v.customer_distance_meters > 500) ||
          (v.fraud_status && v.fraud_status !== "normal"),
      )
      .map((v) => ({
        lat: v.lat!,
        lng: v.lng!,
        label: `${v.customer_name} (${v.fraud_status === "fraudulent" ? " مشبوه" : v.customer_distance_meters ? `${Math.round(v.customer_distance_meters)}م` : ""})`,
        count: 1,
      }));
  }, [visits]);

  const dailyVisits = useMemo(() => {
    const dayMap = new Map<string, Map<string, number>>();

    visits.forEach((v) => {
      const day = new Date(v.checked_in_at).toLocaleDateString("en-CA");
      if (!dayMap.has(day)) dayMap.set(day, new Map());
      const userMap = dayMap.get(day)!;
      userMap.set(v.user_name, (userMap.get(v.user_name) ?? 0) + 1);
    });

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, userMap]) => ({
        day,
        total: Array.from(userMap.values()).reduce((a, b) => a + b, 0),
        byUser: Object.fromEntries(userMap),
      }));
  }, [visits]);

  const selectedRepVisits = useMemo(() => {
    if (!selectedRep) return [];
    return visits.filter((v) => v.user_id === selectedRep).slice(0, 20);
  }, [visits, selectedRep]);

  const selectedRepOrders = useMemo(() => {
    if (!selectedRep) return [];
    return orders.filter((o) => o.assigned_user_id === selectedRep).slice(0, 20);
  }, [orders, selectedRep]);

  const uniqueDays = dailyVisits.length || 1;
  const maxDailyVisits = Math.max(1, ...dailyVisits.map((d) => d.total));

  return (
    <AdminPageFrame>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full min-w-[240px] sm:w-80">
          <DateRangePicker
            id="sales-team-date-range"
            label=""
            placeholder="اختر الفترة"
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {visits.length} زيارة · {orders.length} طلب · {repStats.length} مندوب
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <UserGroupIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">مندوبين نشطين</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white" dir="ltr">{repStats.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <MapPinIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي الزيارات</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white" dir="ltr">{visits.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            <ShoppingCartIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">متوسط زيارات/يوم</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white" dir="ltr">{Math.round(visits.length / uniqueDays)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <CalendarDaysIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">طلبات في الفترة</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white" dir="ltr">
              {orders.length.toLocaleString("en-US")}
            </p>
          </div>
        </div>
      </div>

      <AdminSection title="خريطة كثافة الزيارات" description="مناطق التركيز بناءً على مواقع الزيارات">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          </div>
        ) : heatPoints.length === 0 ? (
          <EmptyState
            icon={<MapPinIcon className="h-6 w-6" />}
            title="لا توجد بيانات مواقع"
            description="ستظهر الخريطة بمجرد تسجيل الزيارات بال GPS."
          />
        ) : (
          <SalesHeatmap
            heatPoints={heatPoints}
            markers={[...markers, ...outlierMarkers]}
            height="500px"
          />
        )}
      </AdminSection>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AdminSection title="الزيارات اليومية" description="عدد الزيارات لكل يوم في الفترة المحددة">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
              </div>
            ) : dailyVisits.length === 0 ? (
              <EmptyState
                icon={<CalendarDaysIcon className="h-6 w-6" />}
                title="لا توجد زيارات"
                description="ستظهر الزيارات هنا."
              />
            ) : (
              <div className="flex flex-col gap-2 px-6 py-4">
                {dailyVisits.map((d) => (
                  <div key={d.day} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                      {d.day}
                    </span>
                    <div className="flex-1">
                      <div
                        className="h-6 rounded-lg bg-blue-500/80 transition-all"
                        style={{ width: `${(d.total / maxDailyVisits) * 100}%`, minWidth: d.total > 0 ? "24px" : "0" }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm font-semibold text-gray-900 dark:text-white" dir="ltr">
                      {d.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </AdminSection>
        </div>

        <AdminSection title="اداء مندوبين المبيعات" description="إحصائيات كل مندوب مبيعات في الفترة المحددة">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            </div>
          ) : repStats.length === 0 ? (
            <EmptyState icon={<UserGroupIcon className="h-6 w-6" />} title="لا يوجد مندوبين" description="ستظهر المندوبين هنا." />
          ) : (
            <div className="flex flex-1 flex-col divide-y divide-gray-100 dark:divide-gray-800 overflow-y-auto max-h-[500px]">
              {repStats.map((r) => (
                <button
                  key={r.user_id}
                  onClick={() => setSelectedRep(selectedRep === r.user_id ? null : r.user_id)}
                  className={`flex items-center gap-3 px-5 py-4 text-right transition hover:bg-brand-25 dark:hover:bg-white/[0.02] ${
                    selectedRep === r.user_id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{r.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                      <span>{r.visits_count} زيارة</span>
                      <span>{r.orders_count} طلب</span>
                      <span dir="ltr">{currencyFormatter.format(r.total_revenue)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">←</div>
                </button>
              ))}
            </div>
          )}
        </AdminSection>
      </div>

      {selectedRep && (
        <AdminSection
          title={`تفاصيل: ${repStats.find((r) => r.user_id === selectedRep)?.name ?? ""}`}
          actions={
            <button
              onClick={() => setSelectedRep(null)}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-4 w-4" />
              إغلاق
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">آخر الزيارات</h4>
              {selectedRepVisits.length === 0 ? (
                <p className="text-sm text-gray-400">لا توجد زيارات</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className="px-3 py-2 text-right font-medium text-gray-500">العميل</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">النتيجة</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {selectedRepVisits.map((v) => (
                        <tr key={v.id}>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{v.customer_name}</td>
                          <td className="px-3 py-2">
                            <StatusBadge
                              label={v.visit_result === "ordered" ? "طلب" : v.visit_result === "no_order" ? "بدون طلب" : v.visit_result ?? "--"}
                              tone={v.visit_result === "ordered" ? "green" : "yellow"}
                            />
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500" dir="ltr">
                            {new Date(v.checked_in_at).toLocaleDateString("ar-EG")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">آخر الطلبات</h4>
              {selectedRepOrders.length === 0 ? (
                <p className="text-sm text-gray-400">لا توجد طلبات</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className="px-3 py-2 text-right font-medium text-gray-500">العميل</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">المبلغ</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {selectedRepOrders.map((o) => (
                        <tr key={o.id}>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{o.customer_name}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300" dir="ltr">
                            {currencyFormatter.format(o.total_amount)}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge
                              label={o.status}
                              tone={o.status === "delivered" ? "green" : o.status === "cancelled" ? "red" : "blue"}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </AdminSection>
      )}
    </AdminPageFrame>
  );
}
