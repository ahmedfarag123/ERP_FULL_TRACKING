import { useQuery } from "@tanstack/react-query";
import PageMeta from "../../../components/common/PageMeta";
import {
  AdminPageFrame,
  AdminSection,
  AdminEmptyState,
  AdminTableSkeleton,
  AdminMetricGrid,
  AdminMetricCard,
} from "../../../components/admin/AdminPageElements";
import { fetchDashboardMetrics, fetchARAging } from "../../../lib/finance-reports";

function formatEGP(value: number): string {
  return new Intl.NumberFormat("en-EG", { style: "decimal", minimumFractionDigits: 2 }).format(value);
}

export default function ReceivablesPage() {
  const { data: metrics } = useQuery({
    queryKey: ["finance", "dashboard", "metrics"],
    queryFn: fetchDashboardMetrics,
  });

  const { data: aging = [], isLoading: agingLoading } = useQuery({
    queryKey: ["finance", "receivables", "aging"],
    queryFn: fetchARAging,
  });

  const totalAR = aging.reduce((sum, bucket) => sum + bucket.amount, 0);

  return (
    <>
      <PageMeta title="المالية — الذمم المدينة" description="إدارة حسابات العملاء والذمم المدينة" />
      <AdminPageFrame>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">الذمم المدينة</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              أعمار الذمم المدينة ورصيد الحسابات
            </p>
          </div>
        </div>

        <AdminMetricGrid>
          <AdminMetricCard
            label="إجمالي الذمم المدينة"
            value={formatEGP(metrics?.accountsReceivable ?? totalAR)}
            tone="blue"
          />
          <AdminMetricCard
            label="فواتير متأخرة"
            value={metrics?.overdueInvoices ?? 0}
            tone="amber"
          />
        </AdminMetricGrid>

        <AdminSection title="أعمار الذمم المدينة" description="تصنيف المستحقات حسب الفترة الزمنية">
          {agingLoading ? (
            <AdminTableSkeleton columns={3} rows={5} />
          ) : aging.length === 0 ? (
            <AdminEmptyState
              title="لا توجد ذمم مدينة"
              description="لم يتم تسجيل أي فواتير مستحقة بعد"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-5 py-3 font-medium text-gray-500">الفترة</th>
                    <th className="px-5 py-3 font-medium text-gray-500">المبلغ</th>
                    <th className="px-5 py-3 font-medium text-gray-500">عدد الفواتير</th>
                    <th className="px-5 py-3 font-medium text-gray-500">النسبة</th>
                  </tr>
                </thead>
                <tbody>
                  {aging.map((bucket) => {
                    const pct = totalAR > 0 ? (bucket.amount / totalAR) * 100 : 0;
                    return (
                      <tr key={bucket.label} className="border-b border-gray-50 dark:border-gray-800/50">
                        <td className="px-5 py-3.5 font-medium">{bucket.label}</td>
                        <td className="px-5 py-3.5">{formatEGP(bucket.amount)}</td>
                        <td className="px-5 py-3.5 text-gray-500">{bucket.invoiceCount}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-white/[0.04]">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-medium">
                    <td className="px-5 py-3.5">الإجمالي</td>
                    <td className="px-5 py-3.5">{formatEGP(totalAR)}</td>
                    <td className="px-5 py-3.5">{aging.reduce((s, b) => s + b.invoiceCount, 0)}</td>
                    <td className="px-5 py-3.5">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      </AdminPageFrame>
    </>
  );
}
