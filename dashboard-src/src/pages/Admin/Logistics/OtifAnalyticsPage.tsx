import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageMeta from "../../../components/common/PageMeta";
import DateRangePicker from "../../../components/form/date-range-picker";
import {
  FIRST_FULL_LINE_SYNC,
  OTIF_STATE_COLORS,
  OTIF_STATE_LABELS,
  coverageWarning,
  fetchOtifAnalytics,
  toExclusiveEnd,
} from "../../../lib/otif";
import type { OtifAnalyticsResult, OtifFilterOption, OtifState } from "../../../lib/otif";
import type { DateRangeValue } from "../../../lib/date-range";

const PAGE_SIZE = 50;
const CARD = "rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 dark:bg-white/[0.04] dark:ring-white/[0.06]";
const UNKNOWN = "(غير معروف)";

const SELECT_CLS =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-white/[0.04] dark:text-gray-200";

/**
 * Options come from the RPC's all-time universe (filter_options), NOT from the
 * current window's breakdown, so a dropdown can never collapse to empty just
 * because another filter is active. The number beside each value is therefore
 * an ALL-TIME shipment count: picking a value that has no shipments in the
 * selected range is expected to return zero rows.
 */
function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  options: OtifFilterOption[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLS}>
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.value} ({o.shipments.toLocaleString("en-US")})
        </option>
      ))}
    </select>
  );
}

function startOfDayIso(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function endOfDayIso(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}
function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDay(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}
function fmtNum(v: number) {
  return v.toLocaleString("en-US");
}
function fmtHours(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "أسبق بـ" : "متأخر بـ";
  if (abs < 1) return `${sign} ${Math.round(abs * 60)} دقيقة`;
  if (abs < 48) return `${sign} ${abs.toFixed(1)} ساعة`;
  return `${sign} ${(abs / 24).toFixed(1)} يوم`;
}

function DeltaBadge({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null) {
    return <span className="text-xs text-gray-400">لا توجد مقارنة</span>;
  }
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) {
    return <span className="text-xs font-semibold text-gray-500">ثابت</span>;
  }
  const up = diff > 0;
  return (
    <span className={`text-xs font-bold ${up ? "text-emerald-600" : "text-red-600"}`}>
      {up ? "▲" : "▼"} {Math.abs(diff).toFixed(1)} نقطة
    </span>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  previous,
  hint,
  accent,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  previous: number | null;
  hint?: string;
  accent: string;
}) {
  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accent }} />
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-black text-gray-900 dark:text-white">
          {value === null ? "—" : value.toFixed(1)}
        </span>
        {suffix ? <span className="text-sm text-gray-500">{suffix}</span> : null}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <DeltaBadge current={value} previous={previous} />
        {hint ? <span className="text-xs text-gray-400">{hint}</span> : null}
      </div>
    </div>
  );
}

export default function OtifAnalyticsPage() {
  const today = useMemo(() => new Date(), []);
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    return d;
  }, [today]);

  const [range, setRange] = useState<DateRangeValue>([thirtyDaysAgo, today]);
  const [warehouse, setWarehouse] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [driver, setDriver] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const queryArgs = useMemo(() => {
    const [start, end] = range;
    if (!start || !end) return null;
    return {
      from: startOfDayIso(start),
      to: toExclusiveEnd(endOfDayIso(end)),
      warehouse: warehouse || null,
      governorate: governorate || null,
      driver: driver || null,
      salesperson: salesperson || null,
      state: state || null,
      search: search.trim() || null,
    };
  }, [range, warehouse, governorate, driver, salesperson, state, search]);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["otif-analytics", queryArgs, page],
    queryFn: () =>
      fetchOtifAnalytics({
        ...(queryArgs as NonNullable<typeof queryArgs>),
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    enabled: !!queryArgs,
    placeholderData: (prev) => prev,
  });

  const result: OtifAnalyticsResult | undefined = data;
  const k = result?.kpis;
  const warning = result ? coverageWarning(result) : null;
  const totalPages = result ? Math.max(1, Math.ceil(result.rows_total / PAGE_SIZE)) : 1;

  // A previous period with almost no verifiable shipments produces a rate that
  // would swing wildly off a handful of rows, so the comparison is suppressed.
  const prevComparable = (k?.prev_verifiable ?? 0) >= 50;

  const stateChart = useMemo(() => {
    if (!result) return [];
    const total = result.by_state.reduce((sum, s) => sum + s.count, 0) || 1;
    return result.by_state
      .map((s) => ({
        state: s.state,
        name: OTIF_STATE_LABELS[s.state] ?? s.state,
        count: s.count,
        share: (s.count / total) * 100,
        fill: OTIF_STATE_COLORS[s.state] ?? "#9ca3af",
      }))
      // biggest slice first so the labels never collide on the thin wedges
      .sort((a, b) => b.count - a.count);
  }, [result]);

  const onSliceClick = (nextState: string) => {
    setState((prev) => (prev === nextState ? "" : nextState));
    setPage(0);
  };

  const trendChart = useMemo(() => {
    if (!result) return [];
    return result.trend.map((p) => ({
      day: p.day,
      label: fmtDay(p.day),
      "نسبة OTIF": p.otif_rate ?? 0,
      "في الموعد": p.on_time,
      "كامل": p.in_full,
    }));
  }, [result]);

  const resetFilters = () => {
    setWarehouse("");
    setGovernorate("");
    setDriver("");
    setSalesperson("");
    setState("");
    setSearch("");
    setPage(0);
  };

  const hasFilters = !!(warehouse || governorate || driver || salesperson || state || search.trim());

  return (
    <div className="min-h-screen bg-gray-50/50 pb-10 dark:bg-gray-950" dir="rtl">
      <PageMeta title="تحليل OTIF" description="معدل التسليم في الموعد وبالكامل" />

      <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
        {/* Header */}
        <div className={`${CARD} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white">تحليل OTIF</h1>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                نسبة الشحنات التي تم التسليم فيها في الموعد المحدد وبالكامل — المصدر: شحنات التوصيل
                الفعلية
              </p>
            </div>
            <DateRangePicker value={range} onChange={(next) => { setRange(next); setPage(0); }} />
          </div>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="بحث: شحنة / طلب / عميل / سائق"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-white/[0.04] dark:text-gray-200"
            />
            <select
              value={state}
              onChange={(e) => { setState(e.target.value); setPage(0); }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-white/[0.04] dark:text-gray-200"
            >
              <option value="">كل الحالات</option>
              {(Object.keys(OTIF_STATE_LABELS) as OtifState[]).map((s) => (
                <option key={s} value={s}>{OTIF_STATE_LABELS[s]}</option>
              ))}
            </select>
            <FilterSelect
              value={driver}
              onChange={(v) => { setDriver(v); setPage(0); }}
              allLabel="كل السواقين"
              options={result?.filter_options.drivers ?? []}
            />
            <FilterSelect
              value={salesperson}
              onChange={(v) => { setSalesperson(v); setPage(0); }}
              allLabel="كل تيم البيع"
              options={result?.filter_options.salespersons ?? []}
            />
            <FilterSelect
              value={governorate}
              onChange={(v) => { setGovernorate(v); setPage(0); }}
              allLabel="كل المحافظات"
              options={result?.filter_options.governorates ?? []}
            />
            <FilterSelect
              value={warehouse}
              onChange={(v) => { setWarehouse(v); setPage(0); }}
              allLabel="كل المستودعات"
              options={result?.filter_options.warehouses ?? []}
            />
            <button
              onClick={resetFilters}
              disabled={!hasFilters}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
            >
              مسح الفلاتر
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
            الأرقام بجوار كل خيار في فلاتر السواقين/تيم البيع/المحافظات/المستودعات هي عدد الشحنات
            <span className="font-semibold"> على مدار كل الفترات </span>
            وليست في الفترة المختارة — عشان كده الفلتر ما بيختفيش لما تختار فلتر تاني. لو اخترت
            اسم مش موجود في فترتك، هتطلع نتيجة فاضية وده طبيعي.
          </p>
        </div>

        {/* Coverage warning */}
        {warning ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
            <div className="font-bold">تنبيه جودة البيانات</div>
            <div className="mt-1">{warning} الشحنات بلا أصناف لا يمكن التحقق من اكتمالها، وقد بدأ
              مزامنة الأصناف التفصيلية بشكل كامل اعتباراً من {FIRST_FULL_LINE_SYNC}.</div>
          </div>
        ) : null}

        {error ? (
          <div className={`${CARD} p-6 text-sm text-red-600`}>تعذّر تحميل البيانات: {String(error)}</div>
        ) : null}

        {isLoading ? (
          <div className={`${CARD} p-10 text-center text-sm text-gray-400`}>جارٍ التحميل…</div>
        ) : null}

        {result && k ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="OTIF — في الموعد وبالكامل"
                value={k.otif_rate}
                suffix="%"
                previous={prevComparable ? k.prev_otif_rate : null}
                hint={`${fmtNum(k.otif)} من ${fmtNum(k.verifiable)}`}
                accent="#10b981"
              />
              <KpiCard
                label="In Full — تم التسليم بالكامل"
                value={k.in_full_rate}
                suffix="%"
                previous={prevComparable ? k.prev_in_full_rate : null}
                hint={`${fmtNum(k.in_full)} من ${fmtNum(k.verifiable)}`}
                accent="#f59e0b"
              />
              <KpiCard
                label="On Time — في الموعد"
                value={k.on_time_rate}
                suffix="%"
                previous={prevComparable ? k.prev_on_time_rate : null}
                hint={`${fmtNum(k.on_time)} من ${fmtNum(k.delivered)}`}
                accent="#3b82f6"
              />
              <div className={`${CARD} p-5`}>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-purple-500" />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    شحنات مسلّمة في الفترة
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900 dark:text-white">
                    {fmtNum(k.delivered)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  متوسط التأخير {fmtHours(k.avg_delay_h)}
                </div>
              </div>
            </div>

            {/* Data quality strip */}
            <div className={`${CARD} p-5`}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  جودة البيانات في الفترة
                </h2>
                {isFetching ? <span className="text-xs text-gray-400">جارٍ التحديث…</span> : null}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]">
                  <div className="text-xs text-gray-500">بلا أصناف (غير قابل للتحقق)</div>
                  <div className="mt-1 text-lg font-black text-gray-900 dark:text-white">
                    {fmtNum(result.quality.unverifiable)}
                    <span className="ml-1 text-xs font-bold text-gray-400">
                      ({result.quality.unverifiable_pct}%)
                    </span>
                  </div>
                </div>
                <div
                  className={
                    result.quality.no_driver_pct >= 50
                      ? "rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200 dark:bg-amber-900/15 dark:ring-amber-700/40"
                      : "rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]"
                  }
                >
                  <div className="text-xs text-gray-500">بلا سائق مسجّل</div>
                  <div className="mt-1 text-lg font-black text-gray-900 dark:text-white">
                    {fmtNum(result.quality.no_driver)}
                    <span className="ml-1 text-xs font-bold text-gray-400">
                      ({result.quality.no_driver_pct}%)
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]">
                  <div className="text-xs text-gray-500">بلا محافظة</div>
                  <div className="mt-1 text-lg font-black text-gray-900 dark:text-white">
                    {fmtNum(result.quality.no_governorate)}
                    <span className="ml-1 text-xs font-bold text-gray-400">
                      ({result.quality.no_governorate_pct}%)
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]">
                  <div className="text-xs text-gray-500">بلا مندوب بيع</div>
                  <div className="mt-1 text-lg font-black text-gray-900 dark:text-white">
                    {fmtNum(result.quality.no_salesperson)}
                    <span className="ml-1 text-xs font-bold text-gray-400">
                      ({result.quality.no_salesperson_pct}%)
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]">
                  <div className="text-xs text-gray-500">متوسط تأخير المتأخرين</div>
                  <div className="mt-1 text-lg font-black text-gray-900 dark:text-white">
                    {k.avg_late_h !== null ? `${k.avg_late_h.toFixed(1)} س` : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className={`${CARD} p-5 lg:col-span-2`}>
                <h2 className="mb-3 text-sm font-bold text-gray-800 dark:text-gray-100">
                  اتجاه نسبة OTIF ونسبة التسليم
                </h2>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChart} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="otifGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 8 }}
                        labelStyle={{ fontWeight: 700 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area
                        type="monotone"
                        dataKey="نسبة OTIF"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#otifGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`${CARD} p-5`}>
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                    توزيع حالات التسليم
                  </h2>
                  {state ? (
                    <button
                      onClick={() => { setState(""); setPage(0); }}
                      className="rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                    >
                      عرض الكل
                    </button>
                  ) : (
                    <span className="text-[11px] text-gray-400">اضغط على أي شريحة لعرض تفاصيلها</span>
                  )}
                </div>

                {stateChart.length > 0 ? (
                  <div className="h-[280px]" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stateChart}
                          dataKey="count"
                          nameKey="name"
                          innerRadius={58}
                          outerRadius={98}
                          paddingAngle={2}
                          stroke="#fff"
                          strokeWidth={2}
                          onClick={(entry: unknown) => {
                            const e = entry as { state?: string };
                            if (e?.state) onSliceClick(e.state);
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          {stateChart.map((entry) => (
                            <Cell
                              key={entry.state}
                              fill={entry.fill}
                              opacity={state && state !== entry.state ? 0.28 : 1}
                              className="transition-opacity duration-200"
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 8 }}
                          formatter={(value, name) => [`${value ?? 0} شحنة`, String(name)]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
                    لا توجد حالات
                  </div>
                )}

                {/* Counted legend: doubles as the click target for small wedges */}
                <div className="mt-1 space-y-1.5">
                  {stateChart.map((entry) => {
                    const active = state === entry.state;
                    const dimmed = !!state && !active;
                    return (
                      <button
                        key={entry.state}
                        onClick={() => onSliceClick(entry.state)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-right transition ${
                          active
                            ? "bg-emerald-50 ring-1 ring-emerald-300 dark:bg-emerald-900/25 dark:ring-emerald-700"
                            : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                        } ${dimmed ? "opacity-45" : ""}`}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: entry.fill }}
                        />
                        <span className="flex-1 truncate text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {entry.name}
                        </span>
                        <span className="text-xs font-black text-gray-900 dark:text-white">
                          {fmtNum(entry.count)}
                        </span>
                        <span className="w-12 text-left text-[11px] text-gray-500">
                          {entry.share.toFixed(1)}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Breakdowns */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <BreakdownTable
                title="أداء السواقين"
                rows={result.by_driver}
                nameKey="driver"
                onPick={(v) => { setDriver(v === driver ? "" : v); setPage(0); }}
                activeValue={driver}
                showDelay
                note={(() => {
                  const missing = result.quality.no_driver_pct;
                  if (missing < 50) return undefined;
                  return `سائق مسجّل لـ ${(100 - missing).toFixed(1)}% فقط من الشحنات و${missing}% بدون سائق. ربط السائق بالشحنة عبر الـdispatch plan ميزة حديثة، فالتغطية تاريخياً ضعيفة (يونيو 0%، يوليو 15%) — اقرأ تحليل السائقين على الفترات الحديثة فقط.${result.quality.co_driver_shipments > 0 ? ` يوجد ${fmtNum(result.quality.co_driver_shipments)} شحنة بسائق مشارك، والمشارك بيحسب في الفلتر بس مش في الأرقام عشان ما تتضاعفش الشحنات.` : ""}`;
                })()}
              />
              <BreakdownTable
                title="أداء المحافظات"
                rows={result.by_governorate}
                nameKey="governorate"
                onPick={(v) => { setGovernorate(v === governorate ? "" : v); setPage(0); }}
                activeValue={governorate}
              />
              <BreakdownTable
                title="أداء المستودعات"
                rows={result.by_warehouse}
                nameKey="warehouse"
                onPick={(v) => { setWarehouse(v === warehouse ? "" : v); setPage(0); }}
                activeValue={warehouse}
              />
              <BreakdownTable
                title="أعلى العملاء"
                rows={result.by_customer}
                nameKey="customer"
                onPick={() => {}}
                activeValue=""
              />
              <BreakdownTable
                title="أداء تيم البيع"
                rows={result.by_salesperson}
                nameKey="salesperson"
                onPick={(v) => { setSalesperson(v === salesperson ? "" : v); setPage(0); }}
                activeValue={salesperson}
                note={(() => {
                  const missing = result.quality.no_salesperson_pct;
                  if (missing >= 50) {
                    return `مربوط ${(100 - missing).toFixed(1)}% فقط من الشحنات — ${missing}% بدون مندوب بيع. راجع التغطية قبل اتخاذ قرار.`;
                  }
                  if (missing > 0) {
                    return `مربوط ${(100 - missing).toFixed(1)}% من الشحنات. المصدر: حقل مندوب البيع في Odao عبر أمر البيع (مش عبر العميل).`;
                  }
                  return "التغطية كاملة — كل الشحنات مرتبطة بمندوب بيع.";
                })()}
              />
            </div>

            {/* Detail table */}
            <div className={`${CARD} overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  تفاصيل الشحنات
                </h2>
                <span className="text-xs text-gray-500">
                  {fmtNum(result.rows_total)} شحنة
                  {search.trim() ? ` (مفلترة بالبحث)` : ""}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600 dark:border-gray-700">
                      <th className="px-4 py-3 font-semibold">الحالة</th>
                      <th className="px-4 py-3 font-semibold">الشحنة</th>
                      <th className="px-4 py-3 font-semibold">الطلب</th>
                      <th className="px-4 py-3 font-semibold">العميل</th>
                      <th className="px-4 py-3 font-semibold">المحافظة</th>
                      <th className="px-4 py-3 font-semibold">السائق</th>
                      <th className="px-4 py-3 font-semibold">مندوب البيع</th>
                      <th className="px-4 py-3 font-semibold">الموعد</th>
                      <th className="px-4 py-3 font-semibold">التسليم</th>
                      <th className="px-4 py-3 font-semibold">الفارق</th>
                      <th className="px-4 py-3 font-semibold">السطور</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row) => {
                      const color = OTIF_STATE_COLORS[row.state] ?? "#9ca3af";
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-2.5">
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold"
                              style={{ background: `${color}22`, color }}
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                              {OTIF_STATE_LABELS[row.state] ?? row.state}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-gray-700 dark:text-gray-300">
                            {row.shipment_reference ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-400">
                            {row.odoo_order_name ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                            {row.customer_name}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                            {row.governorate ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                            {row.driver === UNKNOWN ? <span className="text-gray-300">—</span> : row.driver}
                            {row.co_drivers > 0 ? (
                              <div
                                className="mt-0.5 text-[11px] leading-tight text-gray-400"
                                title={`سائق مشارك: ${row.driver_names.slice(1).join("، ")}`}
                              >
                                + {row.co_drivers} مشارك
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                            {row.salesperson ?? <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                            {fmtDateTime(row.scheduled_at)}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                            {fmtDateTime(row.completed_at)}
                          </td>
                          <td
                            className={`px-4 py-2.5 font-bold ${
                              row.delay_h <= 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {fmtHours(row.delay_h)}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                            {row.verifiable
                              ? `${row.active_lines - row.short_lines}/${row.active_lines} سطر`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {result.rows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                          لا توجد شحنات مطابقة
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-gray-700">
                <span className="text-xs text-gray-500">
                  صفحة {page + 1} من {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                  >
                    السابق
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page + 1 >= totalPages}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                  >
                    التالي
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  nameKey,
  onPick,
  activeValue,
  showDelay = false,
  note,
}: {
  title: string;
  rows: { driver?: string; governorate?: string; warehouse?: string; customer?: string;
          salesperson?: string;
          shipments: number; otif: number; in_full?: number; on_time?: number;
          verifiable: number; otif_rate: number | null; avg_delay_h?: number | null;
          is_test?: boolean }[];
  nameKey: "driver" | "governorate" | "warehouse" | "customer" | "salesperson";
  onPick: (value: string) => void;
  activeValue: string;
  showDelay?: boolean;
  note?: string;
}) {
  const [sortKey, setSortKey] = useState<"shipments" | "otif_rate" | "avg_delay_h">("shipments");

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      if (sortKey === "avg_delay_h") {
        return (b.avg_delay_h ?? -9999) - (a.avg_delay_h ?? -9999);
      }
      const av = (a[sortKey] ?? 0) as number;
      const bv = (b[sortKey] ?? 0) as number;
      return bv - av;
    });
    return copy;
  }, [rows, sortKey]);

  const nameOf = (row: Record<string, unknown>) => String(row[nameKey] ?? UNKNOWN);

  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</h2>
        <div className="flex gap-1">
          <SortBtn label="الشحنات" active={sortKey === "shipments"} onClick={() => setSortKey("shipments")} />
          <SortBtn label="OTIF" active={sortKey === "otif_rate"} onClick={() => setSortKey("otif_rate")} />
          {showDelay ? (
            <SortBtn label="التأخير" active={sortKey === "avg_delay_h"} onClick={() => setSortKey("avg_delay_h")} />
          ) : null}
        </div>
      </div>
      {note ? (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-[11px] text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300">
          {note}
        </div>
      ) : null}
      <div className="max-h-[320px] overflow-auto">
        <table className="w-full text-right text-xs">
          <thead className="sticky top-0 bg-white dark:bg-gray-900">
            <tr className="border-b border-gray-200 text-gray-600 dark:border-gray-700">
              <th className="px-4 py-2.5 font-semibold">الاسم</th>
              <th className="px-4 py-2.5 font-semibold">الشحنات</th>
              <th className="px-4 py-2.5 font-semibold">OTIF</th>
              {showDelay ? <th className="px-4 py-2.5 font-semibold">متوسط الفارق</th> : null}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const name = nameOf(row as unknown as Record<string, unknown>);
              const isActive = name === activeValue;
              return (
                <tr
                  key={name}
                  onClick={() => onPick(name)}
                  className={`cursor-pointer border-b border-gray-100 transition dark:border-gray-800 ${
                    isActive ? "bg-emerald-50 dark:bg-emerald-900/20" : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                    {name === UNKNOWN ? <span className="text-gray-300">غير محدد</span> : name}
                    {row.is_test ? (
                      <span className="mr-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                        بيانات تجريبية
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    {fmtNum(row.shipments)}
                    {row.verifiable < row.shipments ? (
                      <span className="mr-1 text-[10px] text-gray-400">
                        ({fmtNum(row.verifiable)} قابل للتحقق)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(100, row.otif_rate ?? 0)}%` }}
                        />
                      </div>
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        {row.otif_rate === null ? "—" : `${row.otif_rate.toFixed(1)}%`}
                      </span>
                    </div>
                  </td>
                  {showDelay ? (
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                      {fmtHours(row.avg_delay_h)}
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={showDelay ? 4 : 3} className="px-4 py-8 text-center text-gray-400">
                  لا توجد بيانات
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
        active
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]"
      }`}
    >
      {label}
    </button>
  );
}
