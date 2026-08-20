import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageMeta from "../../../components/common/PageMeta";
import {
  AdminPageFrame,
  AdminSection,
  AdminEmptyState,
  AdminFilterBar,
  AdminTableSkeleton,
  AdminMetricGrid,
  AdminMetricCard,
} from "../../../components/admin/AdminPageElements";
import {
  fetchProfitAndLoss,
  fetchBalanceSheet,
  fetchTrialBalance,
  fetchARAging,
  fetchARAgingDetailed,
  fetchGeneralLedger,
  refreshAccountBalances,
} from "../../../lib/finance-reports";
import type { PAndLRow } from "../../../types/finance";

function formatEGP(value: number): string {
  return new Intl.NumberFormat("en-EG", { style: "decimal", minimumFractionDigits: 2 }).format(value);
}

function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: first.toISOString().split("T")[0],
    to: now.toISOString().split("T")[0],
  };
}

type ReportType = "pnl" | "balance-sheet" | "trial-balance" | "aging" | "gl";

const REPORT_TABS: { key: ReportType; label: string }[] = [
  { key: "pnl", label: "قائمة الدخل" },
  { key: "balance-sheet", label: "الميزانية العمومية" },
  { key: "trial-balance", label: "ميزان المراجعة" },
  { key: "aging", label: "أعمار الذمم" },
  { key: "gl", label: "الأستاذ العام" },
];

export default function FinancialReportsPage() {
  const queryClient = useQueryClient();
  const [reportType, setReportType] = useState<ReportType>("pnl");
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  // ─── P&L ────────────────────────────────────────────────────
  const { data: pnl, isLoading: pnlLoading } = useQuery({
    queryKey: ["finance", "reports", "pnl", dateRange],
    queryFn: () => fetchProfitAndLoss(dateRange.from, dateRange.to),
    enabled: reportType === "pnl",
  });

  const revenueRows = pnl?.filter((r: PAndLRow) => r.accountType === "revenue") ?? [];
  const expenseRows = pnl?.filter((r: PAndLRow) => r.accountType === "expense") ?? [];
  const totalRevenue = revenueRows.reduce((s, r) => s + r.netAmount, 0);
  const totalExpenses = expenseRows.reduce((s, r) => s + Math.abs(r.netAmount), 0);

  // ─── Balance Sheet ──────────────────────────────────────────
  const { data: bs = [], isLoading: bsLoading } = useQuery({
    queryKey: ["finance", "reports", "balance-sheet"],
    queryFn: fetchBalanceSheet,
    enabled: reportType === "balance-sheet",
  });

  const assetRows = bs.filter((r) => r.bsCategory === "Assets");
  const liabilityRows = bs.filter((r) => r.bsCategory === "Liabilities");
  const equityRows = bs.filter((r) => r.bsCategory === "Equity");
  const totalAssets = assetRows.reduce((s, r) => s + r.balance, 0);
  const totalLiabilities = liabilityRows.reduce((s, r) => s + r.balance, 0);
  const totalEquity = equityRows.reduce((s, r) => s + r.balance, 0);

  // ─── Trial Balance ──────────────────────────────────────────
  const { data: tb = [], isLoading: tbLoading } = useQuery({
    queryKey: ["finance", "reports", "trial-balance"],
    queryFn: fetchTrialBalance,
    enabled: reportType === "trial-balance",
  });

  const totalDebit = tb.reduce((s, r) => s + r.debitBalance, 0);
  const totalCredit = tb.reduce((s, r) => s + r.creditBalance, 0);

  // ─── AR Aging ───────────────────────────────────────────────
  const { data: aging = [] } = useQuery({
    queryKey: ["finance", "receivables", "aging"],
    queryFn: fetchARAging,
    enabled: reportType === "aging",
  });

  const { data: agingDetailed = [], isLoading: agingDetailedLoading } = useQuery({
    queryKey: ["finance", "receivables", "aging-detailed"],
    queryFn: fetchARAgingDetailed,
    enabled: reportType === "aging",
  });

  // ─── General Ledger ─────────────────────────────────────────
  const { data: gl = [], isLoading: glLoading } = useQuery({
    queryKey: ["finance", "reports", "gl"],
    queryFn: fetchGeneralLedger,
    enabled: reportType === "gl",
  });

  // ─── Refresh Materialized View ──────────────────────────────
  const refreshMutation = useMutation({
    mutationFn: refreshAccountBalances,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "reports"] });
    },
  });

  return (
    <>
      <PageMeta title="المالية — التقارير المالية" description="التقارير المالية" />
      <AdminPageFrame>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">التقارير المالية</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              قوائم مالية وتقارير الأداء — Odoo-level
            </p>
          </div>
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-brand-25 disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshMutation.isPending ? "جارٍ التحديث..." : "تحديث البيانات"}
          </button>
        </div>

        {/* Report Type Tabs — Odoo style */}
        <AdminFilterBar>
          <div className="flex items-center gap-4">
            <div className="flex rounded-lg border border-gray-200 bg-brand-25 p-0.5">
              {REPORT_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setReportType(tab.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    reportType === tab.key
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {reportType === "pnl" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange((d) => ({ ...d, from: e.target.value }))}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                />
                <span className="text-gray-400">→</span>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange((d) => ({ ...d, to: e.target.value }))}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>
            )}
          </div>
        </AdminFilterBar>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* P&L Report */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {reportType === "pnl" && (
          <>
            <AdminMetricGrid>
              <AdminMetricCard label="إجمالي الإيرادات" value={formatEGP(totalRevenue)} tone="emerald" />
              <AdminMetricCard label="إجمالي المصروفات" value={formatEGP(totalExpenses)} tone="rose" />
              <AdminMetricCard
                label="صافي الربح"
                value={formatEGP(totalRevenue - totalExpenses)}
                tone={totalRevenue - totalExpenses >= 0 ? "blue" : "rose"}
              />
              <AdminMetricCard
                label="هامش الربح"
                value={totalRevenue > 0 ? `${((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(1)}%` : "—"}
                tone="violet"
              />
            </AdminMetricGrid>

            <AdminSection title="قائمة الدخل" description={`${dateRange.from} — ${dateRange.to}`}>
              {pnlLoading ? (
                <AdminTableSkeleton columns={5} rows={10} />
              ) : !pnl || pnl.length === 0 ? (
                <AdminEmptyState title="لا توجد بيانات" description="لم يتم تسجيل أي قيود في هذه الفترة" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-brand-25 text-xs font-medium uppercase tracking-wider text-gray-500">
                        <th className="px-5 py-3">الكود</th>
                        <th className="px-5 py-3">الحساب</th>
                        <th className="px-5 py-3 text-right">مدين</th>
                        <th className="px-5 py-3 text-right">دائن</th>
                        <th className="px-5 py-3 text-right">الصافي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueRows.length > 0 && (
                        <>
                          <tr className="bg-emerald-50/50">
                            <td colSpan={5} className="px-5 py-2 text-xs font-bold uppercase text-emerald-700">
                              الإيرادات
                            </td>
                          </tr>
                          {revenueRows.map((row) => (
                            <tr key={row.accountCode} className="border-b border-gray-50 hover:bg-brand-25">
                              <td className="px-5 py-2.5 font-mono text-xs">{row.accountCode}</td>
                              <td className="px-5 py-2.5">{row.accountName}</td>
                              <td className="px-5 py-2.5 text-right font-mono">{formatEGP(row.totalDebit)}</td>
                              <td className="px-5 py-2.5 text-right font-mono">{formatEGP(row.totalCredit)}</td>
                              <td className="px-5 py-2.5 text-right font-mono font-medium text-emerald-600">
                                {formatEGP(row.netAmount)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-emerald-50/30 font-medium">
                            <td colSpan={4} className="px-5 py-2 text-right text-xs uppercase text-emerald-700">
                              إجمالي الإيرادات
                            </td>
                            <td className="px-5 py-2 text-right font-mono text-emerald-700">{formatEGP(totalRevenue)}</td>
                          </tr>
                        </>
                      )}
                      {expenseRows.length > 0 && (
                        <>
                          <tr className="bg-rose-50/50">
                            <td colSpan={5} className="px-5 py-2 text-xs font-bold uppercase text-rose-700">
                              المصروفات
                            </td>
                          </tr>
                          {expenseRows.map((row) => (
                            <tr key={row.accountCode} className="border-b border-gray-50 hover:bg-brand-25">
                              <td className="px-5 py-2.5 font-mono text-xs">{row.accountCode}</td>
                              <td className="px-5 py-2.5">{row.accountName}</td>
                              <td className="px-5 py-2.5 text-right font-mono">{formatEGP(row.totalDebit)}</td>
                              <td className="px-5 py-2.5 text-right font-mono">{formatEGP(row.totalCredit)}</td>
                              <td className="px-5 py-2.5 text-right font-mono font-medium text-rose-600">
                                {formatEGP(Math.abs(row.netAmount))}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-rose-50/30 font-medium">
                            <td colSpan={4} className="px-5 py-2 text-right text-xs uppercase text-rose-700">
                              إجمالي المصروفات
                            </td>
                            <td className="px-5 py-2 text-right font-mono text-rose-700">{formatEGP(totalExpenses)}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-brand-25 font-bold">
                        <td colSpan={4} className="px-5 py-3 text-right text-sm uppercase">
                          صافي الربح
                        </td>
                        <td className={`px-5 py-3 text-right text-lg ${totalRevenue - totalExpenses >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {formatEGP(totalRevenue - totalExpenses)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </AdminSection>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Balance Sheet */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {reportType === "balance-sheet" && (
          <>
            <AdminMetricGrid>
              <AdminMetricCard label="الأصول" value={formatEGP(totalAssets)} tone="blue" />
              <AdminMetricCard label="الخصوم" value={formatEGP(totalLiabilities)} tone="rose" />
              <AdminMetricCard label="حقوق الملكية" value={formatEGP(totalEquity)} tone="emerald" />
              <AdminMetricCard
                label="الميزان"
                value={formatEGP(totalAssets - totalLiabilities - totalEquity)}
                tone={Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01 ? "emerald" : "rose"}
              />
            </AdminMetricGrid>

            <AdminSection title="الميزانية العمومية">
              {bsLoading ? (
                <AdminTableSkeleton columns={4} rows={10} />
              ) : bs.length === 0 ? (
                <AdminEmptyState title="لا توجد بيانات" description="لم يتم تسجيل أي قيود بعد" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-brand-25 text-xs font-medium uppercase tracking-wider text-gray-500">
                        <th className="px-5 py-3">الكود</th>
                        <th className="px-5 py-3">الحساب</th>
                        <th className="px-5 py-3 text-right">الرصيد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["Assets", "Liabilities", "Equity"].map((cat) => {
                        const rows = bs.filter((r) => r.bsCategory === cat);
                        const catTotal = rows.reduce((s, r) => s + r.balance, 0);
                        if (rows.length === 0) return null;
                        return (
                          <>
                            <tr key={cat} className="bg-blue-50/50">
                              <td colSpan={2} className="px-5 py-2 text-xs font-bold uppercase text-blue-700">
                                {cat === "Assets" ? "الأصول" : cat === "Liabilities" ? "الخصوم" : "حقوق الملكية"}
                              </td>
                              <td className="px-5 py-2 text-right font-mono text-xs font-bold text-blue-700">
                                {formatEGP(catTotal)}
                              </td>
                            </tr>
                            {rows.map((row) => (
                              <tr key={row.accountCode} className="border-b border-gray-50 hover:bg-brand-25">
                                <td className="px-5 py-2.5 font-mono text-xs">{row.accountCode}</td>
                                <td className="px-5 py-2.5">{row.accountName}</td>
                                <td className="px-5 py-2.5 text-right font-mono font-medium">{formatEGP(row.balance)}</td>
                              </tr>
                            ))}
                          </>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-brand-25 font-bold">
                        <td className="px-5 py-3 text-sm uppercase">إجمالي الأصول</td>
                        <td />
                        <td className="px-5 py-3 text-right font-mono text-blue-700">{formatEGP(totalAssets)}</td>
                      </tr>
                      <tr className="bg-brand-25 font-bold">
                        <td className="px-5 py-3 text-sm uppercase">إجمالي الخصوم + حقوق الملكية</td>
                        <td />
                        <td className="px-5 py-3 text-right font-mono text-blue-700">{formatEGP(totalLiabilities + totalEquity)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </AdminSection>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Trial Balance */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {reportType === "trial-balance" && (
          <>
            <AdminMetricGrid>
              <AdminMetricCard label="إجمالي المدين" value={formatEGP(totalDebit)} tone="blue" />
              <AdminMetricCard label="إجمالي الدائن" value={formatEGP(totalCredit)} tone="rose" />
              <AdminMetricCard
                label="الفرق"
                value={formatEGP(Math.abs(totalDebit - totalCredit))}
                tone={Math.abs(totalDebit - totalCredit) < 0.01 ? "emerald" : "rose"}
              />
            </AdminMetricGrid>

            <AdminSection title="ميزان المراجعة">
              {tbLoading ? (
                <AdminTableSkeleton columns={4} rows={10} />
              ) : tb.length === 0 ? (
                <AdminEmptyState title="لا توجد بيانات" description="لم يتم تسجيل أي قيود بعد" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-brand-25 text-xs font-medium uppercase tracking-wider text-gray-500">
                        <th className="px-5 py-3">الكود</th>
                        <th className="px-5 py-3">الحساب</th>
                        <th className="px-5 py-3 text-right">مدين</th>
                        <th className="px-5 py-3 text-right">دائن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tb.map((row) => (
                        <tr key={row.accountCode} className="hover:bg-brand-25">
                          <td className="px-5 py-2.5 font-mono text-xs">{row.accountCode}</td>
                          <td className="px-5 py-2.5">{row.accountName}</td>
                          <td className="px-5 py-2.5 text-right font-mono">
                            {row.debitBalance > 0 ? formatEGP(row.debitBalance) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono">
                            {row.creditBalance > 0 ? formatEGP(row.creditBalance) : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-brand-25 font-bold">
                        <td colSpan={2} className="px-5 py-3 text-right text-sm uppercase">الإجمالي</td>
                        <td className="px-5 py-3 text-right font-mono">{formatEGP(totalDebit)}</td>
                        <td className="px-5 py-3 text-right font-mono">{formatEGP(totalCredit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </AdminSection>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* AR Aging */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {reportType === "aging" && (
          <>
            <AdminMetricGrid>
              {aging.map((bucket) => (
                <AdminMetricCard
                  key={bucket.label}
                  label={bucket.label}
                  value={formatEGP(bucket.amount)}
                  tone={bucket.label === "Current" ? "emerald" : bucket.label === "90+ Days" ? "rose" : "amber"}
                  helper={`${bucket.invoiceCount} فاتورة`}
                />
              ))}
            </AdminMetricGrid>

            <AdminSection title="أعمار الذمم المدينة — تفصيلي">
              {agingDetailedLoading ? (
                <AdminTableSkeleton columns={6} rows={10} />
              ) : agingDetailed.length === 0 ? (
                <AdminEmptyState title="لا توجد فواتير مستحقة" description="جميع الفواتير مدفوعة" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-brand-25 text-xs font-medium uppercase tracking-wider text-gray-500">
                        <th className="px-5 py-3">رقم الفاتورة</th>
                        <th className="px-5 py-3">العميل</th>
                        <th className="px-5 py-3">التاريخ</th>
                        <th className="px-5 py-3">الاستحقاق</th>
                        <th className="px-5 py-3 text-right">المبلغ</th>
                        <th className="px-5 py-3">الفئة</th>
                        <th className="px-5 py-3 text-right">أيام التأخير</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {agingDetailed.map((row) => (
                        <tr key={row.invoiceId} className="hover:bg-brand-25">
                          <td className="px-5 py-2.5 font-mono text-xs">{row.invoiceNumber}</td>
                          <td className="px-5 py-2.5">{row.customerId.slice(0, 8)}...</td>
                          <td className="px-5 py-2.5 text-gray-600">{row.issueDate}</td>
                          <td className="px-5 py-2.5 text-gray-600">{row.dueDate}</td>
                          <td className="px-5 py-2.5 text-right font-mono font-medium">{formatEGP(row.invoiceTotal)}</td>
                          <td className="px-5 py-2.5">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              row.agingBucket === "Current" ? "bg-emerald-100 text-emerald-700" :
                              row.agingBucket === "90+ Days" ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            }`}>
                              {row.agingBucket}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono text-sm">
                            {row.daysOverdue > 0 ? (
                              <span className="text-red-600">{row.daysOverdue}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminSection>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* General Ledger */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {reportType === "gl" && (
          <AdminSection title="الأستاذ General Ledger">
            {glLoading ? (
              <AdminTableSkeleton columns={7} rows={10} />
            ) : gl.length === 0 ? (
              <AdminEmptyState title="لا توجد قيود" description="لم يتم تسجيل أي قيود بعد" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-brand-25 text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3">التاريخ</th>
                      <th className="px-4 py-3">رقم القيد</th>
                      <th className="px-4 py-3">النوع</th>
                      <th className="px-4 py-3">الحساب</th>
                      <th className="px-4 py-3">الوصف</th>
                      <th className="px-4 py-3 text-right">مدين</th>
                      <th className="px-4 py-3 text-right">دائن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {gl.map((row) => (
                      <tr key={`${row.entryId}-${row.lineId}`} className="hover:bg-brand-25">
                        <td className="px-4 py-2 text-gray-600">{row.entryDate}</td>
                        <td className="px-4 py-2 font-mono text-xs">{row.entryNumber}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center rounded-full bg-brand-25 px-2 py-0.5 text-xs font-medium text-gray-600">
                            {row.sourceType}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="font-mono text-xs text-gray-500">{row.accountCode}</span>
                          <span className="ml-1">{row.accountName}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{row.lineDescription || row.entryDescription}</td>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.debit > 0 ? (
                            <span className="text-green-700">{formatEGP(row.debit)}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.credit > 0 ? (
                            <span className="text-red-700">{formatEGP(row.credit)}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSection>
        )}
      </AdminPageFrame>
    </>
  );
}
