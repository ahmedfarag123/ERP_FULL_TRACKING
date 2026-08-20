import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  fetchRetentionSummary,
  fetchRetentionDetails,
  type RetentionSummaryRow,
  type RetentionDetailRow,
} from "../../lib/analytics-api";
import StatCard from "../ui/StatCard";
import StatusBadge from "../ui/StatusBadge";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

function fmt(n: number) { return n.toLocaleString("ar-EG", { maximumFractionDigits: 0 }); }

const RETENTION_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

interface Props {
  month: string;
  company_name?: string;
  salesperson?: string;
}

export default function RetentionPanel({ month, company_name, salesperson }: Props) {
  const [summary, setSummary] = useState<RetentionSummaryRow | null>(null);
  const [details, setDetails] = useState<RetentionDetailRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchRetentionSummary({ month, company_name, salesperson }).catch(() => []),
      fetchRetentionDetails({ month, company_name, salesperson, limit: 50 }).catch(() => []),
    ]).then(([s, d]) => {
      setSummary(s[0] ?? null);
      setDetails(d);
      setLoading(false);
    });
  }, [month, company_name, salesperson]);

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-brand-25" />)}</div>;
  }

  const pieData = summary ? [
    { name: "احتفاظ بنفس المندوب", value: summary.retained_with_same_rep, color: RETENTION_COLORS[0] },
    { name: "نقل العملاء", value: summary.transferred_customers, color: RETENTION_COLORS[2] },
    { name: "عملاء مفقودين", value: summary.true_lost_customers, color: RETENTION_COLORS[3] },
    { name: "عملاء جدد", value: summary.new_customers, color: RETENTION_COLORS[1] },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="العملاء السابقون" value={fmt(summary.previous_active_customers)} icon={<ArrowPathIcon className="h-5 w-5" />} tone="blue" />
            <StatCard label="الاحتفاظ" value={`${summary.company_retention_rate.toFixed(1)}%`} icon={<ArrowPathIcon className="h-5 w-5" />} tone="green" />
            <StatCard label="نفس المندوب" value={`${summary.same_rep_retention_rate.toFixed(1)}%`} icon={<ArrowPathIcon className="h-5 w-5" />} tone="purple" />
            <StatCard label="إيرادات المفقودين" value={fmt(summary.lost_customer_revenue_egp)} icon={<ArrowPathIcon className="h-5 w-5" />} tone="red" />
          </div>

          {pieData.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.02]">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">توزيع الاحتفاظ</h3>
              <div className="flex items-center gap-8">
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} stroke="none" paddingAngle={2}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any, name: any) => [`${v} عميل`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-3">
                  {pieData.map(d => (
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
        </>
      )}

      {details.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">تفاصيل الاحتفاظ</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm" dir="rtl">
              <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
                <tr>
                  {["العميل", "المندوب السابق", "المندوب الحالي", "الحالة", "طلبات (سابق)", "طلبات (حالي)", "مبيعات (سابق)", "مبيعات (حالي)", "التغيير %"].map(h => <th key={h} className="px-3 py-2.5">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {details.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-brand-25/50">
                    <td className="px-3 py-2.5 font-medium">{r.customer_name}</td>
                    <td className="px-3 py-2.5">{r.previous_salesperson}</td>
                    <td className="px-3 py-2.5">{r.current_salesperson}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge
                        label={r.retention_status}
                        tone={r.retention_status === "retained" ? "green" : r.retention_status === "transferred" ? "blue" : "red"}
                      />
                    </td>
                    <td className="px-3 py-2.5">{fmt(r.previous_orders)}</td>
                    <td className="px-3 py-2.5">{fmt(r.current_orders)}</td>
                    <td className="px-3 py-2.5">{fmt(r.previous_sales)}</td>
                    <td className="px-3 py-2.5">{fmt(r.current_sales)}</td>
                    <td className="px-3 py-2.5">{r.sales_change_pct != null ? `${r.sales_change_pct.toFixed(1)}%` : "—"}</td>
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
