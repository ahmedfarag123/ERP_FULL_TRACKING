import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../../../components/common/PageMeta";
import {
  AdminPageFrame,
  AdminSection,
  AdminFilterBar,
  AdminEmptyState,
  AdminTableSkeleton,
  AdminMetricGrid,
  AdminMetricCard,
} from "../../../components/admin/AdminPageElements";
import { fetchInvoices, fetchInvoiceMetrics } from "../../../lib/finance-documents";
import type { OdooInvoiceDocument } from "../../../types/finance";

function formatEGP(value: number): string {
  return new Intl.NumberFormat("en-EG", { style: "decimal", minimumFractionDigits: 2 }).format(value);
}

type StatusFilter = "all" | "paid" | "not_paid" | "partial" | "cancelled" | "reversed";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "paid", label: "مدفوع" },
  { key: "not_paid", label: "غير مدفوع" },
  { key: "partial", label: "مدفوع جزئياً" },
  { key: "cancelled", label: "ملغي" },
  { key: "reversed", label: "معكوس" },
];

const PAYMENT_STYLES: Record<string, string> = {
  paid: "text-emerald-700 bg-emerald-50 border border-emerald-200",
  not_paid: "text-amber-700 bg-amber-50 border border-amber-200",
  partial: "text-violet-700 bg-violet-50 border border-violet-200",
  reversed: "text-gray-500 bg-brand-25 border border-gray-200",
};

const PAYMENT_LABELS: Record<string, string> = {
  paid: "مدفوع",
  not_paid: "غير مدفوع",
  partial: "مدفوع جزئياً",
  reversed: "معكوس",
};

const INVOICE_STATE_LABELS: Record<string, string> = {
  draft: "مسودة",
  posted: "مرحل",
  cancel: "ملغي",
};

const PAGE_SIZE = 25;

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["finance", "invoices", statusFilter, page],
    queryFn: () =>
      fetchInvoices({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const invoices = data?.invoices ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.ceil(count / PAGE_SIZE);

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["finance", "invoices", "metrics"],
    queryFn: fetchInvoiceMetrics,
  });

  const filtered = invoices.filter((inv: OdooInvoiceDocument) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoiceName?.toLowerCase().includes(q) ||
      inv.invoiceDate?.includes(q)
    );
  });

  return (
    <>
      <PageMeta title="المالية — فواتير العملاء" description="فواتير العملاء من Odoo" />
      <AdminPageFrame>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">فواتير العملاء</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {count} فاتورة من Odoo
            </p>
          </div>
        </div>

        {/* Metrics — from real data */}
        {!metricsLoading && metrics && (
          <AdminMetricGrid>
            <AdminMetricCard
              label="المستحقات"
              value={formatEGP(metrics.totalOutstanding)}
              tone="blue"
              helper={`${metrics.outstandingCount + metrics.partialCount} فاتورة`}
            />
            <AdminMetricCard
              label="مدفوعة"
              value={formatEGP(metrics.totalPaid)}
              tone="emerald"
              helper={`${metrics.paidCount} فاتورة`}
            />
            <AdminMetricCard
              label="إجمالي الإيرادات"
              value={formatEGP(metrics.totalRevenue)}
              tone="violet"
              helper={`${count} فاتورة إجمالي`}
            />
            <AdminMetricCard
              label="ملغاة / معكوسة"
              value={String(metrics.cancelledCount + metrics.reversedCount)}
              tone="slate"
              helper=""
            />
          </AdminMetricGrid>
        )}

        {/* Filters */}
        <AdminFilterBar>
          <div className="flex items-center gap-4">
            <div className="flex rounded-lg border border-gray-200 bg-brand-25 p-0.5">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setStatusFilter(tab.key); setPage(0); }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === tab.key
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الفاتورة..."
                className="w-64 rounded-lg border border-gray-300 bg-white px-3 py-1.5 pl-9 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <svg className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </AdminFilterBar>

        {/* Invoice Table */}
        <AdminSection>
          {isLoading ? (
            <AdminTableSkeleton columns={8} rows={10} />
          ) : filtered.length === 0 ? (
            <AdminEmptyState
              title="لا توجد فواتير"
              description={searchQuery ? "لا توجد نتائج للبحث" : "لم يتم مزامنة أي فواتير من Odoo بعد"}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-brand-25 text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3">رقم الفاتورة</th>
                      <th className="px-4 py-3">التاريخ</th>
                      <th className="px-4 py-3">النوع</th>
                      <th className="px-4 py-3 text-right">المبلغ</th>
                      <th className="px-4 py-3 text-center">حالة الفاتورة</th>
                      <th className="px-4 py-3 text-center">حالة الدفع</th>
                      <th className="px-4 py-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((inv: OdooInvoiceDocument) => {
                      const paymentStyle = PAYMENT_STYLES[inv.paymentState] ?? PAYMENT_STYLES.not_paid;
                      const paymentLabel = PAYMENT_LABELS[inv.paymentState] ?? inv.paymentState;
                      const stateLabel = INVOICE_STATE_LABELS[inv.invoiceState] ?? inv.invoiceState;
                      const isOutstanding = inv.paymentState === "not_paid" || inv.paymentState === "partial";

                      return (
                        <tr key={inv.id} className="hover:bg-brand-25/50 transition-colors">
                          <td className="px-4 py-3">
                            <Link
                              to={`/finance/invoices/${inv.id}`}
                              className="font-mono text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              {inv.invoiceName}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {inv.invoiceDate ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full bg-brand-25 px-2 py-0.5 text-xs font-medium text-gray-600">
                              {inv.moveType === "out_invoice" ? "فاتورة بيع" : inv.moveType === "out_refund" ? "إشعار دائن" : inv.moveType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-mono text-sm font-medium ${isOutstanding ? "text-amber-700" : "text-gray-900"}`}>
                              {formatEGP(inv.amountTotal)}
                            </span>
                            <span className="mr-1 text-xs text-gray-400">{inv.currencyCode}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              inv.invoiceState === "posted" ? "text-blue-700 bg-blue-50 border border-blue-200" :
                              inv.invoiceState === "cancel" ? "text-gray-500 bg-brand-25 border border-gray-200" :
                              "text-amber-700 bg-amber-50 border border-amber-200"
                            }`}>
                              {stateLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentStyle}`}>
                              {paymentLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Link
                              to={`/finance/invoices/${inv.id}`}
                              className="inline-flex items-center gap-1 rounded p-1 text-gray-400 hover:bg-brand-25/70 hover:text-blue-600"
                              title="عرض التفاصيل"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                  <span className="text-xs text-gray-500">
                    صفحة {page + 1} من {totalPages} — {count} فاتورة
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-brand-25 disabled:opacity-50"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-brand-25 disabled:opacity-50"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </AdminSection>
      </AdminPageFrame>
    </>
  );
}
