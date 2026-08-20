import { useCallback, useEffect, useState } from "react";
import {
  ShoppingBagIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import PageMeta from "../../../components/common/PageMeta";
import { AdminPageFrame } from "../../../components/admin/AdminPageElements";
import EmptyState from "../../../components/ui/EmptyState";
import StatCard from "../../../components/ui/StatCard";
import StatusBadge from "../../../components/ui/StatusBadge";
import {
  fetchProcurementKpis,
  fetchProcurementStockByCategory,
  fetchProcurementSuppliers,
  fetchProcurementReorderSuggestions,
  type ProcurementKpis,
  type StockByCategory,
  type ProcurementSupplier,
  type ReorderSuggestion,
} from "../../../lib/analytics-api";

type TabId = "overview" | "reorder" | "suppliers" | "stock";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "نظرة عامة", icon: <CubeIcon className="h-4 w-4" /> },
  { id: "reorder", label: "إعادة الطلب", icon: <ShoppingBagIcon className="h-4 w-4" /> },
  { id: "suppliers", label: "الموردين", icon: <TruckIcon className="h-4 w-4" /> },
  { id: "stock", label: "المخزون", icon: <CubeIcon className="h-4 w-4" /> },
];

function fmt(n: number) { return n.toLocaleString("ar-EG", { maximumFractionDigits: 0 }); }

const PRIORITY_COLORS: Record<string, string> = { Urgent: "#ef4444", High: "#f59e0b", Medium: "#3b82f6", Low: "#10b981" };
const STOCK_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function ProcurementPage() {
  const [tab, setTab] = useState<TabId>("overview");
  const [kpis, setKpis] = useState<ProcurementKpis | null>(null);
  const [categories, setCategories] = useState<StockByCategory[]>([]);
  const [suppliers, setSuppliers] = useState<ProcurementSupplier[]>([]);
  const [reorder, setReorder] = useState<ReorderSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [k, c, s, r] = await Promise.all([
        fetchProcurementKpis(),
        fetchProcurementStockByCategory(),
        fetchProcurementSuppliers(),
        fetchProcurementReorderSuggestions(),
      ]);
      setKpis(k);
      setCategories(c);
      setSuppliers(s);
      setReorder(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load procurement data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <PageMeta title="المشتريات | Admin" description="تحليل المشتريات وإدارة المخزون." />
      <AdminPageFrame>
        <div className="mb-4 flex gap-1 rounded-lg border border-gray-200 bg-brand-25/60 p-1 dark:border-gray-700 dark:bg-white/[0.02]/60 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition whitespace-nowrap ${
                tab === t.id ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-brand-25" />)}</div>
        ) : tab === "overview" ? (
          <OverviewTab kpis={kpis} categories={categories} suppliers={suppliers} />
        ) : tab === "reorder" ? (
          <ReorderTab data={reorder} />
        ) : tab === "suppliers" ? (
          <SuppliersTab data={suppliers} />
        ) : (
          <StockTab data={categories} />
        )}
      </AdminPageFrame>
    </>
  );
}

/* ── Overview Tab ────────────────────────────────────── */
function OverviewTab({ kpis, categories, suppliers }: { kpis: ProcurementKpis | null; categories: StockByCategory[]; suppliers: ProcurementSupplier[] }) {
  if (!kpis) return <EmptyState title="لا توجد بيانات" description="لم يتم العثور على بيانات المشتريات." />;

  const stockPieData = [
    { name: "متوفر", value: kpis.products_with_stock - kpis.low_stock_products, color: "#10b981" },
    { name: "مخزون منخفض", value: kpis.low_stock_products, color: "#f59e0b" },
    { name: "نفد المخزون", value: kpis.out_of_stock_products, color: "#ef4444" },
    { name: "فائض", value: kpis.overstock_products, color: "#8b5cf6" },
  ].filter(d => d.value > 0);

  const topSuppliers = suppliers.slice(0, 10);
  const barOptions: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", type: "bar", height: 280, toolbar: { show: false } },
    colors: ["#465fff"],
    plotOptions: { bar: { horizontal: true, borderRadius: 4, columnWidth: "60%" } },
    xaxis: { categories: topSuppliers.map(s => s.supplier_name) },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    grid: { xaxis: { lines: { show: false } } },
    dataLabels: { enabled: false },
  };
  const barSeries = [{ name: "المنتجات", data: topSuppliers.map(s => s.product_count) }];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي المنتجات" value={fmt(kpis.total_products)} icon={<CubeIcon className="h-5 w-5" />} tone="blue" />
        <StatCard label="مخزون منخفض" value={fmt(kpis.low_stock_products)} icon={<ExclamationTriangleIcon className="h-5 w-5" />} tone="yellow" />
        <StatCard label="نفد المخزون" value={fmt(kpis.out_of_stock_products)} icon={<ExclamationTriangleIcon className="h-5 w-5" />} tone="red" />
        <StatCard label="محتاج إعادة طلب" value={fmt(kpis.products_needing_reorder)} icon={<ShoppingBagIcon className="h-5 w-5" />} tone="purple" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="قيمة المخزون" value={`${fmt(kpis.total_inventory_value)} ج.م`} icon={<CubeIcon className="h-5 w-5" />} tone="green" />
        <StatCard label="متوسط تغطية الأيام" value={`${fmt(kpis.avg_days_cover)} يوم`} icon={<ClockIcon className="h-5 w-5" />} tone="blue" />
        <StatCard label="عدد الموردين" value={fmt(kpis.total_suppliers)} icon={<TruckIcon className="h-5 w-5" />} tone="purple" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {stockPieData.length > 0 && (
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">توزيع المخزون</h3>
            <div className="flex items-center gap-8">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stockPieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} stroke="none" paddingAngle={2}>
                      {stockPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, name: any) => [`${v} منتج`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-3">
                {stockPieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-sm text-gray-600">{d.name}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white mr-2">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">أكبر 10 موردين</h3>
          <Chart options={barOptions} series={barSeries} type="bar" height={280} />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">المخزون حسب الفئة</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm" dir="rtl">
              <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
                <tr>
                  {["الفئة", "المنتجات", "متوفر", "منخفض", "نفد", "فائض", "القيمة"].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {categories.slice(0, 10).map((c, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium">{c.category}</td>
                    <td className="px-4 py-3">{fmt(c.total_products)}</td>
                    <td className="px-4 py-3 text-green-600">{fmt(c.in_stock)}</td>
                    <td className="px-4 py-3 text-amber-600">{fmt(c.low_stock)}</td>
                    <td className="px-4 py-3 text-red-600">{fmt(c.out_of_stock)}</td>
                    <td className="px-4 py-3 text-purple-600">{fmt(c.overstock)}</td>
                    <td className="px-4 py-3 font-semibold">{fmt(c.total_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Reorder Tab ────────────────────────────────────── */
function ReorderTab({ data }: { data: ReorderSuggestion[] }) {
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? data : data.filter(d => d.priority === filter);

  const counts = { Urgent: data.filter(d => d.priority === "Urgent").length, High: data.filter(d => d.priority === "High").length, Medium: data.filter(d => d.priority === "Medium").length, Low: data.filter(d => d.priority === "Low").length };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">فلتر:</span>
        {[
          { id: "all", label: `الكل (${data.length})`, color: "bg-gray-100 text-gray-700" },
          { id: "Urgent", label: `عاجل (${counts.Urgent})`, color: "bg-red-100 text-red-700" },
          { id: "High", label: `مرتفع (${counts.High})`, color: "bg-amber-100 text-amber-700" },
          { id: "Medium", label: `متوسط (${counts.Medium})`, color: "bg-blue-100 text-blue-700" },
          { id: "Low", label: `منخفض (${counts.Low})`, color: "bg-green-100 text-green-700" },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === f.id ? f.color + " ring-2 ring-offset-1 ring-brand-500" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm" dir="rtl">
            <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
              <tr>
                {["المنتج", "الفئة", "المخزون", "متوسط المبيعات/يوم", "تغطية الأيام", "الكمية المطلوبة", "المورد", "التكلفة", "الأولوية"].map(h => <th key={h} className="px-3 py-2.5">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((r, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-brand-25/50">
                  <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">{r.product_name}</td>
                  <td className="px-3 py-2.5">{r.category}</td>
                  <td className="px-3 py-2.5">{fmt(r.current_stock)}</td>
                  <td className="px-3 py-2.5">{r.avg_daily_sales.toFixed(1)}</td>
                  <td className="px-3 py-2.5">{r.days_cover != null ? `${fmt(r.days_cover)} يوم` : "—"}</td>
                  <td className="px-3 py-2.5 font-bold text-brand-600">{fmt(r.suggested_order_qty)}</td>
                  <td className="px-3 py-2.5">{r.supplier_name}</td>
                  <td className="px-3 py-2.5">{fmt(r.avg_cost)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.priority === "Urgent" ? "bg-red-100 text-red-700" :
                      r.priority === "High" ? "bg-amber-100 text-amber-700" :
                      r.priority === "Medium" ? "bg-blue-100 text-blue-700" :
                      "bg-green-100 text-green-700"
                    }`}>{r.priority === "Urgent" ? "عاجل" : r.priority === "High" ? "مرتفع" : r.priority === "Medium" ? "متوسط" : "منخفض"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Suppliers Tab ────────────────────────────────────── */
function SuppliersTab({ data }: { data: ProcurementSupplier[] }) {
  if (!data.length) return <EmptyState title="لا توجد بيانات" description="لم يتم العثور على بيانات الموردين." />;

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-right text-sm" dir="rtl">
          <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
            <tr>
              {["المورد", "المنتجات", "متوسط التكلفة", "متوسط وقت التوريد", "إجمالي المخزون"].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((s, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-brand-25/50">
                <td className="px-4 py-3 font-medium">{s.supplier_name}</td>
                <td className="px-4 py-3">{fmt(s.product_count)}</td>
                <td className="px-4 py-3">{fmt(s.avg_cost)} ج.م</td>
                <td className="px-4 py-3">{s.avg_lead_time != null ? `${fmt(s.avg_lead_time)} يوم` : "—"}</td>
                <td className="px-4 py-3 font-semibold">{fmt(s.total_stock)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Stock Tab ────────────────────────────────────── */
function StockTab({ data }: { data: StockByCategory[] }) {
  if (!data.length) return <EmptyState title="لا توجد بيانات" description="لم يتم العثور على بيانات المخزون." />;

  const totalValue = data.reduce((sum, c) => sum + c.total_value, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">المخزون حسب الفئة — الإجمالي: {fmt(totalValue)} ج.م</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm" dir="rtl">
            <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
              <tr>
                {["الفئة", "المنتجات", "متوفر", "منخفض", "نفد", "فائض", "القيمة", "نسبة التوفر"].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((c, i) => {
                const availability = c.total_products > 0 ? ((c.in_stock / c.total_products) * 100) : 0;
                return (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-brand-25/50">
                    <td className="px-4 py-3 font-medium">{c.category}</td>
                    <td className="px-4 py-3">{fmt(c.total_products)}</td>
                    <td className="px-4 py-3 text-green-600">{fmt(c.in_stock)}</td>
                    <td className="px-4 py-3 text-amber-600">{fmt(c.low_stock)}</td>
                    <td className="px-4 py-3 text-red-600">{fmt(c.out_of_stock)}</td>
                    <td className="px-4 py-3 text-purple-600">{fmt(c.overstock)}</td>
                    <td className="px-4 py-3 font-semibold">{fmt(c.total_value)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${availability}%`, backgroundColor: availability > 80 ? "#10b981" : availability > 50 ? "#f59e0b" : "#ef4444" }} />
                        </div>
                        <span className="text-xs">{availability.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
