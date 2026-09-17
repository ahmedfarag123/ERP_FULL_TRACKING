import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import PageMeta from "../../../components/common/PageMeta";
import DateRangePicker from "../../../components/form/date-range-picker";
import { fetchDeliveryAnalytics } from "../../../lib/logistics-admin";
import type { DeliveryShipmentRow } from "../../../lib/logistics-admin";
import type { DateRangeValue } from "../../../lib/date-range";

const STATUS_COLORS: Record<string, string> = {
  PENDING_ASSIGN: "#9ca3af",
  ASSIGNED: "#f59e0b",
  CHECK_IN: "#3b82f6",
  PICKUP: "#8b5cf6",
  OUT_FOR_DELIVERY: "#06b6d4",
  ARRIVED: "#14b8a6",
  DELIVERED: "#10b981",
  FINISHED: "#22c55e",
  SETTLED: "#16a34a",
  CANCELLED: "#dc2626",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_ASSIGN: "بانتظار التخصيص",
  ASSIGNED: "تم التخصيص",
  CHECK_IN: "تسجيل الدخول",
  PICKUP: "استلام الطلب",
  OUT_FOR_DELIVERY: "في الطريق",
  ARRIVED: "وصل للمكان",
  DELIVERED: "تم التسليم",
  FINISHED: "انتهت",
  SETTLED: "تم التسوية",
  CANCELLED: "ملغاة",
};

const PAYMENT_COLORS: Record<string, string> = {
  cash: "#10b981",
  credit: "#f59e0b",
  cheque: "#8b5cf6",
  bank_transfer: "#3b82f6",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "نقدي",
  credit: "آجل / أقساط",
  cheque: "شيك",
  bank_transfer: "تحويل بنكي",
};

function rangeToISO(range: DateRangeValue) {
  const now = new Date();
  const start = range[0] ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const end = range[1] ?? now;
  return {
    startISO: new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0).toISOString(),
    endISO: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).toISOString(),
  };
}

function getQuickRangeISO(preset: string) {
  const now = new Date();
  switch (preset) {
    case "7d": {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      return { startISO: s.toISOString(), endISO: now.toISOString() };
    }
    case "30d": {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      return { startISO: s.toISOString(), endISO: now.toISOString() };
    }
    default:
      return { startISO: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(), endISO: now.toISOString() };
  }
}

function KpiCard({ title, value, subtitle, delay, color = "text-blue-300", onClick }: {
  title: string;
  value: string | number;
  subtitle: string;
  delay: number;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      onClick={onClick}
      className={`flex-1 min-w-[180px] rounded-2xl bg-[#0f172a] p-6 text-right text-white shadow-lg ${
        onClick ? "cursor-pointer transition hover:-translate-y-0.5 hover:bg-[#16213d] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/60" : ""
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-blue-200">{title}</p>
      <p className={`mt-3 text-4xl font-extrabold ${color}`}>{value}</p>
      <p className="mt-2 text-sm text-blue-100">{subtitle}</p>
    </motion.button>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200/60 dark:bg-white/[0.04] dark:ring-white/[0.06]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white" dir="rtl">{title}</h3>
        {subtitle && <span className="text-xs text-gray-400" dir="rtl">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(value) + " ج.م";
}

function statusColor(status: string) {
  if (status === "DELIVERED" || status === "SETTLED" || status === "FINISHED") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (status === "CANCELLED") return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
  if (status === "PENDING_ASSIGN" || status === "ASSIGNED" || status === "OUT_FOR_DELIVERY") return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400";
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function DeliveryDetailPanel({ title, summary, rows, onClose }: {
  title: string;
  summary: string;
  rows: DeliveryShipmentRow[];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 dark:bg-white/[0.04] dark:ring-white/[0.06]"
      dir="rtl"
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400" dir="ltr">{summary}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          إغلاق
        </button>
      </div>
      <div className="max-h-[420px] overflow-auto p-4">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">لا توجد شحنات</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-right text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <th className="px-3 py-2">الشحنة</th>
                <th className="px-3 py-2">العميل</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">السائق</th>
                <th className="px-3 py-2">التاريخ</th>
                <th className="px-3 py-2">قيمة (COD)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]">
                  <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200" dir="ltr">{r.reference}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.customerName ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(r.status)}`}>
                      {r.isReturn ? "مرتجع" : STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{r.driver}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400" dir="ltr">{r.date}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.cod ? formatMoney(r.cod) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}

export default function DeliveryAnalyticsPage() {
  const [range, setRange] = useState<DateRangeValue>([
    new Date(Date.now() - 6 * 86400000),
    new Date(),
  ]);
  const [quickRange, setQuickRange] = useState<string>("7d");
  const [detail, setDetail] = useState<{ title: string; summary: string; rows: DeliveryShipmentRow[] } | null>(null);

  const { startISO, endISO } = rangeToISO(range);

  const { data, isLoading } = useQuery({
    queryKey: ["delivery-analytics", startISO, endISO],
    queryFn: () => fetchDeliveryAnalytics([new Date(startISO), new Date(endISO)]),
    staleTime: 60_000,
  });

  const summary = data?.summary;
  const dailyTrend = data?.dailyTrend ?? [];
  const days = data?.days ?? [];
  const statusDistribution = data?.statusDistribution ?? [];
  const paymentMethods = data?.paymentMethods ?? [];
  const drivers = data?.drivers ?? [];
  const rows = data?.shipmentRows ?? [];

  const isDeliveredRow = (r: DeliveryShipmentRow) => (r.status === "DELIVERED" || r.status === "SETTLED") && !r.isReturn;
  const isReturnRow = (r: DeliveryShipmentRow) => r.isReturn;
  const isOpenRow = (r: DeliveryShipmentRow) => !r.isReturn && !["DELIVERED", "SETTLED", "CANCELLED", "FAILED", "ATTEMPTED"].includes(r.status);

  function openDetail(title: string, filtered: DeliveryShipmentRow[]) {
    if (detail && detail.title === title && detail.rows.length === filtered.length) {
      setDetail(null);
      return;
    }
    setDetail({
      title,
      summary: `${filtered.length} شحنة`,
      rows: filtered,
    });
  }

  function openKpi(key: string) {
    let filtered = rows;
    let title = "كل الشحنات";
    if (key === "delivered") { filtered = rows.filter(isDeliveredRow); title = "شحنات تم تسليمها"; }
    if (key === "returned") { filtered = rows.filter(isReturnRow); title = "شحنات مرتجعة"; }
    if (key === "cancelled") { filtered = rows.filter((r) => r.status === "CANCELLED"); title = "شحنات ملغاة"; }
    if (key === "open") { filtered = rows.filter(isOpenRow); title = "شحنات قيد التنفيذ"; }
    if (key === "successRate") { filtered = rows.filter(isDeliveredRow); title = "شحنات تم تسليمها"; }
    if (key === "codExpected" || key === "codCollected") { filtered = rows.filter((r) => r.cod > 0); title = "شحنات بقيمة COD"; }
    openDetail(title, filtered);
  }

  function openStatus(key: string, label: string) {
    const filtered = rows.filter((r) => r.status === key);
    openDetail(`الحالة: ${label}`, filtered);
  }

  function openPayment(key: string, label: string) {
    const filtered = rows.filter((r) => r.paymentMethod === key);
    openDetail(`طريقة الدفع: ${label}`, filtered);
  }

  function openDriver(name: string) {
    openDetail(`أداء السائق: ${name}`, rows.filter((r) => r.driver === name));
  }

  function openDriverDay(name: string, day: string) {
    const filtered = rows.filter((r) => r.driver === name && r.date === day && !r.isReturn && (r.status === "DELIVERED" || r.status === "SETTLED"));
    openDetail(`${name} — توصيل ${day}`, filtered);
  }

  const statusChartData = statusDistribution.map((s) => ({
    name: STATUS_LABEL[s.key] ?? s.label,
    value: s.value,
    color: STATUS_COLORS[s.key] || "#9ca3af",
    key: s.key,
  }));
  const statusChartTotal = statusChartData.reduce((s, d) => s + d.value, 0);

  const paymentChartData = paymentMethods.map((p) => ({
    name: PAYMENT_LABEL[p.key] ?? p.label,
    value: p.value,
    color: PAYMENT_COLORS[p.key] || "#9ca3af",
    key: p.key,
  }));
  const paymentChartTotal = paymentChartData.reduce((s, d) => s + d.value, 0);

  const rangeLabel = quickRange === "7d" ? "آخر أسبوع" : quickRange === "30d" ? "آخر 30 يوم" : "الفترة المحددة";

  const dayLabels: Record<string, string> = {
    "0": "الأحد", "1": "الاثنين", "2": "الثلاثاء", "3": "الأربعاء", "4": "الخميس", "5": "الجمعة", "6": "السبت",
  };
  function dayName(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const weekday = dayLabels[String(d.getDay())] ?? "";
    return `${weekday} ${d.getDate()}/${d.getMonth() + 1}`;
  }
  const dayTotals = days.map((d) => drivers.reduce((s, dr) => s + (dr.daily[d] ?? 0), 0));

  return (
    <>
      <PageMeta title="تحليلات التوصيل | اللوجستيات" description="تقرير أداء التوصيل" />

      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950" dir="rtl">
        <div className="mx-auto max-w-[1400px] p-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c2a1c] via-[#0f3a28] to-[#14532d] shadow-2xl">

            {/* Header */}
            <div className="relative px-8 pt-8 pb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                  <span className="text-lg font-bold text-white">H</span>
                </div>
                <span className="text-sm font-semibold text-emerald-200">Horeca Smart</span>
              </div>

              <div className="text-center">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">تقرير أداء التوصيل</h1>
                <p className="mt-1 text-sm text-emerald-200">اضغط على أي رقم أو مربع لعرض تفاصيل الشحنات</p>
              </div>

              <div className="mt-5 flex items-center justify-center gap-3" dir="ltr">
                <div className="flex gap-1 rounded-xl bg-white/10 p-1 backdrop-blur-sm">
                  {[{ label: "٧ أيام", value: "7d" }, { label: "٣٠ يوم", value: "30d" }].map((qr) => (
                    <button
                      key={qr.value}
                      type="button"
                      onClick={() => {
                        setQuickRange(qr.value);
                        const iso = getQuickRangeISO(qr.value);
                        setRange([new Date(iso.startISO), new Date(iso.endISO)]);
                      }}
                      className={`rounded-lg px-4 py-1.5 text-xs font-medium transition ${
                        quickRange === qr.value ? "bg-emerald-600 text-white shadow" : "text-emerald-200 hover:text-white"
                      }`}
                    >
                      {qr.label}
                    </button>
                  ))}
                </div>
                <DateRangePicker
                  value={range}
                  onChange={(v) => { setRange(v); setQuickRange(""); }}
                />
              </div>
            </div>

            {/* KPI Cards */}
            <div className="px-8 pb-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="إجمالي الشحنات" value={isLoading ? "—" : summary?.totalShipments ?? 0} subtitle={`${rangeLabel} · اضغط للتفاصيل`} delay={0} onClick={() => openKpi("total")} />
                <KpiCard title="تم التوصيل" value={isLoading ? "—" : summary?.delivered ?? 0} subtitle={summary ? `${summary.successRate}% من كل الشحنات` : ""} delay={0.05} color="text-emerald-400" onClick={() => openKpi("delivered")} />
                <KpiCard title="مرتجع" value={isLoading ? "—" : summary?.returned ?? 0} subtitle="شحنات مرتجعة" delay={0.1} color="text-amber-400" onClick={() => openKpi("returned")} />
                <KpiCard title="ملغاة" value={isLoading ? "—" : summary?.cancelled ?? 0} subtitle="شحنات ملغاة" delay={0.15} color="text-rose-400" onClick={() => openKpi("cancelled")} />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="قيد التنفيذ" value={isLoading ? "—" : summary?.open ?? 0} subtitle="مجدولة في الفترة ولم تُغلق" delay={0.2} color="text-sky-400" onClick={() => openKpi("open")} />
                <KpiCard title="نسبة النجاح" value={isLoading ? "—" : `${summary?.successRate ?? 0}%`} subtitle="مُسلّم ÷ كل الشحنات" delay={0.25} color="text-emerald-400" onClick={() => openKpi("successRate")} />
                <KpiCard title="المتوقع تحصيله (COD)" value={isLoading ? "—" : (summary ? formatMoney(summary.codExpected) : "0 ج.م")} subtitle="قيمة الشحنات النقدية" delay={0.3} color="text-teal-400" onClick={() => openKpi("codExpected")} />
                <KpiCard title="المحصل" value={isLoading ? "—" : (summary ? formatMoney(summary.codCollected) : "0 ج.م")} subtitle={`المتبقي ${summary ? formatMoney(summary.underCollection) : "0 ج.م"}`} delay={0.35} color="text-amber-400" onClick={() => openKpi("codCollected")} />
              </div>
            </div>

            <div className="mx-8 border-t border-white/10" />

            {/* Charts */}
            <div className="px-8 py-6">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <ChartCard title="توزيع الشحنات حسب الحالة" subtitle="اضغط على الشرائح">
                  {statusChartData.length === 0 ? (
                    <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">لا توجد بيانات</div>
                  ) : (
                    <div className="flex items-center gap-5">
                      <div className="relative shrink-0" style={{ width: 160, height: 170 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={72}
                              paddingAngle={3}
                              dataKey="value"
                              strokeWidth={0}
                              onClick={(_data, index) => {
                                const entry = statusChartData[index];
                                if (entry) openStatus(entry.key, entry.name);
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              {statusChartData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0];
                                const val = Number(d.value ?? 0);
                                const pct = statusChartTotal > 0 ? Math.round((val / statusChartTotal) * 100) : 0;
                                return (
                                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900" dir="rtl">
                                    <p className="font-bold text-gray-900 dark:text-white">{d.name}</p>
                                    <p className="mt-0.5 text-gray-700 dark:text-gray-300">{val} شحنة ({pct}%)</p>
                                  </div>
                                );
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" dir="rtl">
                          <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{statusChartTotal}</span>
                          <span className="text-xs text-gray-500">شحنة</span>
                        </div>
                      </div>
                      <ul className="flex-1 space-y-2">
                        {statusChartData.map((entry) => (
                          <li key={entry.key}>
                            <button
                              type="button"
                              onClick={() => openStatus(entry.key, entry.name)}
                              className="flex w-full items-center gap-2 text-xs transition hover:opacity-80"
                              dir="rtl"
                            >
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.color }} />
                              <span className="flex-1 text-right text-gray-700 dark:text-gray-300">{entry.name}</span>
                              <span className="font-bold text-gray-900 dark:text-white">{entry.value}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="قيمة الشحنات حسب طريقة الدفع" subtitle="المتوقع (COD) · اضغط">
                  {paymentChartData.length === 0 ? (
                    <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">لا توجد بيانات</div>
                  ) : (
                    <div className="flex items-center gap-5">
                      <div className="relative shrink-0" style={{ width: 160, height: 170 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={paymentChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={72}
                              paddingAngle={3}
                              dataKey="value"
                              strokeWidth={0}
                              onClick={(_data, index) => {
                                const entry = paymentChartData[index];
                                if (entry) openPayment(entry.key, entry.name);
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              {paymentChartData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0];
                                const val = Number(d.value ?? 0);
                                const pct = paymentChartTotal > 0 ? Math.round((val / paymentChartTotal) * 100) : 0;
                                return (
                                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900" dir="rtl">
                                    <p className="font-bold text-gray-900 dark:text-white">{d.name}</p>
                                    <p className="mt-0.5 text-gray-700 dark:text-gray-300">{formatMoney(val)} ({pct}%)</p>
                                  </div>
                                );
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" dir="rtl">
                          <span className="text-lg font-extrabold text-gray-900 dark:text-white">{formatMoney(paymentChartTotal)}</span>
                          <span className="text-xs text-gray-500">ج.م</span>
                        </div>
                      </div>
                      <ul className="flex-1 space-y-2">
                        {paymentChartData.map((entry) => (
                          <li key={entry.key}>
                            <button
                              type="button"
                              onClick={() => openPayment(entry.key, entry.name)}
                              className="flex w-full items-center gap-2 text-xs transition hover:opacity-80"
                              dir="rtl"
                            >
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.color }} />
                              <span className="flex-1 text-right text-gray-700 dark:text-gray-300">{entry.name}</span>
                              <span className="font-bold text-gray-900 dark:text-white">{formatMoney(entry.value)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="تطور التوصيل اليومي" subtitle={rangeLabel}>
                  {dailyTrend.length === 0 ? (
                    <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">لا توجد بيانات</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={dailyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={55} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="delivered" name="تم التوصيل" fill="#10b981" stackId="a" />
                        <Bar dataKey="returned" name="مرتجع" fill="#f59e0b" stackId="a" />
                        <Bar dataKey="cancelled" name="ملغاة" fill="#dc2626" stackId="a" />
                        <Bar dataKey="open" name="قيد التنفيذ" fill="#94b8f7" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>

              {/* Driver Daily Matrix */}
              <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 dark:bg-white/[0.04] dark:ring-white/[0.06]">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white" dir="rtl">التوصيل اليومي لكل سائق</h3>
                  <p className="mt-0.5 text-xs text-gray-500" dir="rtl">اضغط على أي خلية لعرض شحنات السائق في هذا اليوم</p>
                </div>
                {drivers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">لا توجد بيانات</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-right text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                          <th className="sticky right-0 bg-white px-4 py-3 dark:bg-gray-900">السائق</th>
                          {days.map((d) => (
                            <th key={d} className="px-3 py-3 text-center" title={d}>
                              {dayName(d)}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-center text-emerald-600 dark:text-emerald-400">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drivers.map((d) => (
                          <tr key={d.name} className="border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]">
                            <td className="sticky right-0 bg-white px-4 py-2.5 font-medium text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                              <button type="button" onClick={() => openDriver(d.name)} className="text-right transition hover:text-emerald-600 dark:hover:text-emerald-400">
                                {d.name}
                              </button>
                            </td>
                            {days.map((day) => {
                              const val = d.daily[day] ?? 0;
                              return (
                                <td key={day} className="px-1 py-1 text-center">
                                  {val > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => openDriverDay(d.name, day)}
                                      className="inline-flex h-7 w-9 items-center justify-center rounded-lg text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                                    >
                                      {val}
                                    </button>
                                  ) : (
                                    <span className="inline-flex h-7 w-9 items-center justify-center rounded-lg text-xs text-gray-300 dark:text-gray-600">–</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-4 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">{d.delivered}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-bold text-gray-800 dark:bg-white/[0.03] dark:text-gray-200">
                          <td className="sticky right-0 bg-gray-50 px-4 py-2.5 dark:bg-gray-900">الإجمالي اليومي</td>
                          {dayTotals.map((t, i) => (
                            <td key={i} className="px-3 py-2.5 text-center text-emerald-700 dark:text-emerald-400">{t || ""}</td>
                          ))}
                          <td className="px-4 py-2.5 text-center text-emerald-700 dark:text-emerald-400">{drivers.reduce((s, d) => s + d.delivered, 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Driver Summary Table */}
              <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 dark:bg-white/[0.04] dark:ring-white/[0.06]">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white" dir="rtl">ملخص أداء السائقين</h3>
                  <p className="mt-0.5 text-xs text-gray-500" dir="rtl">اضغط على أي سائق لعرض كل شحناته خلال {rangeLabel} · نسبة النجاح = مُسلّم ÷ كل الشحنات</p>
                </div>
                {drivers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">لا توجد بيانات</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-right text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                          <th className="px-4 py-3">السائق</th>
                          <th className="px-4 py-3">الشحنات</th>
                          <th className="px-4 py-3">تم التوصيل</th>
                          <th className="px-4 py-3">مرتجع</th>
                          <th className="px-4 py-3">ملغاة</th>
                          <th className="px-4 py-3">قيد التنفيذ</th>
                          <th className="px-4 py-3">نسبة النجاح</th>
                          <th className="px-4 py-3">المتوقع تحصيله</th>
                          <th className="px-4 py-3">المحصل</th>
                          <th className="px-4 py-3">المتبقي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drivers.map((d) => (
                          <tr
                            key={d.name}
                            onClick={() => openDriver(d.name)}
                            className="cursor-pointer border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]"
                          >
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{d.name}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{d.shipments}</td>
                            <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{d.delivered}</td>
                            <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{d.returned}</td>
                            <td className="px-4 py-3 text-rose-600 dark:text-rose-400">{d.cancelled}</td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{d.open}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                d.successRate >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : d.successRate >= 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                              }`}>
                                {d.successRate}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatMoney(d.codExpected)}</td>
                            <td className="px-4 py-3 font-semibold text-teal-600 dark:text-teal-400">{formatMoney(d.codCollected)}</td>
                            <td className={`px-4 py-3 font-semibold ${d.dueBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`}>
                              {formatMoney(d.dueBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Detail Panel */}
            <div className="mx-8 pb-8">
              <AnimatePresence>
                {detail && (
                  <DeliveryDetailPanel
                    title={detail.title}
                    summary={detail.summary}
                    rows={detail.rows}
                    onClose={() => setDetail(null)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}