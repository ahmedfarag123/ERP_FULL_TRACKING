import { useCallback, useEffect, useState } from "react";
import {
  CalendarDaysIcon,
  ChartBarIcon,
  ShoppingBagIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import PageMeta from "../../../components/common/PageMeta";
import { AdminPageFrame } from "../../../components/admin/AdminPageElements";
import EmptyState from "../../../components/ui/EmptyState";
import StatCard from "../../../components/ui/StatCard";
import StatusBadge from "../../../components/ui/StatusBadge";
import FilterBar from "../../../components/analytics/FilterBar";
import SalesRepDetailPanel from "../../../components/analytics/SalesRepDetailPanel";
import Customer360Panel from "../../../components/analytics/Customer360Panel";
import Product360Panel from "../../../components/analytics/Product360Panel";
import ActionCenterPanel from "../../../components/analytics/ActionCenterPanel";
import RetentionPanel from "../../../components/analytics/RetentionPanel";
import { useUrlStringParam } from "../../../hooks/useUrlState";
import {
  fetchExecutiveKpis,
  fetchDailyTrend,
  fetchTopCustomers,
  fetchSalesRepSummary,
  fetchProductSummary,
  fetchCustomerSummary,
  fetchRetentionSummary,
  type ExecutiveKpis,
  type DailyTrendRow,
  type TopCustomerRow,
  type SalesRepSummaryRow,
  type ProductSummaryRow,
  type CustomerSummaryRow,
  type RetentionSummaryRow,
} from "../../../lib/analytics-api";

type TabId = "executive" | "sales-reps" | "customers" | "products" | "action-center" | "retention";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "executive", label: "نظرة تنفيذية", icon: <ChartBarIcon className="h-4 w-4" /> },
  { id: "sales-reps", label: "فريق المبيعات", icon: <UsersIcon className="h-4 w-4" /> },
  { id: "customers", label: "العملاء", icon: <UsersIcon className="h-4 w-4" /> },
  { id: "products", label: "المنتجات", icon: <ShoppingBagIcon className="h-4 w-4" /> },
  { id: "action-center", label: "مركز الإجراءات", icon: <ExclamationTriangleIcon className="h-4 w-4" /> },
  { id: "retention", label: "الاحتفاظ", icon: <ArrowPathIcon className="h-4 w-4" /> },
];

function today() { return new Date().toISOString().slice(0, 10); }
function thirtyDaysAgo() { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); }
function currentMonth() { return new Date().toISOString().slice(0, 7) + "-01"; }
function fmt(n: number) { return n.toLocaleString("ar-EG", { maximumFractionDigits: 0 }); }

export default function AnalyticsPage() {
  const [tab, setTab] = useState<TabId>("executive");
  const [start_date, setStartDate] = useUrlStringParam("start", thirtyDaysAgo());
  const [end_date, setEndDate] = useUrlStringParam("end", today());
  const [company_name, setCompanyName] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [governorate_code, setGovernorateCode] = useState("");
  const [area_code, setAreaCode] = useState("");

  const [kpis, setKpis] = useState<ExecutiveKpis | null>(null);
  const [trend, setTrend] = useState<DailyTrendRow[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomerRow[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepSummaryRow[]>([]);
  const [products, setProducts] = useState<ProductSummaryRow[]>([]);
  const [customers, setCustomers] = useState<CustomerSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drill-down states
  const [selectedRep, setSelectedRep] = useState<{ salesperson: string; company_name: string } | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryRow | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductSummaryRow | null>(null);

  const month = currentMonth();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { start_date, end_date, company_name: company_name || undefined, salesperson: salesperson || undefined, governorate_code: governorate_code || undefined, area_code: area_code || undefined };

      const results = await Promise.all([
        fetchExecutiveKpis(params),
        fetchDailyTrend(params),
        fetchTopCustomers({ ...params, limit: 10 }),
        fetchSalesRepSummary({ month, company_name: company_name || undefined, salesperson: salesperson || undefined }),
        fetchProductSummary({ ...params, limit: 20 }),
        fetchCustomerSummary({ ...params, limit: 50 }),
      ]);
      setKpis(results[0]);
      setTrend(results[1]);
      setTopCustomers(results[2]);
      setSalesReps(results[3]);
      setProducts(results[4]);
      setCustomers(results[5]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [start_date, end_date, company_name, salesperson, governorate_code, area_code]);

  useEffect(() => { void load(); }, [load]);

  const filterProps = {
    start_date, end_date, company_name, salesperson, governorate_code, area_code,
    onStartChange: setStartDate, onEndChange: setEndDate,
    onCompanyChange: setCompanyName, onSalespersonChange: setSalesperson,
    onGovernorateChange: setGovernorateCode, onAreaChange: setAreaCode,
  };

  return (
    <>
      <PageMeta title="التحليلات | Admin" description="تحليلات المبيعات والعملاء والمنتجات." />
      <AdminPageFrame>
        <FilterBar {...filterProps} />

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
        ) : tab === "executive" ? (
          <ExecutiveView kpis={kpis} trend={trend} topCustomers={topCustomers} />
        ) : tab === "sales-reps" ? (
          <SalesRepsView data={salesReps} month={month} onSelect={(s, c) => setSelectedRep({ salesperson: s, company_name: c })} />
        ) : tab === "customers" ? (
          <CustomersView data={topCustomers} onSelect={setSelectedCustomer} />
        ) : tab === "products" ? (
          <ProductsView data={products} onSelect={setSelectedProduct} />
        ) : tab === "action-center" ? (
          <ActionCenterPanel company_name={company_name || undefined} salesperson={salesperson || undefined} start_date={start_date} end_date={end_date} />
        ) : (
          <RetentionPanel month={month} company_name={company_name || undefined} salesperson={salesperson || undefined} />
        )}

        {selectedRep && (
          <SalesRepDetailPanel
            salesperson={selectedRep.salesperson}
            company_name={selectedRep.company_name}
            month={month}
            onClose={() => setSelectedRep(null)}
          />
        )}
        {selectedCustomer && (
          <Customer360Panel
            customer_id={selectedCustomer.customer_id}
            customer_name={selectedCustomer.customer_name}
            company_name={selectedCustomer.company_name}
            salesperson={selectedCustomer.primary_salesperson}
            status={selectedCustomer.customer_status}
            orders_count={selectedCustomer.orders_count}
            sales_value={selectedCustomer.sales_value}
            avg_order={selectedCustomer.average_order_value}
            last_order={selectedCustomer.last_order_date}
            days_since={selectedCustomer.days_since_last_order}
            start_date={start_date}
            end_date={end_date}
            onClose={() => setSelectedCustomer(null)}
          />
        )}
        {selectedProduct && (
          <Product360Panel
            product_id={selectedProduct.product_id}
            product_name={selectedProduct.product_name}
            product_category={selectedProduct.product_category}
            orders_count={selectedProduct.orders_count}
            customers_count={selectedProduct.customers_count}
            qty_sold={selectedProduct.qty_sold}
            sales_value={selectedProduct.sales_value}
            avg_unit_value={selectedProduct.avg_unit_value}
            last_order_date={selectedProduct.last_order_date}
            start_date={start_date}
            end_date={end_date}
            company_name={company_name || undefined}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </AdminPageFrame>
    </>
  );
}

/* ── Executive View ────────────────────────────────────── */
function ExecutiveView({ kpis, trend, topCustomers }: { kpis: ExecutiveKpis | null; trend: DailyTrendRow[]; topCustomers: TopCustomerRow[] }) {
  if (!kpis) return <EmptyState title="لا توجد بيانات" description="لم يتم العثور على بيانات تنفيذية لهذه الفترة." />;

  const trendChartData = trend.slice(0, 30).reverse();
  const lineOptions: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", type: "area", height: 300, toolbar: { show: false } },
    colors: ["#465fff", "#10b981"],
    stroke: { curve: "smooth", width: [2, 2] },
    fill: { type: "gradient", gradient: { opacityFrom: 0.55, opacityTo: 0 } },
    xaxis: { categories: trendChartData.map(r => r.order_date), axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { fontSize: "12px", colors: ["#6B7280"] } } },
    grid: { yaxis: { lines: { show: true } } },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "left" },
    tooltip: { x: { format: "dd MMM yyyy" } },
  };
  const trendSeries = [
    { name: "المبيعات", data: trendChartData.map(r => r.daily_sales) },
    { name: "الطلبات", data: trendChartData.map(r => r.daily_orders) },
  ];

  const companySales = trend.reduce((acc, r) => { acc[r.company_name || "أخرى"] = (acc[r.company_name || "أخرى"] || 0) + r.daily_sales; return acc; }, {} as Record<string, number>);
  const barData = Object.entries(companySales).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const barOptions: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", type: "bar", height: 280, toolbar: { show: false } },
    colors: ["#465fff"],
    plotOptions: { bar: { horizontal: true, borderRadius: 4, columnWidth: "60%" } },
    xaxis: { categories: barData.map(d => d[0]) },
    yaxis: { labels: { style: { fontSize: "12px" } } },
    grid: { xaxis: { lines: { show: false } } },
    dataLabels: { enabled: false },
  };
  const barSeries = [{ name: "المبيعات", data: barData.map(d => d[1]) }];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي المبيعات" value={fmt(kpis.total_sales)} icon={<ShoppingBagIcon className="h-5 w-5" />} tone="blue" />
        <StatCard label="عدد الطلبات" value={fmt(kpis.total_orders)} icon={<ChartBarIcon className="h-5 w-5" />} tone="green" />
        <StatCard label="العملاء الفعالون" value={fmt(kpis.active_customers)} icon={<UsersIcon className="h-5 w-5" />} tone="purple" />
        <StatCard label="متوسط الطلب" value={fmt(kpis.average_order_value)} icon={<CalendarDaysIcon className="h-5 w-5" />} tone="yellow" />
      </div>

      {trend.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">الاتجاه اليومي</h3>
            <Chart options={lineOptions} series={trendSeries} type="area" height={300} />
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">المبيعات حسب الشركة</h3>
            <Chart options={barOptions} series={barSeries} type="bar" height={280} />
          </div>
        </div>
      )}

      {topCustomers.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">أكبر 10 عملاء</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm" dir="rtl">
              <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04] dark:text-gray-500">
                <tr>
                  {["العميل", "الشركة", "المبيعات", "الطلبات", "متوسط الطلب", "آخر طلب"].map((h) => <th key={h} className="px-4 py-3 text-right">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium">{row.customer_name || "—"}</td>
                    <td className="px-4 py-3">{row.company_name || "—"}</td>
                    <td className="px-4 py-3 font-semibold">{fmt(row.sales_value)}</td>
                    <td className="px-4 py-3">{fmt(row.orders_count)}</td>
                    <td className="px-4 py-3">{fmt(row.average_order_value)}</td>
                    <td className="px-4 py-3" dir="ltr">{row.last_order_at}</td>
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

/* ── Sales Reps View ────────────────────────────────────── */
function SalesRepsView({ data, month, onSelect }: { data: SalesRepSummaryRow[]; month: string; onSelect: (name: string, company: string) => void }) {
  if (!data.length) return <EmptyState title="لا توجد بيانات" description="لم يتم العثور على بيانات فريق المبيعات." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((row, i) => (
          <div key={i} onClick={() => onSelect(row.salesperson, row.company_name)}
            className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02] cursor-pointer hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">مندوب المبيعات</p>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{row.salesperson || "غير محدد"}</p>
              </div>
              <StatusBadge label={`${row.orders_count} طلب`} tone={row.orders_count > 50 ? "green" : row.orders_count > 10 ? "blue" : "gray"} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-400">المبيعات</p>
                <p className="font-semibold text-gray-900 dark:text-white">{fmt(row.sales_value)}</p>
              </div>
              <div>
                <p className="text-gray-400">العملاء الفعالون</p>
                <p className="font-semibold text-gray-900 dark:text-white">{fmt(row.active_customers)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <p className="text-green-600 font-bold">{fmt(row.retained_customers)}</p>
                <p className="text-gray-400">احتفاظ</p>
              </div>
              <div className="text-center">
                <p className="text-red-500 font-bold">{fmt(row.lost_customers)}</p>
                <p className="text-gray-400">مفقود</p>
              </div>
              <div className="text-center">
                <p className="text-blue-500 font-bold">{fmt(row.new_customers)}</p>
                <p className="text-gray-400">جديد</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {row.company_name} • {row.order_month} • احتفاظ: {row.retention_rate.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Customers View ────────────────────────────────────── */
function CustomersView({ data, onSelect }: { data: TopCustomerRow[]; onSelect: (c: any) => void }) {
  if (!data.length) return <EmptyState title="لا توجد بيانات" description="لم يتم العثور على بيانات عملاء." />;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-right text-sm" dir="rtl">
          <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04] dark:text-gray-500">
            <tr>
              {["العميل", "الشركة", "المبيعات", "الطلبات", "متوسط الطلب", "آخر طلب", "المندوب"].map((h) => <th key={h} className="px-4 py-3 text-right">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} onClick={() => onSelect(row)}
                className="border-b border-gray-100 transition hover:bg-brand-25 dark:border-gray-800 dark:hover:bg-white/[0.02] cursor-pointer">
                <td className="px-4 py-3 font-medium">{row.customer_name || "—"}</td>
                <td className="px-4 py-3">{row.company_name || "—"}</td>
                <td className="px-4 py-3 font-semibold">{fmt(row.sales_value)}</td>
                <td className="px-4 py-3">{fmt(row.orders_count)}</td>
                <td className="px-4 py-3">{fmt(row.average_order_value)}</td>
                <td className="px-4 py-3" dir="ltr">{row.last_order_at}</td>
                <td className="px-4 py-3">{row.primary_salesperson}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Products View ────────────────────────────────────── */
function ProductsView({ data, onSelect }: { data: ProductSummaryRow[]; onSelect: (p: ProductSummaryRow) => void }) {
  if (!data.length) return <EmptyState title="لا توجد بيانات" description="لم يتم العثور على بيانات منتجات." />;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-right text-sm" dir="rtl">
          <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04] dark:text-gray-500">
            <tr>
              {["المنتج", "الفئة", "الطلبات", "العملاء", "الكمية", "المبيعات", "متوسط الوحدة", "آخر طلب"].map((h) => <th key={h} className="px-4 py-3 text-right">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} onClick={() => onSelect(row)}
                className="border-b border-gray-100 transition hover:bg-brand-25 dark:border-gray-800 dark:hover:bg-white/[0.02] cursor-pointer">
                <td className="px-4 py-3 font-medium">{row.product_name || "—"}</td>
                <td className="px-4 py-3">{row.product_category || "—"}</td>
                <td className="px-4 py-3">{fmt(row.orders_count)}</td>
                <td className="px-4 py-3">{fmt(row.customers_count)}</td>
                <td className="px-4 py-3">{fmt(row.qty_sold)}</td>
                <td className="px-4 py-3 font-semibold">{fmt(row.sales_value)}</td>
                <td className="px-4 py-3">{fmt(row.avg_unit_value)}</td>
                <td className="px-4 py-3" dir="ltr">{row.last_order_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
