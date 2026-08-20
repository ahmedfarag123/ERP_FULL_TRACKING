import { useEffect, useState } from "react";
import {
  fetchSalesRepCustomers,
  fetchSalesRepRetentionDetails,
  fetchDailyActions,
  fetchRecoveryPipeline,
  type SalesRepCustomerRow,
  type RetentionDetailRow,
  type DailyActionRow,
  type RecoveryPipelineRow,
} from "../../lib/analytics-api";
import StatCard from "../ui/StatCard";
import StatusBadge from "../ui/StatusBadge";
import { UsersIcon, ArrowPathIcon, ExclamationTriangleIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";

type DetailTab = "customers" | "retention" | "actions" | "recovery";

function fmt(n: number) {
  return n.toLocaleString("ar-EG", { maximumFractionDigits: 0 });
}

interface Props {
  salesperson: string;
  company_name: string;
  month: string;
  onClose: () => void;
}

export default function SalesRepDetailPanel({ salesperson, company_name, month, onClose }: Props) {
  const [tab, setTab] = useState<DetailTab>("customers");
  const [customers, setCustomers] = useState<SalesRepCustomerRow[]>([]);
  const [retention, setRetention] = useState<RetentionDetailRow[]>([]);
  const [actions, setActions] = useState<DailyActionRow[]>([]);
  const [recovery, setRecovery] = useState<RecoveryPipelineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchSalesRepCustomers({ month, salesperson, company_name, limit: 50 }).catch(() => []),
      fetchSalesRepRetentionDetails({ month, salesperson, company_name, limit: 50 }).catch(() => []),
      fetchDailyActions({ salesperson, company_name, limit: 30 }).catch(() => []),
      fetchRecoveryPipeline({ salesperson, company_name, limit: 20 }).catch(() => []),
    ]).then(([c, r, a, rv]) => {
      setCustomers(c);
      setRetention(r);
      setActions(a);
      setRecovery(rv);
      setLoading(false);
    });
  }, [salesperson, company_name, month]);

  const tabs: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
    { id: "customers", label: "العملاء", icon: <UsersIcon className="h-4 w-4" /> },
    { id: "retention", label: "الاحتفاظ", icon: <ArrowPathIcon className="h-4 w-4" /> },
    { id: "actions", label: "الإجراءات", icon: <ExclamationTriangleIcon className="h-4 w-4" /> },
    { id: "recovery", label: "التعافي", icon: <CurrencyDollarIcon className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{salesperson}</h2>
            <p className="text-xs text-gray-500">{company_name} • {month}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">✕</button>
        </div>

        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition border-b-2 ${
                tab === t.id
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-brand-25" />
              ))}
            </div>
          ) : tab === "customers" ? (
            <CustomersTab data={customers} />
          ) : tab === "retention" ? (
            <RetentionTab data={retention} />
          ) : tab === "actions" ? (
            <ActionsTab data={actions} />
          ) : (
            <RecoveryTab data={recovery} />
          )}
        </div>
      </div>
    </div>
  );
}

function CustomersTab({ data }: { data: SalesRepCustomerRow[] }) {
  if (!data.length) return <p className="text-sm text-gray-500">لا توجد بيانات</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-right text-sm" dir="rtl">
        <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
          <tr>
            {["العميل", "الشركة", "الطلبات", "المبيعات", "متوسط الطلب", "أول طلب", "آخر طلب"].map((h) => (
              <th key={h} className="px-3 py-2.5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-brand-25/50 dark:hover:bg-white/[0.02]">
              <td className="px-3 py-2.5 font-medium">{r.customer_name}</td>
              <td className="px-3 py-2.5">{r.company_name}</td>
              <td className="px-3 py-2.5">{fmt(r.orders_count)}</td>
              <td className="px-3 py-2.5 font-semibold">{fmt(r.sales_value)}</td>
              <td className="px-3 py-2.5">{fmt(r.average_order_value)}</td>
              <td className="px-3 py-2.5" dir="ltr">{r.first_order_date}</td>
              <td className="px-3 py-2.5" dir="ltr">{r.last_order_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RetentionTab({ data }: { data: RetentionDetailRow[] }) {
  if (!data.length) return <p className="text-sm text-gray-500">لا توجد بيانات</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-right text-sm" dir="rtl">
        <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
          <tr>
            {["العميل", "المندوب السابق", "المندوب الحالي", "الحالة", "الطلبات (سابق)", "الطلبات (حالي)", "التغيير %"].map((h) => (
              <th key={h} className="px-3 py-2.5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
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
              <td className="px-3 py-2.5">{r.sales_change_pct != null ? `${r.sales_change_pct.toFixed(1)}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionsTab({ data }: { data: DailyActionRow[] }) {
  if (!data.length) return <p className="text-sm text-gray-500">لا توجد إجراءات</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-right text-sm" dir="rtl">
        <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
          <tr>
            {["#", "العميل", "النوع", "الأولوية", "المخاطر", "آخر طلب", "أيام", "فرصة التعافي"].map((h) => (
              <th key={h} className="px-3 py-2.5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
              <td className="px-3 py-2.5 text-gray-400">{r.action_rank}</td>
              <td className="px-3 py-2.5 font-medium">{r.customer_name}</td>
              <td className="px-3 py-2.5">
                <StatusBadge
                  label={r.action_type}
                  tone={r.action_type.includes("REACTIVATE") ? "red" : r.action_type.includes("WIN_BACK") ? "yellow" : "blue"}
                />
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge
                  label={r.priority}
                  tone={r.priority === "high" ? "red" : r.priority === "medium" ? "yellow" : "gray"}
                />
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge label={r.risk} tone={r.risk === "high" ? "red" : r.risk === "medium" ? "yellow" : "green"} />
              </td>
              <td className="px-3 py-2.5" dir="ltr">{r.last_order_date}</td>
              <td className="px-3 py-2.5">{r.days_since_last_order}</td>
              <td className="px-3 py-2.5 font-semibold">{fmt(r.recovery_opportunity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecoveryTab({ data }: { data: RecoveryPipelineRow[] }) {
  if (!data.length) return <p className="text-sm text-gray-500">لا توجد فرص تعافي</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-right text-sm" dir="rtl">
        <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
          <tr>
            {["العميل", "الشركة", "فرصة التعافي", "المخاطر", "النوع", "آخر طلب", "الأيام"].map((h) => (
              <th key={h} className="px-3 py-2.5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
              <td className="px-3 py-2.5 font-medium">{r.customer_name}</td>
              <td className="px-3 py-2.5">{r.company_name}</td>
              <td className="px-3 py-2.5 font-semibold text-brand-600">{fmt(r.recovery_opportunity)}</td>
              <td className="px-3 py-2.5">
                <StatusBadge label={r.risk} tone={r.risk === "high" ? "red" : r.risk === "medium" ? "yellow" : "green"} />
              </td>
              <td className="px-3 py-2.5">{r.action_type}</td>
              <td className="px-3 py-2.5" dir="ltr">{r.last_order_date}</td>
              <td className="px-3 py-2.5">{r.days_since_last_order}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
