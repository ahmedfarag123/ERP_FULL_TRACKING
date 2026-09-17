import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../../lib/supabase";

interface SalesKpiRow {
  agentOdooUserId: number;
  agentName: string;
  gmvDelivered: number;
  gmvTarget: number | null;
  activeCustomers: number;
  newCustomers: number;
  newCustomersTarget: number | null;
  retention: number;
  odooCalls: number;
  appCalls: number;
  crmTotal: number;
  crmTarget: number | null;
}

interface SalesKpisResponse {
  success: boolean;
  periodStart?: string;
  periodEnd?: string;
  rows?: SalesKpiRow[];
  error?: string;
}

function pct(actual: number | undefined | null, target: number | undefined | null): string {
  if (actual == null || target == null || target === 0) return "—";
  return `${((actual / target) * 100).toFixed(0)}%`;
}

function formatEgp(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-EG", { maximumFractionDigits: 0 }).format(value);
}

const currentMonth = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
})();

export function SalesAgentKpisTab() {
  const [month, setMonth] = useState(currentMonth);
  const [rows, setRows] = useState<SalesKpiRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [computedAt, setComputedAt] = useState<string | null>(null);

  const load = useCallback(async (ym: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<SalesKpisResponse>(
        "sales-kpis",
        {
          body: { periodStart: `${ym}-01`, trigger: "dashboard" },
        }
      );
      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error(data?.error ?? "فشل احتساب مؤشرات المبيعات");
      setRows(data.rows ?? []);
      setComputedAt(new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

  const totals = useMemo(() => {
    if (!rows) return null;
    return rows.reduce(
      (acc, r) => ({
        gmv: acc.gmv + (r.gmvDelivered || 0),
        gmvTarget: acc.gmvTarget + (r.gmvTarget || 0),
        newCustomers: acc.newCustomers + (r.newCustomers || 0),
        ncTarget: acc.ncTarget + (r.newCustomersTarget || 0),
        crm: acc.crm + (r.crmTotal || 0),
        crmTarget: acc.crmTarget + (r.crmTarget || 0),
      }),
      { gmv: 0, gmvTarget: 0, newCustomers: 0, ncTarget: 0, crm: 0, crmTarget: 0 }
    );
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="rounded-xl border border-stroke bg-gray-2 px-4 py-2 text-sm font-medium text-gray-6 dark:border-strokedark dark:bg-boxdark">
          الشهر
        </label>
        <input
          type="month"
          value={month}
          disabled={loading}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="rounded-xl border border-stroke bg-white px-4 py-2 text-sm text-gray-6 dark:border-strokedark dark:bg-boxdark dark:text-gray-4"
        />
        <button
          onClick={() => load(month)}
          disabled={loading}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60"
        >
          {loading ? "جارٍ الاحتساب..." : "احتساب الآن"}
        </button>
        {computedAt && (
          <span className="text-xs text-gray-5">آخر احتساب: {computedAt}</span>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {rows && (
        <div className="overflow-x-auto rounded-2xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-stroke bg-gray-2 text-gray-6 dark:border-strokedark dark:bg-graydark dark:text-gray-4">
                <th className="px-4 py-3 text-right font-semibold">المندوب</th>
                <th className="px-3 py-3 text-center font-semibold" colSpan={3}>GMV</th>
                <th className="px-3 py-3 text-center font-semibold" colSpan={3}>عملاء جدد</th>
                <th className="px-3 py-3 text-center font-semibold" colSpan={3}>CRM</th>
                <th className="px-4 py-3 text-center font-semibold">الاستمرارية</th>
              </tr>
              <tr className="border-b border-stroke bg-gray-1 text-xs text-gray-5 dark:border-strokedark dark:bg-meta-4 dark:text-gray-4">
                <th />
                <th className="px-3 py-2 text-center">الهدف</th>
                <th className="px-3 py-2 text-center">الفعلي</th>
                <th className="px-3 py-2 text-center">التحقيق</th>
                <th className="px-3 py-2 text-center">الهدف</th>
                <th className="px-3 py-2 text-center">الفعلي</th>
                <th className="px-3 py-2 text-center">التحقيق</th>
                <th className="px-3 py-2 text-center">الهدف</th>
                <th className="px-3 py-2 text-center">الفعلي</th>
                <th className="px-3 py-2 text-center">التحقيق</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.agentOdooUserId}
                  className="border-b border-stroke text-gray-6 last:border-0 dark:border-strokedark dark:text-gray-4"
                >
                  <td className="px-4 py-3 font-medium text-black dark:text-white">
                    <span className="ml-2 inline-block w-5 text-center text-xs text-gray-4">{idx + 1}</span>
                    {r.agentName}
                  </td>
                  <td className="px-3 py-3 text-center">{formatEgp(r.gmvTarget)}</td>
                  <td className="px-3 py-3 text-center font-medium text-black dark:text-white">{formatEgp(r.gmvDelivered)}</td>
                  <td className="px-3 py-3 text-center font-semibold">{pct(r.gmvDelivered, r.gmvTarget)}</td>
                  <td className="px-3 py-3 text-center">{r.newCustomersTarget ?? "—"}</td>
                  <td className="px-3 py-3 text-center font-medium text-black dark:text-white">{r.newCustomers}</td>
                  <td className="px-3 py-3 text-center font-semibold">{pct(r.newCustomers, r.newCustomersTarget)}</td>
                  <td className="px-3 py-3 text-center">{r.crmTarget ?? "—"}</td>
                  <td className="px-3 py-3 text-center font-medium text-black dark:text-white">
                    {r.crmTotal}
                    <span className="ml-1 text-[10px] text-gray-4">({r.odooCalls}+{r.appCalls})</span>
                  </td>
                  <td className="px-3 py-3 text-center font-semibold">{pct(r.crmTotal, r.crmTarget)}</td>
                  <td className="px-4 py-3 text-center font-semibold text-black dark:text-white">
                    {r.retention != null ? `${(r.retention * 100).toFixed(1)}%` : "—"}
                  </td>
                </tr>
              ))}
              {totals && (
                <tr className="border-t border-stroke bg-gray-2 font-semibold text-black dark:border-strokedark dark:bg-graydark dark:text-white">
                  <td className="px-4 py-3">الإجمالي</td>
                  <td className="px-3 py-3 text-center">{formatEgp(totals.gmvTarget)}</td>
                  <td className="px-3 py-3 text-center">{formatEgp(totals.gmv)}</td>
                  <td className="px-3 py-3 text-center">{pct(totals.gmv, totals.gmvTarget)}</td>
                  <td className="px-3 py-3 text-center">{totals.ncTarget}</td>
                  <td className="px-3 py-3 text-center">{totals.newCustomers}</td>
                  <td className="px-3 py-3 text-center">{pct(totals.newCustomers, totals.ncTarget)}</td>
                  <td className="px-3 py-3 text-center">{totals.crmTarget}</td>
                  <td className="px-3 py-3 text-center">{totals.crm}</td>
                  <td className="px-3 py-3 text-center">{pct(totals.crm, totals.crmTarget)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-5">
        GMV = الأوردرات المسلّمة فعليًا في الشهر. العملاء الجدد = أول طلب للعميل في الشهر.
        CRM = مكالمات Odoo + مكالمات التطبيق (منسوبة لكل مندوب). يتم الاحتساب تلقائيًا شهريًا.
      </p>
    </div>
  );
}