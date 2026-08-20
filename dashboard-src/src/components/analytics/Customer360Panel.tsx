import { useEffect, useState } from "react";
import {
  fetchCustomerOrders,
  fetchCustomerFavoriteProducts,
  fetchCustomerActionCenter,
  type CustomerOrderRow,
  type FavoriteProductRow,
  type ActionCenterRow,
} from "../../lib/analytics-api";
import StatCard from "../ui/StatCard";
import StatusBadge from "../ui/StatusBadge";
import { ShoppingBagIcon, HeartIcon, ExclamationTriangleIcon, ClockIcon, CurrencyDollarIcon, UserIcon } from "@heroicons/react/24/outline";

type C360Tab = "overview" | "orders" | "products" | "risk";

function fmt(n: number) { return n.toLocaleString("ar-EG", { maximumFractionDigits: 0 }); }

interface Props {
  customer_id: number;
  customer_name: string;
  company_name: string;
  salesperson: string;
  status: string;
  orders_count: number;
  sales_value: number;
  avg_order: number;
  last_order: string;
  days_since: number;
  start_date: string;
  end_date: string;
  onClose: () => void;
}

export default function Customer360Panel({
  customer_id, customer_name, company_name, salesperson, status,
  orders_count, sales_value, avg_order, last_order, days_since,
  start_date, end_date, onClose,
}: Props) {
  const [tab, setTab] = useState<C360Tab>("overview");
  const [orders, setOrders] = useState<CustomerOrderRow[]>([]);
  const [products, setProducts] = useState<FavoriteProductRow[]>([]);
  const [action, setAction] = useState<ActionCenterRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchCustomerOrders({ customer_id, start_date, end_date, company_name, limit: 20 }).catch(() => []),
      fetchCustomerFavoriteProducts({ customer_id, start_date, end_date, company_name, limit: 10 }).catch(() => []),
      fetchCustomerActionCenter({ company_name, limit: 1 }).catch(() => []),
    ]).then(([o, p, a]) => {
      setOrders(o);
      setProducts(p);
      setAction(a[0] ?? null);
      setLoading(false);
    });
  }, [customer_id, start_date, end_date, company_name]);

  const tabs: { id: C360Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "نظرة عامة", icon: <UserIcon className="h-4 w-4" /> },
    { id: "orders", label: "الطلبات", icon: <ShoppingBagIcon className="h-4 w-4" /> },
    { id: "products", label: "المنتجات المفضلة", icon: <HeartIcon className="h-4 w-4" /> },
    { id: "risk", label: "التقييم", icon: <ExclamationTriangleIcon className="h-4 w-4" /> },
  ];

  const statusTone = status === "active" ? "green" : status === "inactive" ? "yellow" : "red";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{customer_name}</h2>
              <StatusBadge label={status} tone={statusTone} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{company_name} • {salesperson}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">✕</button>
        </div>

        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 px-6">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition border-b-2 ${
                tab === t.id ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-brand-25" />)}
            </div>
          ) : tab === "overview" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="الطلبات" value={fmt(orders_count)} icon={<ShoppingBagIcon className="h-5 w-5" />} tone="blue" />
                <StatCard label="المبيعات" value={fmt(sales_value)} icon={<CurrencyDollarIcon className="h-5 w-5" />} tone="green" />
                <StatCard label="متوسط الطلب" value={fmt(avg_order)} icon={<CurrencyDollarIcon className="h-5 w-5" />} tone="purple" />
                <StatCard label="آخر طلب" value={`${days_since} يوم`} icon={<ClockIcon className="h-5 w-5" />} tone={days_since > 30 ? "red" : "green"} />
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.02]">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">آخر الطلبات</h3>
                {orders.length ? (
                  <table className="min-w-full text-right text-sm" dir="rtl">
                    <thead className="text-xs text-gray-400">
                      <tr>
                        {["رقم الطلب", "التاريخ", "القيمة", "المنتجات", "الحالة"].map(h => <th key={h} className="px-3 py-2">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((o, i) => (
                        <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="px-3 py-2 font-medium">{o.order_name}</td>
                          <td className="px-3 py-2" dir="ltr">{o.order_date}</td>
                          <td className="px-3 py-2">{fmt(o.order_value)}</td>
                          <td className="px-3 py-2">{o.products_count}</td>
                          <td className="px-3 py-2"><StatusBadge label={o.order_status} tone={o.order_status === "delivered" ? "green" : "blue"} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-sm text-gray-500">لا توجد طلبات</p>}
              </div>
            </div>
          ) : tab === "orders" ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-right text-sm" dir="rtl">
                <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
                  <tr>
                    {["رقم الطلب", "التاريخ", "الشركة", "المندوب", "القيمة", "المنتجات", "الكمية", "الحالة"].map(h => <th key={h} className="px-3 py-2.5">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-brand-25/50">
                      <td className="px-3 py-2.5 font-medium">{o.order_name}</td>
                      <td className="px-3 py-2.5" dir="ltr">{o.order_date}</td>
                      <td className="px-3 py-2.5">{o.company_name}</td>
                      <td className="px-3 py-2.5">{o.salesperson}</td>
                      <td className="px-3 py-2.5 font-semibold">{fmt(o.order_value)}</td>
                      <td className="px-3 py-2.5">{o.products_count}</td>
                      <td className="px-3 py-2.5">{fmt(o.total_qty)}</td>
                      <td className="px-3 py-2.5"><StatusBadge label={o.order_status} tone={o.order_status === "delivered" ? "green" : "blue"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : tab === "products" ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-right text-sm" dir="rtl">
                <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
                  <tr>
                    {["المنتج", "المبيعات", "الطلبات", "الكمية", "الحصة %", "آخر طلب"].map(h => <th key={h} className="px-3 py-2.5">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-brand-25/50">
                      <td className="px-3 py-2.5 font-medium">{p.product_name}</td>
                      <td className="px-3 py-2.5 font-semibold">{fmt(p.sales_value)}</td>
                      <td className="px-3 py-2.5">{p.orders_count}</td>
                      <td className="px-3 py-2.5">{fmt(p.quantity)}</td>
                      <td className="px-3 py-2.5">{p.sales_share_pct.toFixed(1)}%</td>
                      <td className="px-3 py-2.5" dir="ltr">{p.last_order_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              {action ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="المخاطر" value={action.risk_level} icon={<ExclamationTriangleIcon className="h-5 w-5" />} tone={action.risk_level === "high" ? "red" : action.risk_level === "medium" ? "yellow" : "green"} />
                  <StatCard label="الإجراء" value={action.action_type} icon={<ExclamationTriangleIcon className="h-5 w-5" />} tone="blue" />
                  <StatCard label="مبيعات 30 يوم" value={fmt(action.recent_30d_sales)} icon={<CurrencyDollarIcon className="h-5 w-5" />} tone="green" />
                  <StatCard label="فرصة التعافي" value={fmt(action.recovery_opportunity)} icon={<CurrencyDollarIcon className="h-5 w-5" />} tone="purple" />
                </div>
              ) : <p className="text-sm text-gray-500">لا توجد بيانات تقييم</p>}
              {action && (
                <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.02]">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">سبب الإجراء</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{action.action_reason}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
