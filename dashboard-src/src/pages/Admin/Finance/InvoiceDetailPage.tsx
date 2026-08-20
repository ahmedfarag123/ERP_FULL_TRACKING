import { useState } from "react";
import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import PageMeta from "../../../components/common/PageMeta";
import {
  AdminPageFrame,
  AdminSection,
  AdminMetricGrid,
  AdminMetricCard,
} from "../../../components/admin/AdminPageElements";
import { fetchInvoiceWithOrder } from "../../../lib/finance-documents";

function formatEGP(value: number): string {
  return new Intl.NumberFormat("en-EG", { style: "decimal", minimumFractionDigits: 2 }).format(value);
}

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

type TabKey = "lines" | "order";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>("lines");

  const { data, isLoading } = useQuery({
    queryKey: ["finance", "invoice", id],
    queryFn: () => fetchInvoiceWithOrder(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <AdminPageFrame>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
          ))}
        </div>
      </AdminPageFrame>
    );
  }

  if (!data) return null;

  const { invoice, order, lines } = data;
  const paymentStyle = PAYMENT_STYLES[invoice.paymentState] ?? PAYMENT_STYLES.not_paid;
  const paymentLabel = PAYMENT_LABELS[invoice.paymentState] ?? invoice.paymentState;

  // Calculate totals from order lines
  const subtotal = lines.reduce((s, l) => s + (l.subtotalAmount ?? l.totalAmount ?? 0), 0);
  const totalDiscount = lines.reduce((s, l) => {
    const base = l.unitPrice * l.orderedQuantity;
    return s + (base * (l.discountPercent ?? 0)) / 100;
  }, 0);
  const totalTax = invoice.amountTotal - subtotal + totalDiscount;
  const orderTotal = order ? order.amountTotal ?? order.totalAmount : 0;

  return (
    <>
      <PageMeta
        title={`الفاتورة ${invoice.invoiceName}`}
        description="تفاصيل فاتورة العميل"
      />
      <AdminPageFrame>
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            to="/finance/invoices"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-brand-25/70 hover:text-gray-600"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {invoice.invoiceName}
              </h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentStyle}`}>
                {paymentLabel}
              </span>
              {invoice.invoiceState === "cancel" && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  ملغي
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
              <span>{invoice.invoiceDate ?? "—"}</span>
              <span>{invoice.currencyCode}</span>
              {invoice.partnerRef && <span>مرجع: {invoice.partnerRef}</span>}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <AdminMetricGrid>
          <AdminMetricCard
            label="المبلغ الإجمالي"
            value={formatEGP(invoice.amountTotal)}
            tone="blue"
            helper={invoice.currencyCode}
          />
          {order && (
            <>
              <AdminMetricCard
                label="المبلغ قبل الضريبة"
                value={formatEGP(order.amountUntaxed ?? subtotal)}
                tone="violet"
              />
              <AdminMetricCard
                label="الخصم"
                value={formatEGP(orderTotal - (order.amountUntaxed ?? subtotal))}
                tone="amber"
              />
            </>
          )}
          <AdminMetricCard
            label="بنود الفاتورة"
            value={String(lines.length)}
            tone="slate"
            helper="بند"
          />
        </AdminMetricGrid>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            {[
              { key: "lines" as TabKey, label: "بنود الطلب", count: lines.length },
              { key: "order" as TabKey, label: "الطلب المرتبط" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="mr-1.5 inline-flex items-center rounded-full bg-brand-25 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "lines" && (
          <AdminSection title="بنود الطلب">
            {lines.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-500">لا توجد بنود مرتبطة بهذا الطلب</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-brand-25 text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="px-5 py-3">#</th>
                      <th className="px-5 py-3">المنتج</th>
                      <th className="px-5 py-3 text-right">الكمية</th>
                      <th className="px-5 py-3 text-right">سعر الوحدة</th>
                      <th className="px-5 py-3 text-right">الخصم %</th>
                      <th className="px-5 py-3 text-right">المجموع الفرعي</th>
                      <th className="px-5 py-3 text-right">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.map((line, idx) => (
                      <tr key={line.id} className="hover:bg-brand-25">
                        <td className="px-5 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-5 py-3">
                          <div>
                            <div className="font-medium text-gray-900">{line.productName}</div>
                            {line.productCode && (
                              <div className="text-xs text-gray-500">كود: {line.productCode}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-mono">{line.orderedQuantity}</td>
                        <td className="px-5 py-3 text-right font-mono">{formatEGP(line.unitPrice)}</td>
                        <td className="px-5 py-3 text-right font-mono">
                          {line.discountPercent > 0 ? (
                            <span className="text-red-600">{line.discountPercent}%</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-mono">
                          {formatEGP(line.subtotalAmount)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-medium">
                          {formatEGP(line.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-brand-25">
                    <tr>
                      <td colSpan={5} className="px-5 py-3 text-right text-xs font-medium uppercase text-gray-500">
                        المجموع الفرعي
                      </td>
                      <td className="px-5 py-3 text-right font-mono">{formatEGP(subtotal)}</td>
                      <td />
                    </tr>
                    {totalDiscount > 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-3 text-right text-xs font-medium uppercase text-gray-500">
                          الخصم
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-red-600">
                          -{formatEGP(totalDiscount)}
                        </td>
                        <td />
                      </tr>
                    )}
                    {totalTax > 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-3 text-right text-xs font-medium uppercase text-gray-500">
                          الضريبة
                        </td>
                        <td className="px-5 py-3 text-right font-mono">{formatEGP(totalTax)}</td>
                        <td />
                      </tr>
                    )}
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan={5} className="px-5 py-3 text-right text-sm font-bold uppercase text-gray-900">
                        الإجمالي
                      </td>
                      <td />
                      <td className="px-5 py-3 text-right font-mono text-lg font-bold">
                        {formatEGP(invoice.amountTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </AdminSection>
        )}

        {activeTab === "order" && (
          <AdminSection title="الطلب المرتبط">
            {order ? (
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div>
                    <dt className="font-medium text-gray-500">رقم الطلب</dt>
                    <dd className="mt-1">
                      <Link
                        to={`/orders/${order.id}`}
                        className="font-mono text-blue-600 hover:text-blue-800"
                      >
                        {order.odooOrderName ?? order.id.slice(0, 8)}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">العميل</dt>
                    <dd className="mt-1">{order.customerName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">المصدر</dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center rounded-full bg-brand-25 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {order.source}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">تاريخ الطلب</dt>
                    <dd className="mt-1">{order.orderDate ?? "—"}</dd>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <dt className="font-medium text-gray-500">الحالة</dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {order.status}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">حالة الفوترة</dt>
                    <dd className="mt-1">{order.invoiceStatus ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">المبلغ الإجمالي</dt>
                    <dd className="mt-1 font-mono font-medium">{formatEGP(order.amountTotal ?? order.totalAmount)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">المبلغ غير شامل الضريبة</dt>
                    <dd className="mt-1 font-mono">{formatEGP(order.amountUntaxed ?? 0)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">المبلغ المتبقي للفوترة</dt>
                    <dd className="mt-1 font-mono text-amber-600">{formatEGP(order.amountToInvoice ?? 0)}</dd>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-500">لا توجد بيانات طلب مرتبطة</p>
              </div>
            )}
          </AdminSection>
        )}
      </AdminPageFrame>
    </>
  );
}
