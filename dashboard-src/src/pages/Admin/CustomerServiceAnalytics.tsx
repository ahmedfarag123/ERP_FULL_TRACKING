import { useState, useCallback } from "react";
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
} from "recharts";
import PageMeta from "../../components/common/PageMeta";
import DateRangePicker from "../../components/form/date-range-picker";
import {
  fetchCustomerServiceAnalytics,
  fetchCustomerServiceProductAnalytics,
} from "../../lib/customer-service";
import type { CustomerServiceProductStat } from "../../lib/customer-service";
import { supabase } from "../../lib/supabase";
import type { DateRangeValue } from "../../lib/date-range";

const CATEGORY_LABELS: Record<string, string> = {
  stock_shortage: "نقص مخزون",
  delivery_issue: "مشكلة في التسليم",
  product_damage: "تلف منتج",
  product_expired: "منتهي الصلاحية",
  product_quality: "جودة المنتج",
  wrong_order: "خطأ طلب",
  invoice_error: "خطأ فاتورة",
  customer_unavailable: "عميل غير متواجد",
  delivery_delay: "تأخير توصيل",
  loading_error: "عدم تحميل",
  wrong_shipment: "إرسال خاطئ",
  customer_refused: "رفض العميل",
  delivery_negligence: "إهمال تسليم",
  return_request: "طلب إرجاع",
  external_circumstance: "ظرف خارجي",
  invoice_duplicate: "فاتورة مكررة",
  protocol_violation: "مخالفة بروتوكول",
  collection_issue: "مشكلة تحصيل",
  vehicle_full: "سيارة ممتلئة",
  pricing_error: "خطأ تسعير",
  product_expiry_date: "منتهي الصلاحية",
  wrong_branch_invoice: "فاتورة فرع غلط",
  product_mismatch: "عدم مطابقة منتج",
  customer_complaint: "شكوى عميل",
  data_error: "خطأ بيانات",
  customer_no_response: "عدم رد العميل",
  no_refrigerated_vehicle: "عدم توفر سيارة مبردة",
  certificate_issue: "مشكلة شهادة",
  route_missing: "ناقص خط سير",
  order_change: "تغيير الطلب",
  invoice_tax: "فاتورة ضريبية",
  invoice_edit: "تعديل فاتورة",
  customer_hesitation: "تردد العميل",
  payment_issue: "مشكلة دفع",
  debt_issue: "مديونية",
  other: "أخرى",
};

const CATEGORY_COLORS: Record<string, string> = {
  stock_shortage: "#2563eb",
  delivery_issue: "#0891b2",
  product_damage: "#ef4444",
  product_expired: "#f59e0b",
  product_quality: "#8b5cf6",
  wrong_order: "#ec4899",
  invoice_error: "#dc2626",
  customer_unavailable: "#6b7280",
  delivery_delay: "#d97706",
  loading_error: "#ea580c",
  wrong_shipment: "#be185d",
  customer_refused: "#9333ea",
  delivery_negligence: "#4f46e5",
  return_request: "#f97316",
  external_circumstance: "#059669",
  invoice_duplicate: "#b91c1c",
  protocol_violation: "#7c3aed",
  collection_issue: "#0d9488",
  vehicle_full: "#65a30d",
  pricing_error: "#ca8a04",
  product_expiry_date: "#eab308",
  wrong_branch_invoice: "#e11d48",
  product_mismatch: "#a855f7",
  customer_complaint: "#db2777",
  data_error: "#475569",
  customer_no_response: "#64748b",
  no_refrigerated_vehicle: "#14b8a6",
  certificate_issue: "#84cc16",
  route_missing: "#22d3ee",
  order_change: "#f59e0b",
  invoice_tax: "#991b1b",
  invoice_edit: "#9f1239",
  customer_hesitation: "#c084fc",
  payment_issue: "#f43f5e",
  debt_issue: "#e11d48",
  other: "#9ca3af",
};

const DEPARTMENT_COLORS: Record<string, string> = {
  "المخزن": "#1e40af",
  "الحركة": "#059669",
  "السيستم": "#d97706",
  "العميل": "#7c3aed",
  "المبيعات": "#db2777",
  "المشتريات": "#dc2626",
  "الشركة المصنعة": "#0891b2",
  "الحسابات": "#ea580c",
  "البيانات": "#0d9488",
  "خدمة العملاء": "#9333ea",
  "الادارة": "#4f46e5",
};

const DELIVERY_COLORS: Record<string, string> = {
  full: "#059669",
  partial: "#f59e0b",
  cancelled: "#dc2626",
  pending: "#3b82f6",
  other_delivery: "#8b5cf6",
  unknown: "#9ca3af",
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

function GeometricPattern({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0L60 0L0 60Z" fill="rgba(59,130,246,0.15)" />
      <path d="M20 0L80 0L20 60Z" fill="rgba(59,130,246,0.10)" />
      <path d="M40 0L100 0L40 60Z" fill="rgba(59,130,246,0.07)" />
    </svg>
  );
}

/* ─── Ticket Row type ────────────────────────────────────────────────── */

interface TicketRow {
  id: string;
  subject: string;
  status: string;
  category: string | null;
  created_at: string;
  assigned_to_full_name: string | null;
  customer_full_name: string | null;
}

/* ─── Inline Detail Panel ────────────────────────────────────────────── */

function InlineDetailPanel({
  title,
  summary,
  tickets,
  onClose,
}: {
  title: string;
  summary?: string;
  tickets: TicketRow[];
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
        <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          إغلاق
        </button>
      </div>
      {summary && (
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-3 dark:border-gray-800">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            محلول
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            معلق
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            النسبة
          </span>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300" dir="ltr">{summary}</span>
        </div>
      )}
      <div className="max-h-[400px] overflow-auto p-4">
        {tickets.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">لا توجد تذاكر</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-right text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">الموضوع</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t, i) => (
                <tr key={t.id} className="border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5 text-xs text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-gray-200">{t.subject}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      t.status === "resolved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : t.status === "closed" ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}>
                      {t.status === "resolved" ? "تم الحل" : t.status === "closed" ? "مغلقة" : t.status === "pending" ? "قيد الانتظار" : "مفتوحة"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400" dir="ltr">
                    {new Date(t.created_at).toLocaleDateString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Pie Chart Card ──────────────────────────────────────────────────── */

function PieChartCard({
  title,
  data,
  centerValue,
  centerLabel,
  onSliceClick,
  ticketsByValue,
  activeKey,
}: {
  title: string;
  data: { name: string; value: number; color: string; key: string }[];
  centerValue?: string;
  centerLabel?: string;
  onSliceClick?: (key: string, name: string) => void;
  ticketsByValue?: Record<string, TicketRow[]>;
  activeKey?: string;
}) {
  const chartData = data.filter((d) => d.value > 0);
  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex-1 min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200/60 dark:bg-white/[0.04] dark:ring-white/[0.06]">
      <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white" dir="rtl">{title}</h3>
      {chartData.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">لا توجد بيانات</div>
      ) : (
        <div className="flex items-center gap-5">
          <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                  onClick={(_data, index) => {
                    if (onSliceClick && chartData[index]) {
                      onSliceClick(chartData[index].key, chartData[index].name);
                    }
                  }}
                  style={{ cursor: onSliceClick ? "pointer" : "default" }}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={activeKey && activeKey !== entry.key ? 0.35 : 1} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    const val = Number(d.value ?? 0);
                    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                    return (
                      <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900" dir="rtl">
                        <p className="font-bold text-gray-900 dark:text-white">{d.name}</p>
                        <p className="mt-0.5 text-gray-700 dark:text-gray-300">{val} تذكرة ({pct}%)</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {(centerValue || centerLabel) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {centerValue && <span className="text-xl font-bold text-gray-900 dark:text-white">{centerValue}</span>}
                {centerLabel && <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{centerLabel}</span>}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            {chartData.map((d) => {
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
              const count = ticketsByValue?.[d.key]?.length ?? d.value;
              const isActive = activeKey === d.key;
              return (
                <button
                  key={d.key}
                  onClick={() => onSliceClick?.(d.key, d.name)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                    isActive
                      ? "bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-800"
                      : "hover:bg-gray-50 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="min-w-0 flex-1 truncate text-right font-medium text-gray-800 dark:text-gray-200">{d.name}</span>
                  <span className="shrink-0 font-bold text-gray-900 dark:text-white">{count}</span>
                  <span className="shrink-0 text-[11px] font-semibold text-gray-600 dark:text-gray-400">({pct}%)</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── KPI Card ────────────────────────────────────────────────────────── */

function KpiCard({ title, value, subtitle, delay, onClick }: {
  title: string;
  value: string | number;
  subtitle: string;
  delay: number;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      onClick={onClick}
      className={`flex-1 min-w-[200px] rounded-2xl bg-[#0f172a] p-6 text-left text-white shadow-lg ${
        onClick ? "cursor-pointer transition hover:-translate-y-0.5 hover:bg-[#16213d] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400/60" : ""
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-blue-200">{title}</p>
      <p className="mt-3 text-4xl font-extrabold text-red-500">{value}</p>
      <p className="mt-2 text-sm text-blue-100">{subtitle}</p>
    </motion.button>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────── */

export default function CustomerServiceAnalytics() {
  const [range, setRange] = useState<DateRangeValue>([
    new Date(Date.now() - 6 * 86400000),
    new Date(),
  ]);
  const [quickRange, setQuickRange] = useState<string>("7d");

  const { startISO, endISO } = rangeToISO(range);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["cs-analytics", startISO, endISO],
    queryFn: () => fetchCustomerServiceAnalytics(startISO, endISO),
    staleTime: 60_000,
  });

  const { data: prevAnalytics } = useQuery({
    queryKey: ["cs-analytics-prev", startISO, endISO],
    queryFn: async () => {
      const diff = new Date(endISO).getTime() - new Date(startISO).getTime();
      const prevStart = new Date(new Date(startISO).getTime() - diff).toISOString();
      const prevEnd = new Date(new Date(endISO).getTime() - diff).toISOString();
      return fetchCustomerServiceAnalytics(prevStart, prevEnd);
    },
    staleTime: 60_000,
  });

  const { data: ticketDetails } = useQuery({
    queryKey: ["cs-analytics-tickets", startISO, endISO],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_tickets")
        .select("id, subject, status, category, created_at, resolved_at, closed_at, assigned_to_full_name, assigned_departments, order:orders(delivery_status), raw_payload")
        .gte("created_at", startISO)
        .lte("created_at", endISO);
      return (data ?? []) as unknown as Array<TicketRow & {
        resolved_at: string | null;
        closed_at: string | null;
        assigned_departments: string[] | null;
        order: { delivery_status: string | null } | null;
        raw_payload: Record<string, unknown> | null;
      }>;
    },
    staleTime: 60_000,
  });

  const isDetailResolved = (t: { status: string; resolved_at?: string | null; closed_at?: string | null }) =>
    t.status === "resolved" || t.status === "closed" || Boolean(t.resolved_at || t.closed_at);
  const sortByCreatedDesc = (a: TicketRow, b: TicketRow) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

  const { data: productStats } = useQuery({
    queryKey: ["cs-analytics-products", startISO, endISO],
    queryFn: () => fetchCustomerServiceProductAnalytics(startISO, endISO),
    staleTime: 60_000,
  });

  const [detailTitle, setDetailTitle] = useState("");
  const [detailTickets, setDetailTickets] = useState<TicketRow[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | undefined>();
  const [activeDepartment, setActiveDepartment] = useState<string | undefined>();
  const [activeDelivery, setActiveDelivery] = useState<string | undefined>();
  const [productDetail, setProductDetail] = useState<CustomerServiceProductStat | null>(null);

  const [kpiDetail, setKpiDetail] = useState<{ title: string; summary: string; tickets: TicketRow[] } | null>(null);

  function openKpiDetail(key: "total" | "resolved" | "percent" | "rate") {
    if (!ticketDetails?.length) return;
    const all = [...ticketDetails].sort(sortByCreatedDesc);
    const resolved = all.filter(isDetailResolved);
    const pending = all.filter((t) => !isDetailResolved(t));
    const pct = all.length > 0 ? Math.round((resolved.length / all.length) * 100) : 0;
    const summary = `محلول ${resolved.length}  (${pct}%)   •   معلق ${pending.length}  (${100 - pct}%)   •   إجمالي ${all.length}`;
    if (key === "total") {
      setKpiDetail({ title: `إجمالي التذاكر — ${all.length}`, summary, tickets: all });
    } else if (key === "resolved") {
      setKpiDetail({ title: `تم الحل — ${resolved.length} من ${all.length} (${pct}%)`, summary, tickets: resolved });
    } else if (key === "percent") {
      setKpiDetail({ title: `نسبة التذاكر المكتملة — ${pct}%`, summary, tickets: resolved });
    } else {
      setKpiDetail({ title: `معدل الحل — ${pct}%`, summary, tickets: resolved });
    }
  }

  function getTicketDeliveryKey(t: TicketRow & { order: { delivery_status: string | null } | null; raw_payload: Record<string, unknown> | null }): string {
    const orderStatus = Array.isArray(t.order) ? t.order[0]?.delivery_status : t.order?.delivery_status;
    if (orderStatus && orderStatus !== "false") return orderStatus;
    const xl = t.raw_payload?.delivery_status_xl;
    if (xl === "بالكامل") return "full";
    if (xl === "مرتجع جزئى") return "partial";
    if (["مرتجع كلى بعد الوصول","مرتجع كلى قبل الوصول","مرتجع كلي","مرتجع كلى","الغاء"].includes(String(xl ?? ""))) return "cancelled";
    if (xl) return "other_delivery";
    return "unknown";
  }

  const handleSliceClick = useCallback(
    (key: string, label: string, field: "category" | "assigned_departments" | "delivery") => {
      if (!ticketDetails) return;

      const clearAll = () => {
        setActiveCategory(undefined);
        setActiveDepartment(undefined);
        setActiveDelivery(undefined);
        setDetailTickets([]);
        setDetailTitle("");
      };

      if (field === "category") {
        const isSame = activeCategory === key;
        clearAll();
        if (isSame) return;
        setActiveCategory(key);
        const filtered = ticketDetails.filter((t) => (t.category || "other") === key);
        setDetailTitle(`${label} — ${filtered.length} تذكرة`);
        setDetailTickets(filtered);
      } else if (field === "assigned_departments") {
        const isSame = activeDepartment === key;
        clearAll();
        if (isSame) return;
        setActiveDepartment(key);
        const filtered = ticketDetails.filter((t) => t.assigned_departments?.includes(key as string));
        setDetailTitle(`${label} — ${filtered.length} تذكرة`);
        setDetailTickets(filtered);
      } else {
        const isSame = activeDelivery === key;
        clearAll();
        if (isSame) return;
        setActiveDelivery(key);
        const filtered = ticketDetails.filter((t) => getTicketDeliveryKey(t) === key);
        setDetailTitle(`${label} — ${filtered.length} تذكرة`);
        setDetailTickets(filtered);
      }
    },
    [ticketDetails, activeCategory, activeDepartment, activeDelivery]
  );

  const total = analytics?.total ?? 0;
  const resolved = analytics?.resolved ?? 0;
  const percentage = analytics?.percentage ?? 0;
  const prevTotal = prevAnalytics?.total ?? 0;
  const prevResolved = prevAnalytics?.resolved ?? 0;

  const totalTrend = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;
  const resolvedTrend = prevResolved > 0 ? ((resolved - prevResolved) / prevResolved) * 100 : 0;
  const resolveRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const categoryData = Object.entries(analytics?.byCategory ?? {}).map(([key, value]) => ({
    name: CATEGORY_LABELS[key] || key,
    value,
    color: CATEGORY_COLORS[key] || "#9ca3af",
    key,
  }));

  const departmentData = Object.entries(analytics?.byDepartment ?? {}).map(([key, value]) => ({
    name: key,
    value,
    color: DEPARTMENT_COLORS[key] || "#9ca3af",
    key,
  }));

  const deliveryData = Object.entries(analytics?.byDelivery ?? {}).map(([key, value]) => ({
    name: analytics?.deliveryLabels?.[key] || key,
    value,
    color: DELIVERY_COLORS[key] || "#9ca3af",
    key,
  }));

  const productChartData = (productStats ?? []).slice(0, 10).map((p) => ({
    name: (p.product_name || "").replace(/^\[[^\]]*\]\s*/, "").slice(0, 30),
    tickets: p.ticket_count,
  }));

  const rangeLabel = quickRange === "7d" ? "Last Week" : quickRange === "30d" ? "Last 30 Days" : "Selected Period";

  return (
    <>
      <PageMeta title="Score Cards | خدمة العملاء" description="Score Cards of the week - Customer Service" />

      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950" dir="rtl">
        <div className="mx-auto max-w-[1400px] p-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1a3a] via-[#0f2449] to-[#162d5a] shadow-2xl">

            {/* Header */}
            <div className="relative px-8 pt-8 pb-6">
              <div className="absolute left-0 top-0 opacity-60"><GeometricPattern /></div>
              <div className="absolute bottom-0 right-0 rotate-180 opacity-60"><GeometricPattern /></div>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                  <span className="text-lg font-bold text-white">H</span>
                </div>
                <span className="text-sm font-semibold text-blue-200">Horeca Smart</span>
              </div>

              <div className="text-center">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">Score Cards of the week</h1>
                <p className="mt-1 text-sm text-blue-200">6. Customer Service</p>
              </div>

              <div className="mt-5 flex items-center justify-center gap-3" dir="ltr">
                <div className="flex gap-1 rounded-xl bg-white/10 p-1 backdrop-blur-sm">
                  {[{ label: "7 Days", value: "7d" }, { label: "30 Days", value: "30d" }].map((qr) => (
                    <button
                      key={qr.value}
                      type="button"
                      onClick={() => {
                        setQuickRange(qr.value);
                        const iso = getQuickRangeISO(qr.value);
                        setRange([new Date(iso.startISO), new Date(iso.endISO)]);
                      }}
                      className={`rounded-lg px-4 py-1.5 text-xs font-medium transition ${
                        quickRange === qr.value ? "bg-blue-600 text-white shadow" : "text-blue-200 hover:text-white"
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
                <KpiCard title="Count Of Tickets" value={isLoading ? "—" : total} subtitle={`${rangeLabel} ${prevTotal > 0 ? (totalTrend >= 0 ? "+" : "") + totalTrend.toFixed(0) + "% vs prev" : ""}`} delay={0} onClick={() => openKpiDetail("total")} />
                <KpiCard title="Resolved Tickets" value={isLoading ? "—" : resolved} subtitle={`${rangeLabel} ${prevResolved > 0 ? (resolvedTrend >= 0 ? "+" : "") + resolvedTrend.toFixed(0) + "% vs prev" : ""}`} delay={0.05} onClick={() => openKpiDetail("resolved")} />
                <KpiCard title="Percent of Tickets" value={isLoading ? "—" : `${percentage}%`} subtitle={`${rangeLabel} ${total > 0 ? resolved + "/" + total + " resolved" : ""}`} delay={0.1} onClick={() => openKpiDetail("percent")} />
                <KpiCard title="Resolving Rate" value={isLoading ? "—" : `${resolveRate}%`} subtitle={rangeLabel} delay={0.15} onClick={() => openKpiDetail("rate")} />
              </div>
            </div>

            <div className="mx-8 border-t border-white/10" />

            {/* Charts */}
            <div className="px-8 py-6">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <PieChartCard
                  title="عنوان المشكلة"
                  data={categoryData}
                  centerValue={String(total)}
                  centerLabel="إجمالي"
                  onSliceClick={(key, name) => handleSliceClick(key, name, "category")}
                  activeKey={activeCategory}
                  ticketsByValue={ticketDetails ? Object.fromEntries(
                    Object.keys(analytics?.byCategory ?? {}).map((k) => [
                      k,
                      ticketDetails.filter((t) => (t.category || "other") === k),
                    ])
                  ) : undefined}
                />
                <PieChartCard
                  title="القسم المسؤول"
                  data={departmentData}
                  centerValue={String(departmentData.length)}
                  centerLabel="قسم"
                  onSliceClick={(key, name) => handleSliceClick(key, name, "assigned_departments")}
                  activeKey={activeDepartment}
                  ticketsByValue={ticketDetails ? Object.fromEntries(
                    Object.keys(analytics?.byDepartment ?? {}).map((k) => [
                      k,
                      ticketDetails.filter((t) => t.assigned_departments?.includes(k)),
                    ])
                  ) : undefined}
                />
                <PieChartCard
                  title="حالة التسليم"
                  data={deliveryData}
                  centerValue={String(total)}
                  centerLabel="طلب"
                  onSliceClick={(key, name) => handleSliceClick(key, name, "delivery")}
                  activeKey={activeDelivery}
                  ticketsByValue={ticketDetails ? Object.fromEntries(
                    Object.keys(analytics?.byDelivery ?? {}).map((k) => [
                      k,
                      ticketDetails.filter((t) => getTicketDeliveryKey(t) === k),
                    ])
                  ) : undefined}
                />
              </div>
            </div>

            {/* Top Problem Products */}
            <div className="px-8 pb-6">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200/60 dark:bg-white/[0.04] dark:ring-white/[0.06]">
                <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white" dir="rtl">
                  المنتجات الأكثر شكاوى (مرتبطة بتذاكر)
                </h3>
                {(!productStats || productStats.length === 0) ? (
                  <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
                    {productStats && productStats.length === 0 ? "لا توجد منتجات مرتبطة في هذه الفترة" : "جارٍ التحميل..."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="min-w-0">
                      <ResponsiveContainer width="100%" height={Math.max(240, productChartData.length * 26)}>
                        <BarChart
                          data={productChartData}
                          layout="vertical"
                          margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
                        >
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={170}
                            tick={{ fontSize: 10, fill: "#64748b" }}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0];
                              return (
                                <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900" dir="rtl">
                                  <p className="font-bold text-gray-900 dark:text-white">{d.payload.name}</p>
                                  <p className="mt-0.5 text-gray-700 dark:text-gray-300">{d.value} تذكرة</p>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="tickets" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="min-w-0 space-y-1.5 lg:col-span-2">
                      {(productStats ?? []).map((p) => (
                        <button
                          key={`${p.product_code ?? p.product_name}`}
                          type="button"
                          onClick={() => setProductDetail(p)}
                          className={`w-full rounded-lg px-3 py-2 text-right text-xs transition ${
                            productDetail?.product_code === p.product_code && productDetail?.product_name === p.product_name
                              ? "bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-800"
                              : "hover:bg-gray-50 dark:hover:bg-white/[0.06]"
                          }`}
                        >
                          <span className="block font-semibold text-gray-800 dark:text-gray-200">
                            {(p.product_name || "").replace(/^\[[^\]]*\]\s*/, "")}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-gray-500 dark:text-gray-400">
                            {p.ticket_count} تذكرة
                            {p.product_code ? ` • كود ${p.product_code}` : ""}
                            {p.order_count > 0 ? ` • ${p.order_count} أوردر` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Product Ticket Detail Panel */}
            <AnimatePresence>
              {productDetail && productDetail.tickets.length > 0 && (
                <div className="px-8 pb-6">
                  <InlineDetailPanel
                    title={`${productDetail.product_name} — ${productDetail.tickets.length} تذكرة`}
                    tickets={productDetail.tickets as unknown as TicketRow[]}
                    onClose={() => setProductDetail(null)}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* KPI Detail Panel */}
            <AnimatePresence>
              {kpiDetail && kpiDetail.tickets.length > 0 && (
                <div className="px-8 pb-6">
                  <InlineDetailPanel
                    title={kpiDetail.title}
                    summary={kpiDetail.summary}
                    tickets={kpiDetail.tickets}
                    onClose={() => setKpiDetail(null)}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* Inline Detail Panel */}
            <AnimatePresence>
              {detailTickets.length > 0 && (
                <div className="px-8 pb-6">
                  <InlineDetailPanel
                    title={detailTitle}
                    tickets={detailTickets}
                    onClose={() => {
                      setDetailTickets([]);
                      setDetailTitle("");
                      setActiveCategory(undefined);
                      setActiveDepartment(undefined);
                      setActiveDelivery(undefined);
                    }}
                  />
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
