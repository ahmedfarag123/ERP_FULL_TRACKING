import { useQuery } from "@tanstack/react-query";
import {
  BanknotesIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../../../components/common/PageMeta";
import {
  AdminPageFrame,
  AdminMetricGrid,
  AdminMetricCard,
  AdminSection,
} from "../../../components/admin/AdminPageElements";
import { AdminTableSkeleton } from "../../../components/admin/AdminPageElements";
import {
  fetchDashboardMetrics,
  fetchRecentJournalEntries,
  fetchRecentInvoices,
  fetchRecentOperationalInvoices,
  fetchRecentOperationalOrders,
  fetchRecentSettlementSummaries,
  type FinanceRecentOperationalInvoice,
  type FinanceRecentOperationalOrder,
  type FinanceRecentSettlement,
} from "../../../lib/finance-reports";
import type { FinanceJournalEntry, FinanceInvoice } from "../../../types/finance";

function formatEGP(value: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "-";
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  posted: { label: "مرحل", color: "text-emerald-600 bg-emerald-50" },
  reversed: { label: "معكوس", color: "text-rose-600 bg-rose-50" },
  draft: { label: "مسودة", color: "text-amber-600 bg-amber-50" },
  approved: { label: "معتمد", color: "text-blue-600 bg-blue-50" },
  paid: { label: "مدفوع", color: "text-emerald-600 bg-emerald-50" },
  not_paid: { label: "غير مدفوع", color: "text-amber-600 bg-amber-50" },
  partial: { label: "مدفوع جزئياً", color: "text-blue-600 bg-blue-50" },
  partially_paid: { label: "مدفوع جزئياً", color: "text-blue-600 bg-blue-50" },
  confirmed: { label: "مؤكد", color: "text-emerald-600 bg-emerald-50" },
  pending: { label: "قيد الانتظار", color: "text-amber-600 bg-amber-50" },
  cancelled: { label: "ملغي", color: "text-gray-600 bg-brand-25" },
  cancel: { label: "ملغي", color: "text-gray-600 bg-brand-25" },
  void: { label: "ملغي", color: "text-gray-600 bg-brand-25" },
  unknown: { label: "غير محدد", color: "text-gray-600 bg-brand-25" },
};

function StatusBadge({ status }: { status: string }) {
  const statusInfo = STATUS_MAP[status] ?? STATUS_MAP.unknown;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
      {statusInfo.label}
    </span>
  );
}

export default function FinanceDashboardPage() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["finance", "dashboard", "metrics"],
    queryFn: fetchDashboardMetrics,
  });

  const { data: recentEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["finance", "dashboard", "recent-entries"],
    queryFn: () => fetchRecentJournalEntries(10),
  });

  const { data: recentInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["finance", "dashboard", "recent-invoices"],
    queryFn: () => fetchRecentInvoices(10),
  });

  const { data: recentOperationalInvoices = [], isLoading: operationalInvoicesLoading } = useQuery({
    queryKey: ["finance", "dashboard", "recent-operational-invoices"],
    queryFn: () => fetchRecentOperationalInvoices(10),
  });

  const { data: recentOperationalOrders = [], isLoading: operationalOrdersLoading } = useQuery({
    queryKey: ["finance", "dashboard", "recent-operational-orders"],
    queryFn: () => fetchRecentOperationalOrders(10),
  });

  const { data: recentSettlements = [], isLoading: settlementsLoading } = useQuery({
    queryKey: ["finance", "dashboard", "recent-settlements"],
    queryFn: () => fetchRecentSettlementSummaries(10),
  });

  const sourceHelper =
    metrics?.dataSource === "operational" ? "من بيانات التشغيل" : "من القيود المحاسبية";

  return (
    <>
      <PageMeta title="المالية - لوحة التحكم" description="لوحة التحكم المالية الرئيسية" />
      <AdminPageFrame>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">لوحة التحكم المالية</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              نظرة عامة على المركز المالي والأداء
            </p>
          </div>
        </div>

        <AdminMetricGrid>
          {metricsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
            ))
          ) : (
            <>
              <AdminMetricCard
                label="الإيرادات الشهرية"
                value={formatEGP(metrics?.totalRevenue ?? 0)}
                helper={sourceHelper}
                icon={<CurrencyDollarIcon className="h-6 w-6" />}
                tone="emerald"
              />
              <AdminMetricCard
                label="المصروفات الشهرية"
                value={formatEGP(metrics?.totalExpenses ?? 0)}
                helper="مصروفات فعلية مسجلة"
                icon={<BanknotesIcon className="h-6 w-6" />}
                tone="rose"
              />
              <AdminMetricCard
                label="صافي الربح"
                value={formatEGP(metrics?.netProfit ?? 0)}
                helper="الإيرادات ناقص المصروفات"
                icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
                tone="blue"
              />
              <AdminMetricCard
                label="المستحقات (AR)"
                value={formatEGP(metrics?.accountsReceivable ?? 0)}
                helper={sourceHelper}
                icon={<DocumentTextIcon className="h-6 w-6" />}
                tone="violet"
              />
            </>
          )}
        </AdminMetricGrid>

        <AdminMetricGrid>
          {metricsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
            ))
          ) : (
            <>
              <AdminMetricCard
                label="المركز النقدي"
                value={formatEGP(metrics?.cashPosition ?? 0)}
                helper={sourceHelper}
                icon={<BanknotesIcon className="h-6 w-6" />}
                tone="emerald"
              />
              <AdminMetricCard
                label="فواتير متأخرة"
                value={metrics?.overdueInvoices ?? 0}
                helper="فواتير مالية مرحلة"
                icon={<ExclamationTriangleIcon className="h-6 w-6" />}
                tone="amber"
              />
              <AdminMetricCard
                label="تسويات معلقة"
                value={metrics?.pendingSettlements ?? 0}
                helper="مسودة أو معتمدة"
                icon={<ClockIcon className="h-6 w-6" />}
                tone="violet"
              />
            </>
          )}
        </AdminMetricGrid>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <AdminSection title="آخر القيود اليومية" description="أحدث القيود أو التسويات الجاهزة للترحيل">
            {entriesLoading ? (
              <AdminTableSkeleton columns={4} rows={5} />
            ) : recentEntries.length > 0 ? (
              <JournalEntriesTable entries={recentEntries} />
            ) : settlementsLoading ? (
              <AdminTableSkeleton columns={4} rows={5} />
            ) : recentSettlements.length > 0 ? (
              <SettlementFallbackTable settlements={recentSettlements} />
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">لا توجد قيود أو تسويات بعد</p>
            )}
          </AdminSection>

          <AdminSection title="آخر الفواتير" description="أحدث الفواتير أو أوامر البيع المتاحة">
            {invoicesLoading ? (
              <AdminTableSkeleton columns={4} rows={5} />
            ) : recentInvoices.length > 0 ? (
              <FinanceInvoicesTable invoices={recentInvoices} />
            ) : operationalInvoicesLoading || operationalOrdersLoading ? (
              <AdminTableSkeleton columns={4} rows={5} />
            ) : recentOperationalInvoices.length > 0 ? (
              <OperationalInvoicesTable invoices={recentOperationalInvoices} />
            ) : recentOperationalOrders.length > 0 ? (
              <OperationalOrdersTable orders={recentOperationalOrders} />
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">لا توجد فواتير أو أوامر بيع بعد</p>
            )}
          </AdminSection>
        </div>
      </AdminPageFrame>
    </>
  );
}

function JournalEntriesTable({ entries }: { entries: FinanceJournalEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="px-3 py-3 font-medium text-gray-500">الرقم</th>
            <th className="px-3 py-3 font-medium text-gray-500">التاريخ</th>
            <th className="px-3 py-3 font-medium text-gray-500">المصدر</th>
            <th className="px-3 py-3 font-medium text-gray-500">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-gray-50 dark:border-gray-800/50">
              <td className="px-3 py-3 font-mono text-xs">{entry.entryNumber}</td>
              <td className="px-3 py-3">{formatDate(entry.entryDate)}</td>
              <td className="px-3 py-3 text-gray-500">{entry.sourceType}</td>
              <td className="px-3 py-3">
                <StatusBadge status={entry.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettlementFallbackTable({ settlements }: { settlements: FinanceRecentSettlement[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="px-3 py-3 font-medium text-gray-500">التسوية</th>
            <th className="px-3 py-3 font-medium text-gray-500">الفترة</th>
            <th className="px-3 py-3 font-medium text-gray-500">القيمة</th>
            <th className="px-3 py-3 font-medium text-gray-500">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {settlements.map((settlement) => (
            <tr key={settlement.id} className="border-b border-gray-50 dark:border-gray-800/50">
              <td className="px-3 py-3 font-mono text-xs">SET-{settlement.id.slice(0, 8)}</td>
              <td className="px-3 py-3">
                {formatDate(settlement.periodStart)} - {formatDate(settlement.periodEnd)}
              </td>
              <td className="px-3 py-3">{formatEGP(settlement.amount)}</td>
              <td className="px-3 py-3">
                <StatusBadge status={settlement.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FinanceInvoicesTable({ invoices }: { invoices: FinanceInvoice[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="px-3 py-3 font-medium text-gray-500">رقم الفاتورة</th>
            <th className="px-3 py-3 font-medium text-gray-500">التاريخ</th>
            <th className="px-3 py-3 font-medium text-gray-500">المبلغ</th>
            <th className="px-3 py-3 font-medium text-gray-500">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-gray-50 dark:border-gray-800/50">
              <td className="px-3 py-3 font-mono text-xs">{invoice.invoiceNumber ?? "مسودة"}</td>
              <td className="px-3 py-3">{formatDate(invoice.issueDate)}</td>
              <td className="px-3 py-3">{formatEGP(invoice.total)}</td>
              <td className="px-3 py-3">
                <StatusBadge status={invoice.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OperationalInvoicesTable({ invoices }: { invoices: FinanceRecentOperationalInvoice[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="px-3 py-3 font-medium text-gray-500">فاتورة أودو</th>
            <th className="px-3 py-3 font-medium text-gray-500">التاريخ</th>
            <th className="px-3 py-3 font-medium text-gray-500">المبلغ</th>
            <th className="px-3 py-3 font-medium text-gray-500">الدفع</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-gray-50 dark:border-gray-800/50">
              <td className="px-3 py-3 font-mono text-xs">{invoice.invoiceName}</td>
              <td className="px-3 py-3">{formatDate(invoice.invoiceDate)}</td>
              <td className="px-3 py-3">{formatEGP(invoice.amount)}</td>
              <td className="px-3 py-3">
                <StatusBadge status={invoice.paymentState} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OperationalOrdersTable({ orders }: { orders: FinanceRecentOperationalOrder[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="px-3 py-3 font-medium text-gray-500">أمر البيع</th>
            <th className="px-3 py-3 font-medium text-gray-500">العميل</th>
            <th className="px-3 py-3 font-medium text-gray-500">المبلغ</th>
            <th className="px-3 py-3 font-medium text-gray-500">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-gray-50 dark:border-gray-800/50">
              <td className="px-3 py-3">
                <div className="font-mono text-xs">{order.reference}</div>
                <div className="mt-1 text-xs text-gray-400">{formatDate(order.orderDate)}</div>
              </td>
              <td className="px-3 py-3 text-gray-500">{order.customerName ?? "-"}</td>
              <td className="px-3 py-3">{formatEGP(order.amount)}</td>
              <td className="px-3 py-3">
                <StatusBadge status={order.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
