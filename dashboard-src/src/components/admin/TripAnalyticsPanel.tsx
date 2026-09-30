import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Download } from "lucide-react";
import { AdminSection } from "./AdminPageElements";
import { supabase } from "../../lib/supabase";
import {
  analyzeDriverTrip,
  formatDuration,
  type TripCustomer,
  type TripPing,
  type TripWarehouse,
} from "../../lib/tripAnalytics";
import type { MapPlanAssignee } from "./AdminLiveTrackingMap";
import { exportTripAnalysisWorkbook } from "../../lib/excel-export";

type Props = {
  driverId: string | null;
  driverName?: string;
  assignees?: MapPlanAssignee[];
};

type Period = "day" | "week" | "month";

const PERIOD_OPTIONS: { value: Period; label: string; days: number }[] = [
  { value: "day", label: "اليوم", days: 1 },
  { value: "week", label: "آخر 7 أيام", days: 7 },
  { value: "month", label: "آخر 30 يوم", days: 30 },
];

const ACTIVE_PLAN_STATUSES = ["pending", "in_progress"];

function todayStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function periodSinceIso(period: Period): string {
  const days = PERIOD_OPTIONS.find((p) => p.value === period)?.days ?? 1;
  const d = new Date(Date.now() - days * 86400000);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function periodLabel(period: Period): string {
  return PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? "اليوم";
}

function todayDateLabel(): string {
  return new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtClock(iso: string | null): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function mins(seconds: number): number {
  return Math.round(seconds / 60);
}

async function fetchTripAnalysis(driverId: string, period: Period) {
  const since = period === "day" ? todayStartIso() : periodSinceIso(period);
  const days = PERIOD_OPTIONS.find((p) => p.value === period)?.days ?? 1;

  const { data: pings, error: pingsErr } = await supabase
    .from("location_tracking")
    .select("captured_at, lat, lng, accuracy_meters")
    .eq("user_id", driverId)
    .gte("captured_at", since)
    .order("captured_at", { ascending: true })
    .limit(Math.min(days * 2000, 30000));
  if (pingsErr) throw pingsErr;

  const mappedPings: TripPing[] = (pings ?? []).map((p) => ({
    capturedAt: p.captured_at as string,
    lat: Number(p.lat),
    lng: Number(p.lng),
    accuracyMeters: p.accuracy_meters !== null && p.accuracy_meters !== undefined ? Number(p.accuracy_meters) : null,
  }));

  const sinceDate = since.slice(0, 10);
  const untilDate = new Date().toISOString().slice(0, 10);

  const { data: plans } = await supabase
    .from("logistics_delivery_plans")
    .select("id")
    .eq("assigned_profile_id", driverId)
    .in("plan_status", [...ACTIVE_PLAN_STATUSES, "completed"])
    .gte("planned_date", sinceDate)
    .lte("planned_date", untilDate);

  const planIds = (plans ?? []).map((p) => p.id);
  const customers: TripCustomer[] = [];
  let warehouse: TripWarehouse | null = null;

  if (planIds.length > 0) {
    const { data: shipments } = await supabase
      .from("logistics_shipments")
      .select(
        "id, customer_name, customer_latitude, customer_longitude, route_sequence, shipment_status, warehouse_name, warehouse_latitude, warehouse_longitude"
      )
      .in("plan_id", planIds)
      .not("customer_latitude", "is", null)
      .not("customer_longitude", "is", null);

    for (const s of shipments ?? []) {
      const lat = Number(s.customer_latitude);
      const lng = Number(s.customer_longitude);
      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
      customers.push({
        id: s.id,
        name: s.customer_name,
        lat,
        lng,
        status: s.shipment_status,
        routeSequence:
          s.route_sequence !== null && s.route_sequence !== undefined && Number.isFinite(Number(s.route_sequence))
            ? Number(s.route_sequence)
            : null,
      });
      if (!warehouse) {
        const wLat = Number(s.warehouse_latitude);
        const wLng = Number(s.warehouse_longitude);
        if (!Number.isNaN(wLat) && !Number.isNaN(wLng) && wLat !== 0 && wLng !== 0) {
          warehouse = { name: s.warehouse_name, lat: wLat, lng: wLng };
        }
      }
    }
  }

  return analyzeDriverTrip(mappedPings, customers, warehouse);
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_ASSIGN: "جاهزة للتخطيط",
  ASSIGNED: "تم الإسناد",
  CHECK_IN: "استلام",
  PICKUP: "استلام",
  OUT_FOR_DELIVERY: "في الطريق",
  ARRIVED: "في الطريق",
  DELIVERED: "تم التسليم",
  FINISHED: "تم التسليم",
  SETTLED: "تم التسليم",
  CANCELLED: "ملغي",
};

function statusLabel(status: string | null): string {
  if (!status) return "—";
  return STATUS_LABELS[status] ?? status;
}

export default function TripAnalyticsPanel({ driverId, driverName, assignees = [] }: Props) {
  const [period, setPeriod] = useState<Period>("day");
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  const personId = selectedPerson ?? driverId;

  const { data, isLoading } = useQuery({
    queryKey: ["logistics", "trip-analysis", personId ?? "none", period],
    queryFn: () => fetchTripAnalysis(personId as string, period),
    enabled: Boolean(personId),
    refetchInterval: period === "day" ? 30_000 : false,
  });

  const allPeople = useMemo(() => {
    const list: { id: string; name: string; role: string }[] = [];
    if (driverId && driverName) {
      list.push({ id: driverId, name: driverName, role: "سائق" });
    }
    for (const a of assignees) {
      if (a.profileId !== driverId) {
        list.push({ id: a.profileId, name: a.displayName, role: "مشارك" });
      }
    }
    return list;
  }, [driverId, driverName, assignees]);

  if (!driverId) {
    return (
      <AdminSection
        title="تحليل خط السير"
        description="اضغط على سائق في الخريطة لمشاهدة تفاصيل وقوفه وتنقلاته"
      >
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-6 text-sm text-gray-500 dark:bg-white/[0.02] dark:text-gray-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 3v7h7" />
            <path d="M14 10 21 3" />
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          </svg>
          <span>حدد سائقًا من قائمة «المشاركون» بالخريطة ثم تابع التحليل هنا</span>
        </div>
      </AdminSection>
    );
  }

  return (
    <AdminSection
      title="تحليل خط السير"
      description={allPeople.length > 1
        ? `كل المسندين — ${todayDateLabel()}`
        : `${driverName ? `${driverName} · ` : ""}${todayDateLabel()}`
      }
    >
      {allPeople.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {allPeople.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPerson(p.id === driverId ? null : p.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                (selectedPerson ?? driverId) === p.id
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.04] dark:text-gray-300 dark:hover:bg-white/[0.08]"
              }`}
            >
              {p.role === "مشارك" && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              )}
              {p.name}
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-white/[0.02]">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                period === opt.value
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {data && data.pings >= 2 && (
          <button
            onClick={() => {
              const person = allPeople.find((p) => (selectedPerson ?? driverId) === p.id);
              if (person && data) {
                exportTripAnalysisWorkbook({
                  periodLabel: periodLabel(period),
                  entries: [{ name: person.name, role: person.role, summary: data, stops: data.stops }],
                });
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <Download size={13} />
            تحميل Excel
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : !data || data.pings < 2 ? (
        <div className="rounded-xl bg-gray-50 px-4 py-6 text-sm text-gray-500 dark:bg-white/[0.02] dark:text-gray-400">
          لا توجد بيانات تتبع لهذه الفترة. تظهر التحليلات فور بدء إرسال المواقع.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
            <SummaryCard label="نقاط تتبع" value={data.pings.toLocaleString("ar-EG")} />
            <SummaryCard label="وقت حركة" value={formatDuration(data.driveSeconds)} />
            <SummaryCard label="مسافة تقريبية" value={`${data.driveKm.toFixed(1)} كم`} />
            <SummaryCard label="زيارات عملاء" value={data.visits.toLocaleString("ar-EG")} />
            <SummaryCard label="وقفات" value={data.stops.length.toLocaleString("ar-EG")} />
            <SummaryCard label="إجمالي الوقوف" value={formatDuration(data.totalStopSeconds)} />
          </div>

          {/* Timeline table */}
          {data.stops.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-right text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-[11px] text-gray-400 dark:border-gray-800">
                    <th className="py-2 pr-2 font-medium">#</th>
                    <th className="py-2 font-medium">النقطة</th>
                    <th className="py-2 font-medium">الوصول</th>
                    <th className="py-2 font-medium">استغرق للوصول</th>
                    <th className="py-2 font-medium">المكوث</th>
                    <th className="py-2 font-medium">حالة الشحنة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stops.map((stop, index) => {
                    const leg = data.legs.find((l) => l.toStopIndex === index);
                    const isCurrent = !stop.departedAt;
                    return (
                      <tr
                        key={`${index}-${stop.kind}`}
                        className="border-b border-gray-100 text-gray-700 last:border-0 dark:border-gray-800/60 dark:text-gray-300"
                      >
                        <td className="py-2.5 pr-2 text-gray-400">{index + 1}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                                stop.kind === "customer"
                                  ? "bg-blue-500"
                                  : stop.kind === "warehouse"
                                    ? "bg-gray-600"
                                    : "bg-amber-400"
                              }`}
                            />
                            <span className="font-medium">{stop.label}</span>
                            {stop.kind === "other" && (
                              <span className="text-[10px] text-gray-400">
                                {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
                              </span>
                            )}
                            {isCurrent && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                واقف الآن
                              </span>
                            )}
                          </div>
                          <span className="mt-0.5 block text-[10px] text-gray-400">
                            {stop.kind === "customer"
                              ? "زيارة عميل"
                              : stop.kind === "warehouse"
                                ? "المستودع"
                                : "وقفة أخرى"}
                          </span>
                        </td>
                        <td className="py-2.5">{fmtClock(stop.arrivedAt)}</td>
                        <td className="py-2.5">
                          {index === 0 ? (
                            <span className="text-gray-400">بداية التتبع</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs">
                              <span>{formatDuration(leg?.durationSeconds ?? 0)}</span>
                              <span className="text-gray-400">· {leg?.straightKm.toFixed(1) ?? 0} كم</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span className="font-semibold">
                            {isCurrent ? `منذ ${formatDuration(stop.dwellSeconds)}` : `${mins(stop.dwellSeconds)} دقيقة`}
                          </span>
                        </td>
                        <td className="py-2.5">
                          {stop.kind === "customer" ? (
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {statusLabel(stop.status)}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 px-4 py-6 text-sm text-gray-500 dark:bg-white/[0.02] dark:text-gray-400">
              نقاط التتبع موجودة لكن لم تُرصد وقفات كافية اليوم (مكوث ≥ 45 ثانية).
            </div>
          )}

          <p className="text-[10px] leading-relaxed text-gray-400 dark:text-gray-500">
            مبني على نقاط المواقع المرسلة من التطبيق (كل ~15 ثانية). «الوقفة» تعني سكون داخل نطاق ~30 متر لمدة 45
            ثانية فأكثر؛ المسافة والوقت تقريبيان.
          </p>
        </div>
      )}
    </AdminSection>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="text-lg font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{label}</div>
    </div>
  );
}
