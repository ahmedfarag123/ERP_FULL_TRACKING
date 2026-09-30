import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminSection } from "./AdminPageElements";
import CustomerAvatar from "../ui/CustomerAvatar";
import DateRangePicker from "../form/date-range-picker";
import type { DateRangeValue } from "../../lib/date-range";
import { exportAttendanceWorkbook } from "../../lib/excel-export";

type Props = { className?: string };

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

type DriverInfo = {
  id: string;
  name: string;
  warehouse: string;
  firstAttendedAt: string;
  attendedDates: Map<string, AttendanceRow>;
  plannedDates: Set<string>;
  absentDates: string[];
};

type ViewMode = "matrix" | "log";

function cairoNow(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function cairoFormatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function dateRangeToArray(start: string, end: string): string[] {
  const dates: string[] = [];
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  while (s <= e) {
    dates.push(dateOnly(s.toISOString())!);
    s.setDate(s.getDate() + 1);
  }
  return dates;
}

const AR_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function dayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return AR_DAYS[d.getDay()];
}

function dayShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${AR_DAYS[d.getDay()].slice(0, 3)} ${d.getDate()}/${d.getMonth() + 1}`;
}

function normalizeWarehouse(raw: string | null | undefined): string {
  if (!raw) return "";
  const lower = raw.toLowerCase().trim();
  if (lower.includes("mas") || lower.includes("ماز")) return "Mas MARG";
  if (lower.includes("horeca")) return "Horeca Marg";
  return raw.trim();
}

function normalizeName(raw: string | null | undefined): string {
  if (!raw) return "سائق غير محدد";
  return raw.trim() || "سائق غير محدد";
}

function buildDriverMap(
  rows: AttendanceRow[],
  plans: PlanRow[],
  rosterNames: Map<string, string>,
  allDrivers: Array<{ id: string; name: string }>,
): Map<string, DriverInfo> {
  const byId = new Map<string, DriverInfo>();

  const ensure = (id: string, name?: string, warehouse?: string): DriverInfo => {
    let d = byId.get(id);
    if (!d) {
      d = {
        id,
        name: normalizeName(name),
        warehouse: normalizeWarehouse(warehouse),
        firstAttendedAt: "",
        attendedDates: new Map(),
        plannedDates: new Set(),
        absentDates: [],
      };
      byId.set(id, d);
    }
    if (name && d.name === "سائق غير محدد") d.name = normalizeName(name);
    if (warehouse && d.warehouse === "غير محدد") d.warehouse = normalizeWarehouse(warehouse);
    return d;
  };

  for (const driver of allDrivers) {
    ensure(driver.id, driver.name);
  }

  for (const p of plans) {
    const key = p.assigned_profile_id;
    if (!key) continue;
    const d = ensure(key, p.assigned_profile_id_full_name ?? undefined);
    const dt = dateOnly(p.planned_date);
    if (dt) d.plannedDates.add(dt);
  }

  for (const r of rows) {
    const key = r.driver_profile_id || r.driver_full_name || r.id;
    const d = ensure(key, r.driver_full_name, r.warehouse_name);
    if (!d.attendedDates.has(r.work_date)) {
      d.attendedDates.set(r.work_date, r);
    }
    const ts = r.attended_at;
    if (!d.firstAttendedAt || (ts && ts < d.firstAttendedAt)) {
      d.firstAttendedAt = ts;
    }
  }

  for (const d of byId.values()) {
    d.absentDates = [...d.plannedDates].filter((dt) => !d.attendedDates.has(dt)).sort();
  }

  for (const d of byId.values()) {
    if (d.name === "سائق غير محدد") {
      const rosterName = rosterNames.get(d.id);
      if (rosterName) d.name = rosterName;
    }
  }

  return byId;
}

async function fetchAttendance(range: DateRangeValue) {
  const end = dateOnly(range[1]?.toISOString()) ?? cairoNow();
  const startRaw = dateOnly(range[0]?.toISOString());

  const { data: minRow } = await supabase
    .from("driver_attendance")
    .select("work_date")
    .order("work_date", { ascending: true })
    .limit(1);
  const featureStart = dateOnly(minRow?.[0]?.work_date) ?? cairoNow();
  const start = startRaw && startRaw < featureStart ? featureStart : startRaw ?? featureStart;

  const [attRes, planRes, luRes, profileRes] = await Promise.all([
    supabase
      .from("driver_attendance")
      .select("*")
      .gte("work_date", start)
      .lte("work_date", end)
      .order("work_date", { ascending: true }),
    supabase
      .from("logistics_delivery_plans")
      .select("assigned_profile_id, assigned_profile_id_full_name, planned_date")
      .not("assigned_profile_id", "is", null)
      .neq("plan_status", "cancelled")
      .is("return_of_plan_id", null)
      .gte("planned_date", start)
      .lte("planned_date", end),
    supabase
      .from("logistics_users")
      .select("linked_profile_id, employee_name")
      .not("linked_profile_id", "is", null),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("role", "driver"),
  ]);

  if (attRes.error) throw attRes.error;
  if (planRes.error) throw planRes.error;

  const rosterNames = new Map<string, string>();
  for (const p of (profileRes.data ?? []) as Array<{ id: string; full_name: string | null }>) {
    if (p.id && p.full_name?.trim()) {
      rosterNames.set(p.id, p.full_name.trim());
    }
  }
  for (const lu of (luRes.data ?? []) as Array<{ linked_profile_id: string; employee_name: string | null }>) {
    if (lu.linked_profile_id && lu.employee_name?.trim() && !rosterNames.has(lu.linked_profile_id)) {
      rosterNames.set(lu.linked_profile_id, lu.employee_name.trim());
    }
  }

  const allDrivers = (profileRes.data ?? []).map((p: any) => ({
    id: String(p.id),
    name: normalizeName(p.full_name),
  }));

  const rows = (attRes.data ?? []) as AttendanceRow[];
  const plans = (planRes.data ?? []) as PlanRow[];
  const allDates = dateRangeToArray(start, end);
  const driverMap = buildDriverMap(rows, plans, rosterNames, allDrivers);

  const drivers = [...driverMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "ar")
  );

  const today = cairoNow();
  const todayExpectedIds = new Set<string>();
  const todayAttendedIds = new Set<string>();
  for (const d of drivers) {
    if (d.plannedDates.has(today)) todayExpectedIds.add(d.id);
    if (d.attendedDates.has(today)) todayAttendedIds.add(d.id);
  }
  const absentToday = [...todayExpectedIds].filter((id) => !todayAttendedIds.has(id));
  const absentTodayNames = absentToday.map((id) => driverMap.get(id)?.name ?? "").filter(Boolean);

  return {
    drivers,
    allDates,
    rows,
    presentToday: todayAttendedIds.size,
    absentToday: absentToday.length,
    absentTodayNames,
    totalAttendedDays: rows.length,
    rangeLabel: `${start}_اليوم`,
  };
}

function StatusDot({ present }: { present: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        present ? "bg-emerald-500" : "bg-rose-500"
      }`}
    />
  );
}

export default function DriverAttendanceSection({ className = "" }: Props) {
  const [range, setRange] = useState<DateRangeValue>([
    new Date(Date.now() - 6 * 86400000),
    new Date(),
  ]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("matrix");

  const { data, isLoading } = useQuery({
    queryKey: ["logistics", "attendance", range[0]?.toISOString(), range[1]?.toISOString()],
    queryFn: () => fetchAttendance(range),
    staleTime: 30_000,
  });

  const allDates = data?.allDates ?? [];
  const absentTodayNames = data?.absentTodayNames ?? [];

  const filteredDrivers = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return q
      ? data.drivers.filter((d) => d.name.toLowerCase().includes(q) || d.warehouse.toLowerCase().includes(q))
      : data.drivers;
  }, [data, search]);

  const groupedByWarehouse = useMemo(() => {
    const groups = new Map<string, typeof filteredDrivers>();
    for (const d of filteredDrivers) {
      const wh = d.warehouse;
      if (!wh) continue;
      if (!groups.has(wh)) groups.set(wh, []);
      groups.get(wh)!.push(d);
    }
    return groups;
  }, [filteredDrivers]);

  const dayTotals = useMemo(() => {
    if (!data) return new Map<string, number>();
    const totals = new Map<string, number>();
    for (const dt of allDates) {
      let count = 0;
      for (const d of data.drivers) {
        if (d.attendedDates.has(dt)) count++;
      }
      totals.set(dt, count);
    }
    return totals;
  }, [data, allDates]);

  const handleExportExcel = () => {
    if (!data) return;
    const headers = allDates.map((dt) => dayShort(dt));
    const rows = filteredDrivers.map((driver) => {
      const present = allDates.filter((dt) => driver.attendedDates.has(dt)).length;
      const absent = allDates.filter(
        (dt) => driver.plannedDates.has(dt) && !driver.attendedDates.has(dt),
      ).length;
      const values = allDates.map((dt) => {
        const row = driver.attendedDates.get(dt);
        const isPlanned = driver.plannedDates.has(dt);
        if (row) return cairoFormatTime(row.attended_at);
        if (isPlanned) return "✗";
        return "—";
      });
      return { name: driver.name, warehouse: driver.warehouse, values, present, absent };
    });
    const dateRows = allDates.map((dt) => ({ date: dt, count: dayTotals.get(dt) ?? 0 }));

    exportAttendanceWorkbook({
      periodLabel: "الفترة",
      headers,
      rows,
      dateRows,
      rangeLabel: data.rangeLabel,
    });
  };

  return (
    <AdminSection
      className={className}
      title="جدول الحضور اليومي"
      description="حضور وغياب السائقين — مصفوفة أسبوعية + سجل تفصيلي"
      actions={
        <>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن سائق"
            className="h-9 w-44 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 outline-none transition focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          />
          <button
            onClick={handleExportExcel}
            disabled={!data || filteredDrivers.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={13} />
            تحميل Excel
          </button>
          <DateRangePicker value={range} onChange={setRange} />
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-right dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">حاضرون اليوم</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
            {data?.presentToday ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-right dark:border-rose-500/20 dark:bg-rose-500/10">
          <p className="text-xs font-medium text-rose-700 dark:text-rose-300">غائبون اليوم</p>
          <p className="mt-1 text-2xl font-extrabold text-rose-700 dark:text-rose-300">
            {data?.absentToday ?? 0}
          </p>
          {absentTodayNames.length > 0 && (
            <p className="mt-1 text-[10px] font-medium text-rose-600 dark:text-rose-300">
              {absentTodayNames.join("، ")}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-right dark:border-blue-500/20 dark:bg-blue-500/10">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">إجمالي أيام التسجيل</p>
          <p className="mt-1 text-2xl font-extrabold text-blue-700 dark:text-blue-300">
            {data?.totalAttendedDays ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-right dark:border-gray-700 dark:bg-white/[0.03]">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">سائقون مطلوبون</p>
          <p className="mt-1 text-2xl font-extrabold text-gray-800 dark:text-gray-200">
            {filteredDrivers.filter((d) => d.plannedDates.size > 0).length}
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setView("matrix")}
          className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
            view === "matrix"
              ? "border-brand-500 text-brand-600 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          المصفوفة الأسبوعية
        </button>
        <button
          onClick={() => setView("log")}
          className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
            view === "log"
              ? "border-brand-500 text-brand-600 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          السجل اليومي التفصيلي
        </button>
      </div>

      {isLoading ? (
        <div className="h-56 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/60" />
      ) : filteredDrivers.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">
          لا توجد بيانات حضور في هذه الفترة
        </p>
      ) : view === "matrix" ? (
        <MatrixView
          drivers={filteredDrivers}
          allDates={allDates}
          dayTotals={dayTotals}
        />
      ) : (
        <DailyLogView drivers={filteredDrivers} allDates={allDates} />
      )}

      <p className="mt-3 text-[11px] text-gray-400">
        الحضور بيُسجَّل تلقائيًا أول ما السائق يضغط «الوصول للمخزن» في تطبيق السائق — مرة واحدة لكل يوم عمل.
        الغياب بيُحسب من الخطة المطلوبة في نفس اليوم بدون تسجيل حضور.
      </p>
    </AdminSection>
  );
}

function MatrixView({
  drivers,
  allDates,
  dayTotals,
}: {
  drivers: DriverInfo[];
  allDates: string[];
  dayTotals: Map<string, number>;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-800/60">
            <th className="sticky right-0 z-10 bg-gray-50 px-3 py-2.5 text-right font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              السائق
            </th>
            {allDates.map((dt) => (
              <th
                key={dt}
                className="min-w-[60px] px-2 py-2.5 text-center font-semibold text-gray-600 dark:text-gray-300"
              >
                <div className="leading-tight">{dayShort(dt)}</div>
              </th>
            ))}
            <th className="min-w-[40px] px-2 py-2.5 text-center font-bold text-gray-700 dark:text-gray-200">
              ✓
            </th>
            <th className="min-w-[40px] px-2 py-2.5 text-center font-bold text-gray-700 dark:text-gray-200">
              ✗
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {drivers.map((driver) => {
            const present = allDates.filter((dt) => driver.attendedDates.has(dt)).length;
            const absent = allDates.filter(
              (dt) => driver.plannedDates.has(dt) && !driver.attendedDates.has(dt),
            ).length;
            return (
              <tr
                key={driver.id}
                className="bg-white transition hover:bg-gray-50 dark:bg-transparent dark:hover:bg-white/[0.02]"
              >
                <td className="sticky right-0 z-10 bg-white px-3 py-2 dark:bg-gray-900">
                  <div className="flex items-center gap-2">
                    <CustomerAvatar name={driver.name} size="sm" shape="circle" />
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {driver.name}
                    </span>
                    {driver.warehouse && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
                        {driver.warehouse}
                      </span>
                    )}
                  </div>
                </td>
                {allDates.map((dt) => {
                  const row = driver.attendedDates.get(dt);
                  const isPlanned = driver.plannedDates.has(dt);
                  const isPresent = Boolean(row);
                  return (
                    <td key={dt} className="px-2 py-2 text-center">
                      {isPresent ? (
                        <span
                          className="inline-flex flex-col items-center gap-0.5"
                          title={row ? cairoFormatTime(row.attended_at) : ""}
                        >
                          <StatusDot present />
                          <span className="text-[9px] text-gray-500 dark:text-gray-400">
                            {row ? cairoFormatTime(row.attended_at) : ""}
                          </span>
                        </span>
                      ) : isPlanned ? (
                        <span className="text-rose-400" title="غائب">✗</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center">
                  <span className="font-bold text-emerald-600">{present}</span>
                </td>
                <td className="px-2 py-2 text-center">
                  {absent > 0 ? (
                    <span className="font-bold text-rose-500">{absent}</span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
              </tr>
            );
          })}
          <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold dark:border-gray-600 dark:bg-gray-800/60">
            <td className="px-3 py-2 text-right text-[11px] text-gray-500 dark:text-gray-400">
              الإجمالي
            </td>
            {allDates.map((dt) => (
              <td key={dt} className="px-2 py-2 text-center text-[11px] text-gray-700 dark:text-gray-200">
                {dayTotals.get(dt) ?? 0}/{drivers.length}
              </td>
            ))}
            <td colSpan={2} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DailyLogView({
  drivers,
  allDates,
}: {
  drivers: DriverInfo[];
  allDates: string[];
}) {
  const dayGroups = useMemo(() => {
    const groups: Array<{ date: string; entries: Array<{ driver: DriverInfo; row: AttendanceRow }> }> = [];
    for (const dt of allDates) {
      const entries: Array<{ driver: DriverInfo; row: AttendanceRow }> = [];
      for (const d of drivers) {
        const row = d.attendedDates.get(dt);
        if (row) entries.push({ driver: d, row });
      }
      if (entries.length > 0) {
        entries.sort((a, b) => a.row.attended_at.localeCompare(b.row.attended_at));
        groups.push({ date: dt, entries });
      }
    }
    return groups;
  }, [drivers, allDates]);

  const today = cairoNow();

  return (
    <div className="space-y-3">
      {dayGroups.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          لا توجد سجلات حضور في هذه الفترة
        </p>
      ) : (
        dayGroups.map(({ date, entries }) => (
          <div
            key={date}
            className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
          >
            <div
              className={`flex items-center justify-between px-4 py-2.5 text-sm font-bold ${
                date === today
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                  : "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              <span>
                {dayOfWeek(date)} — {date}
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {entries.length} حاضر
              </span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-right text-[11px] font-semibold text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-4 py-2">السائق</th>
                  <th className="px-4 py-2">الحضور</th>
                  <th className="px-4 py-2">المخزن</th>
                  <th className="px-4 py-2">الملاحظة</th>
                  <th className="px-4 py-2">الإحداثيات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {entries.map(({ driver, row }) => (
                  <tr
                    key={`${driver.id}-${date}`}
                    className="bg-white transition hover:bg-gray-50 dark:bg-transparent dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <CustomerAvatar name={driver.name} size="sm" shape="circle" />
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {driver.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                      {cairoFormatTime(row.attended_at)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                      {normalizeWarehouse(row.warehouse_name)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                      {row.note || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500">
                      {row.location_lat && row.location_lng
                        ? `${row.location_lat.toFixed(4)}, ${row.location_lng.toFixed(4)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
