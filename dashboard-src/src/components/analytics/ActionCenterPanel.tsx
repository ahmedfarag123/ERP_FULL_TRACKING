import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  fetchCustomerActionCenter,
  fetchActionSummary,
  fetchRecoveryPipeline,
  type ActionCenterRow,
  type ActionSummaryRow,
  type RecoveryPipelineRow,
} from "../../lib/analytics-api";
import StatCard from "../ui/StatCard";
import StatusBadge from "../ui/StatusBadge";
import { ExclamationTriangleIcon, CurrencyDollarIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

function fmt(n: number) { return n.toLocaleString("ar-EG", { maximumFractionDigits: 0 }); }

const RISK_COLORS: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };
const ACTION_COLORS: Record<string, string> = { REACTIVATE_LOST: "#ef4444", WIN_BACK: "#f59e0b", RECOVER_DECLINE: "#3b82f6", OVERDUE_FOLLOWUP: "#8b5cf6" };

interface Props {
  company_name?: string;
  salesperson?: string;
  start_date: string;
  end_date: string;
}

export default function ActionCenterPanel({ company_name, salesperson, start_date, end_date }: Props) {
  const [actions, setActions] = useState<ActionCenterRow[]>([]);
  const [summary, setSummary] = useState<ActionSummaryRow | null>(null);
  const [recovery, setRecovery] = useState<RecoveryPipelineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchCustomerActionCenter({ company_name, salesperson, limit: 50 }).catch(() => []),
      fetchActionSummary({ company_name, salesperson }).catch(() => []),
      fetchRecoveryPipeline({ company_name, salesperson, limit: 20 }).catch(() => []),
    ]).then(([a, s, r]) => {
      setActions(a);
      setSummary(s[0] ?? null);
      setRecovery(r);
      setLoading(false);
    });
  }, [company_name, salesperson, start_date, end_date]);

  const riskData = [
    { name: "عالي", value: actions.filter(a => a.risk_level === "high").length, color: "#ef4444" },
    { name: "متوسط", value: actions.filter(a => a.risk_level === "medium").length, color: "#f59e0b" },
    { name: "منخفض", value: actions.filter(a => a.risk_level === "low").length, color: "#10b981" },
  ].filter(d => d.value > 0);

  const actionTypeData = Object.entries(
    actions.reduce((acc, a) => { acc[a.action_type] = (acc[a.action_type] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value, color: ACTION_COLORS[name] || "#6b7280" }));

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-brand-25" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <StatCard label="إجمالي الإجراءات" value={fmt(summary.total_actions)} icon={<ExclamationTriangleIcon className="h-5 w-5" />} tone="blue" />
          <StatCard label="عالي الأولوية" value={fmt(summary.high_priority)} icon={<ExclamationTriangleIcon className="h-5 w-5" />} tone="red" />
          <StatCard label="متوسط الأولوية" value={fmt(summary.medium_priority)} icon={<ExclamationTriangleIcon className="h-5 w-5" />} tone="yellow" />
          <StatCard label="منخفض الأولوية" value={fmt(summary.low_priority)} icon={<ExclamationTriangleIcon className="h-5 w-5" />} tone="green" />
          <StatCard label="إجمالي التعافي" value={fmt(summary.total_recovery)} icon={<CurrencyDollarIcon className="h-5 w-5" />} tone="purple" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {riskData.length > 0 && (
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.02]">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">توزيع المخاطر</h3>
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} stroke="none">
                      {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, name: any) => [`${v} عميل`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2">
                {riskData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm text-gray-600">{d.name}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {actionTypeData.length > 0 && (
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.02]">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">أنواع الإجراءات</h3>
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={actionTypeData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} stroke="none">
                      {actionTypeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, name: any) => [`${v} عميل`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2">
                {actionTypeData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm text-gray-600">{d.name.replace(/_/g, " ")}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {recovery.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800 flex items-center gap-2">
            <ArrowPathIcon className="h-4 w-4 text-brand-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">فرص التعافي</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm" dir="rtl">
              <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
                <tr>
                  {["العميل", "الشركة", "فرصة التعافي", "المخاطر", "الإجراء", "آخر طلب", "الأيام"].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {recovery.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-brand-25/50">
                    <td className="px-4 py-3 font-medium">{r.customer_name}</td>
                    <td className="px-4 py-3">{r.company_name}</td>
                    <td className="px-4 py-3 font-bold text-brand-600">{fmt(r.recovery_opportunity)}</td>
                    <td className="px-4 py-3"><StatusBadge label={r.risk} tone={r.risk === "high" ? "red" : r.risk === "medium" ? "yellow" : "green"} /></td>
                    <td className="px-4 py-3">{r.action_type?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3" dir="ltr">{r.last_order_date}</td>
                    <td className="px-4 py-3">{r.days_since_last_order}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">جميع الإجراءات</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm" dir="rtl">
              <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
                <tr>
                  {["#", "العميل", "المندوب", "النوع", "الأولوية", "المخاطر", "آخر طلب", "الأيام", "التعافي"].map(h => <th key={h} className="px-3 py-2.5">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {actions.map((a, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-brand-25/50">
                    <td className="px-3 py-2.5 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">{a.customer_name}</td>
                    <td className="px-3 py-2.5">{a.current_salesperson}</td>
                    <td className="px-3 py-2.5"><StatusBadge label={a.action_type?.replace(/_/g, " ") || ""} tone="blue" /></td>
                    <td className="px-3 py-2.5"><StatusBadge label={a.priority} tone={a.priority === "high" ? "red" : a.priority === "medium" ? "yellow" : "gray"} /></td>
                    <td className="px-3 py-2.5"><StatusBadge label={a.risk_level} tone={a.risk_level === "high" ? "red" : a.risk_level === "medium" ? "yellow" : "green"} /></td>
                    <td className="px-3 py-2.5" dir="ltr">{a.last_order_date}</td>
                    <td className="px-3 py-2.5">{a.days_since_last_order}</td>
                    <td className="px-3 py-2.5 font-semibold">{fmt(a.recovery_opportunity)}</td>
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
