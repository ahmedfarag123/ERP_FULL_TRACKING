import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { AdminSection } from "./AdminPageElements";
import CustomerAvatar from "../ui/CustomerAvatar";
import { StatusBadge } from "../ui/StatusBadge";
import DateRangePicker from "../form/date-range-picker";
import type { DateRangeValue } from "../../lib/date-range";

type Props = {
  className?: string;
};

type AttendanceRow = {
  id: string;
  driver_profile_id: string;
  driver_full_name: string;
  warehouse_name: string;
  work_date: string;
  attended_at: string;
  location_lat: number | null;
  location_lng: number | null;
  note: string | null;
};

type PlanRow = {
  assigned_profile_id: string;
  assigned_profile_id_full_name: string | null;
  planned_date: string;
};

type DriverAttendance = {
  driverId: string;
  driverName: string;
  warehouseName: string;
  firstAttendedAt: string;
  days: string[];
  expectedDays: number;
  absentDays: number;
  absentDates: string[];
};

type AttendanceData = {
  drivers: DriverAttendance[];
  presentToday: number;
  absentToday: number;
  absentTodayNames: string[];
  totalAttendedDays: number;
};

const DAY_LABELS: Record<string, string> = {
  "0": "السبت", "1": "الأحد", "2": "الاثنين", "3": "الثلاثاء", "4": "الأربعاء", "5": "الخميس", "6": "الجمعة",
};

function dayLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return `${DAY_LABELS[String(d.getDay())] ?? ""} ${d.getDate()}/${d.getMonth() + 1}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function cairoToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

async function fetchAttendance(range: DateRangeValue): Promise<AttendanceData> {
  const end = range[1] ? dateOnly(range[1].toISOString()) : cairoToday();
  const startRaw = range[0] ? dateOnly(range[0].toISOString()) : null;

  const { data: minRow } = await supabase
    .from("driver_attendance")
    .select("work_date")
    .order("work_date", { ascending: true })
    .limit(1);
  const featureStart = dateOnly(minRow?.[0]?.work_date) ?? cairoToday();

  const start = startRaw && startRaw < featureStart ? featureStart : startRaw ?? featureStart;

  const [attRes, planRes] = await Promise.all([
    supabase
      .from("driver_attendance")
      .select("*")
      .gte("work_date", start)
      .lte("work_date", end)
      .order("work_date", { ascending: false }),
    supabase
      .from("logistics_delivery_plans")
      .select("assigned_profile_id, assigned_profile_id_full_name, planned_date")
      .not("assigned_profile_id", "is", null)
      .neq("plan_status", "cancelled")
      .is("return_of_plan_id", null)
      .gte("planned_date", start)
      .lte("planned_date", end),
  ]);

  if (attRes.error) throw attRes.error;
  if (planRes.error) throw planRes.error;

  const rows = (attRes.data ?? []) as AttendanceRow[];
  const plans = (planRes.data ?? []) as PlanRow[];

  const expectedByDriver = new Map<string, { name: string; days: string[] }>();
  for (const p of plans) {
    const key = p.assigned_profile_id;
    let e = expectedByDriver.get(key);
    if (!e) {
      e = { name: p.assigned_profile_id_full_name ?? "", days: [] };
      expectedByDriver.set(key, e);
    }
    const d = dateOnly(p.planned_date);
    if (d && !e.days.includes(d)) e.days.push(d);
  }

  const today = cairoToday();
  const todayExpected = new Set<string>();
  for (const [key, e] of expectedByDriver) {
    if (e.days.includes(today)) todayExpected.add(key);
  }

  const byDriver = new Map<string, DriverAttendance>();
  const ensure = (id: string): DriverAttendance => {
    let e = byDriver.get(id);
    if (!e) {
      const exp = expectedByDriver.get(id);
      e = {
        driverId: id,
        driverName: exp?.name ?? "",
        warehouseName: "Horeca Marg",
        firstAttendedAt: "",
        days: [],
        expectedDays: exp ? exp.days.length : 0,
        absentDays: 0,
        absentDates: [],
      };
      byDriver.set(id, e);
    }
    return e;
  };

  for (const key of expectedByDriver.keys()) ensure(key);

  const attendedTodayIds = new Set<string>();
  let totalAttendedDays = 0;
  for (const row of rows) {
    const key = row.driver_profile_id || row.driver_full_name || row.id;
    const entry = ensure(key);
    if (!entry.driverName && row.driver_full_name) entry.driverName = row.driver_full_name;
    entry.warehouseName = row.warehouse_name ?? entry.warehouseName;
    if (!entry.firstAttendedAt || new Date(row.attended_at).getTime() < new Date(entry.firstAttendedAt).getTime()) {
      entry.firstAttendedAt = row.attended_at;
    }
    if (!entry.days.includes(row.work_date)) entry.days.push(row.work_date);
    totalAttendedDays += 1;
    if (row.work_date === today) attendedTodayIds.add(key);
  }

  for (const entry of byDriver.values()) {
    entry.days.sort();
    const expectedSet = (expectedByDriver.get(entry.driverId)?.days ?? []);
    entry.absentDates = expectedSet.filter((d) => !entry.days.includes(d));
    entry.absentDays = entry.absentDates.length;
  }

  const presentToday = attendedTodayIds.size;
  const absentTodayNames = [...todayExpected].filter((id) => !attendedTodayIds.has(id)).map((id) => ensure(id).driverName).filter(Boolean);

  const drivers = [...byDriver.values()].sort((a, b) => {
    if (a.absentDays !== b.absentDays) return b.absentDays - a.absentDays;
    if (a.firstAttendedAt && b.firstAttendedAt) return a.firstAttendedAt < b.firstAttendedAt ? -1 : 1;
    return a.driverName.localeCompare(b.driverName);
  });

  return { drivers, presentToday, absentToday: absentTodayNames.length, absentTodayNames, totalAttendedDays };
}

export default function DriverAttendanceSection({ className = "" }: Props) {
  const endDate = new Date();
  const [range, setRange] = useState<DateRangeValue>([new Date(Date.now() - 6 * 86400000), endDate]);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["logistics", "attendance", range[0]?.toISOString(), range[1]?.toISOString()],
    queryFn: () => fetchAttendance(range),
    staleTime: 30_000,
  });

  const drivers = data?.drivers ?? [];
  const rows = useMemo(
    () => drivers.filter((r) => r.driverName.toLowerCase().includes(search.trim().toLowerCase())),
    [drivers, search],
  );

  const today = cairoToday();

  return (
    <AdminSection
      className={className}
      title="تسجيل حضور السائقين"
      description="أول ضغطة على 'الوصول للمخزن' بتُحسب حضور — بتتسجل يوميًا للأبد، والغياب بيُحسب من الخطط المطلوب تنفيذها"
      actions={
        <>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن سائق"
            className="h-9 w-44 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 outline-none transition focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          />
          <DateRangePicker value={range} onChange={setRange} />
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-right dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">حاضرون اليوم</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{data?.presentToday ?? 0}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-right dark:border-rose-500/20 dark:bg-rose-500/10">
          <p className="text-xs font-medium text-rose-700 dark:text-rose-300">غائبون اليوم</p>
          <p className="mt-1 text-2xl font-extrabold text-rose-700 dark:text-rose-300">{data?.absentToday ?? 0}</p>
          {(data?.absentTodayNames ?? []).length > 0 && (
            <p className="mt-1 text-[10px] font-medium text-rose-600 dark:text-rose-300">{data!.absentTodayNames.join("، ")}</p>
          )}
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-right dark:border-blue-500/20 dark:bg-blue-500/10">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">أيام تسجيل حضور</p>
          <p className="mt-1 text-2xl font-extrabold text-blue-700 dark:text-blue-300">{data?.totalAttendedDays ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-right dark:border-gray-700 dark:bg-white/[0.03]">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">سائقون مطلوبون</p>
          <p className="mt-1 text-2xl font-extrabold text-gray-800 dark:text-gray-200">
            {drivers.filter((d) => d.expectedDays > 0).length}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-56 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/60" />
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">لا توجد بيانات حضور في هذه الفترة</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-right text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <th className="px-4 py-3">السائق</th>
                <th className="px-4 py-3">المخزن</th>
                <th className="px-4 py-3">أول حضور</th>
                <th className="px-4 py-3">أيام الحضور</th>
                <th className="px-4 py-3">أيام مطلوبة</th>
                <th className="px-4 py-3">غائب</th>
                <th className="px-4 py-3">حاضر اليوم</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.driverId} className="border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <CustomerAvatar name={r.driverName || "سائق"} size="sm" shape="circle" />
                      <span className="font-medium text-gray-800 dark:text-gray-200">{r.driverName || "سائق غير محدد"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{r.warehouseName}</td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400" dir="ltr">{r.firstAttendedAt ? formatTime(r.firstAttendedAt) : "--"}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex flex-wrap gap-1">{r.days.length ? r.days.map((d) => <span key={d} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">{dayLabel(d)}</span>) : <span className="text-xs text-gray-400">—</span>}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center font-bold text-gray-800 dark:text-gray-200">{r.expectedDays || "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    {r.absentDays > 0 ? (
                      <div>
                        <span className="font-bold text-rose-600 dark:text-rose-400">{r.absentDays}</span>
                        <span className="mr-1.5 inline-flex flex-wrap gap-1">{r.absentDates.map((d) => <span key={d} className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{dayLabel(d)}</span>)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.days.includes(today) ? <StatusBadge tone="green" label="حاضر" /> : r.expectedDays > 0 ? <StatusBadge tone="red" label="غائب" /> : <StatusBadge tone="gray" label="لا يوجد خطط" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[11px] text-gray-400">
        الحضور بيُسجَّل تلقائيًا أول ما السائق يضغط "الوصول للمخزن" في تطبيق السائق — مرة واحدة لكل يوم عمل.
        الغياب بيُحسب من الخطة المطلوبة في نفس اليوم بدون تسجيل حضور.
      </p>
    </AdminSection>
  );
}