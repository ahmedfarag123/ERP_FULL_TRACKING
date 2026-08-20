import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  fetchProduct360,
  type Product360Data,
} from "../../lib/analytics-api";
import StatCard from "../ui/StatCard";
import StatusBadge from "../ui/StatusBadge";
import { ShoppingBagIcon, UsersIcon, CurrencyDollarIcon, ChartBarIcon } from "@heroicons/react/24/outline";

function fmt(n: number) { return n.toLocaleString("ar-EG", { maximumFractionDigits: 0 }); }

type P360Tab = "overview" | "customers" | "salespeople" | "alerts";

interface Props {
  product_id: number;
  product_name: string;
  product_category: string;
  orders_count: number;
  customers_count: number;
  qty_sold: number;
  sales_value: number;
  avg_unit_value: number;
  last_order_date: string;
  start_date: string;
  end_date: string;
  company_name?: string;
  onClose: () => void;
}

export default function Product360Panel({
  product_id, product_name, product_category, orders_count, customers_count,
  qty_sold, sales_value, avg_unit_value, last_order_date,
  start_date, end_date, company_name, onClose,
}: Props) {
  const [tab, setTab] = useState<P360Tab>("overview");
  const [data, setData] = useState<Product360Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchProduct360({ product_id, start_date, end_date, company_name })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [product_id, start_date, end_date, company_name]);

  const tabs: { id: P360Tab; label: string }[] = [
    { id: "overview", label: "نظرة عامة" },
    { id: "customers", label: "أكبر العملاء" },
    { id: "salespeople", label: "مندوب المبيعات" },
    { id: "alerts", label: "التنبيهات" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{product_name}</h2>
            <p className="text-xs text-gray-500 mt-1">{product_category} • آخر طلب: {last_order_date}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">✕</button>
        </div>

        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 px-6">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
                tab === t.id ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-brand-25" />)}</div>
          ) : tab === "overview" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="الطلبات" value={fmt(orders_count)} icon={<ShoppingBagIcon className="h-5 w-5" />} tone="blue" />
                <StatCard label="العملاء" value={fmt(customers_count)} icon={<UsersIcon className="h-5 w-5" />} tone="green" />
                <StatCard label="الكمية المباعة" value={fmt(qty_sold)} icon={<ChartBarIcon className="h-5 w-5" />} tone="purple" />
                <StatCard label="متوسط الوحدة" value={fmt(avg_unit_value)} icon={<CurrencyDollarIcon className="h-5 w-5" />} tone="yellow" />
              </div>
              {data?.alerts && data.alerts.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                  <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">تنبيهات</h4>
                  {data.alerts.map((a, i) => (
                    <p key={i} className="text-sm text-amber-600 dark:text-amber-300">• {a.message}</p>
                  ))}
                </div>
              )}
            </div>
          ) : tab === "customers" ? (
            <div>
              {data?.top_customers && data.top_customers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-right text-sm" dir="rtl">
                    <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
                      <tr>
                        {["العميل", "الشركة", "المبيعات", "الطلبات"].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_customers.map((c, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-brand-25/50">
                          <td className="px-4 py-3 font-medium">{c.customer_name}</td>
                          <td className="px-4 py-3">{c.company_name}</td>
                          <td className="px-4 py-3 font-semibold">{fmt(c.sales_value)}</td>
                          <td className="px-4 py-3">{c.orders_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-sm text-gray-500">لا توجد بيانات</p>}
            </div>
          ) : tab === "salespeople" ? (
            <div>
              {data?.top_salespeople && data.top_salespeople.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-right text-sm" dir="rtl">
                    <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
                      <tr>
                        {["المندوب", "الشركة", "المبيعات", "الطلبات", "العملاء"].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_salespeople.map((s, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-brand-25/50">
                          <td className="px-4 py-3 font-medium">{s.salesperson}</td>
                          <td className="px-4 py-3">{s.company_name}</td>
                          <td className="px-4 py-3 font-semibold">{fmt(s.sales_value)}</td>
                          <td className="px-4 py-3">{s.orders_count}</td>
                          <td className="px-4 py-3">{s.customers_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-sm text-gray-500">لا توجد بيانات</p>}
            </div>
          ) : (
            <div>
              {data?.alerts && data.alerts.length > 0 ? (
                <div className="space-y-3">
                  {data.alerts.map((a, i) => (
                    <div key={i} className={`rounded-xl border p-4 ${
                      a.severity === "high" ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20" :
                      a.severity === "medium" ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20" :
                      "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                    }`}>
                      <div className="flex items-center gap-2">
                        <StatusBadge label={a.alert_type} tone={a.severity === "high" ? "red" : a.severity === "medium" ? "yellow" : "gray"} />
                        <p className="text-sm text-gray-700 dark:text-gray-300">{a.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-500">لا توجد تنبيهات</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
